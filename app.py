"""
PhishGuard AI — Flask backend for phishing detection (email / URL / image).
Startup order matters on macOS:
  1. Load all sklearn/XGBoost/LightGBM/CatBoost models FIRST
  2. Then import HuggingFace transformers and load BERT
  (Importing tokenizers before XGBoost causes a Rust/OpenMP thread conflict on macOS.)
"""
import os
import re
import sys
import warnings
warnings.filterwarnings("ignore")

import numpy as np
import joblib

# ─── Load all traditional ML models BEFORE importing transformers/torch ─────
BASE = os.path.dirname(os.path.abspath(__file__))

def _load_pkl(path):
    """Load a joblib/pickle file, returning None on failure."""
    try:
        return joblib.load(path)
    except Exception as e:
        print(f"  [skip] {os.path.basename(path)}: {e}", flush=True)
        return None


EMAIL_DIR = os.path.join(BASE, "EMAIL", "fusion_email_model")
URL_DIR   = os.path.join(BASE, "URL", "all_saved_files_url", "models")

print("[INFO] Loading traditional ML models...", flush=True)

# Email models (XGB must be first — it initialises OpenMP before sklearn RF)
email_xgb  = _load_pkl(os.path.join(EMAIL_DIR, "xgboost_model.pkl"))
email_lr   = _load_pkl(os.path.join(EMAIL_DIR, "logistic_regression_model.pkl"))
email_nb   = _load_pkl(os.path.join(EMAIL_DIR, "naive_bayes_model.pkl"))
email_svm  = _load_pkl(os.path.join(EMAIL_DIR, "svm_model.pkl"))
email_rf   = _load_pkl(os.path.join(EMAIL_DIR, "random_forest_model.pkl"))
email_tfid = _load_pkl(os.path.join(EMAIL_DIR, "tfid_vectorizer.pkl"))
print("  [ok] email traditional models", flush=True)

# URL models (XGB first for same reason)
url_xgb    = _load_pkl(os.path.join(URL_DIR, "traditional", "xgb_model.pkl"))
url_lr     = _load_pkl(os.path.join(URL_DIR, "traditional", "log_reg_model.pkl"))
url_rf     = _load_pkl(os.path.join(URL_DIR, "traditional", "rf_model.pkl"))
url_lgb    = _load_pkl(os.path.join(URL_DIR, "traditional", "lgb_model.pkl"))
url_cat    = _load_pkl(os.path.join(URL_DIR, "traditional", "cat_model.pkl"))
url_scaler = _load_pkl(os.path.join(URL_DIR, "traditional", "feature_scaler.pkl"))
print("  [ok] url traditional models", flush=True)

# ─── Now safe to import transformers / torch ────────────────────────────────
print("[INFO] Loading torch + transformers...", flush=True)
import torch
import torch.nn.functional as F
from transformers import BertTokenizer, BertForSequenceClassification

# CPU only — MPS conflicts with XGBoost OpenMP thread pool on macOS
device = torch.device("cpu")
print(f"  [ok] device={device}", flush=True)

# ─── Load BERT models ────────────────────────────────────────────────────────
print("[INFO] Loading BERT models...", flush=True)
try:
    email_bert_tok   = BertTokenizer.from_pretrained(os.path.join(EMAIL_DIR, "bert"))
    email_bert_model = BertForSequenceClassification.from_pretrained(
        os.path.join(EMAIL_DIR, "bert"), num_labels=2
    ).eval()
    print("  [ok] email BERT", flush=True)
except Exception as e:
    email_bert_tok = email_bert_model = None
    print(f"  [warn] email BERT: {e}", flush=True)

try:
    url_bert_tok   = BertTokenizer.from_pretrained(os.path.join(URL_DIR, "bert_url"))
    url_bert_model = BertForSequenceClassification.from_pretrained(
        os.path.join(URL_DIR, "bert_url"), num_labels=2
    ).eval()
    print("  [ok] url BERT", flush=True)
except Exception as e:
    url_bert_tok = url_bert_model = None
    print(f"  [warn] url BERT: {e}", flush=True)

# ─── Image model ─────────────────────────────────────────────────────────────
print("[INFO] Loading image model...", flush=True)
from PIL import Image
from torchvision import transforms as _tv

IMAGE_TRANSFORM = _tv.Compose([
    _tv.Resize((224, 224)),
    _tv.ToTensor(),
    _tv.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

_image_raw = None
try:
    import torch.serialization as _ts

    _orig_restore = _ts.default_restore_location
    def _cpu_restore(storage, location):
        return _orig_restore(storage, "cpu")
    _ts.default_restore_location = _cpu_restore

    # ImageFusionWrapper must be in __main__ for pickle to find it
    import torch.nn as _nn
    from torchvision.models import (
        resnet50, efficientnet_b0, densenet121,
        ResNet50_Weights, EfficientNet_B0_Weights, DenseNet121_Weights,
    )

    class ImageFusionWrapper:
        def __init__(self, model_paths, f1_scores, device):
            self.device = device
            self.f1_scores = f1_scores
            self.weights = [f / sum(f1_scores) for f in f1_scores]
            self.models = []
            m = resnet50(weights=None); m.fc = _nn.Linear(m.fc.in_features, 2)
            m.load_state_dict(torch.load(model_paths[0], map_location=device))
            self.models.append(m.to(device).eval())
            m = efficientnet_b0(weights=None); m.classifier[1] = _nn.Linear(m.classifier[1].in_features, 2)
            m.load_state_dict(torch.load(model_paths[1], map_location=device))
            self.models.append(m.to(device).eval())
            m = densenet121(weights=None); m.classifier = _nn.Linear(m.classifier.in_features, 2)
            m.load_state_dict(torch.load(model_paths[2], map_location=device))
            self.models.append(m.to(device).eval())

        def predict(self, dataloader):
            all_preds = []
            with torch.no_grad():
                for inputs in dataloader:
                    if isinstance(inputs, (list, tuple)):
                        inputs = inputs[0]
                    inputs = inputs.to(self.device)
                    avg = sum(w * torch.softmax(m(inputs), dim=1) for w, m in zip(self.weights, self.models))
                    all_preds.extend(torch.argmax(avg, dim=1).cpu().numpy())
            return all_preds

    import __main__
    __main__.ImageFusionWrapper = ImageFusionWrapper

    _image_raw = joblib.load(os.path.join(BASE, "Images", "image_fusion_model.pkl"))
    if hasattr(_image_raw, "models"):
        for m in _image_raw.models:
            if hasattr(m, "to"):
                m.to(device)
    if hasattr(_image_raw, "device"):
        _image_raw.device = device
    print("  [ok] image fusion model", flush=True)
except Exception as e:
    print(f"  [warn] image model: {e}", flush=True)
finally:
    try:
        _ts.default_restore_location = _orig_restore
    except Exception:
        pass

# ─── Flask app ───────────────────────────────────────────────────────────────
from flask import Flask, request, jsonify, render_template
from urllib.parse import urlparse
import tldextract
import pandas as pd

app = Flask(__name__)

# ─── Inference helpers ────────────────────────────────────────────────────────

def _bert_proba(model, tokenizer, texts, batch=8):
    model.eval()
    probs = []
    with torch.no_grad():
        for i in range(0, len(texts), batch):
            enc = tokenizer(list(texts[i:i+batch]), padding=True, truncation=True,
                            max_length=128, return_tensors="pt")
            logits = model(**enc).logits
            p = torch.softmax(logits, dim=1)[:, 1].numpy()
            probs.extend(p)
    return np.array(probs)


def _safe_proba(model, X):
    """predict_proba that skips models not configured with probability=True."""
    try:
        return model.predict_proba(X)[:, 1]
    except Exception:
        return None


def _email_proba(text):
    texts = [text]
    tfidf = email_tfid.transform(texts)

    models_w = {}
    for key, m, w in [("LR", email_lr, 0.97), ("NB", email_nb, 0.95),
                       ("SVM", email_svm, 0.98), ("RF", email_rf, 0.97),
                       ("XGB", email_xgb, 0.97)]:
        if m:
            p = _safe_proba(m, tfidf)
            if p is not None:
                models_w[key] = (p, w)

    # BERT skipped at inference time — CPU inference takes 30-60s per request.
    # Traditional ML ensemble (LR+NB+RF+XGB) achieves ~97% accuracy standalone.

    if not models_w:
        raise RuntimeError("No email models loaded")

    total_w = sum(w for _, w in models_w.values())
    combined = sum(p * w for p, w in models_w.values()) / total_w
    return float(combined[0])


def _url_features(urls):
    feats = []
    for url in urls:
        parsed = urlparse(url)
        dom = tldextract.extract(url)
        feats.append([
            len(url), len(parsed.netloc), len(parsed.path),
            url.count("."), url.count("-"), url.count("/"),
            url.count("?"), url.count("&"), url.count("="),
            1 if re.search(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}", url) else 0,
            1 if dom.suffix in ["xyz", "tk", "ml", "ga", "cf"] else 0,
        ])
    cols = ["length_url","length_hostname","length_path","nb_dots","nb_hyphens",
            "nb_slash","nb_qm","nb_and","nb_eq","has_ip_address","suspicious_tld"]
    return pd.DataFrame(url_scaler.transform(feats), columns=cols)


def _url_proba(url):
    X = _url_features([url])

    models_w = {}
    for key, m, w in [("LR", url_lr, 0.93), ("RF", url_rf, 0.94),
                       ("XGB", url_xgb, 0.93), ("LGB", url_lgb, 0.94),
                       ("CAT", url_cat, 0.93)]:
        if m:
            p = _safe_proba(m, X)
            if p is not None:
                models_w[key] = (p, w)

    # BERT skipped at inference time (too slow on CPU for interactive use).

    if not models_w:
        raise RuntimeError("No URL models loaded")

    total_w = sum(w for _, w in models_w.values())
    combined = sum(p * w for p, w in models_w.values()) / total_w
    return float(combined[0])


def _image_proba(tensor):
    if _image_raw is None:
        raise RuntimeError("Image model not loaded")
    loader = [(tensor.unsqueeze(0),)]
    pred = _image_raw.predict(loader)
    return 1.0 if pred[0] == 1 else 0.0


# ─── Health ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/health")
def health():
    return jsonify({
        "status": "ok",
        "device": str(device),
        "models": {
            "email_trad":  email_tfid is not None,
            "email_bert":  email_bert_model is not None,
            "url_trad":    url_scaler is not None,
            "url_bert":    url_bert_model is not None,
            "image":       _image_raw is not None,
        },
    })


# ─── Email prediction ─────────────────────────────────────────────────────────

@app.route("/api/predict/email", methods=["POST"])
def predict_email():
    body = request.get_json(silent=True) or {}
    text = body.get("email_text", "").strip()
    if not text:
        return jsonify({"error": "email_text is required"}), 400
    if email_tfid is None:
        return jsonify({"error": "Email models not loaded"}), 503
    try:
        prob  = _email_proba(text)
        label = int(prob >= 0.5)
        return jsonify({
            "modality": "email", "label": label,
            "is_phishing": bool(label),
            "confidence": round(prob, 4),
            "confidence_pct": round(prob * 100, 1),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── URL prediction ──────────────────────────────────────────────────────────

@app.route("/api/predict/url", methods=["POST"])
def predict_url():
    body = request.get_json(silent=True) or {}
    url  = body.get("url", "").strip()
    if not url:
        return jsonify({"error": "url is required"}), 400
    if url_scaler is None:
        return jsonify({"error": "URL models not loaded"}), 503
    try:
        prob  = _url_proba(url)
        label = int(prob >= 0.5)
        return jsonify({
            "modality": "url", "label": label,
            "is_phishing": bool(label),
            "confidence": round(prob, 4),
            "confidence_pct": round(prob * 100, 1),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Image prediction ────────────────────────────────────────────────────────

@app.route("/api/predict/image", methods=["POST"])
def predict_image():
    if _image_raw is None:
        return jsonify({"error": "Image model not loaded"}), 503
    if "file" not in request.files:
        return jsonify({"error": "No image file provided"}), 400
    try:
        img    = Image.open(request.files["file"].stream).convert("RGB")
        tensor = IMAGE_TRANSFORM(img)
        prob   = _image_proba(tensor)
        label  = int(prob >= 0.5)
        return jsonify({
            "modality": "image", "label": label,
            "is_phishing": bool(label),
            "confidence": round(prob, 4),
            "confidence_pct": round(prob * 100, 1),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ─── Multimodal prediction ───────────────────────────────────────────────────

@app.route("/api/predict/multimodal", methods=["POST"])
def predict_multimodal():
    email_text = url = image_tensor = None
    ct = request.content_type or ""

    if "multipart/form-data" in ct:
        email_text = request.form.get("email_text", "").strip() or None
        url        = request.form.get("url", "").strip() or None
        if "image" in request.files:
            img          = Image.open(request.files["image"].stream).convert("RGB")
            image_tensor = IMAGE_TRANSFORM(img)
    else:
        body       = request.get_json(silent=True) or {}
        email_text = body.get("email_text", "").strip() or None
        url        = body.get("url", "").strip() or None

    if not any([email_text, url, image_tensor is not None]):
        return jsonify({"error": "Provide at least one of: email_text, url, image"}), 400

    probs = {}
    errors = []

    if email_text and email_tfid:
        try:
            probs["email"] = _email_proba(email_text)
        except Exception as e:
            errors.append(f"email: {e}")

    if url and url_scaler:
        try:
            probs["url"] = _url_proba(url)
        except Exception as e:
            errors.append(f"url: {e}")

    if image_tensor is not None and _image_raw:
        try:
            probs["image"] = _image_proba(image_tensor)
        except Exception as e:
            errors.append(f"image: {e}")

    if not probs:
        return jsonify({"error": "No models available for provided inputs", "details": errors}), 503

    votes = [1 if v >= 0.5 else 0 for v in probs.values()]
    label = 1 if sum(votes) > len(votes) / 2 else 0
    fp    = float(np.mean(list(probs.values())))

    return jsonify({
        "label": label, "is_phishing": bool(label),
        "final_confidence": round(fp, 4),
        "final_confidence_pct": round(fp * 100, 1),
        "modality_scores": {
            "email": round(probs["email"], 4) if "email" in probs else None,
            "url":   round(probs["url"],   4) if "url"   in probs else None,
            "image": round(probs["image"], 4) if "image" in probs else None,
        },
    })


if __name__ == "__main__":
    print("[INFO] Starting Flask server on port 5050...", flush=True)
    app.run(debug=False, port=5050, host="0.0.0.0")
