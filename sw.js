const CACHE_NAME = "btc-alert-v1";
const URLS_TO_CACHE = [
  "./",
  "./index.html",
  "./main.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => k !== CACHE_NAME && caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((resp) => resp || fetch(event.request))
  );
});

// Background sync para iOS
self.addEventListener('sync', event => {
  if (event.tag === 'price-check') {
    event.waitUntil(checkPriceInBackground());
  }
});

// Periodic background sync (limitado no iOS)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'price-monitor') {
    event.waitUntil(checkPriceInBackground());
  }
});

async function checkPriceInBackground() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur');
    const data = await response.json();
    const price = data.bitcoin?.eur;
    
    if (price) {
      // Enviar mensagem para todas as abas abertas
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({ type: 'PRICE_UPDATE', price });
      });
      
      // Verificar thresholds
      await checkThresholdsInSW(price);
    }
  } catch (error) {
    console.error('Erro ao verificar preço em background:', error);
  }
}

async function checkThresholdsInSW(price) {
  // Recuperar configurações do IndexedDB ou localStorage via cliente
  const clients = await self.clients.matchAll();
  if (clients.length > 0) {
    clients[0].postMessage({ type: 'CHECK_THRESHOLDS', price });
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientsArr) => {
      if (clientsArr.length > 0) {
        return clientsArr[0].focus();
      }
      return clients.openWindow("./");
    })
  );
});
