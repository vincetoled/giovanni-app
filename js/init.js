// ============================================================
// NAVIGATION
// ============================================================
function showView(name) {
  if (name === 'admin' && !STATE.adminUnlocked) {
    showPinModal();
    return;
  }
  showBottomNav();
  STATE.currentView = name;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const v = document.getElementById('view-' + name);
  if (v) v.classList.add('active');
  const n = document.getElementById('nav-' + name);
  if (n) n.classList.add('active');
  // Redémarrer polling avec bon intervalle
  stopPolling(); startPolling();
  renderCurrentView();
}

function renderCurrentView(force) {
  switch(STATE.currentView) {
    case 'service': renderService(); break;
    case 'cuisine': renderStation('cuisine'); break;
    case 'bar': renderStation('bar'); break;
    case 'admin':
      // Ne pas re-rendre l'Admin pendant le polling si un champ est en cours de saisie
      if (force || !document.getElementById('admin-content')?.contains(document.activeElement)) {
        renderAdmin();
      }
      break;
  }
}

// ============================================================
// INITIALISATION
// ============================================================
async function init() {
  STATE.terminalId = getTerminalId();

  if (!CONFIG.APPS_SCRIPT_URL) {
    showToast('URL Apps Script non configurée — mode démo', 'warning');
    renderService();
    return;
  }

  // Charger menu + config en parallèle
  try {
    const [menuRes, configRes] = await Promise.all([
      apiGet('getMenu'),
      apiGet('getConfig'),
    ]);

    if (menuRes.menu) {
      STATE.menu = menuRes.menu;
      STATE.categories = [...new Set(STATE.menu.map(m => m.categorie))];
    }

    if (configRes.config) {
      const c = configRes.config;
      if (c.chips_commentaires) STATE.config.chips = c.chips_commentaires;
      if (c.seuil_orange_commande) STATE.config.seuilOrangeCommande = parseInt(c.seuil_orange_commande);
      if (c.seuil_rouge_commande) STATE.config.seuilRougeCommande = parseInt(c.seuil_rouge_commande);
      if (c.seuil_rouge_article) STATE.config.seuilRougeArticle = parseInt(c.seuil_rouge_article);
      if (c.email_destinataires) STATE.config.email_destinataires = c.email_destinataires;
    }
    setOnline(true);
  } catch(e) {
    setOnline(false);
    showToast('Impossible de charger les données', 'error');
  }

  await requestWakeLock();
  initNavAutoHide();
  startPolling();
  renderService();
}

document.addEventListener('DOMContentLoaded', init);
// Réactiver Wake Lock si page reprend le focus
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) requestWakeLock();
});
