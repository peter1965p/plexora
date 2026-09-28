// Generisches Fundament für "Plexora AI" — ein Adapter pro Anbieter, alle mit
// derselben Schnittstelle. Neue Features (Assistent, Insights, Content) rufen
// nur noch chatOnce() auf und müssen sich nie um Anbieter-Details kümmern.

export const AI_PROVIDERS = ['anthropic', 'openai', 'groq', 'gemini'] as const
export type AiProvider = typeof AI_PROVIDERS[number]

export const AI_PROVIDER_LABELS: Record<AiProvider, string> = {
  anthropic: 'Claude (Anthropic)',
  openai:    'OpenAI',
  groq:      'Groq',
  gemini:    'Gemini (Google)',
}

export const AI_PROVIDER_DEFAULT_MODELS: Record<AiProvider, string> = {
  anthropic: 'claude-sonnet-4-6',
  openai:    'gpt-4o-mini',
  groq:      'llama-3.3-70b-versatile',
  gemini:    'gemini-3.8-flash',
}

export interface ChatMessage { role: 'user' | 'assistant'; content: string }
export interface ChatResult { text: string; inputTokens: number; outputTokens: number }

interface ChatArgs {
  apiKey: string
  model?: string
  system?: string
  messages: ChatMessage[]
  maxTokens?: number
}

async function chatAnthropic({ apiKey, model, system, messages, maxTokens }: ChatArgs): Promise<ChatResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: model || AI_PROVIDER_DEFAULT_MODELS.anthropic,
      max_tokens: maxTokens || 1024,
      ...(system ? { system } : {}),
      messages,
    }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return {
    text: data.content?.[0]?.text || '',
    inputTokens: data.usage?.input_tokens || 0,
    outputTokens: data.usage?.output_tokens || 0,
  }
}

// OpenAI und Groq sind API-kompatibel (Chat-Completions-Format) — ein Adapter genügt.
async function chatOpenAiCompatible(baseUrl: string, defaultModel: string) {
  return async ({ apiKey, model, system, messages, maxTokens }: ChatArgs): Promise<ChatResult> => {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: model || defaultModel,
        max_tokens: maxTokens || 1024,
        messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages],
      }),
    })
    const data = await res.json() as any
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
    return {
      text: data.choices?.[0]?.message?.content || '',
      inputTokens: data.usage?.prompt_tokens || 0,
      outputTokens: data.usage?.completion_tokens || 0,
    }
  }
}

async function chatGemini({ apiKey, model, system, messages, maxTokens }: ChatArgs): Promise<ChatResult> {
  const useModel = model || AI_PROVIDER_DEFAULT_MODELS.gemini
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: maxTokens || 1024 },
    }),
  })
  const data = await res.json() as any
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return {
    text: data.candidates?.[0]?.content?.parts?.[0]?.text || '',
    inputTokens: data.usageMetadata?.promptTokenCount || 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
  }
}

export async function chatOnce(provider: AiProvider, args: ChatArgs): Promise<ChatResult> {
  switch (provider) {
    case 'anthropic': return chatAnthropic(args)
    case 'openai':    return (await chatOpenAiCompatible('https://api.openai.com/v1', AI_PROVIDER_DEFAULT_MODELS.openai))(args)
    case 'groq':      return (await chatOpenAiCompatible('https://api.groq.com/openai/v1', AI_PROVIDER_DEFAULT_MODELS.groq))(args)
    case 'gemini':    return chatGemini(args)
  }
}

// Fragt die tatsächlich verfügbaren Modelle live beim Anbieter ab, statt eine
// Liste im Code zu pflegen — genau das ist heute mit dem festen Gemini-Default
// schiefgegangen (Modell wurde abgeschaltet, ohne dass wir's gemerkt hätten).
export async function listModels(provider: AiProvider, apiKey: string): Promise<string[]> {
  if (provider === 'anthropic') {
    const res = await fetch('https://api.anthropic.com/v1/models?limit=100', {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    })
    const data = await res.json() as any
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
    return (data.data || []).map((m: any) => m.id)
  }
  if (provider === 'openai' || provider === 'groq') {
    const baseUrl = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://api.groq.com/openai/v1'
    const res = await fetch(`${baseUrl}/models`, { headers: { 'Authorization': `Bearer ${apiKey}` } })
    const data = await res.json() as any
    if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
    return (data.data || []).map((m: any) => m.id).sort()
  }
  // gemini
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=200`)
  const data = await res.json() as any
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return (data.models || [])
    .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m: any) => String(m.name || '').replace(/^models\//, ''))
}
