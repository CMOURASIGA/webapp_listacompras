import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

// URL padrão absoluta caso nenhuma outra seja configurada
const FALLBACK_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxgt0XKD21dsD8EqMNQv0-8VFvBGjrktswc8t6FC8kwKdVsIZyoelpKO4rRiXOrXBQ/exec";

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const payloadStr = url.searchParams.get('payload');
  const userEmail = url.searchParams.get('userEmail');
  
  const overrideUrl = url.searchParams.get('override_url');
  const overrideKey = url.searchParams.get('override_key');

  const SCRIPT_URL_RAW = overrideUrl || process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL || FALLBACK_SCRIPT_URL;
  const EFFECTIVE_API_KEY = overrideKey || process.env.API_KEY;

  const jsonResponse = (data: any, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });

  if (req.method === 'OPTIONS') return jsonResponse({}, 200);

  // IA Sugestões (Gemini)
  if (action === 'getSmartSuggestions') {
    if (!EFFECTIVE_API_KEY) return jsonResponse({ error: "API Key ausente." }, 400);
    try {
      const payload = payloadStr ? JSON.parse(payloadStr) : { items: [], categories: [] };
      const ai = new GoogleGenAI({ apiKey: EFFECTIVE_API_KEY });
      const currentItems = payload.items.map((i: any) => i.nome).join(", ");
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Lista atual: [${currentItems}]. Sugira 5 itens de mercado úteis. Responda apenas nomes separados por vírgula.`,
      });
      const suggestions = (response.text || "").split(',').map(s => s.trim()).filter(s => s.length > 0);
      return jsonResponse({ data: suggestions });
    } catch (e: any) {
      return jsonResponse({ error: "Erro na IA", details: e.message }, 500);
    }
  }

  // Proxy para Google Scripts
  try {
    let sanitizedUrl = SCRIPT_URL_RAW.trim();
    if (sanitizedUrl.includes('/edit')) {
       return jsonResponse({ 
          error: "URL de Edição Detectada",
          details: "Você está usando a URL do editor de código. O app precisa da URL de IMPLANTAÇÃO.",
          hint: "Clique em Implantar > Gerenciar Implantações e copie a URL que termina em /exec."
        }, 400);
    }

    const targetUrl = new URL(sanitizedUrl);
    if (action) targetUrl.searchParams.set('action', action);
    if (payloadStr) targetUrl.searchParams.set('payload', payloadStr);
    if (userEmail) targetUrl.searchParams.set('userEmail', userEmail);
    
    // Cache buster para garantir dados novos
    targetUrl.searchParams.set('_t', Date.now().toString());

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow',
      cache: 'no-store' // Força o fetch a não usar cache do navegador/edge
    });
    
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (response.status === 404 || text.includes('<!DOCTYPE') || contentType.includes('text/html')) {
       return jsonResponse({ 
          error: "Google Script Inacessível",
          details: "O servidor retornou HTML em vez de JSON (provavelmente erro 404 ou login).",
          hint: "Verifique se a implantação no Google Scripts está configurada como 'Qualquer Pessoa'.",
          google_status: response.status
        }, 500);
    }

    try {
      const data = JSON.parse(text);
      return jsonResponse(data);
    } catch (e) {
      return jsonResponse({ 
        error: "Resposta do Google inválida", 
        details: "O script não retornou um JSON válido.",
        preview: text.substring(0, 100)
      }, 500);
    }
  } catch (e: any) {
    return jsonResponse({ error: "Erro crítico no Proxy", details: e.message }, 500);
  }
}