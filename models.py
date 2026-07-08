"""
Phishing model class definitions — must match the classes used when pickling on Colab.
Imported by app.py AND registered as __main__ attributes for pickle compatibility.
"""
import re
import numpy as np
import torch
import torch.nn.functional as F
from urllib.parse import urlparse
import tldextract
import pandas as pd


class FusionModel:
    """Email fusion: TF-IDF traditional ML + BERT, F1-weighted soft voting."""

    def __init__(self, models, tfid, bert_model, tokenizer, f1_weights, device):
        self.models = models
        self.tfid = tfid
        self.bert_model = bert_model
        self.tokenizer = tokenizer
        self.f1_weights = f1_weights
        self.device = device

    def predict_proba(self, texts):
        model_probs = []
        tfidf_vec = self.tfid.transform(texts)
        for name in self.models:
            probs = self.models[name].predict_proba(tfidf_vec)[:, 1]
            model_probs.append(probs)

        self.bert_model.eval()
        bert_probs = []
        with torch.no_grad():
            for i in range(0, len(texts), 16):
                batch = list(texts[i:i + 16])
                inputs = self.tokenizer(
                    batch, padding=True, truncation=True,
                    max_length=128, return_tensors='pt'
                ).to(self.device)
                logits = self.bert_model(**inputs).logits
                probs = torch.softmax(logits, dim=1)[:, 1]
                bert_probs.extend(probs.cpu().numpy())
        model_probs.append(np.array(bert_probs))

        weights = np.array(list(self.f1_weights.values())).reshape(-1, 1)
        all_probs = np.array(model_probs)
        return np.sum(all_probs * weights, axis=0) / np.sum(weights)

    def predict(self, texts):
        return (self.predict_proba(texts) >= 0.5).astype(int)


class URLFusionModel:
    """URL fusion: structural features + traditional ML + BERT, F1-weighted soft voting."""

    def __init__(self, traditional_models, cnn_model, bert_model, tokenizer,
                 scaler, f1_weights, device, max_length=100):
        self.models = traditional_models
        self.cnn_model = cnn_model
        self.bert_model = bert_model
        self.tokenizer = tokenizer
        self.scaler = scaler
        self.f1_weights = f1_weights
        self.device = device
        self.max_length = max_length

    def _extract_url_features(self, urls):
        features = []
        for url in urls:
            parsed = urlparse(url)
            domain = tldextract.extract(url)
            features.append([
                len(url), len(parsed.netloc), len(parsed.path),
                url.count('.'), url.count('-'), url.count('/'),
                url.count('?'), url.count('&'), url.count('='),
                1 if re.search(r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}', url) else 0,
                1 if domain.suffix in ["xyz", "tk", "ml", "ga", "cf"] else 0,
            ])
        cols = [
            "length_url", "length_hostname", "length_path",
            "nb_dots", "nb_hyphens", "nb_slash",
            "nb_qm", "nb_and", "nb_eq",
            "has_ip_address", "suspicious_tld",
        ]
        scaled = self.scaler.transform(features)
        return pd.DataFrame(scaled, columns=cols)

    def predict_proba(self, urls):
        model_probs = []
        X = self._extract_url_features(urls)
        for name, model in self.models.items():
            probs = model.predict_proba(X)[:, 1]
            model_probs.append(probs)

        self.bert_model.eval()
        bert_probs = []
        with torch.no_grad():
            for i in range(0, len(urls), 16):
                batch = list(urls[i:i + 16])
                inputs = self.tokenizer(
                    batch, padding=True, truncation=True,
                    max_length=128, return_tensors='pt'
                ).to(self.device)
                logits = self.bert_model(**inputs).logits
                probs = torch.softmax(logits, dim=1)[:, 1]
                bert_probs.extend(probs.cpu().numpy())
        model_probs.append(np.array(bert_probs))

        weights = np.array(list(self.f1_weights.values())).reshape(-1, 1)
        all_probs = np.array(model_probs)
        return np.sum(all_probs * weights, axis=0) / np.sum(weights)

    def predict(self, urls):
        return (self.predict_proba(urls) >= 0.5).astype(int)


class ImageFusionWrapper:
    """CNN fusion: ResNet50 + EfficientNet-B0 + DenseNet121, F1-weighted soft voting."""

    def __init__(self, model_paths, f1_scores, device):
        import torch.nn as nn
        from torchvision.models import (
            resnet50, efficientnet_b0, densenet121,
            ResNet50_Weights, EfficientNet_B0_Weights, DenseNet121_Weights,
        )
        self.device = device
        self.f1_scores = f1_scores
        self.weights = [f / sum(f1_scores) for f in f1_scores]
        self.models = []

        m = resnet50(weights=None)
        m.fc = nn.Linear(m.fc.in_features, 2)
        m.load_state_dict(torch.load(model_paths[0], map_location=device))
        m.to(device).eval()
        self.models.append(m)

        m = efficientnet_b0(weights=None)
        m.classifier[1] = nn.Linear(m.classifier[1].in_features, 2)
        m.load_state_dict(torch.load(model_paths[1], map_location=device))
        m.to(device).eval()
        self.models.append(m)

        m = densenet121(weights=None)
        m.classifier = nn.Linear(m.classifier.in_features, 2)
        m.load_state_dict(torch.load(model_paths[2], map_location=device))
        m.to(device).eval()
        self.models.append(m)

    def predict(self, dataloader):
        all_weighted = []
        with torch.no_grad():
            for inputs in dataloader:
                if isinstance(inputs, (list, tuple)):
                    inputs = inputs[0]
                inputs = inputs.to(self.device)
                batch_probs = []
                for model in self.models:
                    out = model(inputs)
                    probs = F.softmax(out, dim=1)[:, 1].cpu().numpy()
                    batch_probs.append(probs)
                weighted = sum(w * p for w, p in zip(self.weights, batch_probs))
                all_weighted.extend(weighted)
        return (np.array(all_weighted) >= 0.5).astype(int)
