import { AppSettings, ItemSuggestion } from '../../types';
import { generateWithGemini } from './providers/geminiProvider';
import { generateWithOpenAI } from './providers/openaiProvider';

export async function generateSuggestions(input: string, settings: AppSettings): Promise<ItemSuggestion[]> {
  const sanitizedInput = (input || '').trim();
  if (!sanitizedInput) return [];

  if (settings.aiProvider === 'disabled') return [];

  if (settings.aiProvider === 'openai') {
    return generateWithOpenAI(sanitizedInput, settings);
  }

  return generateWithGemini(sanitizedInput, settings);
}

