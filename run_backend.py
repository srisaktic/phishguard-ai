"""
PhishGuard AI — FastAPI backend (port 8000)

Models used:
  models/email_logistic_regression_model.pkl
  models/url_log_reg_model.pkl
  models/image_fusion_model.pkl  (ResNet50 + EfficientNet-B0 + DenseNet121)

Run:
    source backend/venv/bin/activate
    python run_backend.py
"""
import os, io, re, sys, warnings, time, traceback
warnings.filterwarnings("ignore")

import numpy as np
import joblib

# ── Email text cleaning ────────────────────────────────────────────────────────
# Must match the cleaning_text() pipeline used during training:
# lowercase → strip HTML → strip URLs → keep only letters → normalize whitespace
# → remove stopwords → lemmatize (requires nltk; falls back to simpler version)
try:
    import nltk as _nltk
    from nltk.corpus import stopwords as _sw
    from nltk.tokenize import word_tokenize as _wt
    from nltk.stem import WordNetLemmatizer as _WNL
    for _corpus in ('stopwords', 'punkt_tab', 'wordnet'):
        try:
            _nltk.data.find(f'corpora/{_corpus}' if _corpus != 'punkt_tab' else 'tokenizers/punkt_tab')
        except LookupError:
            _nltk.download(_corpus, quiet=True)
    _stopwords  = set(_sw.words('english'))
    _lemmatizer = _WNL()
    _NLTK_OK    = True
    print("[INFO] NLTK available — full email cleaning active", flush=True)
except Exception:
    _NLTK_OK   = False
    # Hardcoded core English stopwords used as fallback
    _stopwords = {
        'a','an','the','and','or','but','if','in','on','at','to','for','of','with',
        'by','from','as','is','are','was','were','be','been','being','have','has',
        'had','do','does','did','will','would','could','should','may','might','must',
        'i','me','my','we','our','you','your','he','she','it','they','them','their',
        'this','that','these','those','not','no','nor','so','yet','both','either',
        'also','just','very','more','most','such','than','then','too','up','out',
        'into','about','over','after','before','between','each','few','other',
    }
    print("[INFO] NLTK not installed — using stdlib email cleaning (install nltk for full match)", flush=True)

def _clean_email_text(text: str) -> str:
    """Replicate training cleaning_text() so TF-IDF features match what the SVM was trained on."""
    text = str(text).lower()
    text = re.sub(r'<.*?>', '', text)                    # remove HTML tags
    text = re.sub(r'https?://\S+|www\.\S+', '', text)   # remove URLs
    text = re.sub(r'[^a-zA-Z\s]', '', text)             # keep letters only
    text = re.sub(r'\s+', ' ', text).strip()             # collapse whitespace
    if _NLTK_OK:
        words = _wt(text)
        words = [_lemmatizer.lemmatize(w) for w in words if w not in _stopwords]
    else:
        words = [w for w in text.split() if w not in _stopwords]
    return ' '.join(words)

BASE   = os.path.dirname(os.path.abspath(__file__))
MODELS = os.path.join(BASE, "models")


def _load(name):
    path = os.path.join(MODELS, name)
    try:
        m = joblib.load(path)
        print(f"  [ok] {name}", flush=True)
        return m
    except Exception as e:
        print(f"  [skip] {name}: {e}", flush=True)
        return None

def _load_path(path):
    try:
        m = joblib.load(path)
        print(f"  [ok] {os.path.basename(path)}", flush=True)
        return m
    except Exception as e:
        print(f"  [skip] {os.path.basename(path)}: {e}", flush=True)
        return None


# ── 1. Load email + URL models (before torch) ─────────────────────────────────
print("[INFO] Loading models …", flush=True)
email_model = _load("svm_model_email.pkl")
url_model   = _load("url_log_reg_model.pkl")  # kept but unused (BERT handles URL)

# TF-IDF vectorizer lives with the individual email models
email_tfid = _load_path(os.path.join(BASE, "1.EMAIL", "fusion_email_model", "tfid_vectorizer.pkl"))
# sklearn version mismatch: 1.6 stores idf_ as array, 1.4 expects _idf_diag sparse matrix
if email_tfid is not None and hasattr(email_tfid, '_tfidf'):
    t = email_tfid._tfidf
    if not hasattr(t, '_idf_diag') and hasattr(t, '__dict__') and 'idf_' in t.__dict__:
        import scipy.sparse as _sp
        t._idf_diag = _sp.diags(t.__dict__['idf_'], offsets=0, format='csr')
        print("  [patch] idf_ → _idf_diag applied", flush=True)

# SVM version-compat patch: sklearn 1.9 sparse path requires _effective_probability
# which was not serialised in 1.6.1. Setting False tells libsvm to return raw
# decision values; we then apply Platt scaling manually via _probA/_probB.
if email_model is not None and not hasattr(email_model, '_effective_probability'):
    email_model._effective_probability = False
    print("  [patch] SVM _effective_probability set to False", flush=True)

# URL model uses raw features (11 columns), no scaler needed

# ── 2. Import torch AFTER sklearn models ──────────────────────────────────────
import torch
import torch.nn.functional as F
from torchvision import transforms as _tv
from PIL import Image as PILImage

device = torch.device("cpu")

# ── 3a. Load BERT URL model ────────────────────────────────────────────────────
print("[INFO] Loading BERT URL model …", flush=True)
_bert_url_dir      = os.path.join(MODELS, "bert_url")
bert_url_model     = None
bert_url_tokenizer = None
try:
    if not os.path.isdir(_bert_url_dir):
        raise FileNotFoundError(f"bert_url directory not found: {_bert_url_dir}")
    from transformers import BertForSequenceClassification, BertTokenizer
    bert_url_tokenizer = BertTokenizer.from_pretrained(
        _bert_url_dir, local_files_only=True
    )
    bert_url_model = BertForSequenceClassification.from_pretrained(
        _bert_url_dir, local_files_only=True
    )
    bert_url_model.eval()
    bert_url_model.to(device)
    print("  [ok] bert_url (BertForSequenceClassification + BertTokenizer)", flush=True)
except Exception as e:
    print(f"  [skip] bert_url: {e}", flush=True)

# ── 3. Image fusion model with CUDA→CPU patch ─────────────────────────────────
image_model = None
try:
    import torch.serialization as _ts
    import torch.nn as _nn

    _orig = _ts.default_restore_location
    def _cpu(s, loc): return _orig(s, "cpu")
    _ts.default_restore_location = _cpu

    sys.path.insert(0, BASE)
    from models import ImageFusionWrapper
    import __main__
    __main__.ImageFusionWrapper = ImageFusionWrapper

    raw = joblib.load(os.path.join(MODELS, "image_fusion_model.pkl"))
    if hasattr(raw, "device"): raw.device = device
    mlist = list(raw.models.values() if isinstance(raw.models, dict) else raw.models)
    for m in mlist:
        if hasattr(m, "to"): m.to(device)
    image_model = raw
    print("  [ok] image_fusion_model.pkl", flush=True)
except Exception as e:
    print(f"  [skip] image_fusion_model.pkl: {e}", flush=True)
finally:
    try: _ts.default_restore_location = _orig
    except: pass

IMAGE_TRANSFORM = _tv.Compose([
    _tv.Resize((224, 224)),
    _tv.ToTensor(),
    _tv.Normalize(mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]),  # must match training
])

# ── Inference ─────────────────────────────────────────────────────────────────
def _email_predict(text: str) -> float:
    cleaned = _clean_email_text(text)                    # match training preprocessing
    vec = email_tfid.transform([cleaned])
    dec = email_model.decision_function(vec)[0]
    # Platt scaling using the coefficients stored during SVM training with probability=True
    A, B = email_model._probA[0], email_model._probB[0]
    prob = 1.0 / (1.0 + np.exp(A * dec + B))
    return float(prob)

_IP      = re.compile(r"\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}")
_BAD_TLD = {"xyz", "tk", "ml", "ga", "cf"}

def _url_features(url: str):
    from urllib.parse import urlparse
    import pandas as pd
    p   = urlparse(url if "://" in url else "http://" + url)
    h   = p.netloc.split(":")[0]
    suf = h.rsplit(".", 1)[-1].lower() if "." in h else ""
    # Raw features — url_log_reg_model was trained on unscaled values
    raw = [[len(url), len(p.netloc), len(p.path),
            url.count("."), url.count("-"), url.count("/"),
            url.count("?"), url.count("&"), url.count("="),
            1 if _IP.search(url) else 0,
            1 if suf in _BAD_TLD else 0]]
    cols = ["length_url","length_hostname","length_path","nb_dots","nb_hyphens",
            "nb_slash","nb_qm","nb_and","nb_eq","has_ip_address","suspicious_tld"]
    return pd.DataFrame(raw, columns=cols)

def _url_predict(url: str) -> float:
    """Predict URL phishing probability using BERT (BertForSequenceClassification).
    Label mapping: 0 = legitimate, 1 = phishing.
    """
    if bert_url_model is None or bert_url_tokenizer is None:
        raise RuntimeError("BERT URL model not loaded — check models/bert_url/")
    enc = bert_url_tokenizer(
        url,
        padding=True,
        truncation=True,
        max_length=128,
        return_tensors="pt",
    )
    enc = {k: v.to(device) for k, v in enc.items()}
    with torch.no_grad():
        logits = bert_url_model(**enc).logits         # shape: [1, 2]
        prob   = torch.softmax(logits, dim=1)[0, 1]   # index 1 = phishing
    return float(prob.cpu().item())

def _image_predict(data: bytes) -> float:
    img    = PILImage.open(io.BytesIO(data)).convert("RGB")
    tensor = IMAGE_TRANSFORM(img).unsqueeze(0).to(device)
    mlist  = list(image_model.models.values() if isinstance(image_model.models, dict) else image_model.models)
    w      = image_model.weights
    total  = None
    with torch.no_grad():
        for wt, m in zip(w, mlist):
            p     = torch.softmax(m(tensor), dim=1)[:, 1]
            total = p * wt if total is None else total + p * wt
    return float(total.cpu().item())

def _result(modality, prob, models_used, ms=0, feats=None):
    ph    = round(prob, 4); lg = round(1 - prob, 4)
    label = "phishing"   if ph >= 0.55 else ("legitimate" if lg > 0.55 else "uncertain")
    risk  = "high"       if ph >= 0.7  else ("medium"     if ph >= 0.45 else "low")
    r = {"modality": modality, "label": label,
         "phishing_probability": ph, "legitimate_probability": lg,
         "confidence": round(max(ph, lg), 4), "risk_level": risk,
         "models_used": models_used, "processing_time_ms": ms}
    if feats: r["extracted_features"] = feats
    return r

# ── Startup self-test ─────────────────────────────────────────────────────────
# Runs two known examples at startup to confirm the preprocessing + model pipeline
# is working correctly end-to-end. Expected: phishing ≥ 0.7, safe ≤ 0.3.
def _run_self_test():
    if email_model is None or email_tfid is None:
        return
    _PHISHING = (
        "URGENT Your account will be suspended Click here to verify "
        "http://secure-login-verify.xyz/confirm?token=abc123 immediately"
    )
    _SAFE = "Hi team just a reminder about our weekly standup tomorrow at 10am see you there"
    try:
        p_phish = _email_predict(_PHISHING)
        p_safe  = _email_predict(_SAFE)
        ok_p = p_phish >= 0.60
        ok_s = p_safe  <= 0.40
        print(f"  [self-test] phishing email → {p_phish:.3f} {'✓' if ok_p else '✗ UNEXPECTED'}", flush=True)
        print(f"  [self-test] safe email     → {p_safe:.3f} {'✓' if ok_s else '✗ UNEXPECTED'}", flush=True)
        if not ok_p or not ok_s:
            print("  [self-test] WARNING: check preprocessing pipeline", flush=True)
    except Exception as e:
        print(f"  [self-test] failed: {e}", flush=True)

print("[INFO] Running email self-test …", flush=True)
_run_self_test()

# ── FastAPI ───────────────────────────────────────────────────────────────────
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import uvicorn

app = FastAPI(title="PhishGuard AI", version="2.0")
app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"], allow_headers=["*"])

@app.exception_handler(Exception)
async def _err(req, exc):
    traceback.print_exc()
    return JSONResponse(status_code=500, content={"detail": f"{type(exc).__name__}: {exc}"})

@app.get("/api/health")
def health():
    return {"status": "ok", "models": {
        "email": email_model      is not None and email_tfid is not None,
        "url":   bert_url_model   is not None and bert_url_tokenizer is not None,
        "image": image_model      is not None,
    }}

class EmailReq(BaseModel):
    subject: Optional[str] = ""
    content: str

@app.post("/api/predict/email")
def predict_email(body: EmailReq):
    if email_model is None or email_tfid is None:
        raise HTTPException(503, "Email model not loaded")
    text = f"{body.subject or ''} {body.content}".strip()
    t0   = time.perf_counter()
    prob = _email_predict(text)
    return _result("email", prob, ["SVM"], int((time.perf_counter()-t0)*1000))

class UrlReq(BaseModel):
    url: str

@app.post("/api/predict/url")
def predict_url(body: UrlReq):
    if bert_url_model is None or bert_url_tokenizer is None:
        raise HTTPException(503, "BERT URL model not loaded")
    url = body.url.strip()
    t0  = time.perf_counter()
    prob = _url_predict(url)
    try:
        df    = _url_features(url)
        feats = {c: round(float(df[c].iloc[0]), 4) for c in df.columns}
    except: feats = None
    return _result("url", prob, ["BERT"], int((time.perf_counter()-t0)*1000), feats)

@app.post("/api/predict/image")
async def predict_image(file: UploadFile = File(...)):
    if image_model is None:
        raise HTTPException(503, "Image model not loaded")
    data = await file.read()
    t0   = time.perf_counter()
    prob = _image_predict(data)
    return _result("image", prob, ["ResNet50", "EfficientNet-B0", "DenseNet121"],
                   int((time.perf_counter()-t0)*1000))

def _fuse_max(results: dict, threshold: float = 0.55) -> dict:
    """Conservative max-score fusion: final probability = max(available modality scores).

    A single strong phishing signal from any modality drives the final verdict.
    No dilution from weaker signals on other modalities.
    """
    scores = {k: float(results[k]["phishing_probability"]) for k in results}
    triggered_by  = max(scores, key=scores.get)
    final_prob    = scores[triggered_by]
    label = "phishing"   if final_prob >= threshold else ("legitimate" if (1 - final_prob) > threshold else "uncertain")
    risk  = "high"       if final_prob >= 0.7       else ("medium"     if final_prob >= 0.45            else "low")
    return {
        "label":          label,
        "probability":    round(final_prob, 4),
        "confidence":     round(max(final_prob, 1 - final_prob), 4),
        "risk_level":     risk,
        "triggered_by":   triggered_by,
        "fusion_method":  "maximum_score",
        "modality_scores": {k: round(v, 4) for k, v in scores.items()},
    }


@app.post("/api/predict/multimodal")
async def predict_multimodal(
    email_subject: Optional[str] = Form(default=None),
    email_content: Optional[str] = Form(default=None),
    url:           Optional[str] = Form(default=None),
    image: Optional[UploadFile]  = File(default=None),
):
    t0 = time.perf_counter(); results = {}

    if email_content and email_content.strip() and email_model and email_tfid:
        text = f"{email_subject or ''} {email_content}".strip()
        results["email"] = _result("email", _email_predict(text), ["SVM"])

    if url and url.strip() and bert_url_model is not None and bert_url_tokenizer is not None:
        u = url.strip()
        try:
            df    = _url_features(u)
            feats = {c: round(float(df[c].iloc[0]), 4) for c in df.columns}
        except: feats = None
        results["url"] = _result("url", _url_predict(u), ["BERT"], feats=feats)

    if image and image.filename and image_model:
        prob = _image_predict(await image.read())
        results["image"] = _result("image", prob, ["ResNet50", "EfficientNet-B0", "DenseNet121"])

    if not results:
        raise HTTPException(422, "Provide at least one of: email_content, url, image")

    fusion = _fuse_max(results)
    fusion["modalities"]          = results
    fusion["processing_time_ms"]  = int((time.perf_counter() - t0) * 1000)
    return fusion

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    print(f"[INFO] Starting PhishGuard AI → http://localhost:{port}", flush=True)
    uvicorn.run(app, host="0.0.0.0", port=port)
