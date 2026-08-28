// Service worker mínimo — existe só pra satisfazer o critério de
// "instalabilidade" do Chrome/Android (beforeinstallprompt exige um SW
// registrado com handler de fetch). Sem cache offline por enquanto.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
