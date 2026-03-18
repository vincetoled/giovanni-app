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
      if (c.chips_commentaires)     STATE.config.chips                = c.chips_commentaires;
      if (c.seuil_orange_commande)  STATE.config.seuilOrangeCommande  = parseInt(c.seuil_orange_commande);
      if (c.seuil_rouge_commande)   STATE.config.seuilRougeCommande   = parseInt(c.seuil_rouge_commande);
      if (c.seuil_rouge_article)    STATE.config.seuilRougeArticle    = parseInt(c.seuil_rouge_article);
      if (c.seuil_orange_article)   STATE.config.seuilOrangeArticle   = parseInt(c.seuil_orange_article);
      if (c.email_destinataires)    STATE.config.email_destinataires  = c.email_destinataires;
      if (c.zones_salle)            STATE.config.zones                = c.zones_salle;
      if (c.nb_couverts_max)        STATE.config.nbCouvertsMax        = parseInt(c.nb_couverts_max);
      if (c.duree_repas_cible)      STATE.config.dureeRepasCible      = parseInt(c.duree_repas_cible);
      if (c.tva_taux !== undefined) STATE.config.tva_taux             = parseFloat(c.tva_taux);
      if (c.ticket_prefix_emporter) STATE.config.ticketPrefixEmporter = String(c.ticket_prefix_emporter);
      if (c.son_actif !== undefined) STATE.config.sonActif            = c.son_actif === true || c.son_actif === 'true';
      if (c.nom_restaurant)         STATE.config.nomRestaurant        = String(c.nom_restaurant);
      if (c.menu_qr_actif !== undefined) STATE.config.menuQrActif     = c.menu_qr_actif === true || c.menu_qr_actif === 'true';
      if (c.message_bienvenu_qr !== undefined) STATE.config.messageBienvenuQr = String(c.message_bienvenu_qr);
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
