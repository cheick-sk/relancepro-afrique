// =====================================================
// RELANCEPRO AFRICA - Enhanced Service Worker
// Progressive Web App with full offline support
// =====================================================

const CACHE_VERSION = 'v2';
const STATIC_CACHE = `relancepro-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `relancepro-dynamic-${CACHE_VERSION}`;
const DATA_CACHE = `relancepro-data-${CACHE_VERSION}`;
const IMAGE_CACHE = `relancepro-images-${CACHE_VERSION}`;

// Assets statiques à mettre en cache immédiatement
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/clients',
  '/debts',
  '/reminders',
  '/templates',
  '/settings',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline',
];

// Patterns pour les assets statiques
const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\/icons\//,
  /\.js$/,
  /\.css$/,
  /\.woff2?$/,
  /\.ttf$/,
];

// Patterns pour les images
const IMAGE_PATTERNS = [
  /\.png$/,
  /\.jpg$/,
  /\.jpeg$/,
  /\.gif$/,
  /\.webp$/,
  /\.svg$/,
  /\.ico$/,
];

// Routes API à mettre en cache
const CACHEABLE_API_ROUTES = [
  '/api/clients',
  '/api/debts',
  '/api/reminders',
  '/api/templates',
  '/api/settings',
  '/api/analytics',
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Cache les assets statiques
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS).catch((err) => {
          console.warn('[SW] Some static assets failed to cache:', err);
        });
      }),
      // Pré-cache les images
      caches.open(IMAGE_CACHE).then((cache) => {
        console.log('[SW] Pre-caching image assets');
        return Promise.all(
          ['/icons/icon-72x72.png', '/icons/icon-96x96.png', '/icons/icon-128x128.png', 
           '/icons/icon-144x144.png', '/icons/icon-152x152.png', '/icons/icon-192x192.png', 
           '/icons/icon-256x256.png', '/icons/icon-384x384.png',
           '/icons/icon-512x512.png', '/logo.svg'].map((url) =>
            cache.add(url).catch(() => null)
          )
        );
      }),
    ])
  );
  
  // Activer immédiatement
  self.skipWaiting();
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v' + CACHE_VERSION);
  
  event.waitUntil(
    Promise.all([
      // Nettoyer les anciens caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                !cacheName.includes(CACHE_VERSION) &&
                (cacheName.startsWith('relancepro-') || cacheName.startsWith('sw-'))
              );
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Initialiser IndexedDB pour le stockage offline
      initIndexedDB(),
    ])
  );
  
  self.clients.claim();
});

// Initialiser IndexedDB pour les données offline
function initIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RelanceProOffline', 2);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Store pour les relances en attente
      if (!db.objectStoreNames.contains('pending-reminders')) {
        db.createObjectStore('pending-reminders', { keyPath: 'id', autoIncrement: true });
      }
      
      // Store pour les clients en attente
      if (!db.objectStoreNames.contains('pending-clients')) {
        db.createObjectStore('pending-clients', { keyPath: 'id', autoIncrement: true });
      }
      
      // Store pour les créances en attente
      if (!db.objectStoreNames.contains('pending-debts')) {
        db.createObjectStore('pending-debts', { keyPath: 'id', autoIncrement: true });
      }
      
      // Store pour les actions générales en attente
      if (!db.objectStoreNames.contains('pending-actions')) {
        const store = db.createObjectStore('pending-actions', { keyPath: 'id', autoIncrement: true });
        store.createIndex('type', 'type', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Store pour les notifications en attente
      if (!db.objectStoreNames.contains('pending-notifications')) {
        db.createObjectStore('pending-notifications', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = () => {
      console.log('[SW] IndexedDB initialized');
      resolve(request.result);
    };
  });
}

// Stratégie de fetch principale
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorer les requêtes non-GET
  if (request.method !== 'GET') {
    // Pour les requêtes POST/PUT/DELETE, intercepter et stocker si offline
    if (!navigator.onLine) {
      event.respondWith(handleOfflineMutation(request));
      return;
    }
    return;
  }
  
  // Ignorer les requêtes d'authentification et de paiement
  if (url.pathname.includes('/api/auth/') || 
      url.pathname.includes('/api/paystack/') ||
      url.pathname.includes('/api/push/')) {
    return;
  }
  
  // Ignorer les requêtes externes
  if (url.origin !== location.origin) {
    return;
  }
  
  // API calls - Network First avec fallback cache
  if (url.pathname.startsWith('/api/')) {
    const isCacheable = CACHEABLE_API_ROUTES.some(route => 
      url.pathname.startsWith(route)
    );
    
    if (isCacheable) {
      event.respondWith(networkFirst(request, DATA_CACHE));
    } else {
      event.respondWith(networkOnly(request));
    }
    return;
  }
  
  // Images - Cache First avec fallback
  if (IMAGE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }
  
  // Assets statiques - Cache First
  if (STATIC_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  
  // Pages - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
});

// Gérer les mutations offline
async function handleOfflineMutation(request) {
  const url = new URL(request.url);
  
  // Stocker l'action pour synchronisation ultérieure
  const action = {
    url: url.pathname,
    method: request.method,
    body: await request.clone().text(),
    headers: Object.fromEntries(request.headers.entries()),
    timestamp: Date.now(),
  };
  
  await storePendingAction(action);
  
  // Retourner une réponse de succès temporaire
  return new Response(
    JSON.stringify({
      success: false,
      offline: true,
      message: 'Action enregistrée. Elle sera synchronisée lorsque la connexion sera rétablie.',
      pendingAction: true,
    }),
    {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// Stocker une action en attente
async function storePendingAction(action) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RelanceProOffline', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      const transaction = db.transaction(['pending-actions'], 'readwrite');
      const store = transaction.objectStore('pending-actions');
      
      const addRequest = store.add({
        ...action,
        timestamp: Date.now(),
      });
      
      addRequest.onsuccess = () => {
        console.log('[SW] Pending action stored');
        // Notifier l'application
        notifyApp('action-pending', { count: 1 });
        resolve(addRequest.result);
      };
      
      addRequest.onerror = () => reject(addRequest.error);
    };
    
    request.onerror = () => reject(request.error);
  });
}

// Stratégie Cache First
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    // Rafraîchir le cache en arrière-plan
    fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        caches.open(cacheName).then((cache) => {
          cache.put(request, networkResponse);
        });
      }
    }).catch(() => {});
    
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
    // Retourner une image placeholder pour les images
    if (request.destination === 'image') {
      return new Response(
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect fill="#f97316" width="200" height="200"/><text x="50%" y="50%" fill="white" text-anchor="middle" dy=".3em">Offline</text></svg>',
        { headers: { 'Content-Type': 'image/svg+xml' } }
      );
    }
    
    // Retourner une page offline pour les navigations
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline');
      if (offlinePage) return offlinePage;
      
      return new Response(
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Hors ligne</title></head><body style="font-family: system-ui; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f97316;"><div style="text-align: center; color: white;"><h1>Hors ligne</h1><p>Vérifiez votre connexion internet</p></div></body></html>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
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
      // Ajouter un header pour indiquer que c'est du cache
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Offline-Cache', 'true');
      
      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers,
      });
    }
    
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Données non disponibles hors ligne',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Stratégie Network Only
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch (error) {
    return new Response(
      JSON.stringify({ 
        error: 'Offline', 
        message: 'Cette fonctionnalité nécessite une connexion internet',
        offline: true,
      }),
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
    .catch(async () => {
      // Si offline et pas de cache, retourner la page offline
      if (request.mode === 'navigate') {
        const offlinePage = await caches.match('/offline');
        if (offlinePage) return offlinePage;
      }
      return cachedResponse;
    });
  
  return cachedResponse || fetchPromise;
}

// Background Sync pour les actions en attente
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
  
  if (event.tag === 'sync-all') {
    event.waitUntil(syncAllPending());
  }
  
  if (event.tag === 'sync-actions') {
    event.waitUntil(syncPendingActions());
  }
});

// Synchronisation de toutes les données en attente
async function syncAllPending() {
  await Promise.all([
    syncReminders(),
    syncClients(),
    syncDebts(),
    syncPendingActions(),
  ]);
  
  notifyApp('sync-complete', { timestamp: Date.now() });
}

// Synchronisation des relances en attente
async function syncReminders() {
  try {
    const pendingReminders = await getPendingData('pending-reminders');
    let synced = 0;
    let failed = 0;
    
    for (const reminder of pendingReminders) {
      try {
        const response = await fetch('/api/reminders/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reminder),
        });
        
        if (response.ok) {
          await removePendingData('pending-reminders', reminder.id);
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('[SW] Failed to sync reminder:', error);
        failed++;
      }
    }
    
    console.log(`[SW] Reminders synced: ${synced}, failed: ${failed}`);
    notifyApp('sync-progress', { type: 'reminders', synced, failed });
  } catch (error) {
    console.error('[SW] Sync reminders failed:', error);
  }
}

// Synchronisation des clients
async function syncClients() {
  try {
    const pendingClients = await getPendingData('pending-clients');
    let synced = 0;
    let failed = 0;
    
    for (const client of pendingClients) {
      try {
        const response = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(client),
        });
        
        if (response.ok) {
          await removePendingData('pending-clients', client.id);
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('[SW] Failed to sync client:', error);
        failed++;
      }
    }
    
    console.log(`[SW] Clients synced: ${synced}, failed: ${failed}`);
    notifyApp('sync-progress', { type: 'clients', synced, failed });
  } catch (error) {
    console.error('[SW] Sync clients failed:', error);
  }
}

// Synchronisation des créances
async function syncDebts() {
  try {
    const pendingDebts = await getPendingData('pending-debts');
    let synced = 0;
    let failed = 0;
    
    for (const debt of pendingDebts) {
      try {
        const response = await fetch('/api/debts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(debt),
        });
        
        if (response.ok) {
          await removePendingData('pending-debts', debt.id);
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('[SW] Failed to sync debt:', error);
        failed++;
      }
    }
    
    console.log(`[SW] Debts synced: ${synced}, failed: ${failed}`);
    notifyApp('sync-progress', { type: 'debts', synced, failed });
  } catch (error) {
    console.error('[SW] Sync debts failed:', error);
  }
}

// Synchronisation des actions générales
async function syncPendingActions() {
  try {
    const pendingActions = await getPendingData('pending-actions');
    let synced = 0;
    let failed = 0;
    
    for (const action of pendingActions) {
      try {
        const response = await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body,
        });
        
        if (response.ok) {
          await removePendingData('pending-actions', action.id);
          synced++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error('[SW] Failed to sync action:', error);
        failed++;
      }
    }
    
    console.log(`[SW] Actions synced: ${synced}, failed: ${failed}`);
    notifyApp('sync-progress', { type: 'actions', synced, failed });
  } catch (error) {
    console.error('[SW] Sync actions failed:', error);
  }
}

// Helper: Récupérer les données en attente
async function getPendingData(storeName) {
  return new Promise((resolve) => {
    const request = indexedDB.open('RelanceProOffline', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(storeName)) {
        resolve([]);
        return;
      }
      
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
    const request = indexedDB.open('RelanceProOffline', 2);
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains(storeName)) {
        resolve();
        return;
      }
      
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      store.delete(id);
      resolve();
    };
    
    request.onerror = () => resolve();
  });
}

// Helper: Notifier l'application
async function notifyApp(type, data) {
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  
  for (const client of allClients) {
    client.postMessage({ type, data });
  }
}

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let notification = {
    title: 'RelancePro Africa',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'general',
    requireInteraction: false,
    renotify: true,
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notification = {
        ...notification,
        title: data.title || notification.title,
        body: data.body || notification.body,
        tag: data.tag || notification.tag,
        icon: data.icon || notification.icon,
        image: data.image,
        data: {
          url: data.url || '/dashboard',
          action: data.action,
          id: data.id,
        },
      };
    } catch (e) {
      notification.body = event.data.text();
    }
  }
  
  const options = {
    body: notification.body,
    icon: notification.icon,
    badge: notification.badge,
    tag: notification.tag,
    image: notification.image,
    data: notification.data,
    requireInteraction: notification.requireInteraction,
    renotify: notification.renotify,
    vibrate: [100, 50, 100],
    actions: [
      { action: 'open', title: 'Ouvrir', icon: '/icons/icon-96x96.png' },
      { action: 'close', title: 'Fermer' },
    ],
  };
  
  event.waitUntil(
    self.registration.showNotification(notification.title, options)
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Chercher une fenêtre existante
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.postMessage({
            type: 'notification-click',
            data: event.notification.data,
          });
          return client.focus();
        }
      }
      
      // Ouvrir une nouvelle fenêtre
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Notification Close
self.addEventListener('notificationclose', (event) => {
  console.log('[SW] Notification closed');
  
  // Peut être utilisé pour le tracking
  event.waitUntil(
    notifyApp('notification-closed', { tag: event.notification.tag })
  );
});

// Message handler pour communication avec l'app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_URLS':
      event.waitUntil(
        caches.open(DYNAMIC_CACHE).then((cache) => {
          return cache.addAll(data.urls);
        })
      );
      break;
      
    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
      );
      break;
      
    case 'GET_PENDING_COUNT':
      event.waitUntil(
        Promise.all([
          getPendingData('pending-reminders'),
          getPendingData('pending-clients'),
          getPendingData('pending-debts'),
          getPendingData('pending-actions'),
        ]).then(([reminders, clients, debts, actions]) => {
          event.source.postMessage({
            type: 'PENDING_COUNT',
            data: {
              reminders: reminders.length,
              clients: clients.length,
              debts: debts.length,
              actions: actions.length,
              total: reminders.length + clients.length + debts.length + actions.length,
            },
          });
        })
      );
      break;
      
    case 'REGISTER_SYNC':
      event.waitUntil(
        self.registration.sync.register(data?.tag || 'sync-all').then(() => {
          console.log('[SW] Sync registered:', data?.tag || 'sync-all');
        }).catch((err) => {
          console.error('[SW] Sync registration failed:', err);
        })
      );
      break;
      
    case 'SUBSCRIBE_PUSH':
      event.waitUntil(
        self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: data?.vapidKey,
        }).then((subscription) => {
          event.source.postMessage({
            type: 'PUSH_SUBSCRIPTION',
            data: subscription.toJSON(),
          });
        }).catch((err) => {
          console.error('[SW] Push subscription failed:', err);
          event.source.postMessage({
            type: 'PUSH_SUBSCRIPTION_ERROR',
            data: { error: err.message },
          });
        })
      );
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

// Périodique sync (si supporté)
self.addEventListener('periodicsync', (event) => {
  console.log('[SW] Periodic Sync:', event.tag);
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncAllPending());
  }
});

// Gestion des erreurs non capturées
self.addEventListener('error', (event) => {
  console.error('[SW] Uncaught error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

console.log('[SW] Service Worker loaded - RelancePro Africa PWA');
