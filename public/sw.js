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
    // Retourner une page offline si disponible
    return caches.match('/offline') || new Response('Offline', { status: 503 });
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
    .catch(() => cachedResponse);
  
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

// Push Notifications
self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let notification = {
    title: 'RelancePro Africa',
    body: 'Nouvelle notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
  };
  
  if (event.data) {
    try {
      const data = event.data.json();
      notification = {
        ...notification,
        title: data.title || notification.title,
        body: data.body || notification.body,
        data: data.url || '/dashboard',
      };
    } catch (e) {
      notification.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon,
      badge: notification.badge,
      data: { url: notification.data },
      actions: [
        { action: 'open', title: 'Ouvrir' },
        { action: 'close', title: 'Fermer' },
      ],
    })
  );
});

// Notification Click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  if (event.action === 'close') {
    return;
  }
  
  const urlToOpen = event.notification.data?.url || '/dashboard';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Chercher une fenêtre existante
      for (const client of windowClients) {
        if (client.url.includes(urlToOpen) && 'focus' in client) {
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
