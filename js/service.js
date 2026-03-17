// ============================================================
// VUE SERVICE
// ============================================================
function renderService() {
  const el = document.getElementById('service-content');
  if (!el) return;

  const surPlace = STATE.commandes.filter(c =>
    c.type === 'sur_place' && c.statut !== 'payée' && c.statut !== 'refusée');
  const emporter = STATE.commandes.filter(c =>
    c.type === 'emporter' && c.statut !== 'payée' && c.statut !== 'refusée');
  const clients = STATE.commandes.filter(c => c.statut === 'en_attente_validation');

  let html = '';

  // Demandes client en attente
  if (clients.length > 0) {
    html += '<div class="section-title">📱 Demandes client (' + clients.length + ')</div>';
    clients.forEach(c => {
      const lignes = getLignes(c);
      const total = lignes.reduce((s,l) => s + l.prix * (l.qte||1), 0);
      html += `<div class="card" style="border-color:var(--orange);margin-bottom:8px;animation:pulse-orange 1.5s ease-in-out infinite">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <span class="badge badge-client">📱 CLIENT</span>
          <strong style="font-size:15px">Table ${c.table}</strong>
          <span style="margin-left:auto;font-size:14px;color:var(--or)">${formatPrice(total)}</span>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">${lignes.map(l=>(l.qte||1)+'× '+l.nom+(l.commentaire?' — '+l.commentaire:'')).join('<br>')}</div>
        <div style="display:flex;gap:8px">
          <button class="btn btn-success" style="padding:8px;font-size:13px" onclick="validerDemandeClient('${c.id}')">✓ Valider</button>
          <button class="btn btn-danger" style="padding:8px;font-size:13px" onclick="refuserDemandeClient('${c.id}')">✕ Refuser</button>
        </div>
      </div>`;
    });
  }

  // Tables sur place
  html += '<div class="section-title">Tables</div>';
  html += '<div class="tables-grid">';

  // Bouton nouvelle table
  html += `<button class="btn-new-table" onclick="openModalNewCommande()">
    <span class="plus">+</span>
    <span>Nouvelle table</span>
  </button>`;

  surPlace.forEach(c => {
    html += renderTableCard(c);
  });

  html += '</div>';

  // Emporter
  if (emporter.length > 0 || true) {
    html += '<div class="section-title">Emporter</div>';
    html += '<div class="tables-grid">';
    html += `<button class="btn-new-table" onclick="openModalNewCommandeEmporter()">
      <span class="plus">+</span>
      <span>Nouvel emporté</span>
    </button>`;
    emporter.forEach(c => html += renderEmporterCard(c));
    html += '</div>';
  }

  el.innerHTML = html;

  // Démarrer chronomètres
  startServiceTimers();
}

function renderTableCard(c) {
  const lignes = getLignes(c);
  const now = Date.now();
  const ref = c.sentAt ? parseInt(c.sentAt) : parseInt(c.createdAt);
  const elapsed = ref ? now - ref : 0;
  const tClass = c.statut === 'ouverte' ? timerClass(elapsed, false) : 'green';
  const tStr = c.statut === 'ouverte' && ref ? formatTimer(elapsed) : '';

  const pretAll = isPretAll(c);
  const pretPartial = !pretAll && isPretPartial(c);
  const isLocked = isLockedByOther(c);
  const isBrouillon = c.statut === 'brouillon';

  let badges = '';
  if (c.vip) badges += '<span class="badge badge-vip">⭐ VIP</span>';
  if (isBrouillon) badges += '<span class="badge badge-brouillon">Brouillon</span>';
  if (pretAll) badges += `<span class="pret-all-badge pret-all-badge-clickable" onclick="event.stopPropagation();showPretDetail('${c.id}',event)">✓ Tout prêt</span>`;
  if (pretPartial) badges += `<span class="pret-partial-badge" onclick="event.stopPropagation();showPretDetail('${c.id}',event)">◑ En partie prêt</span>`;
  if (c.zone) badges += `<span class="badge" style="background:rgba(107,140,58,.15);color:#6B8C3A;border-color:rgba(107,140,58,.3)">${c.zone}</span>`;

  let cardClass = 'table-card';
  if (c.statut !== 'brouillon') cardClass += ' has-order';
  if (pretAll) cardClass += ' pret-all';
  if (pretPartial) cardClass += ' pret-partial';
  if (isLocked) cardClass += ' locked';

  const totalItems = lignes.reduce((s,l) => s + (l.qte||1), 0);

  const burgerBanner = STATE.burgerWarnings.has(c.id)
    ? `<div class="burger-warning" id="burger-warning-${c.id}">
        <span>⏱ Burger — prévoir +5 min de cuisson</span>
        <button class="burger-warning-close" onclick="event.stopPropagation();closeBurgerWarning('${c.id}')">✕</button>
       </div>`
    : '';

  return `<div class="${cardClass}" onclick="openTableActions('${c.id}')" data-cmdid="${c.id}" data-sentAt="${c.sentAt || c.createdAt}">
    <div style="display:flex;align-items:flex-start;justify-content:space-between">
      <div class="table-num">${c.table}</div>
      ${c.couverts ? `<div class="table-info">👥 ${c.couverts}</div>` : ''}
    </div>
    ${badges ? '<div class="table-badges">' + badges + '</div>' : ''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:auto">
      <div class="table-info">${totalItems} article${totalItems > 1 ? 's' : ''}</div>
      ${tStr ? `<div class="table-timer ${tClass}" data-timer="${c.id}">${tStr}</div>` : ''}
    </div>
    ${burgerBanner}
  </div>`;
}

function renderEmporterCard(c) {
  const lignes = getLignes(c);
  const now = Date.now();
  const ref = c.sentAt ? parseInt(c.sentAt) : parseInt(c.createdAt);
  const elapsed = ref ? now - ref : 0;
  const tClass = c.statut === 'ouverte' ? timerClass(elapsed, false) : 'green';
  const tStr = c.statut === 'ouverte' && ref ? formatTimer(elapsed) : '';
  const pretAll = isPretAll(c);
  const totalItems = lignes.reduce((s,l) => s + (l.qte||1), 0);

  return `<div class="emporter-card" onclick="openTableActions('${c.id}')" data-cmdid="${c.id}" data-sentAt="${c.sentAt||c.createdAt}">
    <div class="emporter-num">#${String(c.table).padStart(4,'0')}</div>
    <div style="font-size:12px;color:var(--text-muted)">${totalItems} article${totalItems>1?'s':''}</div>
    ${pretAll ? '<span class="pret-all-badge">✓ Prêt</span>' : ''}
    ${tStr ? `<div class="table-timer ${tClass}">${tStr}</div>` : ''}
  </div>`;
}

function isPretAll(cmd) {
  const lignes = getLignes(cmd);
  if (lignes.length === 0) return false;
  // Au moins un article encore en "prêt" (pas encore emporté), et tous sont prêts ou servis
  const hasPret = lignes.some(l => l.statut === 'prêt');
  return hasPret && lignes.every(l => l.statut === 'prêt' || l.statut === 'servi');
}

function isPretPartial(cmd) {
  const lignes = getLignes(cmd);
  if (lignes.length === 0) return false;
  const hasPret = lignes.some(l => l.statut === 'prêt' || l.statut === 'servi');
  const hasPending = lignes.some(l => l.statut === 'en_attente' || l.statut === 'en préparation');
  return hasPret && hasPending;
}

// ============================================================
// QUICK ACTIONS — TABLE CARD
// ============================================================
function openTableActions(cmdId) {
  const cmd = STATE.commandes.find(c => c.id === cmdId);
  if (!cmd) return;
  // Brouillon / en_attente_validation : ouvrir directement la modale
  if (cmd.statut !== 'ouverte') { openModalEditCommande(cmdId); return; }

  const lignes = getLignes(cmd);
  const total = lignes.reduce((s,l) => s + (parseFloat(l.prix)||0)*(l.qte||1), 0);
  const totalItems = lignes.reduce((s,l) => s + (l.qte||1), 0);
  const label = cmd.type === 'emporter'
    ? 'Emporté #' + String(cmd.table).padStart(4,'0')
    : 'Table ' + cmd.table;

  // Résumé des 4 premiers articles pour le popup
  const topItems = lignes.slice(0,4).map(l => `<span style="display:block;font-size:12px;color:#7A6E5F;padding:1px 0">${l.qte||1}× ${l.nom}</span>`).join('');
  const moreItems = lignes.length > 4 ? `<span style="font-size:11px;color:#7A6E5F">…et ${lignes.length-4} autre${lignes.length-4>1?'s':''}</span>` : '';

  const box = document.getElementById('confirm-popup-box');
  box.innerHTML = `
    <div class="confirm-popup-title">${label}${cmd.vip ? ' ⭐' : ''}</div>
    <div class="confirm-popup-detail">${totalItems} article${totalItems>1?'s':''} · <strong>${formatPrice(total)}</strong></div>
    <div style="margin-bottom:14px">${topItems}${moreItems}</div>
    <button class="confirm-popup-ok" style="width:100%;margin-bottom:8px;background:#5C6B3A;font-size:15px;padding:14px"
      onclick="closeConfirmPopup();encaisserDirect('${cmdId}')">💳 Encaisser — ${formatPrice(total)}</button>
    <div class="confirm-popup-btns" style="margin-top:0">
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup();openModalEditCommande('${cmdId}')">✏️ Modifier</button>
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup();showPretDetail('${cmdId}',null)">📋 Détail</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

async function encaisserDirect(cmdId) {
  const cmd = STATE.commandes.find(c => c.id === cmdId);
  if (!cmd) return;
  STATE.editCommande = cmd;
  encaisser();
}

function showPretDetail(cmdId, e) {
  if (e) e.stopPropagation();
  const cmd = STATE.commandes.find(c => c.id === cmdId);
  if (!cmd) return;
  const lignes = getLignes(cmd);
  const label = cmd.type === 'emporter'
    ? 'Emporté #' + String(cmd.table).padStart(4,'0')
    : 'Table ' + cmd.table;

  const prets = lignes.filter(l => l.statut === 'prêt');
  const enCours = lignes.filter(l => l.statut !== 'prêt' && l.statut !== 'servi');
  const servis = lignes.filter(l => l.statut === 'servi');

  const listHtml = (arr, icon, color) => arr.length === 0 ? '' :
    `<div style="margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:${color};text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">${icon} ${arr.length} article${arr.length>1?'s':''}</div>
      ${arr.map(l => `<div style="padding:4px 0;font-size:13px;border-bottom:1px solid rgba(0,0,0,.06)">${l.qte||1}× ${l.nom}${l.commentaire ? `<span style="font-size:11px;color:#7A6E5F;margin-left:6px">— ${l.commentaire}</span>` : ''}</div>`).join('')}
    </div>`;

  const box = document.getElementById('confirm-popup-box');
  box.innerHTML = `
    <div class="confirm-popup-title">${label}</div>
    ${listHtml(prets, '✅ Prêt à emporter', '#6B8C3A')}
    ${listHtml(enCours, '⏳ En préparation', '#D4831A')}
    ${listHtml(servis, '✓ Déjà servi', '#7A6E5F')}
    ${prets.length > 0 ? `<button class="confirm-popup-ok" style="width:100%;margin-bottom:8px;background:#4CAF7D;font-size:14px;padding:13px"
      onclick="closeConfirmPopup();confirmerServiTable('${cmdId}')">✓ Confirmer servi (${prets.length} article${prets.length>1?'s':''})</button>` : ''}
    <div class="confirm-popup-btns" style="margin-top:0">
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup()">Fermer</button>
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup();openModalEditCommande('${cmdId}')">✏️ Modifier</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

function _upsertCommande(cmd) {
  const idx = STATE.commandes.findIndex(c => c.id === cmd.id);
  if (idx >= 0) STATE.commandes[idx] = cmd;
  else STATE.commandes.push(cmd);
}

function isLockedByOther(cmd) {
  if (!cmd.lockedBy) return false;
  try {
    const lock = typeof cmd.lockedBy === 'string' ? JSON.parse(cmd.lockedBy) : cmd.lockedBy;
    if (!lock || !lock.terminalId) return false;
    if (lock.terminalId === STATE.terminalId) return false;
    const age = Date.now() - (lock.timestamp || 0);
    return age < 60000;
  } catch(e) { return false; }
}

let serviceTimerInterval = null;
function startServiceTimers() {
  if (serviceTimerInterval) clearInterval(serviceTimerInterval);
  serviceTimerInterval = setInterval(() => {
    document.querySelectorAll('[data-timer]').forEach(el => {
      const cmdId = el.getAttribute('data-timer');
      const cmd = STATE.commandes.find(c => c.id === cmdId);
      if (!cmd || cmd.statut !== 'ouverte') return;
      const ref = cmd.sentAt ? parseInt(cmd.sentAt) : parseInt(cmd.createdAt);
      if (!ref) return;
      const elapsed = Date.now() - ref;
      el.textContent = formatTimer(elapsed);
      el.className = 'table-timer ' + timerClass(elapsed, false);
    });
  }, 1000);
}

// ============================================================
// MODAL NOUVELLE COMMANDE — FLUX 4 PHASES
// ============================================================
function openModalNewCommande() {
  STATE.editCommande = { id: null, type: 'sur_place', lignes: [], statut: 'brouillon', couverts: '', vip: false, allergie: '', aperitif: false, zone: '' };
  showModalPhase1();
}

function openModalNewCommandeEmporter() {
  STATE.editCommande = { id: null, type: 'emporter', lignes: [], statut: 'brouillon', couverts: '', vip: false, allergie: '', aperitif: false };
  showModalPhase3Couverts();
}

function _phaseStepperHtml(active) {
  const steps = ['Type','Zone','Table','Couverts','Articles'];
  return '<div class="phase-stepper">' + steps.map((s,i) => {
    const cls = i < active ? 'done' : (i === active ? 'active' : '');
    return `<div class="phase-step ${cls}">${s}</div>`;
  }).join('') + '</div>';
}

// Phase 1 — type de commande
function showModalPhase1() {
  document.getElementById('modal-title').textContent = 'Nouvelle commande';
  document.getElementById('modal-body').innerHTML =
    _phaseStepperHtml(0) +
    `<div class="phase1-btns">
      <button class="phase1-btn" onclick="STATE.editCommande.type='sur_place';showModalPhase15Zone()">
        <span class="p1-icon">🪑</span>Sur place
      </button>
      <button class="phase1-btn" onclick="STATE.editCommande.type='emporter';showModalPhase3Couverts()">
        <span class="p1-icon">🥡</span>À emporter
      </button>
    </div>`;
  document.getElementById('modal-footer').innerHTML = '';
  openModal();
}

// Phase 1.5 — sélection de zone
function showModalPhase15Zone() {
  const zones = [
    { nom: 'Salle', icon: '🪑' },
    { nom: 'Terrasse', icon: '☀️' },
    { nom: 'Extérieur', icon: '🌿' },
  ];
  const tilesHtml = zones.map(z =>
    `<button class="phase1-btn" onclick="STATE.editCommande.zone='${z.nom}';showModalPhase2Tables()">
      <span class="p1-icon">${z.icon}</span>${z.nom}
    </button>`
  ).join('');
  document.getElementById('modal-title').textContent = 'Zone';
  document.getElementById('modal-body').innerHTML =
    _phaseStepperHtml(1) +
    `<div class="phase1-btns" style="grid-template-columns:repeat(3,1fr)">${tilesHtml}</div>`;
  document.getElementById('modal-footer').innerHTML =
    `<button class="btn btn-secondary" onclick="showModalPhase1()">← Retour</button>`;
}

// Phase 2 — sélection de table
function showModalPhase2Tables() {
  const maxTables = parseInt(STATE.config.nbTables || 20);
  let tilesHtml = '';
  for (let i = 1; i <= maxTables; i++) {
    const existing = STATE.commandes.find(c =>
      (c.statut === 'ouverte' || c.statut === 'brouillon') && String(c.table) === String(i)
    );
    if (existing) {
      const ref = existing.sentAt ? parseInt(existing.sentAt) : parseInt(existing.createdAt);
      const elapsed = ref ? Date.now() - ref : 0;
      tilesHtml += `<div class="phase-table-tile occupee" onclick="openModalEditCommande('${existing.id}');closeModal()">
        ${i}<div class="tile-sub">${formatTimer(elapsed)}</div>
      </div>`;
    } else {
      tilesHtml += `<div class="phase-table-tile libre" onclick="STATE.editCommande.table='${i}';showModalPhase3Couverts()">
        ${i}<div class="tile-sub">Libre</div>
      </div>`;
    }
  }
  document.getElementById('modal-title').textContent = 'Sélectionner une table';
  document.getElementById('modal-body').innerHTML =
    _phaseStepperHtml(2) +
    `<div class="phase-tables-grid">${tilesHtml}</div>`;
  document.getElementById('modal-footer').innerHTML =
    `<button class="btn btn-secondary" onclick="showModalPhase15Zone()">← Retour</button>`;
}

// Phase 3 — couverts
function showModalPhase3Couverts() {
  const isEmporter = STATE.editCommande.type === 'emporter';
  let tilesHtml = '';
  for (let i = 1; i <= 8; i++) {
    tilesHtml += `<div class="couvert-tile" onclick="STATE.editCommande.couverts='${i}';showModalPhase35()">${i}</div>`;
  }
  document.getElementById('modal-title').textContent = isEmporter
    ? 'Nouvel emporté'
    : 'Table ' + (STATE.editCommande.table || '');
  document.getElementById('modal-body').innerHTML =
    _phaseStepperHtml(3) +
    `<div style="font-size:13px;color:var(--text-muted);padding:8px 0 4px">Nombre de couverts</div>
    <div class="couverts-grid">${tilesHtml}</div>
    <button class="couvert-tile" style="width:100%;border-radius:10px;margin-top:4px;font-size:14px;font-weight:500;padding:14px;background:rgba(255,255,255,.05);border:1px solid var(--border)"
      onclick="askAutreCouverts()">Autre…</button>`;
  document.getElementById('modal-footer').innerHTML =
    `<button class="btn btn-secondary" onclick="${isEmporter ? 'showModalPhase1()' : 'showModalPhase2Tables()'}" >← Retour</button>
     <button class="btn btn-outline" onclick="STATE.editCommande.couverts='';showModalPhase35()">Passer →</button>`;
}

function askAutreCouverts() {
  const val = prompt('Nombre de couverts :');
  if (val && parseInt(val) > 0) {
    STATE.editCommande.couverts = val;
    showModalPhase35();
  }
}

// Phase 3.5 — allergies + apéritif + VIP
let _phase35State = { allergie: false, selectedAllergies: [], aperitif: false, vip: false };

function showModalPhase35() {
  _phase35State = { allergie: false, selectedAllergies: [], aperitif: true, vip: false };
  const allergies = ['Gluten','Lactose','Fruits à coque','Crustacés','Autre'];
  const allergyChips = allergies.map(a =>
    `<div class="allergy-chip" id="achip-${a}" onclick="toggleAllergyChip('${a}')">${a}</div>`
  ).join('');

  document.getElementById('modal-title').textContent = 'Avant de commencer…';
  document.getElementById('modal-body').innerHTML =
    _phaseStepperHtml(3) +
    `<div class="phase35-q">
      <div class="phase35-label">🌿 Allergies à signaler ?</div>
      <div class="phase35-btns">
        <button class="phase35-btn" id="btn-allergie-non" onclick="setAllergie(false)">Non / Passer</button>
        <button class="phase35-btn oui" id="btn-allergie-oui" onclick="setAllergie(true)">Oui</button>
      </div>
      <div id="allergie-detail" style="display:none">
        <div class="allergy-chips">${allergyChips}</div>
        <input id="allergie-libre" class="comment-input" style="margin-top:8px" placeholder="Préciser (optionnel)…">
      </div>
    </div>
    <div class="phase35-q">
      <div class="phase35-label">🥂 Apéritif pour commencer ?</div>
      <div class="phase35-btns">
        <button class="phase35-btn" id="btn-aper-non" onclick="setAperitif(false)">Non / Passer</button>
        <button class="phase35-btn oui selected" id="btn-aper-oui" onclick="setAperitif(true)">Oui →</button>
      </div>
    </div>
    <div class="phase35-q">
      <div class="phase35-label">⭐ Table VIP ?</div>
      <div class="phase35-btns">
        <button class="phase35-btn selected" id="btn-vip-non" onclick="setVip(false)">Non</button>
        <button class="phase35-btn oui" id="btn-vip-oui" onclick="setVip(true)">Oui — VIP ⭐</button>
      </div>
    </div>`;
  document.getElementById('modal-footer').innerHTML =
    `<button class="btn btn-secondary" onclick="showModalPhase3Couverts()">← Retour</button>
     <button class="btn btn-primary" onclick="finaliserPhase35()">Continuer →</button>`;
}

function setAllergie(yes) {
  _phase35State.allergie = yes;
  document.getElementById('btn-allergie-oui').classList.toggle('selected', yes);
  document.getElementById('btn-allergie-non').classList.toggle('selected', !yes);
  document.getElementById('allergie-detail').style.display = yes ? 'block' : 'none';
}

function setAperitif(yes) {
  _phase35State.aperitif = yes;
  document.getElementById('btn-aper-oui').classList.toggle('selected', yes);
  document.getElementById('btn-aper-non').classList.toggle('selected', !yes);
}

function setVip(yes) {
  _phase35State.vip = yes;
  document.getElementById('btn-vip-oui').classList.toggle('selected', yes);
  document.getElementById('btn-vip-non').classList.toggle('selected', !yes);
}

function toggleAllergyChip(a) {
  const chips = _phase35State.selectedAllergies;
  const idx = chips.indexOf(a);
  if (idx >= 0) chips.splice(idx, 1);
  else chips.push(a);
  document.getElementById('achip-' + a)?.classList.toggle('active', idx < 0);
}

function finaliserPhase35() {
  if (_phase35State.allergie) {
    const libre = document.getElementById('allergie-libre')?.value || '';
    const parts = [..._phase35State.selectedAllergies];
    if (libre) parts.push(libre);
    STATE.editCommande.allergie = parts.join(', ') || 'Oui';
  } else {
    STATE.editCommande.allergie = '';
  }
  STATE.editCommande.aperitif = _phase35State.aperitif;
  STATE.editCommande.vip = _phase35State.vip;

  // Finaliser la commande
  if (STATE.editCommande.type === 'emporter') {
    STATE.ticketCounter++;
    localStorage.setItem('gio_ticket', STATE.ticketCounter);
    STATE.editCommande.table = STATE.ticketCounter;
  }
  STATE.editCommande.id = generateId('cmd');
  STATE.editCommande.createdAt = Date.now();
  STATE.editCommande.updatedAt = Date.now();
  STATE.editCommande.source = 'service';

  if (_phase35State.aperitif) {
    // Navigation directe vers les Apéritifs
    const aperCat = STATE.categories.find(c => c === 'Apéritifs')
      || STATE.categories.find(c => c.toLowerCase().includes('apér'))
      || STATE.categories[0] || null;
    STATE.editCatFilter = aperCat;
    showModalArticles();
  } else {
    STATE.editCatFilter = STATE.categories[0] || null;
    showModalCatPicker(false);
  }
}

// Phase 4a — sélection de catégorie (tuiles)
const CAT_ORDER = [
  'Apéritifs',
  'Entrées','Salades',
  'Pizzas Classiques','Pizzas Gourmandes','Pâtes','Escalopes Italiennes','Viandes Rouges','Poissons & Fruits de Mer','Burgers','Menu Bambino',
  'Desserts','Glaces',
  'Cocktails Classiques','Cocktails Signature','Mocktails','Bières Pressions','Bières Bouteilles','Vins','Boissons Fraîches','Eaux Minérales','Boissons Chaudes',
  'Suppléments',
];

// Groupes pour les séparateurs dans le récap
const RECAP_GROUPS = [
  { label: '🥂 Apéritif', cats: ['Apéritifs'] },
  { label: '🥗 Entrées', cats: ['Entrées','Salades'] },
  { label: '🍝 Plats', cats: ['Pizzas Classiques','Pizzas Gourmandes','Pâtes','Escalopes Italiennes','Viandes Rouges','Poissons & Fruits de Mer','Burgers','Menu Bambino'] },
  { label: '🍮 Desserts', cats: ['Desserts','Glaces'] },
  { label: '🍷 Boissons', cats: ['Cocktails Classiques','Cocktails Signature','Mocktails','Bières Pressions','Bières Bouteilles','Vins','Boissons Fraîches','Eaux Minérales','Boissons Chaudes'] },
  { label: '➕ Suppléments', cats: ['Suppléments'] },
];

function _getRecapGroup(cat) {
  return RECAP_GROUPS.find(g => g.cats.includes(cat));
}

const CAT_GROUPS = [
  { icon: '🥗', label: 'Entrées & Salades',     sub: 'Entrées, Salades',           cats: ['Entrées','Salades'] },
  { icon: '🍕', label: 'Pizzas',                 sub: 'Classiques & Gourmandes',    cats: ['Pizzas Classiques','Pizzas Gourmandes'] },
  { icon: '🍝', label: 'Pâtes & Escalopes',      sub: 'Pâtes, Escalopes Italiennes',cats: ['Pâtes','Escalopes Italiennes'] },
  { icon: '🥩', label: 'Viandes & Poissons',     sub: 'Viandes, Poissons',          cats: ['Viandes Rouges','Poissons & Fruits de Mer'] },
  { icon: '🍔', label: 'Burgers',                sub: '',                           cats: ['Burgers'] },
  { icon: '🍨', label: 'Desserts & Glaces',      sub: 'Desserts, Glaces',           cats: ['Desserts','Glaces'] },
  { icon: '🧒', label: 'Menu Bambino',           sub: '',                           cats: ['Menu Bambino'] },
  { icon: '🍹', label: 'Boissons',               sub: 'Apéritifs, Cocktails, Bières…',cats: ['Apéritifs','Cocktails Classiques','Cocktails Signature','Mocktails','Bières Pressions','Bières Bouteilles','Vins','Boissons Fraîches','Eaux Minérales','Boissons Chaudes'] },
  { icon: '➕', label: 'Suppléments',            sub: '',                           cats: ['Suppléments'] },
];

function showModalCatPicker(aperitifSelected) {
  const tilesHtml = CAT_GROUPS.map((g, i) => {
    const hl = aperitifSelected && g.label === 'Boissons' ? ' highlight' : '';
    return `<div class="cat-picker-tile${hl}" onclick="pickCatGroup(${i})">
      <div class="cat-picker-icon">${g.icon}</div>
      <div>
        <div class="cat-picker-label">${g.label}</div>
        ${g.sub ? `<div class="cat-picker-sub">${g.sub}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  const label = STATE.editCommande.type === 'emporter'
    ? 'Emporté #' + String(STATE.editCommande.table || '').padStart(4,'0')
    : 'Table ' + (STATE.editCommande.table || '');
  document.getElementById('modal-title').textContent = label;
  document.getElementById('modal-body').innerHTML =
    _phaseStepperHtml(4) +
    `<div class="cat-picker-grid">${tilesHtml}</div>`;
  document.getElementById('modal-footer').innerHTML =
    `<button class="btn btn-secondary" onclick="showModalPhase35()">← Retour</button>
     <button class="btn btn-outline" onclick="showModalArticles()">Voir tout →</button>`;
}

function pickCatGroup(groupIdx) {
  const group = CAT_GROUPS[groupIdx];
  // Trouver la première catégorie du groupe présente dans le menu
  const found = group.cats.find(c => STATE.categories.includes(c));
  STATE.editCatFilter = found || STATE.categories[0] || null;
  showModalArticles();
}

// ============================================================
// MODAL ÉDITION COMMANDE EXISTANTE
// ============================================================
async function openModalEditCommande(cmdId) {
  const cmd = STATE.commandes.find(c => c.id === cmdId);
  if (!cmd) return;
  if (isLockedByOther(cmd)) { showToast('✏️ En cours de modification par un autre terminal', 'warning'); return; }
  // Acquérir le verrou
  const lockData = JSON.stringify({ terminalId: STATE.terminalId, timestamp: Date.now() });
  const cmdCopy = JSON.parse(JSON.stringify(cmd));
  cmdCopy.lockedBy = lockData;
  STATE.editCommande = cmdCopy;
  STATE.editCatFilter = STATE.categories[0] || null;
  // Écrire le verrou en arrière-plan
  enqueueWrite('saveCommande', { id: cmd.id, lockedBy: lockData, updatedAt: cmd.updatedAt, ...cmdCopy });
  showModalArticles();
}

function releaseModalLock() {
  if (!STATE.editCommande || !STATE.editCommande.id) return;
  const cmd = STATE.editCommande;
  if (!cmd.lockedBy) return;
  try {
    const lock = typeof cmd.lockedBy === 'string' ? JSON.parse(cmd.lockedBy) : cmd.lockedBy;
    if (lock.terminalId !== STATE.terminalId) return;
  } catch(e) { return; }
  // Libérer le verrou
  const updated = { ...cmd, lockedBy: '' };
  enqueueWrite('saveCommande', updated);
}

// ============================================================
// MODAL ARTICLES (saisie)
// ============================================================
function showModalArticles() {
  const cmd = STATE.editCommande;
  const isNew = !STATE.commandes.find(c => c.id === cmd.id);
  const title = cmd.type === 'emporter'
    ? 'Emporté #' + String(cmd.table).padStart(4,'0')
    : 'Table ' + cmd.table;
  document.getElementById('modal-title').textContent = title;

  // Catégories disponibles (Suppléments en dernier)
  const cats = STATE.categories.filter(c => c !== 'Suppléments');
  cats.push('Suppléments');

  let catsHtml = cats.map(c =>
    `<button class="cat-btn ${STATE.editCatFilter === c ? 'active' : ''}" onclick="filterCat('${c}')">${c}</button>`
  ).join('');

  const lignes = getLignes(cmd);
  const total = lignes.reduce((s,l) => s + (parseFloat(l.prix)||0) * (l.qte||1), 0);

  let articlesHtml = _buildArticlesGridHtml();

  // Trier : articles non prêts en haut, prêts en bas
  const lignesNonPret = lignes.filter(l => l.statut !== 'prêt' && l.statut !== 'servi');
  const lignesPretServi = lignes.filter(l => l.statut === 'prêt' || l.statut === 'servi');
  let panierHtml = lignesNonPret.map(l => buildLigneHtml(l)).join('');
  if (lignesPretServi.length > 0) {
    panierHtml += `<div class="panier-statut-sep">✓ Prêt / Servi (${lignesPretServi.length})</div>`;
    panierHtml += lignesPretServi.map(l => buildLigneHtml(l, true)).join('');
  }

  document.getElementById('modal-body').innerHTML = `
    <div class="article-search">
      <span class="search-icon">🔍</span>
      <input type="search" placeholder="Rechercher un article… (3 lettres min)"
        oninput="searchArticles(this.value)" autocomplete="off">
    </div>
    <div id="search-results-box"></div>
    <div class="cats-scroll">${catsHtml}</div>
    <div class="articles-grid">${articlesHtml}</div>
    <div class="panier-section">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0 4px">
        <span style="font-size:13px;font-weight:600">Panier</span>
        ${cmd.vip ? '<span class="badge badge-vip">⭐ VIP</span>' : ''}
      </div>
      <div id="panier-lignes">${panierHtml}</div>
      <div class="panier-total">Total : ${formatPrice(total)}</div>
    </div>`;

  const footerBtns = [];
  if (isNew || cmd.statut === 'brouillon') {
    if (lignes.length > 0) {
      footerBtns.push('<button class="btn btn-primary" onclick="envoyerEnCuisine()">Envoyer en cuisine</button>');
      footerBtns.push('<button class="btn btn-success" onclick="encaisser()">Encaisser</button>');
    } else {
      footerBtns.push('<button class="btn btn-secondary" onclick="closeModal()">Fermer</button>');
    }
  } else if (cmd.statut === 'ouverte') {
    footerBtns.push('<button class="btn btn-outline" onclick="ajouterLignesCommande()">+ Ajouter</button>');
    footerBtns.push('<button class="btn btn-success" onclick="encaisser()">Encaisser</button>');
  }

  document.getElementById('modal-footer').innerHTML = footerBtns.join('');
  openModal();
  attachCatSwipe();
  // Scroller l'onglet actif pour qu'il soit visible dès l'ouverture
  requestAnimationFrame(() => {
    document.querySelector('.cat-btn.active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
  });
}

const BOISSON_CATS = new Set(['Apéritifs','Cocktails Classiques','Cocktails Signature','Mocktails','Bières Pressions','Bières Bouteilles','Vins','Boissons Fraîches','Eaux Minérales','Boissons Chaudes']);
const CHIPS_ACCOM  = ['Pâtes','Frites','Salade','Légumes'];
const CHIPS_CUISSON = ['Bien cuit','Saignant'];

function getChipsForLigne(l) {
  const all = STATE.config.chips || [];
  const cat = l.categorie || '';
  if (BOISSON_CATS.has(cat)) return all.filter(c => !CHIPS_ACCOM.includes(c) && !CHIPS_CUISSON.includes(c));
  if (cat === 'Viandes Rouges') return all; // cuisson + accompagnement
  return all.filter(c => !CHIPS_CUISSON.includes(c)); // plats standards : accompagnement, pas cuisson
}

function buildLigneHtml(l, isDone) {
  const chips = getChipsForLigne(l);
  const activeChips = l.commentaire ? l.commentaire.split(' · ').filter(Boolean) : [];
  const hasDetail = activeChips.length > 0;
  const chipsHtml = chips.map(c => {
    const isActive = activeChips.includes(c);
    return `<span class="chip ${isActive ? 'active' : ''}" onclick="toggleChip('${l.id}','${c}')">${c}</span>`;
  }).join('');

  const commentIndicator = hasDetail ? '<span class="has-comment-dot" title="' + (l.commentaire||'') + '"></span>' : '';

  const suppLink = (l.commentaire || '').startsWith('→')
    ? `<span class="supp-link">${l.commentaire}</span>` : '';

  const statutBadge = isDone
    ? `<span style="font-size:10px;color:var(--olive);font-weight:700;margin-right:4px">${l.statut === 'servi' ? 'servi' : '✓'}</span>`
    : '';

  return `<div class="panier-ligne${isDone ? ' pret-done' : ''}" id="ligne-${l.id}">
    <div class="panier-ligne-header" onclick="toggleLigneDetail('${l.id}')">
      ${statutBadge}<span class="panier-nom">${(l.qte||1) > 1 ? (l.qte||1)+'× ' : ''}${l.nom}${suppLink}${commentIndicator}</span>
      <span class="panier-prix">${formatPrice((l.prix||0) * (l.qte||1))}</span>
      <div class="qte-ctrl" onclick="event.stopPropagation()">
        <button class="qte-btn" onclick="updateQte('${l.id}',-1)">−</button>
        <span class="qte-val">${l.qte||1}</span>
        <button class="qte-btn" onclick="updateQte('${l.id}',1)">+</button>
      </div>
      <button class="chip-del" onclick="event.stopPropagation();confirmRemoveLigne('${l.id}')">✕</button>
      <span class="panier-ligne-toggle">›</span>
    </div>
    <div class="panier-ligne-detail">
      <div class="chips-row">${chipsHtml}</div>
      <textarea class="comment-input" placeholder="Commentaire libre…"
        onchange="setCommentaire('${l.id}', this.value)">${l.commentaire || ''}</textarea>
    </div>
  </div>`;
}

function toggleLigneDetail(ligneId) {
  const el = document.getElementById('ligne-' + ligneId);
  if (el) el.classList.toggle('expanded');
}

function filterCat(cat) {
  STATE.editCatFilter = cat;
  // Mise à jour partielle : on ne reconstruit que la grille d'articles et les boutons de catégorie
  const grid = document.querySelector('.articles-grid');
  const catsEl = document.querySelector('.cats-scroll');
  if (grid && catsEl) {
    grid.innerHTML = _buildArticlesGridHtml();
    catsEl.querySelectorAll('.cat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.trim() === cat);
    });
    // Faire défiler l'onglet actif pour qu'il soit visible
    requestAnimationFrame(() => {
      catsEl.querySelector('.cat-btn.active')?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    });
  } else {
    showModalArticles();
  }
}

function _buildArticlesGridHtml() {
  const _orderCounts = computeMenuOrderCounts();
  const cat = STATE.editCatFilter;
  const isVins = cat === 'Vins';
  let filtered = STATE.menu.filter(m => m.categorie === cat);

  // Pour les vins : grouper par couleur puis nom, sans tri par popularité
  if (isVins) {
    filtered.sort((a, b) => {
      const { base: ba } = _splitBaseAndTaille(a.nom);
      const { base: bb } = _splitBaseAndTaille(b.nom);
      const ca = WINE_COLOR_ORDER.indexOf(_detectWineColor(ba));
      const cb = WINE_COLOR_ORDER.indexOf(_detectWineColor(bb));
      if (ca !== cb) return ca - cb;
      return ba.localeCompare(bb, 'fr');
    });
  } else {
    filtered.sort((a, b) => (_orderCounts[b.id] || 0) - (_orderCounts[a.id] || 0));
  }

  let html = '';
  const _seenBases = new Set();
  const _seenFlavors = new Set();
  let currentWineColor = null;

  filtered.forEach(m => {
    const inactive = !m.actif;

    // --- Flavor groups (ex: Kir) ---
    const flavorGroup = _getFlavorGroup(m.nom);
    if (flavorGroup) {
      if (_seenFlavors.has(flavorGroup)) return;
      _seenFlavors.add(flavorGroup);
      const items = filtered.filter(x => _getFlavorGroup(x.nom) === flavorGroup);
      const anyInCart = items.some(v => getQteInPanier(v.id) > 0);
      const cartCount = items.reduce((s, v) => s + getQteInPanier(v.id), 0);
      const qteHtml = anyInCart
        ? `<div class="art-qte-ctrl" onclick="event.stopPropagation()"><span class="art-qte-val">${cartCount}×</span></div>`
        : '';
      const safeKey = 'flavor_' + flavorGroup.replace(/[^a-zA-Z0-9]/g, '_');
      html += `<div class="article-btn ${anyInCart ? 'in-cart' : ''}" id="artg-${safeKey}"
        onclick="showFlavorPicker('${flavorGroup.replace(/'/g, "\\'")}')">
        <span class="art-nom">${FLAVOR_GROUPS[flavorGroup].label}</span>
        <div class="art-bottom-row"><span class="art-prix" style="font-size:11px;color:var(--text-muted)">Parfum…</span>${qteHtml}</div>
      </div>`;
      return;
    }

    // --- Multi-contenances (vins, cocktails, bières…) ---
    const { base, taille } = _splitBaseAndTaille(m.nom);
    if (taille) {
      const variants = filtered.filter(x => {
        const { base: b2, taille: t2 } = _splitBaseAndTaille(x.nom);
        return b2 === base && t2;
      });
      if (variants.length > 1) {
        if (_seenBases.has(base)) return;
        _seenBases.add(base);

        // Séparateur couleur vin
        if (isVins) {
          const color = _detectWineColor(base);
          if (color !== currentWineColor) {
            currentWineColor = color;
            html += `<div class="grid-section-sep" style="grid-column:1/-1">${color}</div>`;
          }
        }

        const anyInCart = variants.some(v => getQteInPanier(v.id) > 0);
        const cartCount = variants.reduce((s, v) => s + getQteInPanier(v.id), 0);
        const qteHtml = anyInCart
          ? `<div class="art-qte-ctrl" onclick="event.stopPropagation()"><span class="art-qte-val">${cartCount}×</span></div>`
          : '';
        const safeKey = base.replace(/[^a-zA-Z0-9]/g, '_');
        html += `<div class="article-btn ${anyInCart ? 'in-cart' : ''}" id="artg-${safeKey}" data-base="${base.replace(/"/g,'&quot;')}" onclick="showContenancePicker('${base.replace(/'/g, "\\'")}')">
          <span class="art-nom">${base}</span>
          <div class="art-bottom-row"><span class="art-prix" style="font-size:11px;color:var(--text-muted)">Tailles…</span>${qteHtml}</div>
        </div>`;
        return;
      }
    }

    // --- Article simple ---
    // Séparateur couleur vin pour articles sans variante
    if (isVins) {
      const color = _detectWineColor(base || m.nom);
      if (color !== currentWineColor) {
        currentWineColor = color;
        html += `<div class="grid-section-sep" style="grid-column:1/-1">${color}</div>`;
      }
    }

    const qte = cat === 'Suppléments' ? 0 : getQteInPanier(m.id);
    html += `<div class="article-btn ${inactive ? 'inactive' : ''} ${qte > 0 ? 'in-cart' : ''}"
      id="art-${m.id}"
      onclick="${inactive ? '' : `addArticle('${m.id}')`}">
      ${buildArticleTileInner(m, qte)}
    </div>`;
  });
  return html;
}

function _normalizeStr(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function searchArticles(query) {
  const box = document.getElementById('search-results-box');
  if (!box) return;
  const q = _normalizeStr(query.trim());
  if (q.length < 2) {
    box.innerHTML = '';
    box.style.display = 'none';
    document.querySelector('.cats-scroll').style.display = '';
    document.querySelector('.articles-grid').style.display = '';
    return;
  }
  const results = STATE.menu.filter(m => m.actif && _normalizeStr(m.nom).includes(q)).slice(0, 15);
  document.querySelector('.cats-scroll').style.display = 'none';
  document.querySelector('.articles-grid').style.display = 'none';
  if (results.length === 0) {
    box.style.display = 'block';
    box.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px">Aucun résultat</div>';
    return;
  }
  box.style.display = 'block';
  box.innerHTML = '<div class="search-results">' + results.map(m => {
    const qte = getQteInPanier(m.id);
    const qteHtml = qte > 0
      ? `<div class="search-result-qte" onclick="event.stopPropagation()">
          <button class="art-qte-btn" onclick="decrementArticle('${m.id}')">−</button>
          <span class="art-qte-val">${qte}</span>
          <button class="art-qte-btn" onclick="addArticle('${m.id}')">+</button>
         </div>`
      : '';
    return `<div class="search-result-item ${qte > 0 ? 'in-cart' : ''}" id="sart-${m.id}" onclick="addArticle('${m.id}')">
      <div class="search-result-info">
        <div class="search-result-nom">${m.nom}</div>
        <div class="search-result-cat">${m.categorie}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${qteHtml}
        <div class="search-result-prix">${formatPrice(m.prix)}</div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

// ============================================================
// RECHERCHE ARTICLES — VUE SERVICE (barre permanente en haut)
// ============================================================
function searchServiceArticles(query) {
  const box = document.getElementById('service-search-results-box');
  if (!box) return;
  const q = _normalizeStr(query.trim());
  if (q.length < 2) {
    box.style.display = 'none';
    box.innerHTML = '';
    return;
  }
  // Inclut les articles en rupture (actif=false) pour permettre de voir leur statut
  const results = STATE.menu.filter(m => _normalizeStr(m.nom).includes(q)).slice(0, 12);
  box.style.display = 'block';
  if (results.length === 0) {
    box.innerHTML = '<div style="padding:12px;text-align:center;color:var(--text-muted);font-size:13px">Aucun résultat</div>';
    return;
  }
  box.innerHTML = '<div class="search-results">' + results.map(m => {
    const ruptureTag = !m.actif
      ? `<span style="font-size:10px;font-weight:700;color:var(--terre);background:rgba(192,82,42,.15);border:1px solid rgba(192,82,42,.3);border-radius:10px;padding:2px 7px;white-space:nowrap">RUPTURE</span>`
      : '';
    return `<div class="search-result-item" onclick="toggleRuptureFromServiceSearch('${m.id}')">
      <div class="search-result-info">
        <div class="search-result-nom" style="${!m.actif ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${m.nom}</div>
        <div class="search-result-cat">${m.categorie}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        ${ruptureTag}
        <div class="search-result-prix" style="${!m.actif ? 'color:var(--text-muted)' : ''}">${formatPrice(m.prix)}</div>
      </div>
    </div>`;
  }).join('') + '</div>';
}

async function toggleRuptureFromServiceSearch(menuId) {
  await toggleRupture(menuId, false);
  const input = document.getElementById('service-search-input');
  if (input) searchServiceArticles(input.value);
}

function getQteInPanier(menuId) {
  return getLignes(STATE.editCommande)
    .filter(l => l.menuId === menuId)
    .reduce((s, l) => s + (l.qte || 1), 0);
}

function buildArticleTileInner(m, qte) {
  const qteHtml = qte > 0
    ? `<div class="art-qte-ctrl" onclick="event.stopPropagation()">
        <button class="art-qte-btn" onclick="decrementArticle('${m.id}')">−</button>
        <span class="art-qte-val">${qte}</span>
        <button class="art-qte-btn" onclick="addArticle('${m.id}')">+</button>
       </div>`
    : '';
  return `<span class="art-nom">${m.nom}</span><div class="art-bottom-row"><span class="art-prix">${formatPrice(m.prix)}</span>${qteHtml}</div>`;
}

// Matches: 14cl, 25cl, 75cl, 1L, ½ btl, ½btl, 1/2 btl, btl, btle
const SIZE_REGEX = /\s+((?:\d+(?:[,.]\d+)?\s*(?:cl|L|btl(?:e)?)|(?:½|1\/2)\s*btl(?:e)?))$/i;

function _splitBaseAndTaille(nom) {
  const m = nom.match(SIZE_REGEX);
  if (!m) return { base: nom, taille: null };
  return { base: nom.slice(0, nom.length - m[0].length).trim(), taille: m[1].trim() };
}

// Flavor groups: articles partageant un préfixe commun regroupés sous une seule tuile
const FLAVOR_GROUPS = {
  'Kir': { label: 'Kir', subtitle: 'Choisir le parfum…' },
};

function _getFlavorGroup(nom) {
  for (const prefix of Object.keys(FLAVOR_GROUPS)) {
    if (nom === prefix || nom.startsWith(prefix + ' ')) return prefix;
  }
  return null;
}

function showFlavorPicker(prefix) {
  const cfg = FLAVOR_GROUPS[prefix];
  if (!cfg) return;
  const items = STATE.menu.filter(m => m.actif && _getFlavorGroup(m.nom) === prefix);
  if (items.length === 0) return;
  document.getElementById('contenance-sheet-title').textContent = cfg.label;
  document.getElementById('contenance-sheet-sub').textContent = cfg.subtitle;
  document.getElementById('contenance-grid').innerHTML = items.map(m => {
    const flavor = m.nom === prefix ? '(nature)' : m.nom.slice(prefix.length + 1);
    return `<div class="contenance-tile" onclick="closeContenanceSheet();addArticleVariant('${m.id}')">
      <div class="contenance-taille">${flavor}</div>
      <div class="contenance-prix">${formatPrice(m.prix)}</div>
    </div>`;
  }).join('');
  document.getElementById('contenance-overlay').classList.add('active');
}

// Détection couleur vin par mots-clés dans le nom
function _detectWineColor(nom) {
  const n = _normalizeStr(nom);
  if (/rose|rosato|provence|cotes de/.test(n)) return 'Rosé';
  if (/blanc|grigio|bianco|chardonnay|sauvignon|pinot g|riesling|vermentino|viognier|soave|trebbiano|muscadet|chablis|gris/.test(n)) return 'Blanc';
  if (/rouge|chianti|sangiovese|primitivo|merlot|bordeaux|syrah|cabernet|nero|barbera|barolo|brunello|montepulciano|lambrusco|pinot noir|nebbiolo|rioja/.test(n)) return 'Rouge';
  return 'Autre';
}

const WINE_COLOR_ORDER = ['Blanc', 'Rosé', 'Rouge', 'Autre'];

function showContenancePicker(groupKey) {
  const variants = STATE.menu.filter(m => {
    const { base } = _splitBaseAndTaille(m.nom);
    return base === groupKey && m.actif;
  });
  if (variants.length === 0) return;
  variants.sort((a, b) => a.prix - b.prix);
  document.getElementById('contenance-sheet-title').textContent = groupKey;
  document.getElementById('contenance-sheet-sub').textContent = variants[0].categorie;
  document.getElementById('contenance-grid').innerHTML = variants.map(m => {
    const { taille } = _splitBaseAndTaille(m.nom);
    return `<div class="contenance-tile" onclick="closeContenanceSheet();addArticleVariant('${m.id}')">
      <div class="contenance-taille">${taille || m.nom}</div>
      <div class="contenance-prix">${formatPrice(m.prix)}</div>
    </div>`;
  }).join('');
  document.getElementById('contenance-overlay').classList.add('active');
}

function closeContenanceSheet() {
  document.getElementById('contenance-overlay').classList.remove('active');
}

function addArticleVariant(menuId) {
  const m = STATE.menu.find(x => x.id === menuId);
  if (!m || !m.actif) return;
  _doAddArticle(m, '');
}

let _optionsM = null;
let _optionsSelections = {};

function parseOptions(str) {
  if (!str) return [];
  return str.split('|').map(part => {
    const [question, choicesStr] = part.split(':');
    const choices = choicesStr ? choicesStr.split(',').map(s => s.trim()) : [];
    return { question: question.trim(), choices };
  }).filter(g => g.choices.length > 0);
}

function showOptionsPicker(m, optGroups) {
  _optionsM = m;
  _optionsSelections = {};
  document.getElementById('options-picker-title').textContent = m.nom;
  document.getElementById('options-picker-sub').textContent = m.categorie + ' — ' + formatPrice(m.prix);
  let bodyHtml = '';
  optGroups.forEach((g, gi) => {
    bodyHtml += `<div class="options-group-label">${g.question}</div>
      <div class="options-chips">${g.choices.map((c, ci) =>
        `<span class="option-chip" id="optchip-${gi}-${ci}" onclick="toggleOptChip(${gi},'${c.replace(/'/g,"\\'")}',this)">${c}</span>`
      ).join('')}</div>`;
  });
  document.getElementById('options-picker-body').innerHTML = bodyHtml;
  document.getElementById('options-picker-overlay').classList.add('active');
}

function toggleOptChip(groupIdx, choix, el) {
  _optionsSelections[groupIdx] = choix;
  document.querySelectorAll(`[id^="optchip-${groupIdx}-"]`).forEach(c => c.classList.remove('active'));
  el.classList.add('active');
}

function closeOptionsPicker() {
  document.getElementById('options-picker-overlay').classList.remove('active');
  _optionsM = null;
  _optionsSelections = {};
}

function confirmOptionsAndAdd() {
  if (!_optionsM) return;
  const comment = Object.values(_optionsSelections).filter(Boolean).join(' · ');
  _doAddArticle(_optionsM, comment);
  closeOptionsPicker();
}

function computeMenuOrderCounts() {
  const counts = {};
  STATE.commandes.forEach(cmd => {
    getLignes(cmd).forEach(l => {
      if (l.menuId) counts[l.menuId] = (counts[l.menuId] || 0) + (l.qte || 1);
    });
  });
  return counts;
}

function addArticle(menuId) {
  const m = STATE.menu.find(x => x.id === menuId);
  if (!m || !m.actif) return;

  // Suppléments : proposer de lier à un plat du panier
  if (m.categorie === 'Suppléments') {
    const platsInPanier = getLignes(STATE.editCommande)
      .filter(l => !BOISSON_CATS.has(l.categorie) && l.categorie !== 'Suppléments');
    if (platsInPanier.length > 0) {
      showSupplementPicker(m, platsInPanier);
      return;
    }
  }

  // Options spécifiques à l'article
  const opts = parseOptions(m.options || '');
  if (opts.length > 0) {
    showOptionsPicker(m, opts);
    return;
  }

  _doAddArticle(m, '');
}

function showSupplementPicker(m, plats) {
  const box = document.getElementById('confirm-popup-box');
  const tilesHtml = plats.map(l =>
    `<div onclick="closeConfirmPopup();_doAddArticle(window._suppM,'→ ${l.nom.replace(/'/g,"\\'")}');window._suppM=null"
      style="padding:10px 14px;margin-bottom:6px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);border-radius:8px;cursor:pointer;font-size:13px;font-family:'DM Sans',sans-serif">
      ${l.qte > 1 ? l.qte+'× ' : ''}${l.nom}
    </div>`
  ).join('');
  window._suppM = m;
  box.innerHTML = `
    <div class="confirm-popup-title" style="margin-bottom:12px">Sur quel plat ?<br><span style="font-size:13px;color:var(--text-muted);font-weight:400">${m.nom} — ${formatPrice(m.prix)}</span></div>
    ${tilesHtml}
    <div class="confirm-popup-btns" style="margin-top:8px">
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup();_doAddArticle(window._suppM,'');window._suppM=null">Sans précision</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

function _doAddArticle(m, commentaire) {
  const lignes = getLignes(STATE.editCommande);
  const existing = m.categorie !== 'Suppléments'
    ? lignes.find(l => l.menuId === m.id && !l.commentaire)
    : null;
  let targetId;
  if (existing) {
    existing.qte = (existing.qte || 1) + 1;
    targetId = existing.id;
  } else {
    const newLigne = {
      id: generateId('ligne'),
      menuId: m.id,
      nom: m.nom,
      categorie: m.categorie,
      station: m.station,
      prix: m.prix,
      qte: 1,
      statut: 'en_attente',
      commentaire: commentaire || '',
      addedAt: Date.now(),
    };
    lignes.push(newLigne);
    targetId = newLigne.id;
  }
  saveLignes(STATE.editCommande, lignes);
  refreshPanier();
  // Auto-expand le détail pour accès rapide aux chips/commentaire
  if (targetId) {
    const el = document.getElementById('ligne-' + targetId);
    if (el && !el.classList.contains('expanded')) el.classList.add('expanded');
    // Scroll vers la ligne dans le panier
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function decrementArticle(menuId) {
  const lignes = getLignes(STATE.editCommande);
  const existing = lignes.find(l => l.menuId === menuId && !l.commentaire);
  if (!existing) return;
  existing.qte = (existing.qte || 1) - 1;
  saveLignes(STATE.editCommande, existing.qte <= 0 ? lignes.filter(l => l !== existing) : lignes);
  refreshPanier();
}

function confirmRemoveLigne(ligneId) {
  const l = getLignes(STATE.editCommande).find(x => x.id === ligneId);
  if (!l) return;
  const box = document.getElementById('confirm-popup-box');
  box.innerHTML = `
    <div class="confirm-popup-title">Supprimer cet article ?</div>
    <div class="confirm-popup-detail">${l.nom}${l.commentaire ? ' — ' + l.commentaire : ''}</div>
    <div class="confirm-popup-btns">
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup()">Annuler</button>
      <button class="confirm-popup-ok" style="background:var(--terre)" onclick="closeConfirmPopup();removeLigne('${ligneId}')">Supprimer</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

function removeLigne(ligneId) {
  const lignes = getLignes(STATE.editCommande).filter(l => l.id !== ligneId);
  saveLignes(STATE.editCommande, lignes);
  refreshPanier();
}

function updateQte(ligneId, delta) {
  const lignes = getLignes(STATE.editCommande);
  const l = lignes.find(x => x.id === ligneId);
  if (!l) return;
  l.qte = Math.max(1, (l.qte||1) + delta);
  saveLignes(STATE.editCommande, lignes);
  refreshPanier();
}

function toggleChip(ligneId, chip) {
  const lignes = getLignes(STATE.editCommande);
  const l = lignes.find(x => x.id === ligneId);
  if (!l) return;
  let chips = l.commentaire ? l.commentaire.split(' · ').filter(Boolean) : [];
  if (chips.includes(chip)) {
    chips = chips.filter(c => c !== chip);
  } else {
    chips.push(chip);
  }
  l.commentaire = chips.join(' · ');
  const ta = document.querySelector(`#ligne-${ligneId} .comment-input`);
  if (ta) ta.value = l.commentaire;
  document.querySelectorAll(`#ligne-${ligneId} .chip`).forEach(el => {
    el.classList.toggle('active', chips.includes(el.textContent));
  });
  saveLignes(STATE.editCommande, lignes);
  updatePanierTotal();
}

function setCommentaire(ligneId, val) {
  const lignes = getLignes(STATE.editCommande);
  const l = lignes.find(x => x.id === ligneId);
  if (l) {
    l.commentaire = val;
    saveLignes(STATE.editCommande, lignes);
  }
}

function refreshPanier() {
  const lignes = getLignes(STATE.editCommande);
  const container = document.getElementById('panier-lignes');
  if (container) {
    container.innerHTML = lignes.map(l => buildLigneHtml(l)).join('');
  }
  updatePanierTotal();
  // Rafraîchir les tuiles articles visibles
  document.querySelectorAll('[id^="art-"]').forEach(el => {
    const menuId = el.id.replace('art-', '');
    const m = STATE.menu.find(x => x.id === menuId);
    if (!m) return;
    const qte = getQteInPanier(menuId);
    el.className = `article-btn ${m.actif ? '' : 'inactive'} ${qte > 0 ? 'in-cart' : ''}`;
    el.innerHTML = buildArticleTileInner(m, qte);
  });
  // Rafraîchir les tuiles de groupe (multi-contenances)
  document.querySelectorAll('[id^="artg-"]').forEach(el => {
    const base = el.dataset.base;
    if (!base) return;
    const variants = STATE.menu.filter(m => {
      const { base: b } = _splitBaseAndTaille(m.nom);
      return b === base;
    });
    const anyInCart = variants.some(v => getQteInPanier(v.id) > 0);
    const cartCount = variants.reduce((s, v) => s + getQteInPanier(v.id), 0);
    el.classList.toggle('in-cart', anyInCart);
    const qteHtml = anyInCart
      ? `<div class="art-qte-ctrl" onclick="event.stopPropagation()"><span class="art-qte-val">${cartCount}×</span></div>`
      : '';
    el.innerHTML = `<span class="art-nom">${base}</span><div class="art-bottom-row"><span class="art-prix" style="font-size:11px;color:var(--text-muted)">Tailles…</span>${qteHtml}</div>`;
  });
  // Rafraîchir les résultats de recherche visibles
  document.querySelectorAll('[id^="sart-"]').forEach(el => {
    const menuId = el.id.replace('sart-', '');
    const m = STATE.menu.find(x => x.id === menuId);
    if (!m) return;
    const qte = getQteInPanier(menuId);
    el.className = `search-result-item ${qte > 0 ? 'in-cart' : ''}`;
    const qteHtml = qte > 0
      ? `<div class="search-result-qte" onclick="event.stopPropagation()">
          <button class="art-qte-btn" onclick="decrementArticle('${menuId}')">−</button>
          <span class="art-qte-val">${qte}</span>
          <button class="art-qte-btn" onclick="addArticle('${menuId}')">+</button>
         </div>`
      : '';
    const prixEl = el.querySelector('.search-result-prix');
    const prix = prixEl ? prixEl.outerHTML : `<div class="search-result-prix">${formatPrice(m.prix)}</div>`;
    const infoEl = el.querySelector('.search-result-info');
    const info = infoEl ? infoEl.outerHTML : `<div class="search-result-info"><div class="search-result-nom">${m.nom}</div><div class="search-result-cat">${m.categorie}</div></div>`;
    el.innerHTML = info + `<div style="display:flex;align-items:center;gap:8px">${qteHtml}${prix}</div>`;
  });
  // Mettre à jour footer si besoin
  const footer = document.getElementById('modal-footer');
  if (footer) {
    const hasLignes = lignes.length > 0;
    const isNew = !STATE.commandes.find(c => c.id === STATE.editCommande.id);
    const statut = STATE.editCommande.statut;
    if (isNew || statut === 'brouillon') {
      footer.innerHTML = hasLignes
        ? '<button class="btn btn-primary" onclick="envoyerEnCuisine()">Envoyer en cuisine</button><button class="btn btn-success" onclick="encaisser()">Encaisser</button>'
        : '<button class="btn btn-secondary" onclick="closeModal()">Fermer</button>';
    }
  }
}

function updatePanierTotal() {
  const lignes = getLignes(STATE.editCommande);
  const total = lignes.reduce((s,l) => s + (parseFloat(l.prix)||0) * (l.qte||1), 0);
  const el = document.querySelector('.panier-total');
  if (el) el.textContent = 'Total : ' + formatPrice(total);
}

// ============================================================
// ACTIONS COMMANDE
// ============================================================
function showRecapAvantEnvoi(onConfirm) {
  const lignes = getLignes(STATE.editCommande);
  const sorted = [...lignes].sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a.categorie);
    const bi = CAT_ORDER.indexOf(b.categorie);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });
  const total = lignes.reduce((s, l) => s + (parseFloat(l.prix) || 0) * (l.qte || 1), 0);
  const box = document.getElementById('confirm-popup-box');

  let currentGroup = null;
  const itemsHtml = sorted.map(l => {
    const grp = _getRecapGroup(l.categorie);
    let sepHtml = '';
    if (grp && grp !== currentGroup) {
      currentGroup = grp;
      sepHtml = `<div style="font-size:11px;font-weight:700;letter-spacing:.5px;color:#7A6E5F;text-transform:uppercase;padding:8px 0 2px;margin-top:4px">${grp.label}</div>`;
    }
    return sepHtml + `<div style="display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(44,31,14,.07);font-family:'DM Sans',sans-serif">
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;color:#2C1F0E">${(l.qte||1) > 1 ? (l.qte||1) + '× ' : ''}${l.nom}</div>
        ${l.commentaire ? `<div style="font-size:12px;color:#7A6E5F;margin-top:1px">→ ${l.commentaire}</div>` : ''}
      </div>
      <span style="color:#8a6820;white-space:nowrap;margin-left:10px;font-size:14px;font-weight:700">${formatPrice((l.prix||0)*(l.qte||1))}</span>
    </div>`;
  }).join('');
  box.innerHTML = `
    <div class="confirm-popup-title" style="margin-bottom:4px">📋 Récapitulatif</div>
    <div style="font-size:13px;color:#7A6E5F;margin-bottom:12px">${lignes.length} article${lignes.length > 1 ? 's' : ''} · <strong style="color:#2C1F0E">${formatPrice(total)}</strong></div>
    <div style="max-height:45vh;overflow-y:auto;margin-bottom:14px">${itemsHtml}</div>
    <div class="confirm-popup-btns">
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup()">Annuler</button>
      <button class="confirm-popup-ok" style="background:#5C6B3A;font-size:14px" onclick="closeConfirmPopup();window['${onConfirm}']()">Envoyer ✓</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

function envoyerEnCuisine() {
  const lignes = getLignes(STATE.editCommande);
  if (lignes.length === 0) { showToast('Panier vide', 'error'); return; }
  showRecapAvantEnvoi('_doEnvoyerEnCuisine');
}

async function _doEnvoyerEnCuisine() {
  const cmd = STATE.editCommande;
  const lignes = getLignes(cmd);
  if (lignes.length === 0) { showToast('Panier vide', 'error'); return; }

  const hasBurger = lignes.some(l => l.categorie && l.categorie.toLowerCase().includes('burger'));
  if (hasBurger) STATE.burgerWarnings.add(cmd.id);

  // Détection pour les popups suggestion
  const isFirstSend = !STATE.winePopupShown.has(cmd.id);
  const hasFood = lignes.some(l => !BOISSON_CATS.has(l.categorie));
  const hasPizza = lignes.some(l => l.categorie && ['Pizzas Classiques','Pizzas Gourmandes'].includes(l.categorie));
  const hasAperitifBar = lignes.some(l => l.station === 'bar' && l.categorie === 'Apéritifs');

  // Optimistic — mise à jour immédiate
  cmd.statut = 'ouverte';
  cmd.sentAt = Date.now();
  cmd.updatedAt = Date.now();
  cmd.lockedBy = '';
  saveLignes(cmd, lignes);
  _upsertCommande(JSON.parse(JSON.stringify(cmd)));
  showToast('Commande envoyée en cuisine ✓', 'success');
  closeModal();
  renderCurrentView();
  updateNavBadges();

  // File des suggestions
  _suggQueue = [];
  if (hasPizza) _suggQueue.push(showSuggPizza);
  if (hasAperitifBar) _suggQueue.push(showSuggSnacks);
  if (hasFood && isFirstSend) { STATE.winePopupShown.add(cmd.id); _suggQueue.push(showSuggVin); }
  if (_suggQueue.length > 0) setTimeout(() => { const fn = _suggQueue.shift(); fn(); }, 450);

  // Sync arrière-plan
  enqueueWrite('saveCommande', cmd).catch(() => showToast('⚠ Erreur sync — vérifiez la connexion', 'warning'));
}

function closeBurgerWarning(cmdId) {
  STATE.burgerWarnings.delete(cmdId);
  const el = document.getElementById('burger-warning-' + cmdId);
  if (el) el.remove();
}

async function encaisser() {
  const cmd = STATE.editCommande;
  const lignes = getLignes(cmd);
  const total = lignes.reduce((s,l) => s + (parseFloat(l.prix)||0) * (l.qte||1), 0);
  const label = cmd.type === 'emporter' ? 'Emporté #' + String(cmd.table).padStart(4,'0') : 'Table ' + cmd.table;

  // Optimistic — retrait immédiat de la grille
  cmd.statut = 'payée';
  cmd.total = total.toFixed(2);
  cmd.updatedAt = Date.now();
  cmd.lockedBy = '';
  saveLignes(cmd, lignes);
  STATE.commandes = STATE.commandes.filter(c => c.id !== cmd.id);
  STATE.burgerWarnings.delete(cmd.id);
  showToast(label + ' · encaissée · ' + formatPrice(total), 'success');
  closeModal();
  renderCurrentView();
  updateNavBadges();

  enqueueWrite('saveCommande', cmd).catch(() => showToast('⚠ Erreur sync encaissement', 'warning'));
}

function ajouterLignesCommande() {
  const lignes = getLignes(STATE.editCommande);
  if (lignes.length === 0) { showToast('Panier vide', 'error'); return; }
  showRecapAvantEnvoi('_doAjouterLignesCommande');
}

async function _doAjouterLignesCommande() {
  const cmd = STATE.editCommande;
  const lignes = getLignes(cmd);
  cmd.updatedAt = Date.now();
  cmd.lockedBy = '';
  saveLignes(cmd, lignes);

  _upsertCommande(JSON.parse(JSON.stringify(cmd)));
  showToast('Articles ajoutés ✓', 'success');
  closeModal();
  renderCurrentView();
  updateNavBadges();

  enqueueWrite('saveCommande', cmd).catch(() => showToast('⚠ Erreur sync', 'warning'));
}

// ============================================================
// GESTION DEMANDES CLIENT
// ============================================================
async function validerDemandeClient(cmdId) {
  const cmd = STATE.commandes.find(c => c.id === cmdId);
  if (!cmd) return;
  cmd.statut = 'brouillon';
  cmd.updatedAt = Date.now();
  _upsertCommande(JSON.parse(JSON.stringify(cmd)));
  showToast('Demande validée ✓', 'success');
  renderCurrentView();
  updateNavBadges();
  enqueueWrite('validerCommandeClient', { id: cmdId }).catch(() => showToast('⚠ Erreur sync', 'warning'));
}

async function refuserDemandeClient(cmdId) {
  STATE.commandes = STATE.commandes.filter(c => c.id !== cmdId);
  showToast('Demande refusée', 'warning');
  renderCurrentView();
  updateNavBadges();
  enqueueWrite('refuserCommandeClient', { id: cmdId }).catch(() => showToast('⚠ Erreur sync', 'warning'));
}

// ============================================================
// MODAL OPEN / CLOSE
// ============================================================
function openModal() {
  document.getElementById('modal-overlay').classList.add('active');
}

function isModalOpen() {
  return document.getElementById('modal-overlay')?.classList.contains('active');
}

function closeModal() {
  releaseModalLock();
  document.getElementById('modal-overlay').classList.remove('active');
  STATE.editCommande = null;
  if (STATE.pendingClientAlert) {
    STATE.pendingClientAlert = false;
    setTimeout(() => {
      playNewOrder();
      showToast('📱 Nouvelle demande client en attente', 'warning');
    }, 300);
  }
}

function closeModalOnBackdrop(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

// ============================================================
// SWIPE CATÉGORIES (modale articles)
// ============================================================
function attachCatSwipe() {
  const body = document.getElementById('modal-body');
  if (!body) return;
  let _sx = 0, _sy = 0, _stgt = null;
  if (body._catSwipeStart) {
    body.removeEventListener('touchstart', body._catSwipeStart);
    body.removeEventListener('touchend', body._catSwipeEnd);
  }
  body._catSwipeStart = (e) => {
    _sx = e.touches[0].clientX;
    _sy = e.touches[0].clientY;
    _stgt = e.target;
  };
  body._catSwipeEnd = (e) => {
    if (_stgt && _stgt.closest('.cats-scroll')) return;
    const dx = e.changedTouches[0].clientX - _sx;
    const dy = e.changedTouches[0].clientY - _sy;
    if (Math.abs(dx) < 65 || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    const cats = STATE.categories.filter(c => c !== 'Suppléments');
    cats.push('Suppléments');
    const idx = cats.indexOf(STATE.editCatFilter);
    if (idx < 0) return;
    if (dx < 0 && idx < cats.length - 1) filterCat(cats[idx + 1]);
    else if (dx > 0 && idx > 0) filterCat(cats[idx - 1]);
  };
  body.addEventListener('touchstart', body._catSwipeStart, { passive: true });
  body.addEventListener('touchend', body._catSwipeEnd, { passive: true });
}

// ============================================================
// POPUPS SUGGESTION (après envoi en cuisine)
// ============================================================
let _suggQueue = [];

function _nextSugg() {
  document.getElementById('confirm-popup-overlay').classList.remove('active');
  if (_suggQueue.length === 0) return;
  setTimeout(() => { const fn = _suggQueue.shift(); fn(); }, 220);
}

function showSuggVin() {
  const box = document.getElementById('confirm-popup-box');
  box.innerHTML = `
    <div class="confirm-popup-title">🍷 Proposer une boisson ?</div>
    <div class="confirm-popup-detail">La commande est partie en cuisine — bon moment pour proposer vins ou boissons.</div>
    <div class="confirm-popup-btns" style="margin-top:16px">
      <button class="confirm-popup-cancel" onclick="_nextSugg()">Déjà fait</button>
      <button class="confirm-popup-ok" style="background:#5C6B3A" onclick="_nextSugg();_ouvrirBoissonsPourSugg()">Ouvrir boissons →</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

function _ouvrirBoissonsPourSugg() {
  // Ouvrir la saisie commande en cours (si en édition) directement sur la catégorie Vins
  if (!STATE.editCommande) return;
  const vinCat = STATE.categories.find(c => c === 'Vins') || STATE.categories.find(c => /vin/i.test(c));
  if (vinCat) {
    STATE.editCatFilter = vinCat;
    showModalArticles();
  }
}

function showSuggSnacks() {
  const box = document.getElementById('confirm-popup-box');
  box.innerHTML = `
    <div class="confirm-popup-title">🍟 Grignotages avec l'apéritif ?</div>
    <div class="confirm-popup-detail">Proposer pain à l'ail ou amuse-bouches ?</div>
    <div style="font-size:13px;color:#7A6E5F;margin-bottom:14px">🧊 Pensez aussi aux <strong>glaçons</strong> si besoin.</div>
    <div class="confirm-popup-btns">
      <button class="confirm-popup-cancel" onclick="_nextSugg()">Non merci</button>
      <button class="confirm-popup-ok" style="background:#C9A84C;color:#1A1916" onclick="_nextSugg()">Oui, je propose</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

function showSuggPizza() {
  const box = document.getElementById('confirm-popup-box');
  box.innerHTML = `
    <div class="confirm-popup-title">🌶 Sauce piquante ?</div>
    <div class="confirm-popup-detail">Une pizza est en commande — demander si sauce piquante souhaitée ?</div>
    <div class="confirm-popup-btns" style="margin-top:16px">
      <button class="confirm-popup-cancel" onclick="_nextSugg()">Non besoin</button>
      <button class="confirm-popup-ok" style="background:#C0522A" onclick="_nextSugg()">🌶 Je demande</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

// ============================================================
// CONFIRMER SERVI (depuis vue Service)
// ============================================================
async function confirmerServiTable(cmdId) {
  const cmd = STATE.commandes.find(c => c.id === cmdId);
  if (!cmd) return;
  const lignes = getLignes(cmd);
  let changed = false;
  lignes.forEach(l => { if (l.statut === 'prêt') { l.statut = 'servi'; changed = true; } });
  if (!changed) { showToast('Rien à marquer servi', 'warning'); return; }
  cmd.updatedAt = Date.now();
  saveLignes(cmd, lignes);
  _upsertCommande(JSON.parse(JSON.stringify(cmd)));
  showToast('Servi ✓', 'success');
  renderCurrentView();
  enqueueWrite('saveCommande', cmd).catch(() => showToast('⚠ Erreur sync', 'warning'));
}
