import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const payloadStr = url.searchParams.get('payload');
  const userEmail = url.searchParams.get('userEmail');
  
  const SCRIPT_URL_RAW = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL;
  const API_KEY = process.env.API_KEY;

  const jsonResponse = (data: any, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });

  if (!SCRIPT_URL_RAW) {
    return jsonResponse({ 
      error: "Variável APPS_SCRIPT_URL não configurada no Vercel.",
      details: "Vá em Settings -> Environment Variables e adicione a URL do seu script."
    }, 500);
  }

  // IA Sugestões
  if (action === 'getSmartSuggestions') {
    if (!API_KEY) return jsonResponse({ error: "IA indisponível (falta API_KEY)." }, 500);
    try {
      const payload = payloadStr ? JSON.parse(payloadStr) : { items: [], categories: [] };
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      const currentItems = payload.items.map((i: any) => i.nome).join(", ");
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sugira 5 itens de compras (nomes curtos) que faltam para quem já tem: [${currentItems || 'nada'}]. Responda apenas os nomes separados por vírgula.`,
      });
      return jsonResponse({ data: response.text.split(',').map(s => s.trim()) });
    } catch (e: any) {
      return jsonResponse({ error: e.message }, 500);
    }
  }

  // Proxy GAS
  try {
    const targetUrl = new URL(SCRIPT_URL_RAW.trim());
    if (action) targetUrl.searchParams.set('action', action);
    if (payloadStr) targetUrl.searchParams.set('payload', payloadStr);
    if (userEmail) targetUrl.searchParams.set('userEmail', userEmail);

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow'
    });
    
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (response.status === 404 || contentType.includes('text/html')) {
      return jsonResponse({ 
        error: "O Google retornou erro 404 ou HTML.",
        details: "Isso ocorre se a URL do Script estiver errada ou se o script não estiver publicado como 'Qualquer pessoa'.",
        url: targetUrl.origin + targetUrl.pathname
      }, 500);
    }

    try {
      return jsonResponse(JSON.parse(text));
    } catch (e) {
      return jsonResponse({ error: "Resposta do script não é um JSON válido.", preview: text.substring(0, 100) }, 500);
    }
  } catch (e: any) {
    return jsonResponse({ error: "Erro de rede: " + e.message }, 500);
  }
}