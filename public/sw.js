// =====================================================
// RELANCEPRO AFRICA - Service Worker
// Cache des assets statiques et données offline
// =====================================================

const CACHE_NAME = 'relancepro-v1';
const STATIC_CACHE = 'relancepro-static-v1';
const DYNAMIC_CACHE = 'relancepro-dynamic-v1';
const DATA_CACHE = 'relancepro-data-v1';

// Assets statiques à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/clients',
  '/debts',
  '/reminders',
  '/settings',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  
  // Activer immédiatement
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return (
              cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== DATA_CACHE
            );
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  
  self.clients.claim();
});

// Stratégie de fetch
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    return;
  }
  
  // Ignorer les requêtes d'authentification
  if (url.pathname.includes('/api/auth/')) {
    return;
  }
  
  // Ignorer les requêtes externes
  if (url.origin !== location.origin) {
    return;
  }
  
  // API calls - Network First avec fallback cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }
  
  // Assets statiques - Cache First
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.includes('.js') ||
    url.pathname.includes('.css') ||
    url.pathname.includes('.png') ||
    url.pathname.includes('.jpg') ||
    url.pathname.includes('.svg')
  ) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Pages - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// Stratégie Cache First
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Pour les requêtes de navigation, retourner la page offline
    if (request.mode === 'navigate') {
      return caches.match('/offline');
    }
    // Pour les autres requêtes, retourner une réponse 503
    return new Response('Offline', { status: 503 });
  }
}

// Stratégie Network First
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response(
      JSON.stringify({ error: 'Offline', message: 'Données non disponibles hors ligne' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Stratégie Stale While Revalidate
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => {
      // Pour les requêtes de navigation, retourner la page offline
      if (request.mode === 'navigate') {
        return caches.match('/offline');
      }
      return cachedResponse;
    });
  
  return cachedResponse || fetchPromise;
}

// Background Sync pour les relances
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  
  if (event.tag === 'sync-reminders') {
    event.waitUntil(syncReminders());
  }
  
  if (event.tag === 'sync-clients') {
    event.waitUntil(syncClients());
  }
  
  if (event.tag === 'sync-debts') {
    event.waitUntil(syncDebts());
  }
});

// Synchronisation des relances en attente
async function syncReminders() {
  try {
    // Récupérer les relances en attente depuis IndexedDB ou localStorage
    const pendingReminders = await getPendingData('pending-reminders');
    
    for (const reminder of pendingReminders) {
      try {
        const response = await fetch('/api/reminders/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reminder),
        });
        
        if (response.ok) {
          await removePendingData('pending-reminders', reminder.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync reminder:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync reminders failed:', error);
  }
}

// Synchronisation des clients
async function syncClients() {
  try {
    const pendingClients = await getPendingData('pending-clients');
    
    for (const client of pendingClients) {
      try {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(client),
        });
        
        if (response.ok) {
          await removePendingData('pending-clients', client.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync client:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync clients failed:', error);
  }
}

// Synchronisation des créances
async function syncDebts() {
  try {
    const pendingDebts = await getPendingData('pending-debts');
    
    for (const debt of pendingDebts) {
      try {
        const response = await fetch('/api/debts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(debt),
        });
        
        if (response.ok) {
          await removePendingData('pending-debts', debt.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync debt:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Sync debts failed:', error);
  }
}

// Helper: Récupérer les données en attente
async function getPendingData(storeName) {
  // Utiliser IndexedDB pour le stockage offline
  return new Promise((resolve) => {
    const request = indexedDB.open('RelanceProOffline', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const getAll = store.getAll();
      
      getAll.onsuccess = () => resolve(getAll.result || []);
      getAll.onerror = () => resolve([]);
    };
    
    request.onerror = () => resolve([]);
  });
}

// Helper: Supprimer une donnée en attente
async function removePendingData(storeName, id) {
  return new Promise((resolve) => {
    const request = indexedDB.open('RelanceProOffline', 1);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      store.delete(id);
      resolve();
    };
    
    request.onerror = () => resolve();
  });
}

// =====================================================
// PUSH NOTIFICATIONS - Enhanced handling
// =====================================================

// Notification action definitions
const NOTIFICATION_ACTIONS = {
  MARK_AS_READ: 'mark_as_read',
  VIEW_DETAILS: 'view_details',
  DISMISS: 'dismiss',
  SNOOZE: 'snooze',
  OPEN_CLIENT: 'open_client',
  OPEN_DEBT: 'open_debt',
  SEND_REMINDER: 'send_reminder',
  VIEW_PAYMENT: 'view_payment',
};

// Default notification options by type
const DEFAULT_NOTIFICATION_OPTIONS = {
  debt: {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    requireInteraction: false,
    renotify: true,
  },
  payment: {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    requireInteraction: false,
    renotify: true,
  },
  reminder: {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    requireInteraction: true,
    renotify: true,
  },
  alert: {
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    requireInteraction: true,
    renotify: true,
    vibrate: [200, 100, 200],
  },
};

// Push event listener
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let notification = {
    title: 'RelancePro Africa',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'general',
    data: {},
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      console.log('[SW] Push data:', data);
      
      // Parse notification type and set appropriate options
      const notificationType = data.type || 'general';
      const defaultOptions = DEFAULT_NOTIFICATION_OPTIONS[notificationType] || DEFAULT_NOTIFICATION_OPTIONS.debt;
      
      notification = {
        title: data.title || notification.title,
        body: data.body || notification.body,
        icon: data.icon || defaultOptions.icon,
        badge: data.badge || defaultOptions.badge,
        tag: data.tag || `${notificationType}-${data.id || Date.now()}`,
        data: {
          url: data.url || data.data?.url || '/dashboard',
          type: notificationType,
          id: data.id || data.data?.id,
          ...data.data,
        },
        requireInteraction: data.requireInteraction ?? defaultOptions.requireInteraction,
        renotify: data.renotify ?? defaultOptions.renotify,
        vibrate: data.vibrate || defaultOptions.vibrate,
        actions: getNotificationActions(notificationType, data),
      };
      
      // Store notification in IndexedDB for background sync
      if (data.id) {
        storeNotificationForSync(data);
      }
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
      notification.body = event.data.text();
    }
  }
  
  event.waitUntil(
    Promise.all([
      // Show the notification
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        data: notification.data,
        actions: notification.actions,
        requireInteraction: notification.requireInteraction,
        renotify: notification.renotify,
        vibrate: notification.vibrate,
      }),
      // Update badge count
      updateBadgeCount(),
    ])
  );
});

// Get notification actions based on type
function getNotificationActions(type, data) {
  const actions = [];
  
  switch (type) {
    case 'debt.created':
      actions.push(
        { action: NOTIFICATION_ACTIONS.VIEW_DETAILS, title: 'Voir détails', icon: '/icons/action-view.png' },
        { action: NOTIFICATION_ACTIONS.SEND_REMINDER, title: 'Envoyer relance', icon: '/icons/action-send.png' }
      );
      break;
    case 'debt.paid':
    case 'payment.received':
      actions.push(
        { action: NOTIFICATION_ACTIONS.VIEW_PAYMENT, title: 'Voir paiement', icon: '/icons/action-view.png' },
        { action: NOTIFICATION_ACTIONS.MARK_AS_READ, title: 'Marquer lu', icon: '/icons/action-check.png' }
      );
      break;
    case 'reminder.sent':
    case 'reminder.delivered':
      actions.push(
        { action: NOTIFICATION_ACTIONS.VIEW_DETAILS, title: 'Voir détails', icon: '/icons/action-view.png' },
        { action: NOTIFICATION_ACTIONS.MARK_AS_READ, title: 'Marquer lu', icon: '/icons/action-check.png' }
      );
      break;
    case 'risk.alert':
    case 'payment.overdue':
      actions.push(
        { action: NOTIFICATION_ACTIONS.VIEW_DETAILS, title: 'Voir détails', icon: '/icons/action-view.png' },
        { action: NOTIFICATION_ACTIONS.SEND_REMINDER, title: 'Relancer', icon: '/icons/action-send.png' }
      );
      break;
    case 'daily.digest':
      actions.push(
        { action: NOTIFICATION_ACTIONS.VIEW_DETAILS, title: 'Voir résumé', icon: '/icons/action-view.png' },
        { action: NOTIFICATION_ACTIONS.DISMISS, title: 'Ignorer', icon: '/icons/action-close.png' }
      );
      break;
    default:
      actions.push(
        { action: NOTIFICATION_ACTIONS.VIEW_DETAILS, title: 'Voir', icon: '/icons/action-view.png' },
        { action: NOTIFICATION_ACTIONS.MARK_AS_READ, title: 'Marquer lu', icon: '/icons/action-check.png' }
      );
  }
  
  return actions;
}

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action, event.notification.data);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  // Handle different actions
  switch (action) {
    case NOTIFICATION_ACTIONS.MARK_AS_READ:
      // Mark notification as read in background
      event.waitUntil(
        markNotificationAsRead(data.id)
      );
      break;
      
    case NOTIFICATION_ACTIONS.DISMISS:
      // Just close, nothing else to do
      break;
      
    case NOTIFICATION_ACTIONS.SNOOZE:
      // Snooze for 1 hour
      event.waitUntil(
        snoozeNotification(data.id, 60)
      );
      break;
      
    case NOTIFICATION_ACTIONS.SEND_REMINDER:
      // Open the debt/client page with reminder dialog open
      event.waitUntil(
        openOrFocusWindow(data.url + '?action=send_reminder')
      );
      break;
      
    case NOTIFICATION_ACTIONS.VIEW_PAYMENT:
      event.waitUntil(
        openOrFocusWindow(data.url || '/payments')
      );
      break;
      
    case NOTIFICATION_ACTIONS.VIEW_DETAILS:
    case NOTIFICATION_ACTIONS.OPEN_CLIENT:
    case NOTIFICATION_ACTIONS.OPEN_DEBT:
    default:
      // Open the URL or default to dashboard
      event.waitUntil(
        openOrFocusWindow(data.url || '/dashboard')
      );
  }
  
  // Update badge count after action
  event.waitUntil(
    updateBadgeCount()
  );
});

// Notification close handler
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
  
  // Update badge count
  event.waitUntil(
    updateBadgeCount()
  );
});

// Open or focus window helper
async function openOrFocusWindow(url) {
  const windowClients = await clients.matchAll({ 
    type: 'window', 
    includeUncontrolled: true 
  });
  
  // Check if there's already a window with this URL
  for (const client of windowClients) {
    if (client.url.includes(url) && 'focus' in client) {
      // Focus existing window and navigate
      await client.focus();
      if ('navigate' in client) {
        await client.navigate(url);
      }
      return client;
    }
  }
  
  // Check for any open window to focus first
  for (const client of windowClients) {
    if ('focus' in client) {
      await client.focus();
      if ('navigate' in client) {
        await client.navigate(url);
      }
      return client;
    }
  }
  
  // Open a new window
  if (clients.openWindow) {
    return clients.openWindow(url);
  }
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;
  
  try {
    await fetch('/api/notifications/mark-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notificationId }),
    });
  } catch (error) {
    console.error('[SW] Failed to mark notification as read:', error);
  }
}

// Snooze notification
async function snoozeNotification(notificationId, minutes) {
  if (!notificationId) return;
  
  try {
    await fetch('/api/notifications/snooze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: notificationId, minutes }),
    });
  } catch (error) {
    console.error('[SW] Failed to snooze notification:', error);
  }
}

// Update badge count
async function updateBadgeCount() {
  try {
    const response = await fetch('/api/notifications/unread-count');
    if (response.ok) {
      const data = await response.json();
      const count = data.count || 0;
      
      // Update app badge if supported
      if ('setAppBadge' in navigator) {
        await navigator.setAppBadge(count);
      }
    }
  } catch (error) {
    console.error('[SW] Failed to update badge count:', error);
  }
}

// Store notification for background sync
async function storeNotificationForSync(notificationData) {
  try {
    const db = await openNotificationDB();
    const tx = db.transaction('pending_notifications', 'readwrite');
    const store = tx.objectStore('pending_notifications');
    
    await store.put({
      ...notificationData,
      receivedAt: new Date().toISOString(),
      synced: false,
    });
    
    // Register background sync if available
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-notifications');
    }
  } catch (error) {
    console.error('[SW] Failed to store notification for sync:', error);
  }
}

// Open notification IndexedDB
function openNotificationDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RelanceProNotifications', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_notifications')) {
        db.createObjectStore('pending_notifications', { keyPath: 'id' });
      }
    };
  });
}

// Background sync for notifications
self.addEventListener('sync', (event) => {
  console.log('[SW] Background Sync:', event.tag);
  
  if (event.tag === 'sync-notifications') {
    event.waitUntil(syncPendingNotifications());
  }
  
  if (event.tag === 'sync-reminders') {
    event.waitUntil(syncReminders());
  }
  
  if (event.tag === 'sync-clients') {
    event.waitUntil(syncClients());
  }
  
  if (event.tag === 'sync-debts') {
    event.waitUntil(syncDebts());
  }
});

// Sync pending notifications
async function syncPendingNotifications() {
  try {
    const db = await openNotificationDB();
    const tx = db.transaction('pending_notifications', 'readwrite');
    const store = tx.objectStore('pending_notifications');
    const notifications = await store.getAll();
    
    for (const notification of notifications) {
      if (!notification.synced) {
        // Mark as synced
        notification.synced = true;
        await store.put(notification);
      }
    }
    
    console.log('[SW] Synced', notifications.length, 'notifications');
  } catch (error) {
    console.error('[SW] Failed to sync notifications:', error);
  }
}

// Push subscription change handler
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Push subscription changed');
  
  event.waitUntil(
    (async () => {
      try {
        // Get the new subscription
        const subscription = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: await getVapidKey(),
        });
        
        // Send new subscription to server
        const subJson = subscription.toJSON();
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subJson.endpoint,
            p256dh: subJson.keys?.p256dh,
            auth: subJson.keys?.auth,
            resubscribe: true,
          }),
        });
        
        console.log('[SW] Push subscription renewed');
      } catch (error) {
        console.error('[SW] Failed to renew push subscription:', error);
      }
    })()
  );
});

// Get VAPID key from server
async function getVapidKey() {
  try {
    const response = await fetch('/api/push/subscribe');
    if (response.ok) {
      const data = await response.json();
      return urlBase64ToUint8Array(data.vapidPublicKey);
    }
  } catch (error) {
    console.error('[SW] Failed to get VAPID key:', error);
  }
  return null;
}

// Convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Message handler pour communication avec l'app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
