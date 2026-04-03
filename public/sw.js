const STATIC_CACHE = 'brt-code-static-v1';
const DYNAMIC_CACHE = 'brt-code-dynamic-v1';
const SYNC_QUEUE = 'brt-code-sync-queue-v1';

// App shell files to precache
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/offline.html',
  '/styles/main.css',
  '/manifest.json',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/icons/badge-72.svg'
];

// CDN resources to cache with CORS handling
const CDN_DOMAINS = [
  'cdn.jsdelivr.net',
  'unpkg.com',
  'cdnjs.cloudflare.com',
  'fonts.googleapis.com',
  'fonts.gstatic.com'
];

// Static file extensions (cache first strategy)
const STATIC_EXTENSIONS = ['.css', '.js', '.json', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf', '.eot', '.ico'];

// ===== INSTALL EVENT =====
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching app shell');
        // Add URLs one by one to handle missing files gracefully
        return Promise.all(
          PRECACHE_URLS.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to precache ${url}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[SW] Install complete');
        return self.skipWaiting();
      })
  );
});

// ===== ACTIVATE EVENT =====
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Keep only current caches
            return (
              cacheName.startsWith('brt-code-static-') && cacheName !== STATIC_CACHE
            ) || (
              cacheName.startsWith('brt-code-dynamic-') && cacheName !== DYNAMIC_CACHE
            ) || (
              cacheName.startsWith('brt-code-sync-') && cacheName !== SYNC_QUEUE
            );
          })
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => {
      console.log('[SW] Activation complete');
      return self.clients.claim();
    })
  );
});

// ===== FETCH EVENT =====
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Determine caching strategy based on request type
  const strategy = getCachingStrategy(request, url);

  event.respondWith(handleFetch(request, strategy));
});

// Determine caching strategy
function getCachingStrategy(request, url) {
  const pathname = url.pathname.toLowerCase();
  const extension = pathname.substring(pathname.lastIndexOf('.'));

  // CDN resources - stale-while-revalidate
  if (CDN_DOMAINS.some(domain => url.hostname.includes(domain))) {
    return 'stale-while-revalidate';
  }

  // Static assets (CSS, JS, images, fonts) - cache first
  if (STATIC_EXTENSIONS.includes(extension)) {
    return 'cache-first';
  }

  // HTML pages and navigation - network first
  if (pathname.endsWith('.html') || pathname.endsWith('/') || pathname === '') {
    return 'network-first';
  }

  // API requests - network only (for now)
  if (pathname.startsWith('/api/')) {
    return 'network-only';
  }

  // Project files (user code) - network first
  if (pathname.startsWith('/project/') || pathname.includes('/workspace/')) {
    return 'network-first';
  }

  // Default to network first
  return 'network-first';
}

// Handle fetch with appropriate strategy
async function handleFetch(request, strategy) {
  switch (strategy) {
    case 'cache-first':
      return cacheFirst(request);
    case 'network-first':
      return networkFirst(request);
    case 'stale-while-revalidate':
      return staleWhileRevalidate(request);
    case 'network-only':
      return fetch(request);
    default:
      return networkFirst(request);
  }
}

// Cache First Strategy
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    // Return offline page for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// Network First Strategy
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return offline page for HTML requests
    if (request.headers.get('accept').includes('text/html')) {
      return caches.match('/offline.html');
    }
    throw error;
  }
}

// Stale While Revalidate Strategy
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.log('[SW] Revalidate failed:', error);
  });

  return cached || fetchPromise;
}

// ===== BACKGROUND SYNC =====
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-project') {
    event.waitUntil(syncProjectChanges());
  } else if (event.tag === 'sync-files') {
    event.waitUntil(syncFileChanges());
  }
});

// Sync project changes from queue
async function syncProjectChanges() {
  console.log('[SW] Syncing project changes');
  try {
    const db = await openSyncDB();
    const changes = await db.getAll('projectQueue');
    
    for (const change of changes) {
      try {
        // Attempt to sync each change
        const response = await fetch('/api/project/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change)
        });
        
        if (response.ok) {
          // Remove from queue on success
          await db.delete('projectQueue', change.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync change:', change.id, error);
      }
    }
    
    // Notify clients of sync status
    notifyClients('sync-complete', { type: 'project', count: changes.length });
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Sync file changes from queue
async function syncFileChanges() {
  console.log('[SW] Syncing file changes');
  try {
    const db = await openSyncDB();
    const changes = await db.getAll('fileQueue');
    
    for (const change of changes) {
      try {
        const response = await fetch('/api/files/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(change)
        });
        
        if (response.ok) {
          await db.delete('fileQueue', change.id);
        }
      } catch (error) {
        console.error('[SW] Failed to sync file change:', change.id, error);
      }
    }
    
    notifyClients('sync-complete', { type: 'files', count: changes.length });
  } catch (error) {
    console.error('[SW] File sync failed:', error);
  }
}

// Open IndexedDB for sync queue
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SYNC_QUEUE, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(new SyncDB(request.result));
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('projectQueue')) {
        db.createObjectStore('projectQueue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('fileQueue')) {
        db.createObjectStore('fileQueue', { keyPath: 'id' });
      }
    };
  });
}

// SyncDB helper class
class SyncDB {
  constructor(db) {
    this.db = db;
  }
  
  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  
  delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);
  
  let notificationData = {
    title: 'BRT CODE',
    body: 'Something happened in your project',
    icon: '/icons/icon-192.svg',
    badge: '/icons/badge-72.svg',
    tag: 'brt-code-notification',
    requireInteraction: false,
    data: {}
  };
  
  // Parse push data if available
  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      requireInteraction: notificationData.requireInteraction,
      data: notificationData.data,
      actions: [
        { action: 'open', title: 'Open' },
        { action: 'close', title: 'Close' }
      ]
    })
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/').then((client) => {
        if (event.notification.data && event.notification.data.projectId) {
          // Focus on specific project if provided
          client.postMessage({
            type: 'navigate',
            projectId: event.notification.data.projectId
          });
        }
      })
    );
  }
});

// ===== MESSAGE HANDLING =====
self.addEventListener('message', (event) => {
  if (!event.data) return;
  
  switch (event.data.type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'GET_VERSION':
      event.ports[0].postMessage({
        static: STATIC_CACHE,
        dynamic: DYNAMIC_CACHE
      });
      break;
      
    case 'QUEUE_CHANGE':
      queueChange(event.data.payload);
      break;
      
    case 'CLEAR_CACHES':
      event.waitUntil(
        caches.keys().then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        }).then(() => {
          event.ports[0].postMessage({ success: true });
        })
      );
      break;
      
    default:
      console.log('[SW] Unknown message type:', event.data.type);
  }
});

// Queue a change for background sync
async function queueChange(payload) {
  if (!payload) return;
  
  try {
    const db = await openSyncDB();
    const transaction = db.db.transaction('projectQueue', 'readwrite');
    const store = transaction.objectStore('projectQueue');
    
    await new Promise((resolve, reject) => {
      const request = store.put({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        ...payload,
        timestamp: Date.now()
      });
      request.onsuccess = resolve;
      request.onerror = reject;
    });
    
    // Request background sync if supported
    if ('sync' in self.registration) {
      await self.registration.sync.register('sync-project');
    }
    
    console.log('[SW] Change queued for sync');
  } catch (error) {
    console.error('[SW] Failed to queue change:', error);
  }
}

// ===== NOTIFICATION TO CLIENTS =====
async function notifyClients(type, data) {
  const allClients = await clients.matchAll({ type: 'window' });
  for (const client of allClients) {
    client.postMessage({
      type,
      ...data
    });
  }
}

// ===== PERIODIC SYNC (for future use) =====
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'content-sync') {
    event.waitUntil(syncContent());
  }
});

async function syncContent() {
  console.log('[SW] Periodic sync triggered');
  // Future: Check for updates, sync templates, etc.
}

console.log('[SW] Service Worker initialized');
