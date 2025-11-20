// services/pushNotifications.ts
import { backendApi } from './api';

// Verifica se o navegador suporta notificações push
export const isPushNotificationSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Solicita permissão para notificações
export const requestPushNotificationPermission = async () => {
  if (!isPushNotificationSupported()) {
    throw new Error('Notificações push não são suportadas neste navegador');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Permissão para notificações foi negada');
  }

  return permission;
};

// Registra o service worker
export const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers não são suportados neste navegador');
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registrado com sucesso:', registration);
    return registration;
  } catch (error) {
    console.error('Erro ao registrar Service Worker:', error);
    throw error;
  }
};

// Obtém a chave pública VAPID do backend
export const getVapidPublicKey = async () => {
  try {
    const response = await fetch(`${backendApi.baseUrl}/vapid-public-key`);
    const { publicKey } = await response.json();
    return publicKey;
  } catch (error) {
    console.error('Erro ao obter chave pública VAPID:', error);
    throw error;
  }
};

// Converte a chave pública de base64 para Uint8Array
const urlBase64ToUint8Array = (base64String: string) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Subscreve o usuário para notificações push
export const subscribeToPushNotifications = async (token: string) => {
  if (!isPushNotificationSupported()) {
    throw new Error('Notificações push não são suportadas neste navegador');
  }

  try {
    // Registrar o service worker
    const registration = await registerServiceWorker();
    
    // Obter a chave pública VAPID
    const publicKey = await getVapidPublicKey();
    
    // Subscrever para notificações push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });

    // Enviar a subscrição para o backend
    const response = await backendApi.savePushSubscription(subscription, token);
    
    if (response.success) {
      console.log('Subscrição para notificações push salva com sucesso');
      return subscription;
    } else {
      throw new Error('Falha ao salvar subscrição para notificações push');
    }
  } catch (error) {
    console.error('Erro ao subscrever para notificações push:', error);
    throw error;
  }
};

// Inicializa o sistema de notificações push
export const initializePushNotifications = async (token: string) => {
  if (!isPushNotificationSupported()) {
    console.log('Notificações push não são suportadas neste navegador');
    return false;
  }

  try {
    // Solicitar permissão para notificações
    await requestPushNotificationPermission();
    
    // Subscrever para notificações push
    await subscribeToPushNotifications(token);
    
    console.log('Sistema de notificações push inicializado com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao inicializar notificações push:', error);
    return false;
  }
};