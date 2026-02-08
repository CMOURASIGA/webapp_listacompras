
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

// URL ABSOLUTA fornecida pelo usuário para evitar erro 404
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
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });

  if (req.method === 'OPTIONS') return jsonResponse({}, 200);

  // IA Sugestões (Gemini)
  if (action === 'getSmartSuggestions') {
    if (!EFFECTIVE_API_KEY) return jsonResponse({ error: "API Key não configurada." }, 400);
    try {
      const payload = payloadStr ? JSON.parse(payloadStr) : { items: [], categories: [] };
      const ai = new GoogleGenAI({ apiKey: EFFECTIVE_API_KEY });
      const currentItems = payload.items.map((i: any) => i.nome).join(", ");
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Lista: [${currentItems}]. Sugira 5 itens de mercado. Responda apenas nomes separados por vírgula.`,
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
          error: "URL Inválida (Modo Editor)",
          details: "Você está usando a URL do editor. Use a URL de IMPLANTAÇÃO (/exec).",
          hint: "Vá em Implantar > Nova Implantação e copie a URL final."
        }, 400);
    }

    const targetUrl = new URL(sanitizedUrl);
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

    // Detecção de Erro do Google (HTML retornado em vez de JSON)
    if (response.status === 404 || text.includes('<!DOCTYPE') || text.includes('html') || contentType.includes('text/html')) {
       return jsonResponse({ 
          error: "Google Script não respondeu com JSON",
          details: "O servidor retornou uma página HTML ou erro 404.",
          hint: "1. Verifique se a URL termina em /exec.\n2. Verifique se o ID do Script está correto.\n3. Certifique-se que o script está implantado para 'Qualquer Pessoa'.",
          google_status: response.status
        }, 500);
    }

    try {
      const data = JSON.parse(text);
      return jsonResponse(data);
    } catch (e) {
      return jsonResponse({ 
        error: "Resposta do Google não é um JSON válido", 
        details: "O script retornou texto puro em vez de dados formatados.",
        preview: text.substring(0, 80)
      }, 500);
    }
  } catch (e: any) {
    return jsonResponse({ error: "Erro de Proxy Fatal", details: e.message }, 500);
  }
}
