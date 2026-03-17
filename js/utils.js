// ============================================================
// TERMINAL ID
// ============================================================
function getTerminalId() {
  let id = localStorage.getItem('gio_terminal');
  if (!id) {
    id = 'term_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
    localStorage.setItem('gio_terminal', id);
  }
  return id;
}

// ============================================================
// UTILITAIRES
// ============================================================
function formatPrice(p) {
  return parseFloat(p).toFixed(2).replace('.', ',') + ' €';
}

function formatTimer(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return h + 'h' + String(m % 60).padStart(2,'0');
  return m + ':' + String(s % 60).padStart(2,'0');
}

function timerClass(ms, isArticle) {
  const min = ms / 60000;
  const orange = isArticle ? STATE.config.seuilOrangeCommande : STATE.config.seuilOrangeCommande;
  const red = isArticle ? STATE.config.seuilRougeArticle : STATE.config.seuilRougeCommande;
  if (min >= red) return 'red';
  if (min >= orange) return 'orange';
  return 'green';
}

function showToast(msg, type = 'default') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transition = 'opacity .3s'; }, 2200);
  setTimeout(() => t.remove(), 2600);
}

function generateId(prefix) {
  return (prefix||'id') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2,5);
}

function getLignes(cmd) {
  if (!cmd.lignes) return [];
  if (Array.isArray(cmd.lignes)) return cmd.lignes;
  try { return JSON.parse(cmd.lignes); } catch(e) { return []; }
}

function saveLignes(cmd, lignes) {
  cmd.lignes = lignes;
}

// ============================================================
// DEBUG PANEL
// ============================================================
function dbg(msg, data) {
  const ts = new Date().toISOString().substr(11,12);
  const line = `[${ts}] ${msg}` + (data !== undefined ? ' → ' + JSON.stringify(data).substr(0,200) : '');
  console.log(line);
  const panel = document.getElementById('debug-panel');
  if (panel) {
    const el = document.createElement('div');
    el.textContent = line;
    panel.prepend(el);
    if (panel.children.length > 30) panel.lastChild.remove();
  }
}

function toggleDebug() {
  const wrap = document.getElementById('debug-wrap');
  if (wrap) wrap.style.display = wrap.style.display === 'none' ? 'block' : 'none';
}

// ============================================================
// WEB AUDIO
// ============================================================
function initAudioContext() {
  if (!STATE.audioCtx) {
    STATE.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (STATE.audioCtx.state === 'suspended') STATE.audioCtx.resume();
  STATE.audioEnabled = true;
  showToast('Son activé', 'success');
}

function openSonModal() {
  initAudioContext();
  playBip();
}

function playBip(freq = 880, dur = 0.15) {
  if (!STATE.audioCtx) return;
  try {
    const osc = STATE.audioCtx.createOscillator();
    const gain = STATE.audioCtx.createGain();
    osc.connect(gain); gain.connect(STATE.audioCtx.destination);
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, STATE.audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, STATE.audioCtx.currentTime + dur);
    osc.start(); osc.stop(STATE.audioCtx.currentTime + dur + 0.05);
  } catch(e) {}
}

function playNewOrder() {
  playBip(660, 0.1);
  setTimeout(() => playBip(880, 0.15), 120);
  if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
}

// ============================================================
// WAKE LOCK
// ============================================================
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      STATE.wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch(e) {}
}

// ============================================================
// NAV AUTO-MASQUANTE
// ============================================================
let _navHideTimer = null;

function showBottomNav() {
  const nav = document.querySelector('.nav-bottom');
  if (nav) nav.classList.remove('nav-hidden');
  clearTimeout(_navHideTimer);
  _navHideTimer = setTimeout(hideBottomNav, 5000);
}

function hideBottomNav() {
  const nav = document.querySelector('.nav-bottom');
  if (nav) nav.classList.add('nav-hidden');
}

function initNavAutoHide() {
  let _touchStartY = 0;
  document.addEventListener('touchstart', (e) => {
    _touchStartY = e.touches[0].clientY;
    // Touch dans la zone basse (80px du bas) → toujours montrer le nav
    if (_touchStartY > window.innerHeight - 80) showBottomNav();
    else { clearTimeout(_navHideTimer); _navHideTimer = setTimeout(hideBottomNav, 5000); }
  }, { passive: true });
  document.addEventListener('touchend', (e) => {
    const endY = e.changedTouches[0].clientY;
    const deltaY = _touchStartY - endY; // positif = swipe vers le haut
    if (deltaY > 25 && _touchStartY > window.innerHeight - 200) showBottomNav();
  }, { passive: true });
  // Cacher après 4s au démarrage
  _navHideTimer = setTimeout(hideBottomNav, 4000);
}
