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
      error: "Configuração Pendente",
      details: "URL do Google Script não configurada.",
      hint: "Abra o painel de configuração (engrenagem) e insira a URL de implantação."
    }, 500);
  }

  // IA Sugestões
  if (action === 'getSmartSuggestions') {
    if (!EFFECTIVE_API_KEY) return jsonResponse({ error: "Gemini API Key não configurada." }, 500);
    try {
      const payload = payloadStr ? JSON.parse(payloadStr) : { items: [], categories: [] };
      const ai = new GoogleGenAI({ apiKey: EFFECTIVE_API_KEY });
      const currentItems = payload.items.map((i: any) => i.nome).join(", ");
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Sugira 5 itens de compras que faltam para quem já tem: [${currentItems || 'nada'}]. Responda apenas os nomes separados por vírgula.`,
      });

      const suggestions = (response.text || "").split(',').map(s => s.trim()).filter(s => s.length > 0);
      return jsonResponse({ data: suggestions });
    } catch (e: any) {
      return jsonResponse({ error: "Erro na IA", details: e.message }, 500);
    }
  }

  // Proxy para Google Apps Script
  try {
    let sanitizedUrl = SCRIPT_URL_RAW!.trim();
    
    if (sanitizedUrl.includes('/edit')) {
       return jsonResponse({ 
          error: "URL de Editor Detectada",
          details: "Você colou a URL da página de edição do código.",
          hint: "Clique em 'Implantar' -> 'Nova Implantação' -> 'App da Web' e copie a URL que termina em /exec."
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

    // O erro 404 (robô do Google) significa que o ID do Script na URL não existe ou não está publicado
    if (response.status === 404 || contentType.includes('text/html')) {
       return jsonResponse({ 
          error: "Erro 404: WebApp não encontrado",
          details: "O Google Scripts respondeu, mas disse que esta implantação não existe ou está inacessível.",
          hint: "1. Vá no Apps Script. 2. 'Implantar' -> 'Gerenciar Implantações'. 3. Verifique se existe uma versão ativa. 4. Garanta que o acesso está definido como 'Qualquer Pessoa' (Anyone)."
        }, 500);
    }

    try {
      const data = JSON.parse(text);
      return jsonResponse(data);
    } catch (e) {
      return jsonResponse({ 
        error: "Resposta Inválida", 
        details: "O script não retornou um JSON. Verifique se você publicou o código corretamente.",
        raw: text.substring(0, 200)
      }, 500);
    }
  } catch (e: any) {
    return jsonResponse({ error: "Falha na Conexão", details: e.message }, 500);
  }
}