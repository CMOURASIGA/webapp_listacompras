// Função serverless (Vercel Edge) do 7Mercado atual — sugestões de itens via OpenAI.
// A chave nunca chega ao navegador: fica só na variável de ambiente OPENAI_API_KEY,
// configurada em Project Settings > Environment Variables no painel do Vercel.
export const config = { runtime: 'edge' };

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } });
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Método não suportado, use POST.' }, 405);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json({ error: 'OPENAI_API_KEY não configurada no ambiente do servidor.' }, 503);

  let body: { items?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'Corpo da requisição inválido (esperado JSON).' }, 400); }
  const items = Array.isArray(body.items) ? body.items.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).slice(0, 50) : [];

  const prompt = items.length
    ? `Lista de compras atual: ${items.join(', ')}.\nSugira até 5 produtos de supermercado que combinam com essa lista (itens que costumam ser comprados junto, mas ainda não estão nela).\nResponda apenas com os nomes dos produtos separados por vírgula, sem numeração, sem explicação.`
    : 'Sugira até 5 produtos básicos de supermercado para começar uma lista de compras.\nResponda apenas com os nomes dos produtos separados por vírgula, sem numeração, sem explicação.';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 120,
      }),
    });
    if (!response.ok) {
      const details = await response.text();
      return json({ error: 'A OpenAI recusou a requisição.', details }, 502);
    }
    const data = await response.json();
    const text: string = data.choices?.[0]?.message?.content || '';
    const suggestions = text.split(',').map(s => s.trim().replace(/^\d+[.)]\s*/, '')).filter(Boolean).slice(0, 5);
    return json({ suggestions });
  } catch (e) {
    return json({ error: 'Erro ao chamar a OpenAI.', details: e instanceof Error ? e.message : String(e) }, 500);
  }
}
