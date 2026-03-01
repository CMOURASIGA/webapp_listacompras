
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppSettingsProvider } from './store/appSettingsStore';
import { NotificationsProvider } from './store/notificationsStore';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <AppSettingsProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </AppSettingsProvider>
  </React.StrictMode>
);
