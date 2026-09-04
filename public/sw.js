const CACHE_NAME = 'app-cache-v5'; // Version hochgezählt für sofortiges Update

// 1. Sofort installieren ohne Warten
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Sofort aktivieren & ALLE alten Caches radikal löschen
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => caches.delete(key)) // Löscht ausnahmslos alle alten Caches
      );
    }).then(() => self.clients.claim())
  );
});

// Message Listener für manuelles/automatisches SKIP_WAITING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// 3. Network Fetch Handling
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // CRITICAL: Supabase API/Auth/Realtime Traffic komplett ignorieren (echter Netzwerk-Pass-Through)
  // Niemals event.respondWith() ausführen!
  if (url.includes('supabase.co') || url.includes('supabase')) {
    return;
  }

  // Backend APIs (/api/) & Nicht-GET-Requests direkt an das native Netzwerk übergeben
  if (event.request.method !== 'GET' || url.includes('/api/')) {
    return;
  }

  // Statische Assets: Network First mit Cache Fallback
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
