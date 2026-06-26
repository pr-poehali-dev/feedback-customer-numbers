import { CHAT_API } from '@/components/app/types';

const VAPID_PUBLIC_KEY =
  'BCoKB6DnoSR9ooTdB6-e0WLwQaue8gOgSbbf7wuOCdlWY-gmkph8OCxYQX-biPIjSlOSa0sVV4IFx9lG8x744MM';

const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

export const isPushSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  'PushManager' in window &&
  'Notification' in window;

export const getPushPermission = (): NotificationPermission | 'unsupported' => {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
};

const registerServiceWorker = async (): Promise<ServiceWorkerRegistration> => {
  const existing = await navigator.serviceWorker.getRegistration('/sw.js');
  if (existing) {
    // Проверяем обновление service worker, чтобы доехал свежий код (бейдж и т.п.)
    existing.update().catch(() => {});
    return existing;
  }
  return navigator.serviceWorker.register('/sw.js');
};

const saveSubscription = async (sub: PushSubscription): Promise<void> => {
  await fetch(CHAT_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'subscribe', subscription: sub.toJSON() }),
  });
};

const keyMatchesCurrent = (sub: PushSubscription): boolean => {
  try {
    const opt = sub.options?.applicationServerKey;
    if (!opt) return false;
    const current = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    const existing = new Uint8Array(opt as ArrayBuffer);
    if (existing.length !== current.length) return false;
    for (let i = 0; i < current.length; i++) {
      if (existing[i] !== current[i]) return false;
    }
    return true;
  } catch {
    return false;
  }
};

const getFreshSubscription = async (
  registration: ServiceWorkerRegistration,
): Promise<PushSubscription> => {
  let sub = await registration.pushManager.getSubscription();
  if (sub && !keyMatchesCurrent(sub)) {
    // Подписка сделана под старый VAPID-ключ — удаляем и создаём заново
    try { await sub.unsubscribe(); } catch { /* игнор */ }
    sub = null;
  }
  if (!sub) {
    sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    });
  }
  return sub;
};

export const enablePushNotifications = async (): Promise<boolean> => {
  if (!isPushSupported()) return false;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    const registration = await registerServiceWorker();
    await navigator.serviceWorker.ready;

    const sub = await getFreshSubscription(registration);
    await saveSubscription(sub);
    return true;
  } catch {
    return false;
  }
};

export const ensurePushSubscribed = async (): Promise<void> => {
  if (!isPushSupported()) return;
  if (Notification.permission !== 'granted') return;
  try {
    const registration = await registerServiceWorker();
    await navigator.serviceWorker.ready;
    const sub = await getFreshSubscription(registration);
    await saveSubscription(sub);
  } catch {
    /* тихо */
  }
};