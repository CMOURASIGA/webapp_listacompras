import { useEffect, useState } from 'react';

/** Evento não padronizado pelo TS lib.dom; despachado pelo Chrome/Android antes de permitir instalar o PWA. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

/**
 * Instalação do PWA na tela inicial. No Android/Chrome, guarda o evento
 * `beforeinstallprompt` (o navegador só permite chamar `.prompt()` a
 * partir dele, e só uma vez) para disparar quando o usuário tocar no ícone.
 * No iOS, o Safari não expõe esse evento — não tem como instalar via
 * código, só mostrando o passo a passo manual (ver `ios` no retorno).
 */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandalone());

  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setDeferred(event as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  const promptInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  return { canInstall: Boolean(deferred), promptInstall, installed, ios: isIOS() };
}
