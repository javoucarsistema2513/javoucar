
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' })
      .then(reg => {
        console.log('SW: Registrado:', reg.scope);
      })
      .catch(err => {
        console.warn('SW: Falhou:', err.message);
      });
  });
}

// Solicitar permissão de notificação e configurar som/vibração
const setupNotifications = async () => {
  if (!("Notification" in window)) return;
  
  if (Notification.permission === "default") {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        console.log("Notificações permitidas pelo usuário!");
        // Enviar uma notificação de boas-vindas para testar o canal
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          reg.showNotification('JávouCar', {
            body: 'Notificações de radar ativadas com sucesso.',
            icon: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&q=80&w=192&h=192'
          });
        }
      }
    } catch (e) {
      console.warn("Erro ao pedir permissão de notificação", e);
    }
  }
};

setupNotifications();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <div className="animate-app min-h-screen">
      <App />
    </div>
  </React.StrictMode>
);
