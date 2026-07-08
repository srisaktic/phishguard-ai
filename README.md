<h1 align="center">🛡️ PhishGuard AI — Multimodal Phishing Detection</h1>

<p align="center">
  AI-powered phishing detection using Email, URL, and Image analysis
</p>

<p align="center">
  <img src="https://img.shields.io/badge/AI-Multimodal-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/NLP-BERT-orange?style=for-the-badge" />
  <img src="https://img.shields.io/badge/CV-CNN_Ensemble-purple?style=for-the-badge" />
</p>

---

## System Architecture

| Modality | Model | Accuracy |
|----------|-------|----------|
| Email | TF-IDF + SVM (RBF kernel) | 98.3% |
| URL | BERT (bert-base-uncased, fine-tuned) | 95.1% |
| Image | CNN Ensemble (ResNet50 + EfficientNet-B0 + DenseNet121) | 89.7% |
| Multimodal | Max-score fusion | — |

## How It Works

- **Email** → Text cleaned (lowercase, HTML stripped, stopwords removed, lemmatized) → TF-IDF (120,375 features) → SVM with Platt scaling
- **URL** → Raw URL tokenized as text → BERT fine-tuned on URL sequences
- **Image** → Resize 224×224, normalize [0.5]*3 → 3 CNNs soft-voted by F1 weight
- **Multimodal** → Max-score fusion: highest phishing probability across active modalities wins

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: FastAPI + Uvicorn
- **Email ML**: scikit-learn · TF-IDF · SVM
- **URL Model**: HuggingFace · BERT fine-tuned
- **Image DL**: PyTorch + torchvision · ResNet50 · EfficientNet · DenseNet

## Run Locally

```bash
# Backend
source backend/venv/bin/activate
python run_backend.py

# Frontend (separate terminal)
cd frontend && npm run dev
```

Open http://localhost:5173

## Ensemble Strategy

Intra-modality ensemble (multiple models for same input) is only used for **image** because all three CNNs score similarly (~83–86%) and capture different visual patterns — making ensemble meaningful (+3.7% gain).

For email, SVM (98.3%) dominates over all others including BERT (96.3%), so ensemble would dilute performance. For URL, BERT (95.1%) subsumes what traditional models capture from raw URL strings.

The **inter-modality fusion** (combining email + URL + image) is the system-level ensemble.

## Author

Sri Sakticharan Nirmal Kumar — sole author, all research, model development, and implementation.
