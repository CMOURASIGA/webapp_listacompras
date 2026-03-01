import { AppSettings, ItemSuggestion } from '../../../types';

function buildItemsFromInput(input: string) {
  return input
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((name) => ({ nome: name }));
}

export async function generateWithGemini(input: string, settings: AppSettings): Promise<ItemSuggestion[]> {
  const apiKey = (settings.geminiApiKey || '').trim();
  if (!apiKey) {
    throw new Error('Gemini API key não configurada nas configurações.');
  }

  const params = new URLSearchParams();
  params.set('action', 'getSmartSuggestions');
  params.set('_t', Date.now().toString());
  params.set('payload', JSON.stringify({
    items: buildItemsFromInput(input),
    categories: []
  }));

  if (settings.scriptUrl?.trim()) {
    params.set('override_url', settings.scriptUrl.trim());
  }
  params.set('override_key', apiKey);

  const response = await fetch(`/api?${params.toString()}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
    cache: 'no-store'
  });

  const text = await response.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Resposta inválida da IA Gemini: ${text.substring(0, 80)}`);
  }

  if (!response.ok) {
    throw new Error(json?.details || json?.error || `Erro HTTP ${response.status}`);
  }

  const data = Array.isArray(json?.data) ? json.data : [];
  return data
    .map((name: unknown) => String(name || '').trim())
    .filter(Boolean)
    .map((name: string) => ({ name, source: 'gemini' as const }));
}
