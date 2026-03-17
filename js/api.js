// ============================================================
// CONNEXION INDICATOR
// ============================================================
function setOnline(ok) {
  STATE.isOnline = ok;
  const dot = document.getElementById('connexion-dot');
  const banner = document.getElementById('banner-offline');
  if (dot) dot.classList.toggle('offline', !ok);
  if (banner) banner.classList.toggle('visible', !ok);
}

// ============================================================
// API FETCH
// ============================================================
async function apiFetch(input, options = {}, timeout = CONFIG.FETCH_TIMEOUT) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), timeout);
  dbg('FETCH ' + (options.method || 'GET'), input.toString().substr(0,80));
  try {
    const res = await fetch(input, { ...options, signal: controller.signal });
    clearTimeout(tid);
    dbg('HTTP ' + res.status, res.url.substr(0,80));
    const text = await res.text();
    dbg('BODY', text.substr(0,200));
    try { return JSON.parse(text); }
    catch(e) { return { error: 'JSON invalide: ' + text.substr(0,100) }; }
  } catch(e) {
    clearTimeout(tid);
    dbg('ERROR', e.message);
    throw e;
  }
}

async function apiGet(action, params = {}) {
  const url = new URL(CONFIG.APPS_SCRIPT_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  return apiFetch(url.toString());
}

async function apiPostRaw(action, data = {}) {
  return apiFetch(CONFIG.APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ action, data }),
  });
}

// ============================================================
// WRITE QUEUE (FIFO)
// ============================================================
function enqueueWrite(action, data) {
  return new Promise((resolve, reject) => {
    STATE.writeQueue.push({ action, data, resolve, reject });
    if (!STATE.writeInProgress) processWriteQueue();
  });
}

async function processWriteQueue() {
  if (STATE.writeQueue.length === 0) { STATE.writeInProgress = false; pollCommandes(); return; }
  STATE.writeInProgress = true;
  const { action, data, resolve, reject } = STATE.writeQueue.shift();
  let result;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      result = await apiPostRaw(action, data);
      setOnline(true);
      break;
    } catch(e) {
      if (attempt === 0) {
        await new Promise(r => setTimeout(r, CONFIG.RETRY_DELAY));
      } else {
        setOnline(false);
        reject(e);
        processWriteQueue();
        return;
      }
    }
  }
  if (result && result.error === 'conflict') {
    // Résolution automatique de conflit
    try {
      const fresh = await apiGet('getCommandes');
      if (fresh.commandes) {
        const serverCmd = fresh.commandes.find(c => c.id === data.id);
        if (serverCmd) {
          data.updatedAt = serverCmd.updatedAt;
          const retry = await apiPostRaw(action, data);
          result = retry;
        }
      }
    } catch(e) {}
  }
  resolve(result);
  processWriteQueue();
}

// ============================================================
// POLLING
// ============================================================
function startPolling() {
  if (STATE.pollingTimer) clearInterval(STATE.pollingTimer);
  const interval = ['cuisine','bar'].includes(STATE.currentView)
    ? CONFIG.POLL_STATION : CONFIG.POLL_SERVICE;
  STATE.pollingTimer = setInterval(pollCommandes, interval);
  pollCommandes();
}

function stopPolling() {
  if (STATE.pollingTimer) { clearInterval(STATE.pollingTimer); STATE.pollingTimer = null; }
}

async function pollCommandes() {
  if (!CONFIG.APPS_SCRIPT_URL) return;
  try {
    const res = await apiGet('getCommandes');
    // Si un write est en cours ou en attente, les données serveur sont périmées
    // → ne pas écraser les mises à jour optimistes
    if (STATE.writeInProgress || STATE.writeQueue.length > 0) return;
    if (res.commandes) {
      STATE.consecutiveFailures = 0;
      setOnline(true);
      const prev = new Map(STATE.commandes.map(c => [c.id, c]));
      const freshIds = new Set(res.commandes.map(c => c.id));
      // Détecter nouvelles commandes ouvertes / demandes client
      let hasNew = false;
      let hasNewClient = false;
      res.commandes.forEach(c => {
        if (!STATE.prevCommandeIds.has(c.id)) {
          if (c.statut === 'ouverte') hasNew = true;
          if (c.statut === 'en_attente_validation') hasNewClient = true;
        }
      });
      STATE.commandes = res.commandes;
      STATE.prevCommandeIds = freshIds;
      // DEBUG
      const ouv = res.commandes.filter(c => c.statut === 'ouverte');
      if (ouv.length > 0) {
        const c0 = ouv[0];
        dbg('CMD[0] table=' + c0.table + ' statut=' + c0.statut);
        dbg('RAW lignes type=' + typeof c0.lignes + ' val=' + String(c0.lignes).substr(0,150));
        const lignes = getLignes(c0);
        dbg('PARSED lignes.length=' + lignes.length);
        if (lignes.length > 0) dbg('LIGNE[0] station=' + lignes[0].station + ' statut=' + lignes[0].statut + ' nom=' + lignes[0].nom);
      } else {
        dbg('Pas de commandes ouvertes dans le poll. Total=' + res.commandes.length);
      }
      const modalOpen = isModalOpen();
      if (hasNew && !modalOpen) playNewOrder();
      if (hasNewClient) {
        if (!modalOpen) playNewOrder();
        else STATE.pendingClientAlert = true;
      }
      renderCurrentView();
      updateNavBadges();
    }
  } catch(e) {
    STATE.consecutiveFailures = (STATE.consecutiveFailures || 0) + 1;
    if (STATE.consecutiveFailures >= CONFIG.OFFLINE_FAILURES_THRESHOLD) {
      setOnline(false);
    }
  }
}

// ============================================================
// NAV BADGES
// ============================================================
function updateNavBadges() {
  const ouvertes = STATE.commandes.filter(c => c.statut === 'ouverte');
  const clientDemands = STATE.commandes.filter(c => c.statut === 'en_attente_validation');

  // Badge service = nombre de demandes client en attente
  const bs = document.getElementById('badge-service');
  if (bs) {
    const cnt = clientDemands.length;
    bs.textContent = cnt; bs.style.display = cnt ? '' : 'none';
  }

  // Badge cuisine = nombre de lignes cuisine en_attente sur commandes ouvertes
  const cuisineLignes = ouvertes.reduce((acc, c) => {
    return acc + getLignes(c).filter(l => l.station === 'cuisine' && l.statut === 'en_attente').length;
  }, 0);
  const bc = document.getElementById('badge-cuisine');
  if (bc) { bc.textContent = cuisineLignes; bc.style.display = cuisineLignes ? '' : 'none'; }

  // Badge bar = lignes bar en_attente
  const barLignes = ouvertes.reduce((acc, c) => {
    return acc + getLignes(c).filter(l => l.station === 'bar' && l.statut === 'en_attente').length;
  }, 0);
  const bb = document.getElementById('badge-bar');
  if (bb) { bb.textContent = barLignes; bb.style.display = barLignes ? '' : 'none'; }
}
