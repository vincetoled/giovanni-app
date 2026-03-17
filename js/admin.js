// ============================================================
// MODAL RUPTURE
// ============================================================
function buildRuptureItem(m) {
  return `<div class="rupture-item">
    <span class="rupture-nom">${m.nom}</span>
    <div class="toggle-switch ${m.actif ? 'on' : 'off'}" onclick="toggleRupture('${m.id}')">
      <div class="toggle-knob"></div>
    </div>
  </div>`;
}

function _buildRuptureBody(station, filterQ) {
  const q = filterQ ? _normalizeStr(filterQ) : '';
  if (station === 'service') {
    const stations = [...new Set(STATE.menu.map(m => m.station).filter(Boolean))];
    let body = stations.map(s => {
      const items = STATE.menu.filter(m => m.station === s && (!q || _normalizeStr(m.nom).includes(q)));
      if (items.length === 0) return '';
      const label = s.charAt(0).toUpperCase() + s.slice(1);
      return `<div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;padding:10px 0 4px;margin-top:4px">${label}</div>`
        + items.map(m => buildRuptureItem(m)).join('');
    }).join('');
    return body || '<div style="padding:16px;color:var(--text-muted);font-size:13px;text-align:center">Aucun résultat</div>';
  } else {
    const items = STATE.menu.filter(m => m.station === station && (!q || _normalizeStr(m.nom).includes(q)));
    return items.length
      ? items.map(m => buildRuptureItem(m)).join('')
      : '<div style="padding:16px;color:var(--text-muted);font-size:13px;text-align:center">Aucun résultat</div>';
  }
}

function openRuptureModal(station) {
  STATE.ruptureContext = station;
  document.getElementById('modal-title').textContent = 'Gestion des ruptures';
  document.getElementById('modal-body').innerHTML =
    `<div style="margin-bottom:10px;position:relative">
      <input type="search" id="rupture-search-input"
        placeholder="Rechercher un article…"
        oninput="document.getElementById('rupture-list').innerHTML=_buildRuptureBody('${station}',this.value)"
        autocomplete="off"
        style="width:100%;padding:8px 12px 8px 32px;background:var(--bg-input);border:1px solid var(--border);border-radius:var(--radius-sm);color:var(--text);font-size:14px;font-family:'DM Sans',sans-serif">
      <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:14px;pointer-events:none">🔍</span>
    </div>
    <div id="rupture-list">${_buildRuptureBody(station, '')}</div>`;
  document.getElementById('modal-footer').innerHTML =
    '<button class="btn btn-secondary" onclick="closeModal()">Fermer</button>';
  openModal();
  setTimeout(() => document.getElementById('rupture-search-input')?.focus(), 200);
}


async function toggleRupture(menuId, doRefreshModal = true) {
  const m = STATE.menu.find(x => x.id === menuId);
  if (!m) return;
  m.actif = !m.actif;
  try {
    await enqueueWrite('saveMenuArticle', { id: m.id, categorie: m.categorie, nom: m.nom, prix: m.prix, actif: m.actif, station: m.station });
    if (doRefreshModal) {
      // Rafraîchir la liste sans fermer le modal (préserve le filtre de recherche)
      const listEl = document.getElementById('rupture-list');
      const searchEl = document.getElementById('rupture-search-input');
      if (listEl) {
        listEl.innerHTML = _buildRuptureBody(STATE.ruptureContext || m.station, searchEl?.value || '');
      } else {
        openRuptureModal(STATE.ruptureContext || m.station);
      }
    }
    showToast(m.actif ? 'Article disponible' : 'Article en rupture', m.actif ? 'success' : 'warning');
  } catch(e) { showToast('Erreur', 'error'); m.actif = !m.actif; }
}

// ============================================================
// VUE ADMIN
// ============================================================
async function resetCommandesTest() {
  if (!confirm('Vider TOUTES les commandes ? (action irréversible)')) return;
  try {
    const res = await enqueueWrite('resetCommandes', {});
    if (res && res.success) {
      showToast('Commandes vidées (' + (res.deleted||0) + ' supprimées)', 'success');
      await pollCommandes();
    } else {
      showToast('Erreur: ' + (res?.error || 'inconnue'), 'error');
    }
  } catch(e) { showToast('Connexion perdue', 'error'); }
}

function renderAdmin() {
  const el = document.getElementById('admin-content');
  if (!el) return;

  const openCmds = STATE.commandes.filter(c => c.statut === 'ouverte');
  const brouillons = STATE.commandes.filter(c => c.statut === 'brouillon');
  const totalOuvert = openCmds.reduce((s,c) => {
    return s + getLignes(c).reduce((ss,l) => ss + (parseFloat(l.prix)||0)*(l.qte||1), 0);
  }, 0);
  const paidToday = STATE.commandes.filter(c => c.statut === 'payée');
  const caToday = paidToday.reduce((s,c) => s + (parseFloat(c.total)||0), 0);

  let html = `
    <div class="admin-section">
      <div class="admin-section-title">🧪 Tests & Maintenance</div>
      <button class="btn" style="background:#c0392b;color:#fff;width:100%;padding:12px;font-size:14px;margin-bottom:8px"
        onclick="resetCommandesTest()">🗑 Vider toutes les commandes (test)</button>
    </div>

    <div class="admin-section">
      <div class="admin-section-title">Tableau de bord</div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-val">${openCmds.length}</div>
          <div class="stat-label">Tables ouvertes</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${formatPrice(totalOuvert)}</div>
          <div class="stat-label">En cours</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${paidToday.length}</div>
          <div class="stat-label">Encaissées ce soir</div>
        </div>
        <div class="stat-card">
          <div class="stat-val">${formatPrice(caToday)}</div>
          <div class="stat-label">CA ce soir</div>
        </div>
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-title">🍽 Plats du jour</div>
      ${buildPlatsDuJourAdmin()}
    </div>

    <div class="admin-section">
      <div class="admin-section-title">Carte — Gestion articles</div>
      <button class="btn btn-outline" style="width:100%;margin-bottom:12px" onclick="ouvrirFormulaireArticle(null)">+ Ajouter un article</button>
      ${buildMenuAdminList()}
    </div>

    <div class="admin-section">
      <div class="admin-section-title">Chips commentaires rapides</div>
      ${buildChipsConfig()}
    </div>

    <div class="admin-section">
      <div class="admin-section-title">Seuils chronomètre</div>
      <div class="config-row">
        <span class="config-label">Alerte orange (min)</span>
        <input type="number" style="width:70px;text-align:center" id="seuil-orange" value="${STATE.config.seuilOrangeCommande}" onchange="saveSeuil('seuil_orange_commande',this.value)">
      </div>
      <div class="config-row">
        <span class="config-label">Alerte rouge commande (min)</span>
        <input type="number" style="width:70px;text-align:center" id="seuil-rouge-cmd" value="${STATE.config.seuilRougeCommande}" onchange="saveSeuil('seuil_rouge_commande',this.value)">
      </div>
      <div class="config-row">
        <span class="config-label">Alerte rouge article (min)</span>
        <input type="number" style="width:70px;text-align:center" id="seuil-rouge-art" value="${STATE.config.seuilRougeArticle}" onchange="saveSeuil('seuil_rouge_article',this.value)">
      </div>
    </div>

    <div class="admin-section">
      <div class="admin-section-title">Email récap nocturne</div>
      <div class="form-group">
        <label class="form-label">Destinataires (un par ligne)</label>
        <textarea id="inp-emails" style="height:80px;resize:none">${(STATE.config.email_destinataires || []).join('\n')}</textarea>
      </div>
      <button class="btn btn-secondary" style="width:100%" onclick="saveEmails()">Enregistrer</button>
    </div>

    <div class="admin-section">
      <div class="admin-section-title">Code PIN Admin</div>
      <div class="form-group">
        <label class="form-label">Nouveau PIN</label>
        <input type="password" id="inp-new-pin" placeholder="Nouveau code PIN">
      </div>
      <button class="btn btn-secondary" style="width:100%" onclick="saveNewPin()">Changer le PIN</button>
    </div>

    <div class="admin-section">
      <div class="admin-section-title">Nom de ce terminal</div>
      <div style="display:flex;gap:8px">
        <input type="text" id="inp-terminal-name" placeholder="ex: Salle, Bar, Réception…"
          value="${localStorage.getItem('gio_terminal_name') || ''}"
          style="flex:1">
        <button class="btn btn-secondary" style="flex-shrink:0;padding:8px 12px"
          onclick="saveTerminalName()">💾</button>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:6px">Identifiant affiché dans les logs pour ce poste</div>
    </div>

    <div class="admin-section">
      <div class="admin-section-title">Journal d'activité</div>
      <div style="display:flex;gap:8px;margin-bottom:12px">
        <button class="btn btn-outline" style="flex:1" onclick="chargerLogsServeur()">🔄 Charger logs</button>
        <button class="btn btn-secondary" style="flex:1" onclick="exporterLogs()">Exporter .txt</button>
      </div>
      <div id="log-list" style="display:none;max-height:380px;overflow-y:auto;font-size:11px;font-family:'DM Mono',monospace;background:rgba(0,0,0,.04);border-radius:8px;padding:10px;line-height:1.7">
      </div>
    </div>`;

  el.innerHTML = html;
}

function buildLogList() {
  const cmds = [...STATE.commandes].sort((a,b) => (parseInt(b.createdAt)||0) - (parseInt(a.createdAt)||0));
  if (cmds.length === 0) return '<div style="color:var(--text-muted);padding:8px 0">Aucune activité enregistrée.</div>';
  return cmds.map(c => {
    const lignes = getLignes(c);
    const total = c.total || lignes.reduce((s,l) => s+(parseFloat(l.prix)||0)*(l.qte||1), 0);
    const label = c.type === 'emporter' ? 'Emporté #' + String(c.table).padStart(4,'0') : 'Table ' + c.table;
    const dt = c.createdAt ? new Date(parseInt(c.createdAt)).toLocaleString('fr-FR') : '—';
    const statutColor = { ouverte:'#5C6B3A', brouillon:'#7A6E5F', payée:'#C9A84C', refusée:'#C0522A', en_attente_validation:'#D4831A' };
    const col = statutColor[c.statut] || '#7A6E5F';
    return `<div style="border-bottom:1px solid rgba(0,0,0,.07);padding:6px 0">
      <span style="color:${col};font-weight:700">[${c.statut.toUpperCase()}]</span>
      <span style="margin:0 6px;font-weight:600">${label}</span>
      <span style="color:var(--text-muted)">${dt}</span>
      ${c.couverts ? `<span style="margin-left:6px">👥${c.couverts}</span>` : ''}
      <span style="float:right;color:var(--or);font-weight:600">${formatPrice(total)}</span>
      <div style="color:#7A6E5F;font-size:11px;margin-top:2px">${lignes.map(l=>`${l.qte||1}× ${l.nom}${l.commentaire?' ('+l.commentaire+')':''}`).join(' · ')}</div>
    </div>`;
  }).join('');
}

function toggleLogView() {
  const el = document.getElementById('log-list');
  if (!el) return;
  if (el.style.display === 'none') {
    el.style.display = 'block';
    el.innerHTML = buildLogList();
  } else {
    el.style.display = 'none';
  }
}

function exporterLogs() {
  const cmds = [...STATE.commandes].sort((a,b) => (parseInt(a.createdAt)||0) - (parseInt(b.createdAt)||0));
  const lines = [];
  lines.push('=== Journal d\'activité Giovanni ===');
  lines.push('Exporté le : ' + new Date().toLocaleString('fr-FR'));
  lines.push('');
  cmds.forEach(c => {
    const lignes = getLignes(c);
    const total = c.total || lignes.reduce((s,l) => s+(parseFloat(l.prix)||0)*(l.qte||1), 0);
    const label = c.type === 'emporter' ? 'Emporté #' + String(c.table).padStart(4,'0') : 'Table ' + c.table;
    const dt = c.createdAt ? new Date(parseInt(c.createdAt)).toLocaleString('fr-FR') : '—';
    const sentDt = c.sentAt ? new Date(parseInt(c.sentAt)).toLocaleString('fr-FR') : null;
    lines.push('---');
    lines.push(`[${c.statut.toUpperCase()}] ${label} — ${dt}`);
    if (c.couverts) lines.push(`Couverts : ${c.couverts}`);
    if (sentDt) lines.push(`Envoyé en cuisine : ${sentDt}`);
    if (c.vip) lines.push('★ VIP');
    lignes.forEach(l => {
      lines.push(`  ${l.qte||1}× ${l.nom} — ${formatPrice((l.prix||0)*(l.qte||1))}${l.commentaire ? ' ('+l.commentaire+')' : ''}`);
    });
    lines.push(`TOTAL : ${formatPrice(total)}`);
  });
  lines.push('');
  lines.push(`=== ${cmds.length} commande(s) — FIN ===`);
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'giovanni-logs-' + new Date().toISOString().slice(0,10) + '.txt';
  a.click();
  URL.revokeObjectURL(url);
}

function buildMenuAdminList() {
  const bycat = {};
  STATE.menu.forEach(m => {
    if (!bycat[m.categorie]) bycat[m.categorie] = [];
    bycat[m.categorie].push(m);
  });
  return Object.entries(bycat).map(([cat, items]) => `
    <details style="margin-bottom:6px">
      <summary style="cursor:pointer;padding:8px;background:rgba(255,255,255,.04);border-radius:6px;font-size:13px;font-weight:500">${cat} (${items.length})</summary>
      <div style="padding:4px 0">
        ${items.map(m => `
          <div class="menu-admin-item ${m.actif ? '' : 'inactive'}">
            <div>
              <div class="menu-admin-nom">${m.nom}</div>
              <div class="menu-admin-cat">${m.station} — ${m.actif ? 'Disponible' : 'Rupture'}</div>
            </div>
            <span class="menu-admin-prix">${formatPrice(m.prix)}</span>
            <button class="btn btn-secondary" style="padding:4px 10px;font-size:11px" onclick="ouvrirFormulaireArticle('${m.id}')">Modifier</button>
          </div>`).join('')}
      </div>
    </details>`).join('');
}

function buildChipsConfig() {
  const chips = STATE.config.chips || [];
  const chipsHtml = chips.map((c,i) =>
    `<div class="chip-config">${c}<span class="chip-config-del" onclick="deleteChip(${i})">✕</span></div>`
  ).join('');
  return `<div class="chips-config-list">${chipsHtml}</div>
    <div style="display:flex;gap:8px">
      <input type="text" id="inp-new-chip" placeholder="Nouveau chip…" style="flex:1">
      <button class="btn btn-outline" style="flex-shrink:0;padding:8px 12px" onclick="addChip()">+</button>
    </div>`;
}

function ouvrirFormulaireArticle(menuId) {
  const m = menuId ? STATE.menu.find(x => x.id === menuId) : null;
  const cats = [...new Set(STATE.menu.map(x => x.categorie))];
  const catOptions = cats.map(c => `<option value="${c}" ${m && m.categorie===c?'selected':''}>${c}</option>`).join('');

  document.getElementById('modal-title').textContent = m ? 'Modifier article' : 'Nouvel article';
  document.getElementById('modal-body').innerHTML = `
    <div class="form-group">
      <label class="form-label">Nom</label>
      <input type="text" id="fa-nom" value="${m ? m.nom : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Catégorie</label>
      <select id="fa-cat">${catOptions}
        <option value="__new__">+ Nouvelle catégorie…</option>
      </select>
    </div>
    <div class="form-group" id="new-cat-group" style="display:none">
      <label class="form-label">Nom de la nouvelle catégorie</label>
      <input type="text" id="fa-newcat">
    </div>
    <div class="form-group">
      <label class="form-label">Prix (€)</label>
      <input type="number" id="fa-prix" step="0.5" value="${m ? m.prix : ''}">
    </div>
    <div class="form-group">
      <label class="form-label">Station</label>
      <select id="fa-station">
        <option value="cuisine" ${!m || m.station==='cuisine'?'selected':''}>Cuisine</option>
        <option value="bar" ${m && m.station==='bar'?'selected':''}>Bar</option>
      </select>
    </div>
    ${m ? `<div style="display:flex;align-items:center;gap:10px;padding:8px 0">
      <label class="form-label" style="margin:0;flex:1">Article disponible</label>
      <input type="checkbox" id="fa-actif" ${m.actif?'checked':''} style="width:auto">
    </div>` : ''}`;

  setTimeout(() => {
    const sel = document.getElementById('fa-cat');
    if (sel) sel.addEventListener('change', e => {
      document.getElementById('new-cat-group').style.display = e.target.value === '__new__' ? '' : 'none';
    });
  }, 100);

  document.getElementById('modal-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="closeModal()">Annuler</button>
    <button class="btn btn-primary" onclick="saveArticleForm('${menuId || ''}')">Enregistrer</button>`;
  openModal();
}

async function saveArticleForm(menuId) {
  const nom = document.getElementById('fa-nom')?.value?.trim();
  const catSel = document.getElementById('fa-cat')?.value;
  const cat = catSel === '__new__' ? document.getElementById('fa-newcat')?.value?.trim() : catSel;
  const prix = parseFloat(document.getElementById('fa-prix')?.value);
  const station = document.getElementById('fa-station')?.value;
  const actif = menuId ? (document.getElementById('fa-actif')?.checked !== false) : true;

  if (!nom || !cat || isNaN(prix)) { showToast('Remplissez tous les champs', 'error'); return; }

  const data = { nom, categorie: cat, prix, station, actif };
  if (menuId) data.id = menuId;

  try {
    const res = await enqueueWrite('saveMenuArticle', data);
    if (res && res.success) {
      showToast('Article enregistré', 'success');
      closeModal();
      const menuRes = await apiGet('getMenu');
      if (menuRes.menu) {
        STATE.menu = menuRes.menu;
        STATE.categories = [...new Set(STATE.menu.map(m => m.categorie))];
      }
      renderAdmin();
    } else {
      showToast('Erreur: ' + (res?.error || ''), 'error');
    }
  } catch(e) { showToast('Connexion perdue', 'error'); }
}

async function deleteChip(idx) {
  const chips = [...(STATE.config.chips || [])];
  chips.splice(idx, 1);
  STATE.config.chips = chips;
  await enqueueWrite('saveConfig', { key: 'chips_commentaires', value: chips });
  renderAdmin();
}

async function addChip() {
  const inp = document.getElementById('inp-new-chip');
  if (!inp || !inp.value.trim()) return;
  const chips = [...(STATE.config.chips || [])];
  chips.push(inp.value.trim());
  inp.value = '';
  STATE.config.chips = chips;
  await enqueueWrite('saveConfig', { key: 'chips_commentaires', value: chips });
  renderAdmin();
}

async function saveSeuil(key, val) {
  const v = parseInt(val);
  if (isNaN(v)) return;
  if (key === 'seuil_orange_commande') STATE.config.seuilOrangeCommande = v;
  if (key === 'seuil_rouge_commande') STATE.config.seuilRougeCommande = v;
  if (key === 'seuil_rouge_article') STATE.config.seuilRougeArticle = v;
  await enqueueWrite('saveConfig', { key, value: v });
}

async function saveEmails() {
  const val = document.getElementById('inp-emails')?.value || '';
  const emails = val.split('\n').map(e => e.trim()).filter(Boolean);
  STATE.config.email_destinataires = emails;
  await enqueueWrite('saveConfig', { key: 'email_destinataires', value: emails });
  showToast('Emails enregistrés', 'success');
}

async function saveNewPin() {
  const inp = document.getElementById('inp-new-pin');
  if (!inp || !inp.value) { showToast('Entrez un PIN', 'error'); return; }
  await enqueueWrite('saveConfig', { key: 'admin_pin', value: inp.value });
  inp.value = '';
  showToast('PIN mis à jour', 'success');
}

function deconnecterAdmin() {
  STATE.adminUnlocked = false;
  showView('service');
}

// ============================================================
// PIN MODAL
// ============================================================
let pinInput = '';

function showPinModal() {
  pinInput = '';
  updatePinDisplay();
  document.getElementById('modal-pin').classList.add('active');
}

function hidePinModal() {
  document.getElementById('modal-pin').classList.remove('active');
}

function pinPress(d) {
  if (pinInput.length >= 8) return;
  pinInput += d;
  updatePinDisplay();
  if (pinInput.length >= 4) verifyPin();
}

function pinClear() {
  pinInput = pinInput.slice(0, -1);
  updatePinDisplay();
}

function pinCancel() {
  pinInput = '';
  hidePinModal();
}

function updatePinDisplay() {
  const el = document.getElementById('pin-display');
  if (el) el.textContent = '●'.repeat(pinInput.length) || '·  ·  ·  ·';
}

async function verifyPin() {
  if (!CONFIG.APPS_SCRIPT_URL) {
    // Mode dev : PIN = 0000
    if (pinInput === '0000') { unlockAdmin(); return; }
    if (pinInput.length >= 4) { showPinError(); }
    return;
  }
  try {
    const res = await apiPostRaw('verifierPin', { pin: pinInput });
    if (res && res.valid) {
      unlockAdmin();
    } else if (pinInput.length >= 4) {
      showPinError();
    }
  } catch(e) { showToast('Erreur connexion', 'error'); }
}

function unlockAdmin() {
  STATE.adminUnlocked = true;
  pinInput = '';
  hidePinModal();
  showView('admin');
}

function showPinError() {
  const el = document.getElementById('pin-error');
  if (el) el.textContent = 'Code incorrect';
  pinInput = '';
  updatePinDisplay();
  setTimeout(() => { if (el) el.textContent = ''; }, 2000);
}

// ============================================================
// PLATS DU JOUR
// ============================================================
function buildPlatsDuJourAdmin() {
  const plats = STATE.config.plats_du_jour || [];
  const rows = plats.map((p, i) => `
    <div class="rupture-item">
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600">${p.nom}</div>
        ${p.description ? `<div style="font-size:12px;color:var(--text-muted)">${p.description}</div>` : ''}
      </div>
      <span style="color:var(--or);font-size:14px;font-weight:600;margin:0 10px;white-space:nowrap">${formatPrice(p.prix)}</span>
      <button class="btn btn-secondary" style="padding:4px 10px;font-size:11px;flex-shrink:0"
        onclick="modifierPlatDuJour(${i})">✏</button>
      <button class="btn" style="padding:4px 10px;font-size:11px;flex-shrink:0;background:rgba(192,82,42,.2);color:var(--terre)"
        onclick="supprimerPlatDuJour(${i})">✕</button>
    </div>`).join('');

  return `<div id="plats-jour-list">${rows}</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
      <div class="form-group" style="margin:0">
        <input type="text" id="pdj-nom" placeholder="Nom du plat…">
      </div>
      <div class="form-group" style="margin:0">
        <input type="number" id="pdj-prix" placeholder="Prix (€)" step="0.5" min="0">
      </div>
    </div>
    <div class="form-group" style="margin-top:6px">
      <input type="text" id="pdj-desc" placeholder="Description (optionnel)">
    </div>
    <button class="btn btn-outline" style="width:100%;margin-top:6px" onclick="ajouterPlatDuJour()">+ Ajouter un plat du jour</button>`;
}

async function ajouterPlatDuJour() {
  const nom = document.getElementById('pdj-nom')?.value?.trim();
  const prix = parseFloat(document.getElementById('pdj-prix')?.value);
  const desc = document.getElementById('pdj-desc')?.value?.trim();
  if (!nom || isNaN(prix)) { showToast('Nom et prix obligatoires', 'error'); return; }
  const plats = [...(STATE.config.plats_du_jour || [])];
  plats.push({ nom, prix, description: desc || '' });
  STATE.config.plats_du_jour = plats;
  await enqueueWrite('saveConfig', { key: 'plats_du_jour', value: plats });
  showToast('Plat du jour ajouté', 'success');
  renderAdmin();
}

async function supprimerPlatDuJour(idx) {
  const plats = [...(STATE.config.plats_du_jour || [])];
  plats.splice(idx, 1);
  STATE.config.plats_du_jour = plats;
  await enqueueWrite('saveConfig', { key: 'plats_du_jour', value: plats });
  showToast('Plat supprimé', 'success');
  renderAdmin();
}

function modifierPlatDuJour(idx) {
  const p = (STATE.config.plats_du_jour || [])[idx];
  if (!p) return;
  const box = document.getElementById('confirm-popup-box');
  box.innerHTML = `
    <div class="confirm-popup-title" style="margin-bottom:12px">Modifier le plat du jour</div>
    <div class="form-group"><label class="form-label">Nom</label>
      <input type="text" id="pdj-edit-nom" value="${p.nom}"></div>
    <div class="form-group"><label class="form-label">Prix (€)</label>
      <input type="number" id="pdj-edit-prix" value="${p.prix}" step="0.5" min="0"></div>
    <div class="form-group"><label class="form-label">Description</label>
      <input type="text" id="pdj-edit-desc" value="${p.description || ''}"></div>
    <div class="confirm-popup-btns">
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup()">Annuler</button>
      <button class="confirm-popup-ok" style="background:var(--sauge)" onclick="sauvegarderModifPlatDuJour(${idx})">Enregistrer</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

async function sauvegarderModifPlatDuJour(idx) {
  closeConfirmPopup();
  const nom = document.getElementById('pdj-edit-nom')?.value?.trim();
  const prix = parseFloat(document.getElementById('pdj-edit-prix')?.value);
  const desc = document.getElementById('pdj-edit-desc')?.value?.trim();
  if (!nom || isNaN(prix)) { showToast('Données invalides', 'error'); return; }
  const plats = [...(STATE.config.plats_du_jour || [])];
  plats[idx] = { nom, prix, description: desc || '' };
  STATE.config.plats_du_jour = plats;
  await enqueueWrite('saveConfig', { key: 'plats_du_jour', value: plats });
  showToast('Plat modifié', 'success');
  renderAdmin();
}

// ============================================================
// TERMINAL NAME & LOGS SERVEUR
// ============================================================
function saveTerminalName() {
  const val = document.getElementById('inp-terminal-name')?.value?.trim();
  localStorage.setItem('gio_terminal_name', val || '');
  showToast('Nom terminal enregistré', 'success');
}

async function chargerLogsServeur() {
  const el = document.getElementById('log-list');
  if (!el) return;
  el.style.display = 'block';
  el.innerHTML = '<div style="padding:12px;color:var(--text-muted);text-align:center">Chargement…</div>';
  try {
    const res = await apiGet('getLogs', { limit: 300 });
    if (!res.logs || res.logs.length === 0) {
      el.innerHTML = '<div style="padding:12px;color:var(--text-muted);text-align:center">Aucun log</div>';
      return;
    }
    const ACTION_COLORS = {
      commande_creee: 'var(--olive)',
      commande_envoyee_cuisine: '#D4831A',
      commande_encaissee: 'var(--or)',
      commande_modifiee: 'var(--text-muted)',
      commande_supprimee: 'var(--terre)',
      menu_article_modifie: '#7A6E5F',
      config_modifiee: '#7A6E5F',
      pin_invalide: 'var(--terre)',
    };
    el.innerHTML = res.logs.map(l => {
      const col = ACTION_COLORS[l.action] || 'var(--text-muted)';
      const tableStr = l.table ? ` · Table ${l.table}` : '';
      const vueStr = l.vue ? ` [${l.vue}]` : '';
      return `<div style="border-bottom:1px solid rgba(0,0,0,.07);padding:5px 0">
        <span style="color:${col};font-weight:700">${l.action || '?'}</span>
        <span style="color:var(--text-muted)">${vueStr}${tableStr}</span>
        <span style="float:right;font-size:10px;color:var(--text-muted)">${l.date_paris || ''}</span>
        ${l.details ? `<div style="color:var(--text-muted);font-size:10px;margin-top:1px">${l.details}</div>` : ''}
      </div>`;
    }).join('');
  } catch(e) { el.innerHTML = '<div style="padding:12px;color:var(--terre);text-align:center">Erreur de chargement</div>'; }
}
