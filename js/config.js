// ============================================================
// CONFIG
// ============================================================
const CONFIG = {
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbx0wSPwI7fA-oOWbmkscPssXGq1eHtJShkESvo91gpycVLPU2an4jVgAhnmGCnMixTMgQ/exec",
  POLL_SERVICE: 4000,
  POLL_STATION: 6000,
  FETCH_TIMEOUT: 15000,   // Augmenté 8→15s (GAS peut être lent au réveil)
  RETRY_DELAY: 2000,
  OFFLINE_FAILURES_THRESHOLD: 3,  // Nb d'échecs consécutifs avant afficher "offline"
};

// ============================================================
// STATE
// ============================================================
let STATE = {
  menu: [],
  categories: [],
  commandes: [],
  config: {
    chips: ["Pâtes","Frites","Salade","Légumes","Sans oignons","Bien cuit","Saignant","Sans gluten","Allergie","À part"],
    seuilOrangeCommande: 15,
    seuilRougeCommande: 25,
    seuilRougeArticle: 15,
    seuilOrangeArticle: 10,
    zones: [
      { nom: 'Salle',     icon: '🪑' },
      { nom: 'Terrasse',  icon: '☀️' },
      { nom: 'Extérieur', icon: '🌿' },
    ],
    nbCouvertsMax: 8,
    dureeRepasCible: 90,
    tva_taux: 10,
    ticketPrefixEmporter: '#',
    sonActif: true,
    nomRestaurant: 'Ristorante Giovanni',
    menuQrActif: true,
    messageBienvenuQr: '',
  },
  currentView: 'service',
  adminUnlocked: false,
  isOnline: true,
  consecutiveFailures: 0,  // Compteur pour éviter les faux "offline"
  writeQueue: [],
  writeInProgress: false,
  terminalId: '',
  pollingTimer: null,
  prevCommandeIds: new Set(),
  prevPretLigneIds: new Set(),
  audioEnabled: false,
  audioCtx: null,
  wakeLock: null,
  burgerWarnings: new Set(),
  winePopupShown: new Set(),   // Tables ayant déjà vu le popup vin
  pendingClientAlert: false,
  ruptureContext: null,
  // Edit modal state
  editCommande: null,
  editCatFilter: null,
  ticketCounter: parseInt(localStorage.getItem('gio_ticket') || '0'),
};

// Tracks when each ligne was marked prêt this session (key: cmdId+'_'+ligneId → timestamp)
const PRET_TIMES = {};
// Station-cards where the user clicked to show expired (>30s) prêt items (key: cmdId)
const SHOW_EXPIRED_PRET = new Set();
