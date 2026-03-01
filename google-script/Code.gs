/**
 * BACKEND - LISTA DE COMPRAS PRO
 * Fase 1 - Bootstrap por usuário (Drive + UserProperties + marker)
 */

const APP_ID = "shopping-pro-webapp";
const SCHEMA_VERSION = "1";
const APP_FOLDER_NAME = "Shopping Pro";
const USER_SPREADSHEET_KEY_PREFIX = "SHOPPING_PRO_SPREADSHEET_ID";

const REQUEST_CONTEXT = {
  userEmailHint: "",
  resolvedEmail: "",
  bootstrapResult: null
};

const ABAS = {
  LISTA: "Lista_Atual",
  HISTORICO: "Histórico",
  CATEGORIAS: "Categorias",
  CONFIG: "Configurações"
};

const HEADERS = {
  LISTA: ["id", "nome", "quantidade", "categoria", "precoestimado", "status", "dataadicao"],
  HISTORICO: ["idcompra", "data", "nome", "quantidade", "categoria", "preco", "total"],
  CATEGORIAS: ["id", "nome", "icone", "cor"]
};

/**
 * Roteador principal para chamadas do Vercel
 */
function doGet(e) {
  const params = (e && e.parameter) ? e.parameter : {};
  const action = (params.action || "").toString().trim();
  const payload = parsePayloadSafe(params.payload);
  resetRequestContext(payload.userEmail || params.userEmail);

  try {
    let result;

    switch (action) {
      case "bootstrap":
        result = handleBootstrap(payload.userEmail || params.userEmail);
        break;
      case "listarCategorias":
        result = listarCategorias();
        break;
      case "adicionarCategoria":
        result = adicionarCategoria(
          payload.nome || params.nome,
          payload.icone || params.icone,
          payload.cor || params.cor
        );
        break;
      case "listarItens":
        result = listarItens();
        break;
      case "adicionarItem":
        result = adicionarItem(
          payload.nome || params.nome,
          payload.quantidade || params.quantidade,
          payload.categoria || params.categoria,
          payload.precoEstimado || params.precoEstimado
        );
        break;
      case "editarItem":
        result = editarItem(
          payload.id || params.id,
          payload.nome,
          payload.quantidade,
          payload.categoria,
          payload.precoEstimado
        );
        break;
      case "marcarComoComprado":
        result = marcarComoComprado(payload.id || params.id);
        break;
      case "removerItem":
        result = removerItem(payload.id || params.id);
        break;
      case "finalizarCompra":
        result = finalizarCompra();
        break;
      case "obterHistorico":
        result = obterHistorico();
        break;
      case "carregarListaDoHistorico":
        result = carregarListaDoHistorico(payload.idCompra || params.idCompra);
        break;
      case "getUserEmail":
        result = getCurrentUserEmail(payload.userEmail || params.userEmail);
        break;
      case "ping":
        const bootstrapData = ensureSpreadsheetForUser(payload.userEmail || params.userEmail);
        result = {
          ok: true,
          timestamp: new Date().toISOString(),
          email: bootstrapData.email,
          spreadsheetId: bootstrapData.spreadsheetId,
          spreadsheetUrl: bootstrapData.spreadsheetUrl
        };
        break;
      case "verificarEstrutura":
        result = verificarEstrutura();
        break;
      case "":
        result = {
          ok: true,
          message: "API Lista de Compras ativa.",
          actions: [
            "bootstrap",
            "listarCategorias",
            "adicionarCategoria",
            "listarItens",
            "adicionarItem",
            "editarItem",
            "marcarComoComprado",
            "removerItem",
            "finalizarCompra",
            "obterHistorico",
            "carregarListaDoHistorico",
            "ping",
            "verificarEstrutura"
          ]
        };
        break;
      default:
        throw new Error("Ação não reconhecida: " + action);
    }

    return responder({ data: result });
  } catch (err) {
    return responder({
      error: err && err.message ? err.message : "Erro desconhecido",
      stack: err && err.stack ? err.stack : ""
    });
  }
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function resetRequestContext(userEmailHint) {
  REQUEST_CONTEXT.userEmailHint = (userEmailHint || "").toString().trim();
  REQUEST_CONTEXT.resolvedEmail = "";
  REQUEST_CONTEXT.bootstrapResult = null;
}

function getSS() {
  return getSpreadsheetForUser(REQUEST_CONTEXT.userEmailHint);
}

function getSpreadsheetForUser(userEmailHint) {
  return ensureSpreadsheetForUser(userEmailHint).ss;
}

function handleBootstrap(userEmail) {
  const data = ensureSpreadsheetForUser(userEmail);
  return {
    ok: true,
    email: data.email,
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl,
    created: data.created
  };
}

function ensureSpreadsheetForUser(userEmailHint) {
  if (REQUEST_CONTEXT.bootstrapResult && REQUEST_CONTEXT.bootstrapResult.ss) {
    return REQUEST_CONTEXT.bootstrapResult;
  }

  const email = getCurrentUserEmail(userEmailHint);
  let created = false;
  let ss = null;

  const savedId = loadSpreadsheetIdFromUserProps(email);
  if (savedId) {
    ss = openSpreadsheetIfValid(savedId, email);
    if (!ss) {
      clearSpreadsheetIdFromUserProps(email);
    }
  }

  const folder = getOrCreateAppFolder();

  if (!ss) {
    ss = findExistingSpreadsheetInFolder(folder.getId(), email);
  }

  if (!ss) {
    ss = createSpreadsheetFromScratchOrTemplate(email, folder);
    created = true;
  }

  writeAppMarker(ss, email);
  saveSpreadsheetIdToUserProps(email, ss.getId());

  const result = {
    ok: true,
    email: email,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    created: created,
    ss: ss
  };

  REQUEST_CONTEXT.resolvedEmail = email;
  REQUEST_CONTEXT.bootstrapResult = result;
  return result;
}

function getCurrentUserEmail(userEmailHint) {
  if (REQUEST_CONTEXT.resolvedEmail) {
    return REQUEST_CONTEXT.resolvedEmail;
  }

  // Prioriza o e-mail vindo do app (usuário autenticado no frontend).
  // Isso evita cair no "effective user" da implantação e gravar em planilha de outra conta.
  const hintedEmail = normalizeEmail(userEmailHint || REQUEST_CONTEXT.userEmailHint);
  if (hintedEmail) {
    REQUEST_CONTEXT.resolvedEmail = hintedEmail;
    return hintedEmail;
  }

  let email = "";

  try {
    email = Session.getActiveUser().getEmail() || "";
  } catch (err) {}

  if (!email) {
    try {
      email = Session.getEffectiveUser().getEmail() || "";
    } catch (err) {}
  }

  email = normalizeEmail(email);

  if (!email) {
    throw new Error("Não foi possível identificar o usuário logado. Faça login com conta Google e tente novamente.");
  }

  REQUEST_CONTEXT.resolvedEmail = email;
  return email;
}

function normalizeEmail(value) {
  return (value || "").toString().trim().toLowerCase();
}

function getOrCreateAppFolder() {
  const folders = DriveApp.getFoldersByName(APP_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(APP_FOLDER_NAME);
}

function findExistingSpreadsheetInFolder(folderId, ownerEmail) {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  const email = normalizeEmail(ownerEmail);
  let legacyCandidate = null;

  while (files.hasNext()) {
    const file = files.next();
    try {
      const ss = SpreadsheetApp.openById(file.getId());
      if (hasValidAppMarkerForUser(ss, email)) {
        return ss;
      }
      if (!legacyCandidate && isLikelyAppSpreadsheetForUser(ss, email)) {
        legacyCandidate = ss;
      }
    } catch (err) {
      // ignora arquivos sem permissão ou inválidos
    }
  }

  if (legacyCandidate) {
    writeAppMarker(legacyCandidate, email || getCurrentUserEmail());
    return legacyCandidate;
  }

  return null;
}

function createSpreadsheetFromScratchOrTemplate(userEmail, folder) {
  const email = normalizeEmail(userEmail) || "usuario";
  const shortEmail = email.split("@")[0] || "usuario";
  const ss = SpreadsheetApp.create("Shopping Pro - " + shortEmail);
  const targetFolder = folder || getOrCreateAppFolder();
  const file = DriveApp.getFileById(ss.getId());

  targetFolder.addFile(file);
  try {
    DriveApp.getRootFolder().removeFile(file);
  } catch (err) {}

  setupSpreadsheetStructure(ss);
  writeAppMarker(ss, email);
  return ss;
}

function setupSpreadsheetStructure(ss) {
  const sLista = getOrCreateSheet(ss, ABAS.LISTA);
  const sHistorico = getOrCreateSheet(ss, ABAS.HISTORICO);
  const sCategorias = getOrCreateSheet(ss, ABAS.CATEGORIAS);
  const sConfig = getOrCreateSheet(ss, ABAS.CONFIG);

  configureSheetHeader(sLista, ["ID", "Nome", "Quantidade", "Categoria", "Preço Estimado", "Status", "Data Adição"]);
  configureSheetHeader(sHistorico, ["ID Compra", "Data", "Nome", "Quantidade", "Categoria", "Preço", "Total"]);
  configureSheetHeader(sCategorias, ["ID", "Nome", "Ícone", "Cor"]);
  configureSheetHeader(sConfig, ["key", "value"]);

  insertDefaultCategoriesIfEmpty(sCategorias);
}

function getOrCreateSheet(ss, sheetName) {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }
  return sheet;
}

function configureSheetHeader(sheet, headers) {
  const headerValues = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  const hasHeader = headerValues.some(function(v) { return normalizeText(v) !== ""; });

  if (!hasHeader) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
  }
  sheet.setFrozenRows(1);
}

function insertDefaultCategoriesIfEmpty(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) return;

  const defaults = [
    [1, "Grãos e Cereais", "🌾", "#FFB74D"],
    [2, "Carnes e Peixes", "🥩", "#EF5350"],
    [3, "Laticínios", "🥛", "#42A5F5"],
    [4, "Frutas", "🍎", "#66BB6A"],
    [5, "Verduras e Legumes", "🥬", "#26A69A"],
    [6, "Bebidas", "🥤", "#AB47BC"],
    [7, "Limpeza", "🧹", "#FFA726"],
    [8, "Higiene", "🧴", "#EC407A"]
  ];

  sheet.getRange(2, 1, defaults.length, 4).setValues(defaults);
}

function writeAppMarker(ss, ownerEmail) {
  const sheet = getOrCreateSheet(ss, ABAS.CONFIG);
  configureSheetHeader(sheet, ["key", "value"]);

  upsertConfigValue(sheet, "appId", APP_ID);
  upsertConfigValue(sheet, "schemaVersion", SCHEMA_VERSION);
  upsertConfigValue(sheet, "spreadsheetId", ss.getId());
  upsertConfigValue(sheet, "spreadsheetUrl", ss.getUrl());
  upsertConfigValue(sheet, "ownerEmail", normalizeEmail(ownerEmail || getCurrentUserEmail()));
  upsertConfigValue(sheet, "updatedAt", new Date().toISOString());
}

function upsertConfigValue(sheet, key, value) {
  const safeKey = (key || "").toString().trim();
  const safeValue = value == null ? "" : String(value);
  const lastRow = Math.max(sheet.getLastRow(), 1);
  const values = sheet.getRange(1, 1, lastRow, 2).getValues();

  for (let i = 1; i < values.length; i++) {
    if (normalizeText(values[i][0]) === normalizeText(safeKey)) {
      sheet.getRange(i + 1, 2).setValue(safeValue);
      return;
    }
  }

  sheet.appendRow([safeKey, safeValue]);
}

function readAppMarker(ss) {
  const sheet = ss.getSheetByName(ABAS.CONFIG);
  if (!sheet || sheet.getLastRow() < 2) return {};

  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const marker = {};

  values.forEach(function(r) {
    const key = normalizeText(r[0]);
    if (key) marker[key] = r[1];
  });

  return marker;
}

function hasValidAppMarker(ss) {
  const marker = readAppMarker(ss);
  return normalizeText(marker.appid) === normalizeText(APP_ID);
}

function hasValidAppMarkerForUser(ss, ownerEmail) {
  const marker = readAppMarker(ss);
  return normalizeText(marker.appid) === normalizeText(APP_ID) &&
    normalizeText(marker.owneremail) === normalizeText(ownerEmail);
}

function isLikelyAppSpreadsheet(ss) {
  const requiredSheets = [ABAS.LISTA, ABAS.HISTORICO, ABAS.CATEGORIAS];
  return requiredSheets.every(function(name) {
    return !!ss.getSheetByName(name);
  });
}

function isLikelyAppSpreadsheetForUser(ss, ownerEmail) {
  if (!isLikelyAppSpreadsheet(ss)) return false;

  // Sem marker: tenta inferir pelo nome da planilha (legado)
  const email = normalizeEmail(ownerEmail);
  if (!email) return false;
  const shortEmail = email.split("@")[0] || email;
  const ssName = normalizeText(ss.getName());
  return ssName.indexOf(normalizeText(shortEmail)) !== -1;
}

function openSpreadsheetIfValid(spreadsheetId, ownerEmail) {
  if (!spreadsheetId) return null;
  try {
    const ss = SpreadsheetApp.openById(spreadsheetId);
    if (hasValidAppMarkerForUser(ss, ownerEmail)) {
      return ss;
    }
    if (isLikelyAppSpreadsheetForUser(ss, ownerEmail)) {
      writeAppMarker(ss, ownerEmail || getCurrentUserEmail());
      return ss;
    }
  } catch (err) {}
  return null;
}

function saveSpreadsheetIdToUserProps(email, id) {
  if (!email || !id) return;
  const key = getUserSpreadsheetPropKey(email);
  PropertiesService.getScriptProperties().setProperty(key, String(id));
}

function loadSpreadsheetIdFromUserProps(email) {
  if (!email) return "";
  const key = getUserSpreadsheetPropKey(email);
  return PropertiesService.getScriptProperties().getProperty(key) || "";
}

function clearSpreadsheetIdFromUserProps(email) {
  if (!email) return;
  const key = getUserSpreadsheetPropKey(email);
  PropertiesService.getScriptProperties().deleteProperty(key);
}

function getUserSpreadsheetPropKey(email) {
  return USER_SPREADSHEET_KEY_PREFIX + "_" + sanitizeEmailKey(email);
}

function sanitizeEmailKey(email) {
  return normalizeEmail(email).replace(/[^a-z0-9@._-]/g, "_");
}

function parsePayloadSafe(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new Error("Payload inválido. Verifique o JSON enviado.");
  }
}

function getSheetOrThrow(sheetName) {
  const sheet = getSS().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("A aba '" + sheetName + "' não foi encontrada na planilha.");
  }
  return sheet;
}

function normalizeText(value) {
  return (value == null ? "" : String(value))
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function detectHeaderRow(firstRow, expectedHeaders) {
  if (!firstRow || !firstRow.length || !expectedHeaders || !expectedHeaders.length) {
    return false;
  }

  const normalized = firstRow.map(normalizeText);
  let hits = 0;

  expectedHeaders.forEach(function(header) {
    if (normalized.indexOf(header) !== -1) {
      hits++;
    }
  });

  return hits >= Math.max(2, Math.ceil(expectedHeaders.length * 0.4));
}

function readSheetRows(sheetName, expectedHeaders) {
  const sheet = getSheetOrThrow(sheetName);
  const range = sheet.getDataRange();

  if (!range || range.getNumRows() === 0 || range.getNumColumns() === 0) {
    return { sheet: sheet, values: [], rows: [], headerOffset: 0 };
  }

  const values = range.getValues();
  const headerOffset = detectHeaderRow(values[0], expectedHeaders) ? 1 : 0;
  const rows = values
    .slice(headerOffset)
    .filter(function(row) {
      return row.some(function(cell) {
        return normalizeText(cell) !== "";
      });
    });

  return {
    sheet: sheet,
    values: values,
    rows: rows,
    headerOffset: headerOffset
  };
}

function parseNumber(value) {
  if (typeof value === "number") {
    return isNaN(value) ? 0 : value;
  }

  if (value == null) return 0;

  let str = String(value).trim();
  if (!str) return 0;

  // Suporta formatos: "12", "12,50", "1.234,56", "1,234.56"
  const hasComma = str.indexOf(",") !== -1;
  const hasDot = str.indexOf(".") !== -1;

  if (hasComma && hasDot) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(/,/g, ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    str = str.replace(/,/g, ".");
  }

  str = str.replace(/[^0-9.-]/g, "");
  const num = Number(str);
  return isNaN(num) ? 0 : num;
}

function normalizeStatus(status) {
  return normalizeText(status) === "comprado" ? "comprado" : "pendente";
}

function sameId(a, b) {
  if (a == null || b == null) return false;
  const sa = String(a).trim();
  const sb = String(b).trim();
  if (!sa || !sb) return false;
  return sa === sb;
}

function findRowIndexById(values, headerOffset, id) {
  for (let i = headerOffset; i < values.length; i++) {
    if (sameId(values[i][0], id)) {
      return i;
    }
  }
  return -1;
}

// --- FUNÇÕES DE DADOS ---

function listarCategorias() {
  const ctx = readSheetRows(ABAS.CATEGORIAS, HEADERS.CATEGORIAS);

  return ctx.rows
    .map(function(r, idx) {
      return {
        id: r[0] || (idx + 1),
        nome: (r[1] || "").toString().trim(),
        icone: (r[2] || "📦").toString(),
        cor: (r[3] || "#9E9E9E").toString()
      };
    })
    .filter(function(cat) {
      return !!cat.nome;
    });
}

function adicionarCategoria(nome, icone, cor) {
  const nomeClean = (nome || "").toString().trim();
  const iconeClean = (icone || "📦").toString().trim();
  const corClean = (cor || "#9E9E9E").toString().trim();

  if (!nomeClean) {
    throw new Error("Nome da categoria é obrigatório.");
  }

  const ctx = readSheetRows(ABAS.CATEGORIAS, HEADERS.CATEGORIAS);
  const jaExiste = ctx.rows.some(function(r) {
    return normalizeText(r[1]) === normalizeText(nomeClean);
  });

  if (jaExiste) {
    throw new Error("Já existe uma categoria com este nome.");
  }

  const nextId = getNextCategoryId(ctx.rows);
  ctx.sheet.appendRow([nextId, nomeClean, iconeClean, corClean]);

  return { id: nextId, nome: nomeClean, icone: iconeClean, cor: corClean };
}

function listarItens() {
  const ctx = readSheetRows(ABAS.LISTA, HEADERS.LISTA);

  return ctx.rows
    .map(function(r, idx) {
      const quantidade = parseNumber(r[2]);
      return {
        id: r[0] || (new Date().getTime() + idx),
        nome: (r[1] || "").toString().trim(),
        quantidade: quantidade > 0 ? quantidade : 1,
        categoria: (r[3] || "").toString().trim(),
        precoEstimado: parseNumber(r[4]),
        status: normalizeStatus(r[5]),
        dataAdicao: r[6] || ""
      };
    })
    .filter(function(item) {
      return !!item.nome;
    });
}

function adicionarItem(nome, quantidade, categoria, precoEstimado) {
  const nomeClean = (nome || "").toString().trim();
  const categoriaClean = (categoria || "").toString().trim();

  if (!nomeClean || !categoriaClean) {
    throw new Error("Nome e categoria são obrigatórios para adicionar item.");
  }

  const sheet = getSheetOrThrow(ABAS.LISTA);
  const id = new Date().getTime();
  const qtd = parseNumber(quantidade) || 1;
  const preco = parseNumber(precoEstimado);

  sheet.appendRow([id, nomeClean, qtd, categoriaClean, preco, "pendente", new Date()]);

  return { sucesso: true, id: id };
}

function editarItem(id, nome, quantidade, categoria, precoEstimado) {
  if (!id) {
    throw new Error("ID do item é obrigatório");
  }

  const ctx = readSheetRows(ABAS.LISTA, HEADERS.LISTA);
  const idx = findRowIndexById(ctx.values, ctx.headerOffset, id);

  if (idx === -1) {
    throw new Error("Item não encontrado");
  }

  const rowNumber = idx + 1;

  if (nome !== undefined && nome !== null && String(nome).trim() !== "") {
    ctx.sheet.getRange(rowNumber, 2).setValue(String(nome).trim());
  }

  if (quantidade !== undefined && quantidade !== null && String(quantidade).trim() !== "") {
    ctx.sheet.getRange(rowNumber, 3).setValue(parseNumber(quantidade) || 1);
  }

  if (categoria !== undefined && categoria !== null && String(categoria).trim() !== "") {
    ctx.sheet.getRange(rowNumber, 4).setValue(String(categoria).trim());
  }

  if (precoEstimado !== undefined && precoEstimado !== null && String(precoEstimado).trim() !== "") {
    ctx.sheet.getRange(rowNumber, 5).setValue(parseNumber(precoEstimado));
  }

  return { sucesso: true };
}

function marcarComoComprado(id) {
  if (!id) {
    throw new Error("ID do item é obrigatório");
  }

  const ctx = readSheetRows(ABAS.LISTA, HEADERS.LISTA);
  const idx = findRowIndexById(ctx.values, ctx.headerOffset, id);

  if (idx === -1) {
    throw new Error("Item não encontrado");
  }

  const rowNumber = idx + 1;
  const atual = normalizeStatus(ctx.values[idx][5]);
  const novo = atual === "pendente" ? "comprado" : "pendente";

  ctx.sheet.getRange(rowNumber, 6).setValue(novo);

  return { sucesso: true, novoStatus: novo };
}

function removerItem(id) {
  if (!id) {
    throw new Error("ID do item é obrigatório");
  }

  const ctx = readSheetRows(ABAS.LISTA, HEADERS.LISTA);
  const idx = findRowIndexById(ctx.values, ctx.headerOffset, id);

  if (idx === -1) {
    throw new Error("Item não encontrado");
  }

  ctx.sheet.deleteRow(idx + 1);
  return { sucesso: true };
}

function finalizarCompra() {
  const listaCtx = readSheetRows(ABAS.LISTA, HEADERS.LISTA);
  const sLista = listaCtx.sheet;
  const sHist = getSheetOrThrow(ABAS.HISTORICO);

  const data = listaCtx.values;
  const idCompra = "C-" + new Date().getTime();
  const dataHoje = new Date();

  let count = 0;

  // Percorre de trás para frente para deletar sem errar o índice
  for (let i = data.length - 1; i >= listaCtx.headerOffset; i--) {
    if (normalizeStatus(data[i][5]) === "comprado") {
      const qtd = parseNumber(data[i][2]);
      const preco = parseNumber(data[i][4]);
      sHist.appendRow([idCompra, dataHoje, data[i][1], qtd, data[i][3], preco, (qtd * preco)]);
      sLista.deleteRow(i + 1);
      count++;
    }
  }

  return { sucesso: true, itensFinalizados: count, idCompra: idCompra };
}

function obterHistorico() {
  const ctx = readSheetRows(ABAS.HISTORICO, HEADERS.HISTORICO);
  const data = ctx.rows;

  if (!data.length) {
    return {
      compras: [],
      estatisticas: {
        totalGasto: "0.00",
        totalCompras: 0,
        totalItens: 0,
        gastoMedio: "0.00",
        categoriaFavorita: ""
      }
    };
  }

  const comprasMap = {};
  let totalGasto = 0;
  const cats = {};

  data.forEach(function(r, idx) {
    const id = r[0] || ("SEM-ID-" + idx);

    if (!comprasMap[id]) {
      const dateRaw = r[1];
      const parsedDate = (dateRaw instanceof Date) ? dateRaw : new Date(dateRaw);
      const dateIsValid = parsedDate instanceof Date && !isNaN(parsedDate.getTime());

      comprasMap[id] = {
        id: id,
        data: dateIsValid
          ? Utilities.formatDate(parsedDate, Session.getScriptTimeZone() || "GMT-3", "dd/MM/yyyy HH:mm")
          : String(dateRaw || ""),
        itens: [],
        total: 0
      };
    }

    const qtd = parseNumber(r[3]);
    const preco = parseNumber(r[5]);
    let subtotal = parseNumber(r[6]);

    if (!subtotal && (qtd || preco)) {
      subtotal = qtd * preco;
    }

    const categoria = (r[4] || "").toString();

    comprasMap[id].itens.push({
      nome: r[2],
      quantidade: qtd,
      categoria: categoria,
      preco: preco,
      total: subtotal
    });

    comprasMap[id].total += subtotal;
    totalGasto += subtotal;

    if (categoria) {
      cats[categoria] = (cats[categoria] || 0) + 1;
    }
  });

  const sortedCats = Object.keys(cats).sort(function(a, b) {
    return cats[b] - cats[a];
  });

  const totalCompras = Object.keys(comprasMap).length;

  return {
    compras: Object.values(comprasMap).reverse(),
    estatisticas: {
      totalGasto: totalGasto.toFixed(2),
      totalCompras: totalCompras,
      totalItens: data.length,
      gastoMedio: (totalGasto / (totalCompras || 1)).toFixed(2),
      categoriaFavorita: sortedCats[0] || ""
    }
  };
}

function carregarListaDoHistorico(idCompra) {
  if (!idCompra) {
    throw new Error("ID da compra é obrigatório");
  }

  const histCtx = readSheetRows(ABAS.HISTORICO, HEADERS.HISTORICO);
  const sLista = getSheetOrThrow(ABAS.LISTA);

  let count = 0;

  histCtx.rows.forEach(function(r) {
    if (sameId(r[0], idCompra)) {
      const generatedId = new Date().getTime() + "-" + count;
      sLista.appendRow([
        generatedId,
        (r[2] || "").toString(),
        parseNumber(r[3]) || 1,
        (r[4] || "").toString(),
        parseNumber(r[5]),
        "pendente",
        new Date()
      ]);
      count++;
    }
  });

  return { sucesso: true, itensCarregados: count };
}

function verificarEstrutura() {
  const bootstrapData = ensureSpreadsheetForUser(REQUEST_CONTEXT.userEmailHint);
  const ss = bootstrapData.ss;

  const abasInfo = {
    lista: buildSheetInfo(ABAS.LISTA, HEADERS.LISTA),
    historico: buildSheetInfo(ABAS.HISTORICO, HEADERS.HISTORICO),
    categorias: buildSheetInfo(ABAS.CATEGORIAS, HEADERS.CATEGORIAS),
    configuracoes: buildSheetInfo(ABAS.CONFIG, [])
  };

  const itens = listarItens();
  const categorias = listarCategorias();
  const historico = obterHistorico();

  return {
    email: bootstrapData.email,
    spreadsheetId: ss.getId(),
    spreadsheetUrl: ss.getUrl(),
    spreadsheetNome: ss.getName(),
    abas: abasInfo,
    contagens: {
      itens: itens.length,
      categorias: categorias.length,
      comprasHistorico: historico.compras.length
    },
    exemploItem: itens.length ? itens[0] : null
  };
}

function buildSheetInfo(sheetName, expectedHeaders) {
  const sheet = getSS().getSheetByName(sheetName);

  if (!sheet) {
    return {
      existe: false,
      aba: sheetName,
      linhas: 0,
      colunas: 0,
      cabecalhoDetectado: false,
      primeiraLinha: []
    };
  }

  const range = sheet.getDataRange();
  const values = (range && range.getNumRows() > 0 && range.getNumColumns() > 0)
    ? range.getValues()
    : [];

  const firstRow = values.length ? values[0] : [];

  return {
    existe: true,
    aba: sheetName,
    linhas: sheet.getLastRow(),
    colunas: sheet.getLastColumn(),
    cabecalhoDetectado: detectHeaderRow(firstRow, expectedHeaders),
    primeiraLinha: firstRow
  };
}

function getNextCategoryId(rows) {
  let maxId = 0;
  rows.forEach(function(r) {
    const candidate = parseNumber(r[0]);
    if (candidate > maxId) {
      maxId = candidate;
    }
  });
  return maxId + 1;
}

