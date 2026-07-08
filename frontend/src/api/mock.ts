// Realistic mock responses — no backend needed.
// Swap client.ts imports to use these when demoing standalone.

import type { PredictionResult, MultimodalResult, ModelStatus } from '../types'

function delay(ms = 900) { return new Promise(r => setTimeout(r, ms)) }

function phishingResult(modality: string, prob = 0.91): PredictionResult {
  return {
    modality,
    label: 'phishing',
    phishing_probability: prob,
    legitimate_probability: +(1 - prob).toFixed(4),
    confidence: prob,
    risk_level: prob >= 0.7 ? 'high' : 'medium',
    models_used: modality === 'email'
      ? ['LR', 'NB', 'SVM', 'RF', 'XGB']
      : modality === 'url'
        ? ['LR', 'RF', 'XGB', 'LGB', 'CAT']
        : ['ResNet50', 'EfficientNet-B0', 'DenseNet121'],
    processing_time_ms: Math.floor(Math.random() * 80 + 40),
    extracted_features: modality === 'url' ? {
      url_length: 52,
      num_dots: 3,
      num_hyphens: 1,
      num_slashes: 4,
      has_ip: false,
      suspicious_tld: true,
    } : undefined,
  }
}

function legitimateResult(modality: string, prob = 0.06): PredictionResult {
  return {
    modality,
    label: 'legitimate',
    phishing_probability: prob,
    legitimate_probability: +(1 - prob).toFixed(4),
    confidence: +(1 - prob).toFixed(4),
    risk_level: 'low',
    models_used: modality === 'email'
      ? ['LR', 'NB', 'RF', 'XGB']
      : modality === 'url'
        ? ['LR', 'RF', 'XGB', 'LGB', 'CAT']
        : ['ResNet50', 'EfficientNet-B0', 'DenseNet121'],
    processing_time_ms: Math.floor(Math.random() * 60 + 30),
    extracted_features: modality === 'url' ? {
      url_length: 34,
      num_dots: 2,
      num_hyphens: 0,
      num_slashes: 2,
      has_ip: false,
      suspicious_tld: false,
    } : undefined,
  }
}

function looksPhishy(text: string): boolean {
  const triggers = ['urgent', 'suspend', 'verify', 'click here', 'xyz', 'tk', 'login', 'secure-', 'confirm', 'token=', 'phishing']
  return triggers.some(t => text.toLowerCase().includes(t))
}

export async function predictEmail(subject: string, content: string): Promise<PredictionResult> {
  await delay(1000)
  const text = subject + ' ' + content
  return looksPhishy(text) ? phishingResult('email', 0.91) : legitimateResult('email', 0.05)
}

export async function predictUrl(url: string): Promise<PredictionResult> {
  await delay(700)
  return looksPhishy(url) ? phishingResult('url', 0.89) : legitimateResult('url', 0.08)
}

export async function predictImage(_file: File): Promise<PredictionResult> {
  await delay(1200)
  // Images are demo-only — randomly show a realistic result
  return Math.random() > 0.45 ? phishingResult('image', 0.82) : legitimateResult('image', 0.11)
}

export async function predictMultimodal(
  subject?: string,
  content?: string,
  url?: string,
  _image?: File,
): Promise<MultimodalResult> {
  await delay(1400)
  const text = (subject || '') + ' ' + (content || '') + ' ' + (url || '')
  const isPhish = looksPhishy(text)
  const prob = isPhish ? 0.88 : 0.07

  const modalities: MultimodalResult['modalities'] = {}
  if (content) modalities.email = isPhish ? phishingResult('email', 0.91) : legitimateResult('email', 0.05)
  if (url)     modalities.url   = isPhish ? phishingResult('url', 0.89) : legitimateResult('url', 0.08)
  if (_image)  modalities.image = isPhish ? phishingResult('image', 0.82) : legitimateResult('image', 0.11)

  // Max-score fusion: final probability = highest among active modalities
  const modalityScores: Record<string, number> = {}
  if (content) modalityScores.email = modalities.email!.phishing_probability
  if (url)     modalityScores.url   = modalities.url!.phishing_probability
  if (_image)  modalityScores.image = modalities.image!.phishing_probability

  const triggeredBy = Object.entries(modalityScores)
    .sort(([, a], [, b]) => b - a)[0][0]

  return {
    label: isPhish ? 'phishing' : 'legitimate',
    probability: prob,
    confidence: isPhish ? prob : 1 - prob,
    risk_level: isPhish ? 'high' : 'low',
    modalities,
    triggered_by: triggeredBy,
    fusion_method: 'maximum_score',
    modality_scores: modalityScores,
    processing_time_ms: Math.floor(Math.random() * 120 + 80),
  }
}

export async function getStatus(): Promise<ModelStatus> {
  await delay(400)
  return {
    models_loaded: true,
    supported_modalities: ['email', 'url', 'image'],
    models: {
      email: {
        'xgboost_model.pkl': true,
        'logistic_regression_model.pkl': true,
        'naive_bayes_model.pkl': true,
        'svm_model.pkl': true,
        'random_forest_model.pkl': true,
        'tfid_vectorizer.pkl': true,
        'bert': false,
      },
      url: {
        'xgb_model.pkl': true,
        'log_reg_model.pkl': true,
        'rf_model.pkl': true,
        'lgb_model.pkl': true,
        'cat_model.pkl': true,
        'feature_scaler.pkl': true,
        'bert_url': false,
      },
      image: {
        'image_fusion_model.pkl': true,
      },
    },
  }
}
