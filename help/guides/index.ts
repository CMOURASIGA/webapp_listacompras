import { HelpGuide } from '../types';
import gettingStartedGuide from './getting-started';
import listGuide from './list-guide';
import cartGuide from './cart-guide';
import historyGuide from './history-guide';
import aiGuide from './ai-guide';
import apiKeyGuide from './api-key-guide';
import gesturesGuide from './gestures-guide';
import duplicatesGuide from './duplicates-guide';
import favoritesGuide from './favorites-guide';
import marketModeGuide from './market-mode-guide';
import shareGuide from './share-guide';

export const helpGuides: HelpGuide[] = [
  gettingStartedGuide,
  listGuide,
  gesturesGuide,
  duplicatesGuide,
  favoritesGuide,
  cartGuide,
  marketModeGuide,
  shareGuide,
  historyGuide,
  aiGuide,
  apiKeyGuide
];
