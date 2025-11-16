const API_URL = "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur";

const statusEl = document.getElementById("status");
const priceEl = document.getElementById("price");
const priceNumberEl = document.getElementById("price-number");
const belowInput = document.getElementById("below");
const aboveInput = document.getElementById("above");
const enableBtn = document.getElementById("enable");

let currentPrice = null;
let pollingIntervalId = null;
let wakeLock = null;
let isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
let isVisible = true;
let lastPriceCheck = Date.now();

function log(msg) {
  console.log("[BTC ALERT]", msg);
  statusEl.textContent = msg;
}

// Wake Lock para manter tela ativa (iOS)
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
      log('Wake Lock ativado (mantém tela ativa)');
      
      wakeLock.addEventListener('release', () => {
        log('Wake Lock liberado');
      });
    }
  } catch (err) {
    log('Wake Lock não suportado: ' + err.message);
  }
}

// Detectar mudanças de visibilidade
function setupVisibilityHandlers() {
  document.addEventListener('visibilitychange', () => {
    isVisible = !document.hidden;
    
    if (isVisible) {
      log('App voltou para primeiro plano');
      // Verificar se precisa atualizar preço
      const timeSinceLastCheck = Date.now() - lastPriceCheck;
      if (timeSinceLastCheck > 60000) { // Mais de 1 minuto
        fetchPrice();
      }
    } else {
      log('App foi para segundo plano');
      if (isIOS) {
        // No iOS, registrar background sync
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
          navigator.serviceWorker.ready.then(reg => {
            return reg.sync.register('price-check');
          }).catch(err => console.log('Background sync não suportado'));
        }
      }
    }
  });
  
  // Eventos de foco da janela
  window.addEventListener('focus', () => {
    isVisible = true;
    fetchPrice();
  });
  
  window.addEventListener('blur', () => {
    isVisible = false;
  });
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    log("Service worker não suportado neste navegador.");
    return null;
  }
  
  // Verifica se está sendo executado via file:// protocol
  if (location.protocol === "file:") {
    log("⚠️ ERRO: Acesse via http://127.0.0.1:8080 para usar Service Workers!");
    return null;
  }
  
  try {
    const reg = await navigator.serviceWorker.register("sw.js");
    log("Service worker registrado.");
    return reg;
  } catch (err) {
    console.error(err);
    log("Erro ao registrar service worker: " + err.message);
    return null;
  }
}

async function requestNotificationPermission() {
  if (!("Notification" in window)) {
    log("Notificações não suportadas.");
    return "denied";
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    log("Permissão de notificações negada.");
  } else {
    log("Notificações ativadas.");
  }
  return permission;
}

async function fetchPrice() {
  try {
    lastPriceCheck = Date.now();
    log("Fazendo requisição para CoinGecko...");
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    console.log("Resposta da API:", json);
    const price = json.bitcoin?.eur;
    if (typeof price === "number") {
      currentPrice = price;
      priceNumberEl.textContent = price.toLocaleString("de-DE", { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      });
      
      // Anima a atualização do preço
      priceEl.classList.add("price-update");
      setTimeout(() => priceEl.classList.remove("price-update"), 600);
      
      const timestamp = new Date().toLocaleTimeString();
      log(`Preço atualizado: € ${price.toLocaleString("de-DE")} (${timestamp})`);
      await checkThresholds(price);
      
      // Salvar último preço para comparação
      localStorage.setItem('lastPrice', price);
      localStorage.setItem('lastUpdate', Date.now());
    } else {
      log("Resposta inesperada da API: " + JSON.stringify(json));
    }
  } catch (err) {
    console.error("Erro ao consultar preço:", err);
    log(`Erro ao consultar preço: ${err.message}`);
    
    // Em caso de erro, tentar novamente em 30s no iOS
    if (isIOS && isVisible) {
      setTimeout(fetchPrice, 30000);
    }
  }
}

async function checkThresholds(price) {
  const below = Number(localStorage.getItem("btc_below") || belowInput.value);
  const above = Number(localStorage.getItem("btc_above") || aboveInput.value);

  // Só verifica thresholds se as notificações estiverem ativadas
  if (Notification.permission !== "granted") {
    return;
  }

  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) return;

  if (price < below) {
    reg.showNotification("BTC abaixo do alvo", {
      body: `Bitcoin caiu para € ${price.toLocaleString("de-DE")}, abaixo de € ${below.toLocaleString("de-DE")}.`,
      icon: "icon-192.png",
      badge: "icon-192.png"
    });
  } else if (price > above) {
    reg.showNotification("BTC acima do alvo", {
      body: `Bitcoin subiu para € ${price.toLocaleString("de-DE")}, acima de € ${above.toLocaleString("de-DE")}.`,
      icon: "icon-192.png",
      badge: "icon-192.png"
    });
  }
}

async function startPolling() {
  if (pollingIntervalId) clearInterval(pollingIntervalId);

  await fetchPrice();
  
  // Intervalos mais frequentes no iOS quando visível
  const interval = isIOS ? (isVisible ? 30_000 : 60_000) : 60_000;
  pollingIntervalId = setInterval(() => {
    if (isVisible || !isIOS) {
      fetchPrice();
    }
  }, interval);
  
  // Ativar Wake Lock se disponível
  if (isIOS) {
    await requestWakeLock();
  }
  
  const intervalText = isIOS ? '30-60s' : '60s';
  if (Notification.permission === "granted") {
    log(`Monitorando preço a cada ${intervalText} com alertas ativos…`);
    if (isIOS) {
      log('💡 iOS: Mantenha o app aberto para melhor funcionamento');
    }
  } else {
    log(`Monitorando preço a cada ${intervalText} (alertas desativados)`);
  }
}

enableBtn.addEventListener("click", async () => {
  const below = Number(belowInput.value);
  const above = Number(aboveInput.value);

  if (!below || !above) {
    log("Informe valores válidos para os limites.");
    return;
  }

  localStorage.setItem("btc_below", below);
  localStorage.setItem("btc_above", above);

  enableBtn.disabled = true;
  enableBtn.textContent = "Alertas ativados";

  const reg = await registerServiceWorker();
  if (!reg) {
    enableBtn.disabled = false;
    enableBtn.textContent = "Ativar alertas";
    return;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") {
    enableBtn.disabled = false;
    enableBtn.textContent = "Ativar alertas";
    return;
  }

  startPolling();
});

// Botão de teste
document.getElementById("test").addEventListener("click", async () => {
  log("Testando conexão...");
  await fetchPrice();
});

// Botão para apenas monitorar
document.getElementById("monitor").addEventListener("click", async () => {
  const below = Number(belowInput.value);
  const above = Number(aboveInput.value);

  if (!below || !above) {
    log("Informe valores válidos para os limites.");
    return;
  }

  localStorage.setItem("btc_below", below);
  localStorage.setItem("btc_above", above);

  document.getElementById("monitor").disabled = true;
  document.getElementById("monitor").textContent = "Monitorando...";

  startPolling();
});

// Listener para mensagens do Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    const { type, price } = event.data;
    
    if (type === 'PRICE_UPDATE') {
      currentPrice = price;
      priceNumberEl.textContent = price.toLocaleString("de-DE", { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      });
      log(`Preço atualizado via SW: € ${price.toLocaleString("de-DE")}`);
    } else if (type === 'CHECK_THRESHOLDS') {
      checkThresholds(price);
    }
  });
}

// Restaura valores salvos
window.addEventListener("load", () => {
  const below = localStorage.getItem("btc_below");
  const above = localStorage.getItem("btc_above");
  if (below) belowInput.value = below;
  if (above) aboveInput.value = above;
  
  // Setup handlers de visibilidade
  setupVisibilityHandlers();
  
  // Detectar iOS e mostrar dicas
  if (isIOS) {
    log("📱 iOS detectado - otimizações ativadas");
    const iosTip = document.getElementById("ios-tip");
    if (iosTip) {
      iosTip.style.display = "block";
    }
    
    // Verificar se está rodando como PWA standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    if (!isStandalone) {
      log("💡 Para melhor funcionamento, instale como PWA");
    } else {
      log("✅ Rodando como PWA - modo otimizado");
    }
  }
  
  // Verifica o protocolo
  if (location.protocol === "file:") {
    log("⚠️ AVISO: Para funcionar completamente, acesse via http://127.0.0.1:8080");
    log("Execute: npx http-server -p 8080 -c-1 --cors");
  } else {
    log("App carregado. Testando conexão...");
  }
  
  fetchPrice();
});

// Liberar Wake Lock ao sair
window.addEventListener('beforeunload', () => {
  if (wakeLock) {
    wakeLock.release();
  }
});
