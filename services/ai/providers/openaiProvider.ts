import { AppSettings, ItemSuggestion } from '../../../types';

export async function generateWithOpenAI(input: string, settings: AppSettings): Promise<ItemSuggestion[]> {
  const apiKey = (settings.openaiApiKey || '').trim();
  if (!apiKey) {
    throw new Error('OpenAI API key não configurada nas configurações.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4.1-mini',
      input: `Sugira 5 itens de mercado úteis com base nesta lista: ${input}. Responda apenas os nomes separados por vírgula.`
    })
  });

  const json = await response.json();
  if (!response.ok) {
    const details = json?.error?.message || `Erro HTTP ${response.status}`;
    throw new Error(`Erro OpenAI: ${details}`);
  }

  const text = String(json?.output_text || '').trim();
  if (!text) return [];

  return text
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => ({ name, source: 'openai' as const }));
}

