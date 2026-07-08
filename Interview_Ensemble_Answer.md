# Ensemble & Fusion Strategy in PhishGuard AI

**Question:** "If SVM is used for email and BERT is used for URL, what's the purpose of the ensemble technique? Why did you implement fusion only for image?"

---

## The Core Answer

The ensemble/fusion in this project operates at **two levels**:

| Level | Type | What it does |
|-------|------|--------------|
| Level 1 | Intra-modality fusion | Multiple models combined *within* the same input type |
| Level 2 | Inter-modality fusion | Outputs from different modalities combined into one verdict |

The multimodal max-score **is** the ensemble — Email (SVM) + URL (BERT) + Image (CNN Ensemble) outputs are combined. Fusion is not limited to inside a single modality.

---

## Why Image Uses Intra-Modality Fusion

**Core principle:**
> Ensembles improve performance when individual models are similarly capable and fail on different examples. When one model clearly dominates, adding weaker models degrades the ensemble.

For image, no single CNN architecture dominated:

```
ResNet50:       86.4% F1
EfficientNet:   85.6% F1
DenseNet121:    83.3% F1
─────────────────────────
CNN Ensemble:   89.7% F1   ← meaningful gain over any single model
```

Each architecture learns different visual patterns:
- **ResNet50** → global structure, skip connections
- **EfficientNet** → efficient multi-scale features
- **DenseNet121** → dense feature reuse, fine texture

---

## Why Email Does NOT Use Intra-Modality Ensemble

```
SVM:      98.3% F1   ← clearly dominant
RF:       95.9% F1
XGBoost:  95.6% F1
BERT:     96.3% F1
```

SVM dominates by a large margin. Adding weaker models dilutes rather than improves.

---

## Why URL Does NOT Use Intra-Modality Ensemble

```
Traditional models:  ~91–93% on 11 hand-crafted features
BERT:                95.1%
```

BERT processes the raw URL as text and understands subword patterns (`secure-login-verify.xyz`, `paypal-confirm.tk`). Traditional models only see numerical features — a fundamentally poorer representation.

---

## Word-for-Word Answer

> "Ensemble works best when models have similar accuracy but different failure patterns. For image, all three CNNs score within 3% of each other individually but use different architectures. They fail on different images, so their combination at 89.7% meaningfully improves over any single model at ~86%.
>
> For email, SVM at 98.3% outperforms every other model including BERT at 96.3%. Adding weaker models drags performance down.
>
> For URL, BERT processes the raw URL string and understands subword patterns. Traditional models only see 11 handcrafted numerical features — fundamentally less informative.
>
> The fusion in this project does exist — at the multimodal level, where SVM email score, BERT URL score, and CNN ensemble image score are combined using max-score fusion. A single strong phishing signal from any one modality triggers the alarm."

---

## If Pressed: Why Not Deploy Email/URL Fusion?

> "The email fusion was explored during research. SVM individually outperformed the fusion. The URL fusion had an implementation bug — the CNN component was never actually trained, so it would crash at inference. That's why the best single model was deployed for each modality."

---

## Deployment Architecture

```
RESEARCH                             DEPLOYED
────────────────────────────────────────────────────────
Email:  6-model ensemble tested  →  SVM only     (98.3%)
URL:    6-model ensemble tested  →  BERT only    (95.1%)
Image:  3 CNNs tested            →  CNN Ensemble (89.7%)
Multimodal:                      →  Max-score fusion
                                    SVM + BERT + CNN Ensemble
```

---

