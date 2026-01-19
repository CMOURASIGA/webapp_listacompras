import { GoogleGenAI } from "@google/genai";

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const payloadStr = url.searchParams.get('payload');
  
  // Prioriza APPS_SCRIPT_URL (padrão backend) mas aceita VITE_ prefixo por compatibilidade
  const SCRIPT_URL_RAW = process.env.APPS_SCRIPT_URL || process.env.VITE_APPS_SCRIPT_URL;
  const API_KEY = process.env.API_KEY;

  const jsonResponse = (data: any, status = 200) => new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

  if (!SCRIPT_URL_RAW) {
    return jsonResponse({ 
      error: "Configuração ausente: APPS_SCRIPT_URL não definida.",
      details: "Acesse as configurações do Vercel e adicione a variável de ambiente APPS_SCRIPT_URL com a URL do seu Google Apps Script (terminando em /exec)."
    }, 500);
  }

  // Handle Smart Suggestions via Gemini
  if (action === 'getSmartSuggestions') {
    if (!API_KEY) {
      return jsonResponse({ error: "API_KEY do Gemini não configurada no Vercel." }, 500);
    }

    try {
      const payload = payloadStr ? JSON.parse(payloadStr) : { items: [], categories: [] };
      const ai = new GoogleGenAI({ apiKey: API_KEY });
      
      const currentItems = payload.items.map((i: any) => i.nome).join(", ");
      const categoryNames = payload.categories.map((c: any) => c.nome).join(", ");
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Com base na minha lista de compras atual: [${currentItems || 'vazia'}], sugira 5 itens adicionais comuns que podem estar faltando. Considere estas categorias: [${categoryNames}]. Responda apenas com os nomes dos itens separados por vírgula, sem explicações.`,
      });

      const text = response.text || "";
      const suggestions = text.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 0 && s !== 'vazia');
      
      return jsonResponse({ data: suggestions });
    } catch (e: any) {
      return jsonResponse({ error: "Erro na IA: " + e.message }, 500);
    }
  }

  // Sanitização e construção da URL de destino
  let targetUrl: URL;
  try {
    let sanitizedUrl = SCRIPT_URL_RAW.trim();
    
    // Pequena correção comum: garantir que a URL comece com https://
    if (!sanitizedUrl.startsWith('http')) {
      sanitizedUrl = 'https://' + sanitizedUrl;
    }

    targetUrl = new URL(sanitizedUrl);
    
    // Adiciona os parâmetros vindos do frontend
    if (action) targetUrl.searchParams.set('action', action);
    if (payloadStr) targetUrl.searchParams.set('payload', payloadStr);
  } catch (e) {
    return jsonResponse({ 
      error: "URL do Google Apps Script Inválida",
      details: "A URL fornecida nas variáveis de ambiente do Vercel não é válida. Verifique se ela foi copiada corretamente do Google Sheets.",
      received: SCRIPT_URL_RAW
    }, 500);
  }

  try {
    // Google Apps Script exige seguir redirecionamentos para chegar ao ContentService
    const response = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: { 
        'Accept': 'application/json',
        'User-Agent': 'Vercel-Proxy' 
      },
      redirect: 'follow'
    });
    
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    // Detecção específica de Erro 404 ou páginas HTML do Google
    if (response.status === 404 || contentType.includes('text/html')) {
      console.error("Erro 404 ou HTML retornado do Google:", text.substring(0, 200));
      
      // Verifica se a URL parece estar correta (terminando em /exec)
      const isExecUrl = targetUrl.pathname.endsWith('/exec');

      return jsonResponse({ 
        error: `O Google retornou um erro 404 para a ação '${action}'.`,
        details: isExecUrl 
          ? "A URL do Script parece correta (/exec), mas o ID do script pode estar inválido ou a implantação foi removida."
          : "A URL do Script NÃO termina em '/exec'. Verifique se você copiou a URL correta da opção 'Implantar -> App da Web'.",
        urlTentada: targetUrl.origin + targetUrl.pathname,
        status: response.status,
        tip: "Verifique se o script foi publicado como 'Qualquer pessoa' e se a URL termina em /exec."
      }, 500);
    }

    try {
      const parsed = JSON.parse(text);
      return jsonResponse(parsed);
    } catch (e) {
      console.error("Resposta não-JSON recebida do GAS:", text.substring(0, 300));
      return jsonResponse({ 
        error: "O script retornou um formato inválido (não é JSON).",
        details: "O Google Apps Script deve retornar ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON).",
        preview: text.substring(0, 100)
      }, 500);
    }
  } catch (e: any) {
    return jsonResponse({ 
      error: "Falha na conexão com o Google Apps Script: " + e.message,
      details: "O proxy no Vercel não conseguiu alcançar os servidores do Google. Verifique sua conexão e a URL configurada."
    }, 500);
  }
}