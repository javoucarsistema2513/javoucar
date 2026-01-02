
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service Worker Registration robusto para diferentes origens
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Usamos './sw.js' para garantir que seja relativo ao diretório atual, evitando erros de cross-origin
    navigator.serviceWorker.register('./sw.js')
      .then(reg => {
        console.log('SW: Registrado com sucesso:', reg.scope);
      })
      .catch(err => {
        // Silenciamos erro em ambiente de desenvolvimento local se necessário
        console.warn('SW: Registro falhou (comum em sandboxes sem HTTPS ou origens restritas):', err.message);
      });
  });
}

// Solicitar permissão de notificação para segundo plano e tela de bloqueio
const requestNotificationPermission = async () => {
  if ("Notification" in window) {
    if (Notification.permission !== "granted" && Notification.permission !== "denied") {
      try {
        await Notification.requestPermission();
      } catch (e) {
        console.error("Erro ao solicitar permissão de notificação:", e);
      }
    }
  }
};

requestNotificationPermission();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <div className="animate-app min-h-screen">
      <App />
    </div>
  </React.StrictMode>
);
