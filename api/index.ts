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

  
  // Configurações sensíveis devem ser controladas somente pelo servidor.
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


  const loginUser = (process.env.SHOPPING_LOGIN_USER || 'admin').trim();
  const loginPassword = process.env.SHOPPING_LOGIN_PASSWORD || '';
  const ownerEmail = (process.env.SHOPPING_OWNER_EMAIL || '').trim().toLowerCase();
  const sessionSecret = process.env.SHOPPING_SESSION_SECRET || '';
  const ready = loginPassword.length >= 12 && !!ownerEmail && sessionSecret.length >= 32;
  const encoder = new TextEncoder();
  const toHex = (bytes: Uint8Array) => Array.from(bytes).map(x => x.toString(16).padStart(2, '0')).join('');
  const hmac = async (message: string) => {
    const key = await crypto.subtle.importKey('raw', encoder.encode(sessionSecret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return toHex(new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message))));
  };
  const equal = (a: string, b: string) => {
    const x = encoder.encode(a), y = encoder.encode(b);
    let diff = x.length ^ y.length;
    for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
    return diff === 0;
  };
  const cookie = (value: string, maxAge: number) =>
    'shopping_session=' + value + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge;
  const respond = (data: any, status = 200, setCookie?: string) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
    if (setCookie) headers['Set-Cookie'] = setCookie;
    return new Response(JSON.stringify(data), { status, headers });
  };
  if (req.method === 'OPTIONS') return respond({}, 200);
  if (action === 'health') return respond({ ok: true, configured: ready });
  if (!ready) return respond({ error: 'Login não configurado no servidor. Configure SHOPPING_LOGIN_PASSWORD, SHOPPING_OWNER_EMAIL e SHOPPING_SESSION_SECRET.' }, 503);
  if (action === 'login') {
    if (req.method !== 'POST') return respond({ error: 'Método não permitido' }, 405);
    let body: any;
    try { body = await req.json(); } catch { return respond({ error: 'Dados inválidos' }, 400); }
    if (!equal(String(body?.username || ''), loginUser) || !equal(String(body?.password || ''), loginPassword))
      return respond({ error: 'Usuário ou senha inválidos' }, 401);
    const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000;
    const payload = String(expiry);
    const signature = await hmac(payload);
    return respond({ data: { email: ownerEmail, name: loginUser } }, 200, cookie(payload + '.' + signature, 604800));
  }
  if (action === 'logout') return respond({ data: { ok: true } }, 200, cookie('', 0));
  const cookieHeader = req.headers.get('cookie') || '';
  const token = cookieHeader.split(';').map(x => x.trim()).find(x => x.startsWith('shopping_session='))?.slice('shopping_session='.length) || '';
  const [expiryStr, signature, ...rest] = token.split('.');
  const expiry = Number(expiryStr);
  const valid = rest.length === 0 && /^\d{13}$/.test(expiryStr || '') && expiry > Date.now() &&
    !!signature && equal(signature, await hmac(expiryStr));
  if (!valid) return respond({ error: 'Sessão expirada. Entre novamente.' }, 401);
  if (action === 'session') return respond({ data: { email: ownerEmail, name: loginUser } });
  if (req.method !== 'GET') return respond({ error: 'Método não permitido' }, 405);


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
    if (payloadStr) {
      const parsed = JSON.parse(payloadStr);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) parsed.userEmail = ownerEmail;
      targetUrl.searchParams.set('payload', JSON.stringify(parsed));
    }
    // Identidade derivada da sessão, nunca de parâmetro enviado pelo navegador.
    targetUrl.searchParams.set('userEmail', ownerEmail);
    
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
      if (data?.error) {
        return jsonResponse(data, 500);
      }
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
