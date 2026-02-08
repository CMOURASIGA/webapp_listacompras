
import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const payloadStr = url.searchParams.get('payload');
  const userEmail = url.searchParams.get('userEmail');
  
  const overrideUrl = url.searchParams.get('override_url');
  const overrideKey = url.searchParams.get('override_key');

  const SCRIPT_URL_RAW = overrideUrl || process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL;
  const EFFECTIVE_API_KEY = overrideKey || process.env.API_KEY;

  const jsonResponse = (data: any, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });

  if (!SCRIPT_URL_RAW && action !== 'getSmartSuggestions') {
    return jsonResponse({ 
      error: "URL Ausente",
      details: "A URL do Apps Script não foi informada.",
      hint: "Abra as configurações (engrenagem) e cole a URL de Implantação."
    }, 500);
  }

  if (action === 'getSmartSuggestions') {
    if (!EFFECTIVE_API_KEY) return jsonResponse({ error: "Chave IA ausente." }, 500);
    try {
      const payload = payloadStr ? JSON.parse(payloadStr) : { items: [], categories: [] };
      const ai = new GoogleGenAI({ apiKey: EFFECTIVE_API_KEY });
      const currentItems = payload.items.map((i: any) => i.nome).join(", ");
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Lista atual: [${currentItems}]. Sugira 5 itens. Apenas nomes separados por vírgula.`,
      });
      const suggestions = (response.text || "").split(',').map(s => s.trim()).filter(s => s.length > 0);
      return jsonResponse({ data: suggestions });
    } catch (e: any) {
      return jsonResponse({ error: "IA Offline", details: e.message }, 500);
    }
  }

  try {
    let sanitizedUrl = SCRIPT_URL_RAW!.trim();

    // Verificação de URL de Desenvolvimento (/dev)
    if (sanitizedUrl.endsWith('/dev')) {
      return jsonResponse({
        error: "URL de Teste Detectada (/dev)",
        details: "URLs que terminam em /dev são privadas e não funcionam aqui.",
        hint: "Clique em Implantar > Gerenciar Implantações e pegue a URL que termina em /exec."
      }, 400);
    }

    if (!sanitizedUrl.startsWith('http')) sanitizedUrl = 'https://' + sanitizedUrl;
    
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

    // Tratar o 404 específico do Google
    if (response.status === 404 || contentType.includes('text/html')) {
       return jsonResponse({ 
          error: "O Google retornou 404 (Não Encontrado)",
          details: "A URL tem o formato correto, mas o 'ID do Script' dentro dela não existe ou a implantação foi deletada.",
          hint: "1. No Google Scripts, clique em IMPLANTAR.\n2. Escolha GERENCIAR IMPLANTAÇÕES.\n3. Verifique se há um 'App da Web' ativo.\n4. Se não tiver, clique em 'Nova Implantação', tipo 'App da Web', acesso para 'Qualquer Pessoa'."
        }, 500);
    }

    try {
      const data = JSON.parse(text);
      return jsonResponse(data);
    } catch (e) {
      return jsonResponse({ 
        error: "Erro no Formato dos Dados", 
        details: "O Google Scripts não respondeu um JSON válido. Verifique se você copiou o código Code.gs corretamente.",
        raw: text.substring(0, 300)
      }, 500);
    }
  } catch (e: any) {
    return jsonResponse({ error: "Erro de Conexão", details: e.message }, 500);
  }
}
