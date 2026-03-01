export type HighlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
  label?: string;
};

const highlightMap: Record<string, HighlightRect> = {
  'quick-add': { top: 12, left: 6, width: 70, height: 24, label: 'Adicionar item' },
  quantity: { top: 42, left: 6, width: 22, height: 22, label: 'Quantidade' },
  category: { top: 42, left: 30, width: 28, height: 22, label: 'Categoria' },
  'add-button': { top: 70, left: 6, width: 36, height: 22, label: 'Adicionar' },
  checkbox: { top: 28, left: 6, width: 12, height: 30, label: 'Checkbox' },
  subtotal: { top: 10, left: 56, width: 38, height: 30, label: 'Subtotal' },
  finalize: { top: 72, left: 48, width: 46, height: 20, label: 'Finalizar' },
  'history-list': { top: 12, left: 6, width: 88, height: 44, label: 'Compras' },
  reload: { top: 70, left: 56, width: 38, height: 20, label: 'Recarregar' },
  'total-value': { top: 16, left: 66, width: 26, height: 20, label: 'Valor total' },
  settings: { top: 8, left: 74, width: 22, height: 16, label: 'Configurações' },
  provider: { top: 34, left: 12, width: 34, height: 22, label: 'Provider IA' },
  'api-key': { top: 34, left: 50, width: 42, height: 22, label: 'API key' },
  save: { top: 70, left: 58, width: 30, height: 20, label: 'Salvar' },
  'ask-ai': { top: 10, left: 58, width: 30, height: 20, label: 'Pedir IA' },
  cart: { top: 8, left: 38, width: 24, height: 14, label: 'Carrinho' },
  history: { top: 8, left: 64, width: 28, height: 14, label: 'Histórico' }
};

const aliasMap: Record<string, string> = {
  'quick-add': 'quick-add',
  'campo-adicionar-item': 'quick-add',
  'criar-item': 'quick-add',
  'item-checkbox': 'checkbox',
  'item-check': 'checkbox',
  'quantidade': 'quantity',
  'categoria': 'category',
  'adicionar': 'add-button',
  'botao-adicionar': 'add-button',
  'checkbox': 'checkbox',
  'subtotal': 'subtotal',
  'finalizar-e-salvar': 'finalize',
  'finalizar': 'finalize',
  'compras-anteriores': 'history-list',
  'botao-recarregar': 'reload',
  'valor-total': 'total-value',
  'configuracoes': 'settings',
  'provider-ia': 'provider',
  'api-key': 'api-key',
  'salvar': 'save',
  'pedir-ia': 'ask-ai',
  'carrinho': 'cart',
  'historico': 'history'
};

const normalizeTarget = (target: string) =>
  (target || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const resolveHighlight = (target: string): HighlightRect | null => {
  const normalized = normalizeTarget(target);
  if (!normalized) return null;
  const canonical = aliasMap[normalized] || normalized;
  return highlightMap[canonical] || null;
};

export const hasHighlightTarget = (target: string) => !!resolveHighlight(target);
