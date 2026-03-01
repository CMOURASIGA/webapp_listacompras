import { HelpGuide } from '../types';
import gettingStartedGuide from './getting-started';
import listGuide from './list-guide';
import cartGuide from './cart-guide';
import historyGuide from './history-guide';
import aiGuide from './ai-guide';
import apiKeyGuide from './api-key-guide';

export const helpGuides: HelpGuide[] = [
  gettingStartedGuide,
  listGuide,
  cartGuide,
  historyGuide,
  aiGuide,
  apiKeyGuide
];
