# Guia de Implantação: Lista de Compras Pro

Siga estes passos para conectar o WebApp do Vercel à sua planilha Google Sheets.

## 1. Configuração do Google Apps Script (O "Banco de Dados")

1. Acesse sua planilha: [Planilha de Dados](https://docs.google.com/spreadsheets/d/1LerjhNpG79g06zhiwzgI-FfZ3XpcUBJohDiGAHl2p0c/edit)
2. Vá em **Extensões** -> **Apps Script**.
3. Apague todo o código existente e cole o código abaixo (Versão Pro Otimizada):

```javascript
/**
 * BACKEND - LISTA DE COMPRAS PRO
 * Versão compatível com Vercel + Spreadsheet ID: 1LerjhNpG79g06zhiwzgI-FfZ3XpcUBJohDiGAHl2p0c
 */

const SPREADSHEET_ID = "1LerjhNpG79g06zhiwzgI-FfZ3XpcUBJohDiGAHl2p0c";
const SS = SpreadsheetApp.openById(SPREADSHEET_ID);

const ABAS = {
  LISTA: "Lista_Atual",
  HISTORICO: "Histórico",
  CATEGORIAS: "Categorias",
  CONFIG: "Configurações"
};

function doGet(e) {
  const action = e.parameter.action;
  const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : null;
  const userEmail = e.parameter.userEmail;

  try {
    let result;
    switch (action) {
      case 'listarCategorias': result = listarCategorias(); break;
      case 'listarItens': result = listarItens(); break;
      case 'adicionarItem': result = adicionarItem(payload); break;
      case 'editarItem': result = editarItem(payload); break;
      case 'marcarComoComprado': result = alternarStatus(payload.id); break;
      case 'removerItem': result = removerItem(payload.id); break;
      case 'finalizarCompra': result = finalizarCompra(); break;
      case 'obterHistorico': result = obterHistorico(); break;
      case 'carregarListaDoHistorico': result = carregarDoHistorico(payload.idCompra); break;
      case 'listarUsuarios': result = listarUsuarios(); break;
      default: throw new Error("Ação não reconhecida: " + action);
    }
    return responder(result);
  } catch (err) {
    return responder({ error: err.message }, 500);
  }
}

function responder(data, status = 200) {
  return ContentService.createTextOutput(JSON.stringify({ data: data, status: status }))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- LOGICA DE DADOS ---

function listarCategorias() {
  const sheet = SS.getSheetByName(ABAS.CATEGORIAS);
  const data = sheet.getDataRange().getValues();
  data.shift();
  return data.map(r => ({ id: r[0], nome: r[1], icone: r[2], cor: r[3] }));
}

function listarItens() {
  const sheet = SS.getSheetByName(ABAS.LISTA);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  data.shift();
  return data.map(r => ({
    id: r[0], nome: r[1], quantidade: r[2], categoria: r[3],
    precoEstimado: r[4], status: (r[5] || "pendente").toString().toLowerCase(), 
    dataAdicao: r[6]
  }));
}

function adicionarItem(p) {
  const sheet = SS.getSheetByName(ABAS.LISTA);
  const id = new Date().getTime();
  sheet.appendRow([id, p.nome, p.quantidade, p.categoria, p.precoEstimado, "pendente", new Date()]);
  return { id };
}

function editarItem(p) {
  const sheet = SS.getSheetByName(ABAS.LISTA);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == p.id) {
      sheet.getRange(i + 1, 2, 1, 4).setValues([[p.nome, p.quantidade, p.categoria, p.precoEstimado]]);
      return { success: true };
    }
  }
}

function alternarStatus(id) {
  const sheet = SS.getSheetByName(ABAS.LISTA);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      const novo = data[i][5] === "pendente" ? "comprado" : "pendente";
      sheet.getRange(i + 1, 6).setValue(novo);
      return { success: true };
    }
  }
}

function removerItem(id) {
  const sheet = SS.getSheetByName(ABAS.LISTA);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
}

function finalizarCompra() {
  const sLista = SS.getSheetByName(ABAS.LISTA);
  const sHist = SS.getSheetByName(ABAS.HISTORICO);
  const data = sLista.getDataRange().getValues();
  const idCompra = "C-" + new Date().getTime();
  const dataHoje = new Date();

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][5] === "comprado") {
      sHist.appendRow([idCompra, dataHoje, data[i][1], data[i][2], data[i][3], data[i][4], (data[i][2] * data[i][4])]);
      sLista.deleteRow(i + 1);
    }
  }
  return { success: true };
}

function obterHistorico() {
  const sheet = SS.getSheetByName(ABAS.HISTORICO);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { compras: [], estatisticas: { totalGasto: 0, totalCompras: 0, totalItens: 0, gastoMedio: 0 } };
  data.shift();

  const comprasMap = {};
  let totalGasto = 0;
  const cats = {};

  data.forEach(r => {
    const id = r[0];
    if (!comprasMap[id]) {
      comprasMap[id] = { id, data: Utilities.formatDate(new Date(r[1]), "GMT-3", "dd/MM/yyyy"), itens: [], total: 0 };
    }
    comprasMap[id].itens.push({ nome: r[2], quantidade: r[3], categoria: r[4] });
    comprasMap[id].total += Number(r[6] || 0);
    totalGasto += Number(r[6] || 0);
    cats[r[4]] = (cats[r[4]] || 0) + 1;
  });

  const sortedCats = Object.keys(cats).sort((a,b) => cats[b] - cats[a]);

  return {
    compras: Object.values(comprasMap).reverse(),
    estatisticas: {
      totalGasto: totalGasto,
      totalCompras: Object.keys(comprasMap).length,
      totalItens: data.length,
      gastoMedio: totalGasto / (Object.keys(comprasMap).length || 1),
      categoriaFavorita: sortedCats[0] || ""
    }
  };
}

function carregarDoHistorico(idCompra) {
  const sHist = SS.getSheetByName(ABAS.HISTORICO);
  const sLista = SS.getSheetByName(ABAS.LISTA);
  const data = sHist.getDataRange().getValues();
  data.forEach(r => {
    if (r[0] === idCompra) {
      sLista.appendRow([new Date().getTime() + Math.random(), r[2], r[3], r[4], r[5], "pendente", new Date()]);
    }
  });
  return { success: true };
}
```

4. Clique em **Implantar** -> **Nova Implantação**.
5. Tipo: **App da Web**.
6. Executar como: **Eu (seu email)**.
7. Quem tem acesso: **Qualquer pessoa**.
8. **Copie a URL gerada.**

## 2. Configuração no Vercel

No painel do Vercel, adicione estas variáveis de ambiente (Environment Variables):

| Nome | Valor |
| :--- | :--- |
| `APPS_SCRIPT_URL` | A URL que você copiou no passo anterior |
| `API_KEY` | Sua chave da API do Google Gemini (para as sugestões de IA) |
| `VITE_GOOGLE_CLIENT_ID` | Seu Client ID do Google Cloud Console (para o login) |

## 3. Estrutura da Planilha Esperada

O script criará ou lerá estas abas:
- **Lista_Atual**: ID, Nome, Qtd, Categoria, Preço, Status, Data
- **Histórico**: ID_Compra, Data, Nome, Qtd, Categoria, Preço, Total
- **Categorias**: ID, Nome, Ícone, Cor
