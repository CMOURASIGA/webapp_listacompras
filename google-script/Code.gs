/**
 * BACKEND - LISTA DE COMPRAS PRO
 * Versão final ajustada para a planilha: 1LerjhNpG79g06zhiwzgI-FfZ3XpcUBJohDiGAHl2p0c
 */

const SPREADSHEET_ID = "1LerjhNpG79g06zhiwzgI-FfZ3XpcUBJohDiGAHl2p0c";

function getSS() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

const ABAS = {
  LISTA: "Lista_Atual",
  HISTORICO: "Histórico",
  CATEGORIAS: "Categorias",
  CONFIG: "Configurações"
};

/**
 * Roteador principal para chamadas do Vercel
 */
function doGet(e) {
  const action = e.parameter.action;
  const payload = e.parameter.payload ? JSON.parse(e.parameter.payload) : {};
  const userEmail = e.parameter.userEmail;

  try {
    let result;
    switch (action) {
      case 'listarCategorias': result = listarCategorias(); break;
      case 'listarItens': result = listarItens(); break;
      case 'adicionarItem': 
        // Suporta tanto payload direto quanto parâmetros soltos
        result = adicionarItem(payload.nome || payload.nome, payload.quantidade, payload.categoria, payload.precoEstimado); 
        break;
      case 'editarItem': 
        result = editarItem(payload.id, payload.nome, payload.quantidade, payload.categoria, payload.precoEstimado); 
        break;
      case 'marcarComoComprado': result = marcarComoComprado(payload.id); break;
      case 'removerItem': result = removerItem(payload.id); break;
      case 'finalizarCompra': result = finalizarCompra(); break;
      case 'obterHistorico': result = obterHistorico(); break;
      case 'carregarListaDoHistorico': result = carregarListaDoHistorico(payload.idCompra); break;
      case 'getUserEmail': result = Session.getActiveUser().getEmail(); break;
      default: throw new Error("Ação não reconhecida: " + action);
    }
    return responder({ data: result });
  } catch (err) {
    return responder({ error: err.message, stack: err.stack }, 500);
  }
}

function responder(obj, status = 200) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- FUNÇÕES DE DADOS (BASEADAS NO SEU CÓDIGO OPERACIONAL) ---

function listarCategorias() {
  const sheet = getSS().getSheetByName(ABAS.CATEGORIAS);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(r => ({ id: r[0], nome: r[1], icone: r[2], cor: r[3] }));
}

function listarItens() {
  const sheet = getSS().getSheetByName(ABAS.LISTA);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  return data.slice(1).map(r => ({
    id: r[0],
    nome: r[1],
    quantidade: r[2],
    categoria: r[3],
    precoEstimado: Number(r[4] || 0),
    status: (r[5] || "pendente").toString().toLowerCase().trim(),
    dataAdicao: r[6]
  }));
}

function adicionarItem(nome, quantidade, categoria, precoEstimado) {
  const sheet = getSS().getSheetByName(ABAS.LISTA);
  const id = new Date().getTime();
  sheet.appendRow([id, nome, quantidade, categoria, precoEstimado || 0, "pendente", new Date()]);
  return { sucesso: true, id: id };
}

function editarItem(id, nome, quantidade, categoria, precoEstimado) {
  const sheet = getSS().getSheetByName(ABAS.LISTA);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      if (nome) sheet.getRange(i + 1, 2).setValue(nome);
      if (quantidade) sheet.getRange(i + 1, 3).setValue(quantidade);
      if (categoria) sheet.getRange(i + 1, 4).setValue(categoria);
      if (precoEstimado !== undefined) sheet.getRange(i + 1, 5).setValue(precoEstimado);
      return { sucesso: true };
    }
  }
  return { sucesso: false, error: "Item não encontrado" };
}

function marcarComoComprado(id) {
  const sheet = getSS().getSheetByName(ABAS.LISTA);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      const atual = (data[i][5] || "").toString().toLowerCase().trim();
      const novo = atual === "pendente" ? "comprado" : "pendente";
      sheet.getRange(i + 1, 6).setValue(novo);
      return { sucesso: true, novoStatus: novo };
    }
  }
}

function removerItem(id) {
  const sheet = getSS().getSheetByName(ABAS.LISTA);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return { sucesso: true };
    }
  }
}

function finalizarCompra() {
  const ss = getSS();
  const sLista = ss.getSheetByName(ABAS.LISTA);
  const sHist = ss.getSheetByName(ABAS.HISTORICO);
  const data = sLista.getDataRange().getValues();
  const idCompra = "C-" + new Date().getTime();
  const dataHoje = new Date();

  let count = 0;
  // Percorre de trás para frente para deletar sem errar o índice
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][5] === "comprado") {
      const qtd = Number(data[i][2]) || 0;
      const preco = Number(data[i][4]) || 0;
      sHist.appendRow([idCompra, dataHoje, data[i][1], qtd, data[i][3], preco, (qtd * preco)]);
      sLista.deleteRow(i + 1);
      count++;
    }
  }
  return { sucesso: true, itensFinalizados: count };
}

function obterHistorico() {
  const sheet = getSS().getSheetByName(ABAS.HISTORICO);
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { compras: [], estatisticas: { totalGasto: 0, totalCompras: 0 } };
  
  data.shift();
  const comprasMap = {};
  let totalGasto = 0;
  const cats = {};

  data.forEach(r => {
    const id = r[0];
    if (!comprasMap[id]) {
      comprasMap[id] = { 
        id: id, 
        data: Utilities.formatDate(new Date(r[1]), "GMT-3", "dd/MM/yyyy HH:mm"), 
        itens: [], 
        total: 0 
      };
    }
    const subtotal = Number(r[6]) || 0;
    comprasMap[id].itens.push({ nome: r[2], quantidade: r[3], categoria: r[4], total: subtotal });
    comprasMap[id].total += subtotal;
    totalGasto += subtotal;
    cats[r[4]] = (cats[r[4]] || 0) + 1;
  });

  const sortedCats = Object.keys(cats).sort((a,b) => cats[b] - cats[a]);

  return {
    compras: Object.values(comprasMap).reverse(),
    estatisticas: {
      totalGasto: totalGasto.toFixed(2),
      totalCompras: Object.keys(comprasMap).length,
      totalItens: data.length,
      gastoMedio: (totalGasto / (Object.keys(comprasMap).length || 1)).toFixed(2),
      categoriaFavorita: sortedCats[0] || ""
    }
  };
}

function carregarListaDoHistorico(idCompra) {
  const ss = getSS();
  const sHist = ss.getSheetByName(ABAS.HISTORICO);
  const sLista = ss.getSheetByName(ABAS.LISTA);
  const data = sHist.getDataRange().getValues();
  
  let count = 0;
  data.forEach(r => {
    if (r[0] == idCompra) {
      sLista.appendRow([new Date().getTime() + Math.random(), r[2], r[3], r[4], r[5], "pendente", new Date()]);
      count++;
    }
  });
  return { sucesso: true, itensCarregados: count };
}
