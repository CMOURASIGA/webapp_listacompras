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
  history: { top: 8, left: 64, width: 28, height: 14, label: 'Histórico' },
  'swipe-right-cart': { top: 48, left: 6, width: 42, height: 18, label: 'Swipe direita' },
  'swipe-left-delete': { top: 48, left: 52, width: 42, height: 18, label: 'Swipe esquerda' },
  'delete-confirm-modal': { top: 22, left: 18, width: 64, height: 44, label: 'Confirmação' },
  'sum-quantity': { top: 62, left: 24, width: 52, height: 14, label: 'Somar quantidade' },
  'favorite-star': { top: 50, left: 78, width: 14, height: 14, label: 'Favoritar' },
  'favorites-filter': { top: 24, left: 58, width: 34, height: 14, label: 'Filtro favoritos' },
  'market-mode': { top: 14, left: 56, width: 36, height: 12, label: 'Modo mercado' },
  'checklist-item': { top: 46, left: 8, width: 84, height: 18, label: 'Checklist rápido' },
  'share-button': { top: 24, left: 50, width: 40, height: 14, label: 'Compartilhar lista' },
  'share-text': { top: 46, left: 8, width: 84, height: 30, label: 'Texto para WhatsApp' },
  'item-actions': { top: 50, left: 72, width: 22, height: 14, label: 'Ações do item' }
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
  'historico': 'history',
  'swipe-direita': 'swipe-right-cart',
  'swipe-direita-carrinho': 'swipe-right-cart',
  'swipe-esquerda': 'swipe-left-delete',
  'swipe-esquerda-excluir': 'swipe-left-delete',
  'confirmacao-exclusao': 'delete-confirm-modal',
  'dialogo-duplicado': 'delete-confirm-modal',
  'somar-quantidade': 'sum-quantity',
  'favoritar': 'favorite-star',
  'estrela-favorito': 'favorite-star',
  'filtro-favoritos': 'favorites-filter',
  'modo-mercado': 'market-mode',
  'checklist': 'checklist-item',
  'compartilhar-lista': 'share-button',
  'texto-whatsapp': 'share-text',
  'acoes-item': 'item-actions'
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
