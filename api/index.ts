import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const payloadStr = url.searchParams.get('payload');
  const userEmail = url.searchParams.get('userEmail');
  
  // Suporta tanto APPS_SCRIPT_URL quanto VITE_APPS_SCRIPT_URL para facilitar o deploy
  const SCRIPT_URL_RAW = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL;

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
      details: "Vá em Settings -> Environment Variables e adicione a URL do seu script terminando em /exec."
    }, 500);
  }

  // IA Sugestões
  if (action === 'getSmartSuggestions') {
    if (!process.env.API_KEY) return jsonResponse({ error: "IA indisponível (falta API_KEY)." }, 500);
    try {
      const payload = payloadStr ? JSON.parse(payloadStr) : { items: [], categories: [] };
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const currentItems = payload.items.map((i: any) => i.nome).join(", ");
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sugira 5 itens de compras (nomes curtos) que faltam para quem já tem: [${currentItems || 'nada'}]. Responda apenas os nomes separados por vírgula.`,
      });

      const generatedText = response.text || "";
      const suggestions = generatedText.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      return jsonResponse({ data: suggestions });
    } catch (e: any) {
      return jsonResponse({ error: "Erro na IA: " + e.message }, 500);
    }
  }

  // Proxy para Google Apps Script
  try {
    let sanitizedUrl = SCRIPT_URL_RAW.trim();
    if (!sanitizedUrl.startsWith('http')) sanitizedUrl = 'https://' + sanitizedUrl;
    
    const targetUrl = new URL(sanitizedUrl);
    
    if (action) targetUrl.searchParams.set('action', action);
    if (payloadStr) targetUrl.searchParams.set('payload', payloadStr);
    if (userEmail) targetUrl.searchParams.set('userEmail', userEmail);

    const fullTargetUrl = targetUrl.toString();

    const response = await fetch(fullTargetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'follow'
    });
    
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // Se o Google retornar 404 ou uma página HTML (erro de permissão ou URL errada)
    if (response.status === 404 || contentType.includes('text/html')) {
      console.error("GAS Proxy Error (HTML/404):", text.substring(0, 200));
      return jsonResponse({ 
        error: `O Google Apps Script retornou um erro (${response.status}).`,
        details: `Verifique se a URL em Vercel termina em '/exec'. A URL que tentamos chamar foi: ${fullTargetUrl.split('?')[0]}`,
        hint: "O script deve ser implantado como 'App da Web' com acesso para 'Qualquer Pessoa'."
      }, 500);
    }

    try {
      return jsonResponse(JSON.parse(text));
    } catch (e) {
      console.error("GAS Invalid JSON:", text.substring(0, 200));
      return jsonResponse({ 
        error: "Resposta do Google Apps Script não é um JSON válido.", 
        details: "O script deve retornar ContentService.MimeType.JSON",
        preview: text.substring(0, 100) 
      }, 500);
    }
  } catch (e: any) {
    return jsonResponse({ 
      error: "Falha na conexão de rede com o Google.",
      details: e.message 
    }, 500);
  }
}