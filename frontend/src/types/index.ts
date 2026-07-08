export interface PredictionResult {
  modality: string
  label: 'phishing' | 'legitimate' | 'uncertain'
  phishing_probability: number
  legitimate_probability: number
  confidence: number
  risk_level: 'high' | 'medium' | 'low'
  models_used: string[]
  processing_time_ms: number
  extracted_features?: Record<string, number | string | boolean>
}

export interface ModalityResults {
  email?: PredictionResult
  url?: PredictionResult
  image?: PredictionResult
}

export interface MultimodalResult {
  label: 'phishing' | 'legitimate' | 'uncertain'
  probability: number
  confidence: number
  risk_level: 'high' | 'medium' | 'low'
  modalities: ModalityResults
  triggered_by: string                    // modality with highest phishing probability
  fusion_method: string                   // "maximum_score"
  modality_scores: Record<string, number> // per-modality phishing probabilities
  processing_time_ms: number
}

export interface ModelStatus {
  models_loaded: boolean
  supported_modalities: string[]
  models: Record<string, Record<string, boolean>>
}

export type Tab = 'email' | 'url' | 'image' | 'multimodal'
