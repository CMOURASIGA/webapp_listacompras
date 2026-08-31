/** Sugestões de itens via OpenAI (api/ai-suggestions.ts). A chave fica só no servidor. */
export async function fetchAiSuggestions(currentItemNames: string[]): Promise<string[]> {
  const response = await fetch('/api/ai-suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: currentItemNames }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível gerar sugestões agora.');
  return Array.isArray(data.suggestions) ? data.suggestions : [];
}
