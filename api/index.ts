import { GoogleGenAI } from '@google/genai';

export const config = {
  runtime: 'edge',
};

const FALLBACK_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxgt0XKD21dsD8EqMNQv0-8VFvBGjrktswc8t6FC8kwKdVsIZyoelpKO4rRiXOrXBQ/exec';

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const payloadStr = url.searchParams.get('payload');
  const userEmail = url.searchParams.get('userEmail');

  const SCRIPT_URL_RAW = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL || FALLBACK_SCRIPT_URL;
  const EFFECTIVE_API_KEY = process.env.API_KEY;

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

  if (action === 'getSmartSuggestions') {
    if (!EFFECTIVE_API_KEY) return jsonResponse({ error: 'API Key ausente no ambiente do servidor.' }, 503);
    try {
      const payload = payloadStr ? JSON.parse(payloadStr) : { items: [], categories: [] };
      const ai = new GoogleGenAI({ apiKey: EFFECTIVE_API_KEY });
      const currentItems = Array.isArray(payload.items) ? payload.items.map((i: any) => i.nome).join(', ') : '';
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Lista atual: [${currentItems}]. Sugira 5 itens de mercado úteis. Responda apenas nomes separados por vírgula.`,
      });
      const suggestions = (response.text || '').split(',').map((s) => s.trim()).filter(Boolean);
      return jsonResponse({ data: suggestions });
    } catch (e: any) {
      return jsonResponse({ error: 'Erro na IA', details: e.message }, 500);
    }
  }

  try {
    const sanitizedUrl = SCRIPT_URL_RAW.trim();
    if (sanitizedUrl.includes('/edit')) {
      return jsonResponse({
        error: 'URL de Edição Detectada',
        details: 'O app precisa da URL de implantação do Apps Script.',
        hint: 'Use uma URL terminada em /exec.'
      }, 400);
    }

    const targetUrl = new URL(sanitizedUrl);
    if (action) targetUrl.searchParams.set('action', action);
    if (payloadStr) targetUrl.searchParams.set('payload', payloadStr);
    if (userEmail) targetUrl.searchParams.set('userEmail', userEmail);
    targetUrl.searchParams.set('_t', Date.now().toString());

    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      redirect: 'follow',
      cache: 'no-store'
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (response.status === 404 || text.includes('<!DOCTYPE') || contentType.includes('text/html')) {
      return jsonResponse({
        error: 'Google Script Inacessível',
        details: 'O servidor retornou HTML em vez de JSON.',
        google_status: response.status
      }, 502);
    }

    try {
      const data = JSON.parse(text);
      if (data?.error) return jsonResponse(data, 500);
      return jsonResponse(data);
    } catch {
      return jsonResponse({
        error: 'Resposta do Google inválida',
        details: 'O script não retornou JSON válido.'
      }, 502);
    }
  } catch (e: any) {
    return jsonResponse({ error: 'Erro crítico no Proxy', details: e.message }, 500);
  }
}
