import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './src/app/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Necessário pro Chrome/Android considerar o app "instalável" e disparar o beforeinstallprompt.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { void navigator.serviceWorker.register('/sw.js'); });
}
