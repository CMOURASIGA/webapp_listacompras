import React, { createContext, useContext, useMemo, useState } from 'react';
import { AppSettings } from '../types';

const SETTINGS_STORAGE_KEY = 'shopping_app_settings_v1';

type AppSettingsContextValue = {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

function getDefaultSettings(): AppSettings {
  const env = (import.meta as any).env || {};
  return {
    scriptUrl: (env.VITE_APPS_SCRIPT_URL || '').trim(),
    googleClientId: (env.VITE_GOOGLE_CLIENT_ID || '').trim(),
    aiProvider: 'gemini',
    geminiApiKey: '',
    openaiApiKey: ''
  };
}

function loadSettings(): AppSettings {
  const defaults = getDefaultSettings();
  if (typeof window === 'undefined') return defaults;

  let parsed: Partial<AppSettings> = {};
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (raw) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }
  }

  const legacyScriptUrl = localStorage.getItem('DEBUG_APPS_SCRIPT_URL') || '';
  const legacyClientId = localStorage.getItem('DEBUG_CLIENT_ID') || '';
  const legacyGeminiKey = localStorage.getItem('DEBUG_API_KEY') || '';
  const legacyProvider = localStorage.getItem('DEBUG_AI_PROVIDER') || '';
  const legacyOpenAIKey = localStorage.getItem('DEBUG_OPENAI_API_KEY') || '';

  return {
    ...defaults,
    ...parsed,
    scriptUrl: (parsed.scriptUrl || legacyScriptUrl || defaults.scriptUrl || '').trim(),
    googleClientId: (parsed.googleClientId || legacyClientId || defaults.googleClientId || '').trim(),
    aiProvider: (parsed.aiProvider || legacyProvider || defaults.aiProvider || 'gemini') as AppSettings['aiProvider'],
    geminiApiKey: (parsed.geminiApiKey || legacyGeminiKey || defaults.geminiApiKey || '').trim(),
    openaiApiKey: (parsed.openaiApiKey || legacyOpenAIKey || defaults.openaiApiKey || '').trim()
  };
}

function persistSettings(settings: AppSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));

  if (settings.scriptUrl) localStorage.setItem('DEBUG_APPS_SCRIPT_URL', settings.scriptUrl.trim());
  else localStorage.removeItem('DEBUG_APPS_SCRIPT_URL');

  if (settings.googleClientId) localStorage.setItem('DEBUG_CLIENT_ID', settings.googleClientId.trim());
  else localStorage.removeItem('DEBUG_CLIENT_ID');

  if (settings.geminiApiKey) localStorage.setItem('DEBUG_API_KEY', settings.geminiApiKey.trim());
  else localStorage.removeItem('DEBUG_API_KEY');

  localStorage.setItem('DEBUG_AI_PROVIDER', settings.aiProvider);

  if (settings.openaiApiKey) localStorage.setItem('DEBUG_OPENAI_API_KEY', settings.openaiApiKey.trim());
  else localStorage.removeItem('DEBUG_OPENAI_API_KEY');
}

export function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const value = useMemo<AppSettingsContextValue>(() => ({
    settings,
    updateSettings: (patch: Partial<AppSettings>) => {
      setSettings((prev) => {
        const next = {
          ...prev,
          ...patch,
          scriptUrl: (patch.scriptUrl ?? prev.scriptUrl ?? '').trim(),
          googleClientId: (patch.googleClientId ?? prev.googleClientId ?? '').trim(),
          geminiApiKey: (patch.geminiApiKey ?? prev.geminiApiKey ?? '').trim(),
          openaiApiKey: (patch.openaiApiKey ?? prev.openaiApiKey ?? '').trim()
        };
        persistSettings(next);
        return next;
      });
    }
  }), [settings]);

  return (
    <AppSettingsContext.Provider value={value}>
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);
  if (!context) {
    throw new Error('useAppSettings must be used within AppSettingsProvider');
  }
  return context;
}
