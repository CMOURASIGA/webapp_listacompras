import { Beef, Carrot, CupSoda, Droplet, Milk, Package, SprayCan, Wheat, type LucideIcon } from 'lucide-react';
import { normalize } from '../services/shoppingIntelligence';

/**
 * Ícone por categoria, pra dar escaneabilidade visual na lista/modo mercado
 * sem depender do campo `icon` da tabela categories (hoje não é preenchido
 * pelas categorias padrão, ver supabase/seed.sql).
 */
const ICONS_BY_KEYWORD: Array<[string, LucideIcon]> = [
  ['laticinio', Milk], ['leite', Milk],
  ['acougue', Beef], ['carne', Beef],
  ['hortifruti', Carrot], ['fruta', Carrot], ['verdura', Carrot], ['legume', Carrot],
  ['padaria', Wheat], ['pao', Wheat],
  ['bebida', CupSoda],
  ['limpeza', SprayCan],
  ['higiene', Droplet],
];

export function categoryIcon(categoryName?: string | null): LucideIcon {
  if (categoryName) {
    const normalized = normalize(categoryName);
    const match = ICONS_BY_KEYWORD.find(([keyword]) => normalized.includes(keyword));
    if (match) return match[1];
  }
  return Package;
}
