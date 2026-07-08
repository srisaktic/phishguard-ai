import axios, { AxiosError } from 'axios'
import type { PredictionResult, MultimodalResult, ModelStatus } from '../types'

const api = axios.create({ baseURL: '/api' })

// Extract a human-readable message from FastAPI error responses
function extractError(err: unknown): string {
  if (err instanceof AxiosError) {
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg).join(', ')
    if (err.response?.status) return `Server error ${err.response.status} — check the backend terminal for details.`
    return 'Cannot reach backend — is uvicorn running on port 8000?'
  }
  return err instanceof Error ? err.message : 'Unknown error'
}

export { extractError }

export async function predictEmail(subject: string, content: string): Promise<PredictionResult> {
  try {
    const { data } = await api.post<PredictionResult>('/predict/email', { subject, content })
    return data
  } catch (err) { throw new Error(extractError(err)) }
}

export async function predictUrl(url: string): Promise<PredictionResult> {
  try {
    const { data } = await api.post<PredictionResult>('/predict/url', { url })
    return data
  } catch (err) { throw new Error(extractError(err)) }
}

export async function predictImage(file: File): Promise<PredictionResult> {
  try {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<PredictionResult>('/predict/image', form)
    return data
  } catch (err) { throw new Error(extractError(err)) }
}

export async function predictMultimodal(
  subject?: string,
  content?: string,
  url?: string,
  image?: File,
): Promise<MultimodalResult> {
  try {
    const form = new FormData()
    if (subject) form.append('email_subject', subject)
    if (content) form.append('email_content', content)
    if (url) form.append('url', url)
    if (image) form.append('image', image)
    const { data } = await api.post<MultimodalResult>('/predict/multimodal', form)
    return data
  } catch (err) { throw new Error(extractError(err)) }
}

export async function getStatus(): Promise<ModelStatus> {
  try {
    const { data } = await api.get<{ status: string; models: Record<string, boolean> }>('/health')
    const loaded = Object.values(data.models).every(Boolean)
    return {
      models_loaded: loaded,
      supported_modalities: Object.keys(data.models).filter(k => data.models[k]),
      models: {
        email: { 'TF-IDF + SVM': data.models.email ?? false },
        url: { 'BERT URL Classifier (bert-base-uncased)': data.models.url ?? false },
        image: { 'CNN Ensemble (ResNet50 + EfficientNet-B0 + DenseNet121)': data.models.image ?? false },
      },
    }
  } catch (err) { throw new Error(extractError(err)) }
}
