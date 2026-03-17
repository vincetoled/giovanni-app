// ============================================================
// VUE CUISINE & BAR
// ============================================================
function renderStation(station) {
  const el = document.getElementById(station + '-content');
  if (!el) return;

  const now = Date.now();
  const openCommandes = STATE.commandes.filter(c => c.statut === 'ouverte');

  // Toutes les commandes ayant des lignes pour cette station
  const allRelevant = openCommandes.filter(c =>
    getLignes(c).some(l => l.station === station)
  );

  if (allRelevant.length === 0) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Aucune commande en cours</div>';
    return;
  }

  // Catégoriser en 3 groupes
  const enCours = allRelevant.filter(c =>
    getLignes(c).some(l => l.station === station && (l.statut === 'en_attente' || l.statut === 'en préparation'))
  );
  const pretOnly = allRelevant.filter(c => {
    const sl = getLignes(c).filter(l => l.station === station);
    return sl.length > 0 && sl.every(l => l.statut === 'prêt' || l.statut === 'servi') && sl.some(l => l.statut === 'prêt');
  });
  const serviOnly = allRelevant.filter(c => {
    const sl = getLignes(c).filter(l => l.station === station);
    return sl.length > 0 && sl.every(l => l.statut === 'servi');
  });

  // Bandeau BATCH — uniquement les articles en_attente des commandes en cours
  const batchByCat = {};
  enCours.forEach(c => {
    getLignes(c).filter(l => l.station === station && l.statut === 'en_attente').forEach(l => {
      const cat = l.categorie || '—';
      if (!batchByCat[cat]) batchByCat[cat] = {};
      batchByCat[cat][l.nom] = (batchByCat[cat][l.nom] || 0) + (l.qte || 1);
    });
  });

  let html = '';
  const catEntries = Object.entries(batchByCat);
  if (catEntries.length > 0) {
    const rowsHtml = catEntries.map(([cat, items]) => {
      const chipsHtml = Object.entries(items).map(([nom, qte]) =>
        `<span class="batch-chip">${qte}× ${nom}</span>`
      ).join('');
      return `<div class="batch-cat-row"><span class="batch-cat-label">${cat}</span>${chipsHtml}</div>`;
    }).join('');
    html += `<div class="batch-bandeau">
      <div class="batch-title">En attente — récap par catégorie</div>
      <div class="batch-items" style="flex-direction:column;gap:0">${rowsHtml}</div>
    </div>`;
  }

  // Section EN COURS
  if (enCours.length > 0) {
    html += `<div class="station-section-sep" style="background:rgba(192,82,42,.15);color:#C0522A">🔥 EN COURS (${enCours.length})</div>`;
    enCours.forEach(c => { html += renderStationCard(c, station, now, 'en_cours'); });
  }

  // Section PRÊT
  if (pretOnly.length > 0) {
    html += `<div class="station-section-sep" style="background:rgba(76,175,125,.12);color:#4CAF7D">✅ PRÊT — À SERVIR (${pretOnly.length})</div>`;
    pretOnly.forEach(c => { html += renderStationCard(c, station, now, 'pret'); });
  }

  // Section SERVI
  if (serviOnly.length > 0) {
    html += `<div class="station-section-sep" style="background:rgba(139,134,128,.1);color:#8B8680">✓ SERVI (${serviOnly.length})</div>`;
    serviOnly.forEach(c => { html += renderStationCard(c, station, now, 'servi'); });
  }

  el.innerHTML = html;
  startStationTimers(station);
}

function renderStationCard(c, station, now, mode) {
  const lignes = getLignes(c).filter(l => l.station === station);
  const ref = c.sentAt ? parseInt(c.sentAt) : parseInt(c.createdAt);
  const elapsed = ref ? now - ref : 0;
  const headerCls = mode === 'en_cours' ? stationHeaderClass(elapsed) : '';
  const timerCls = stationTimerClass(elapsed);
  const label = c.type === 'emporter'
    ? 'Emporté #' + String(c.table).padStart(4,'0')
    : 'Table ' + c.table;
  const allergie = c.allergie || '';

  if (mode === 'servi') {
    return `<div class="station-card" style="opacity:.45">
      <div class="station-card-header" style="background:rgba(139,134,128,.2);color:#8B8680">
        <strong>${label}</strong>
        ${c.couverts ? `<span style="font-size:12px;opacity:.7;margin-left:4px">${c.couverts} cvt</span>` : ''}
        <span class="station-card-timer" style="margin-left:auto">${formatTimer(elapsed)}</span>
      </div>
      <div style="padding:8px 14px;font-size:12px;color:#8B8680">
        ${lignes.length} article${lignes.length>1?'s':''} servi${lignes.length>1?'s':''}
      </div>
    </div>`;
  }

  if (mode === 'pret') {
    const pretLignes = lignes.filter(l => l.statut === 'prêt');
    const listHtml = pretLignes.map(l =>
      `<div style="padding:6px 14px;font-size:13px;border-bottom:1px solid rgba(255,255,255,.04);display:flex;align-items:center;gap:6px">
        <span style="color:#4CAF7D">✓</span>
        <span>${l.qte||1}× ${l.nom}</span>
        ${l.commentaire ? `<span style="font-size:11px;color:#7A6E5F;margin-left:4px">— ${l.commentaire}</span>` : ''}
      </div>`
    ).join('');
    return `<div class="station-card" style="border-color:rgba(76,175,125,.4)">
      ${allergie ? `<div class="allergie-bandeau">⚠ Allergie : ${allergie}</div>` : ''}
      <div class="station-card-header" style="background:rgba(76,175,125,.18);color:#4CAF7D">
        <strong style="font-size:15px">${label}</strong>
        ${c.couverts ? `<span style="font-size:12px;opacity:.7;margin-left:4px">${c.couverts} cvt</span>` : ''}
        ${c.vip ? '<span class="badge badge-vip" style="font-size:10px;margin-left:4px">VIP</span>' : ''}
        <span class="station-card-timer" data-station-timer="${c.id}">${formatTimer(elapsed)}</span>
      </div>
      ${listHtml}
    </div>`;
  }

  // Mode EN COURS
  const lignesEnAttente = lignes.filter(l => l.statut !== 'prêt' && l.statut !== 'servi');
  const lignesPret = lignes.filter(l => l.statut === 'prêt');
  const HIDE_DELAY = 30000;
  const lignesPretRecent = lignesPret.filter(l => {
    const t = PRET_TIMES[c.id + '_' + l.id];
    return t && (now - t) < HIDE_DELAY;
  });
  const lignesPretExpires = lignesPret.filter(l => {
    const t = PRET_TIMES[c.id + '_' + l.id];
    return !t || (now - t) >= HIDE_DELAY;
  });
  const showExpired = SHOW_EXPIRED_PRET.has(c.id);

  let pretSection = '';
  if (lignesPretRecent.length > 0) {
    pretSection += `<div class="station-pret-sep">✓ Prêt (${lignesPret.length})</div>`;
    pretSection += lignesPretRecent.map(l => buildStationLigne(c, l, station)).join('');
  } else if (lignesPret.length > 0) {
    pretSection += `<div class="station-pret-sep">✓ Prêt (${lignesPret.length})</div>`;
  }
  if (lignesPretExpires.length > 0) {
    if (showExpired) {
      pretSection += lignesPretExpires.map(l => buildStationLigne(c, l, station)).join('');
      pretSection += `<button class="pret-expire-toggle" onclick="toggleShowExpiredPret('${c.id}','${station}')">▲ Masquer les terminés</button>`;
    } else {
      pretSection += `<button class="pret-expire-toggle" onclick="toggleShowExpiredPret('${c.id}','${station}')">👁 ${lignesPretExpires.length} plat${lignesPretExpires.length > 1 ? 's' : ''} déjà terminé${lignesPretExpires.length > 1 ? 's' : ''} — voir</button>`;
    }
  }

  return `<div class="station-card">
    ${allergie ? `<div class="allergie-bandeau">⚠ Allergie : ${allergie}</div>` : ''}
    <div class="station-card-header ${headerCls}" data-station-header="${c.id}">
      <strong style="font-size:15px">${label}</strong>
      ${c.couverts ? `<span style="font-size:12px;opacity:.7;margin-left:4px">${c.couverts} cvt</span>` : ''}
      ${c.vip ? '<span class="badge badge-vip" style="font-size:10px;margin-left:4px">VIP</span>' : ''}
      <span class="${timerCls}" data-station-timer="${c.id}">${formatTimer(elapsed)}</span>
    </div>
    <div>
      ${lignesEnAttente.map(l => buildStationLigne(c, l, station)).join('')}
      ${pretSection}
    </div>
    <div style="padding:8px 12px">
      <button class="btn btn-success" style="padding:8px;font-size:13px;width:100%;background:#5C6B3A"
        onclick="showConfirmToutPret('${c.id}','${station}')">✓ Tout terminer</button>
    </div>
  </div>`;
}

function buildStationLigne(cmd, l, station) {
  const now = Date.now();
  const elapsed = l.addedAt ? now - parseInt(l.addedAt) : 0;
  const tClass = timerClass(elapsed, true);
  const isPret = l.statut === 'prêt';
  const isRed = tClass === 'red' && !isPret;
  const nomEsc = l.nom.replace(/'/g, "\\'");
  const commentEsc = (l.commentaire || '').replace(/'/g, "\\'");

  return `<div class="station-ligne ${isPret ? 'pret' : ''} ${isRed ? 'blink-red' : ''}"
    data-cmdid="${cmd.id}" data-ligneid="${l.id}"
    onclick="${isPret ? '' : `showConfirmPretLigne('${cmd.id}','${l.id}','${nomEsc}','${commentEsc}')`}">
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:6px">
        <span class="ligne-qte">${l.qte||1}×</span>
        <span class="ligne-nom">${l.nom}</span>
      </div>
      ${l.commentaire ? `<div class="ligne-comment">💬 ${l.commentaire}</div>` : ''}
    </div>
    <span class="ligne-timer ${tClass}">${formatTimer(elapsed)}</span>
    ${isPret ? '<span style="color:var(--green);font-size:20px;margin-left:8px">✓</span>' : ''}
  </div>`;
}

let stationTimerIntervals = {};
function startStationTimers(station) {
  if (stationTimerIntervals[station]) clearInterval(stationTimerIntervals[station]);
  stationTimerIntervals[station] = setInterval(() => {
    const now = Date.now();
    document.querySelectorAll(`[data-station-timer]`).forEach(el => {
      const cmdId = el.getAttribute('data-station-timer');
      const cmd = STATE.commandes.find(c => c.id === cmdId);
      if (!cmd) return;
      const ref = cmd.sentAt ? parseInt(cmd.sentAt) : parseInt(cmd.createdAt);
      if (!ref) return;
      const elapsed = now - ref;
      el.textContent = formatTimer(elapsed);
      el.className = stationTimerClass(elapsed);
      // Update header background class
      const header = document.querySelector(`[data-station-header="${cmdId}"]`);
      if (header) {
        header.className = 'station-card-header ' + stationHeaderClass(elapsed);
      }
    });
    document.querySelectorAll('.ligne-timer').forEach(el => {
      const ligne = el.closest('.station-ligne');
      if (!ligne) return;
      const ligneId = ligne.getAttribute('data-ligneid');
      const cmdId = ligne.getAttribute('data-cmdid');
      const cmd = STATE.commandes.find(c => c.id === cmdId);
      if (!cmd) return;
      const l = getLignes(cmd).find(x => x.id === ligneId);
      if (!l || !l.addedAt) return;
      const elapsed = now - parseInt(l.addedAt);
      el.textContent = formatTimer(elapsed);
      el.className = 'ligne-timer ' + timerClass(elapsed, true);
    });
  }, 1000);
}

// ============================================================
// CUISINE — 4 NIVEAUX DE COULEUR HEADER
// ============================================================
function stationHeaderClass(ms) {
  const min = ms / 60000;
  if (min >= 20) return 'sh-critique';
  if (min >= 15) return 'sh-urgent';
  if (min >= 8)  return 'sh-attention';
  return '';
}

function stationTimerClass(ms) {
  const min = ms / 60000;
  if (min >= 20) return 'sct-critique station-card-timer';
  if (min >= 15) return 'sct-urgent station-card-timer';
  if (min >= 8)  return 'sct-attention station-card-timer';
  return 'sct-normal station-card-timer';
}

// ============================================================
// CUISINE — POPUP CONFIRMATION TAP
// ============================================================
function closeConfirmPopup(e) {
  const overlay = document.getElementById('confirm-popup-overlay');
  if (!e || e.target === overlay) overlay.classList.remove('active');
}

function showConfirmPretLigne(cmdId, ligneId, nom, comment) {
  const box = document.getElementById('confirm-popup-box');
  box.innerHTML = `
    <div class="confirm-popup-title">✓ Plat terminé ?</div>
    <div class="confirm-popup-detail">
      <strong>${nom}</strong><br>
      ${comment ? `<em style="color:#7A6E5F">${comment}</em>` : ''}
    </div>
    <div class="confirm-popup-btns">
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup()">Annuler</button>
      <button class="confirm-popup-ok" onclick="marquerPretLigne('${cmdId}','${ligneId}');closeConfirmPopup()">✓ Confirmer</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

function showConfirmToutPret(cmdId, station) {
  const cmd = STATE.commandes.find(c => c.id === cmdId);
  if (!cmd) return;
  const lignes = getLignes(cmd).filter(l => l.station === station && l.statut === 'en_attente');
  if (lignes.length === 0) { showToast('Tout est déjà prêt', 'success'); return; }
  const label = cmd.type === 'emporter'
    ? 'Emporté #' + String(cmd.table).padStart(4,'0')
    : 'Table ' + cmd.table;
  const listHtml = lignes.map(l =>
    `<li>${l.qte||1}× ${l.nom}</li>`
  ).join('');
  const box = document.getElementById('confirm-popup-box');
  box.innerHTML = `
    <div class="confirm-popup-title">✓ Terminer toute la table ?</div>
    <div class="confirm-popup-detail">${label}${cmd.couverts ? ' · ' + cmd.couverts + ' couverts' : ''}</div>
    <ul class="confirm-popup-list">${listHtml}</ul>
    <div class="confirm-popup-btns">
      <button class="confirm-popup-cancel" onclick="closeConfirmPopup()">Annuler</button>
      <button class="confirm-popup-ok" onclick="marquerToutPret('${cmdId}','${station}');closeConfirmPopup()">✓ Tout confirmer</button>
    </div>`;
  document.getElementById('confirm-popup-overlay').classList.add('active');
}

async function marquerPretLigne(cmdId, ligneId) {
  const cmd = STATE.commandes.find(c => c.id === cmdId);
  if (!cmd) return;
  const lignes = getLignes(cmd);
  const l = lignes.find(x => x.id === ligneId);
  if (!l || l.statut === 'prêt') return;
  l.statut = 'prêt';
  PRET_TIMES[cmdId + '_' + ligneId] = Date.now();
  saveLignes(cmd, lignes);
  cmd.updatedAt = Date.now();
  renderCurrentView();
  enqueueWrite('saveCommande', cmd).catch(() => showToast('Erreur réseau', 'error'));
}

async function marquerToutPret(cmdId, station) {
  const cmd = STATE.commandes.find(c => c.id === cmdId);
  if (!cmd) return;
  const lignes = getLignes(cmd);
  const now = Date.now();
  lignes.filter(l => l.station === station && l.statut === 'en_attente').forEach(l => {
    l.statut = 'prêt';
    PRET_TIMES[cmdId + '_' + l.id] = now;
  });
  saveLignes(cmd, lignes);
  cmd.updatedAt = Date.now();
  showToast('Table prête ✓', 'success');
  renderCurrentView();
  enqueueWrite('saveCommande', cmd).catch(() => showToast('Erreur réseau', 'error'));
}

function toggleShowExpiredPret(cmdId, station) {
  if (SHOW_EXPIRED_PRET.has(cmdId)) SHOW_EXPIRED_PRET.delete(cmdId);
  else SHOW_EXPIRED_PRET.add(cmdId);
  renderStation(station);
}

async function marquerToutPretStation(station) {
  const ouvertes = STATE.commandes.filter(c => c.statut === 'ouverte');
  for (const cmd of ouvertes) {
    const lignes = getLignes(cmd);
    const pending = lignes.filter(l => l.station === station && l.statut === 'en_attente');
    if (pending.length > 0) {
      pending.forEach(l => l.statut = 'prêt');
      saveLignes(cmd, lignes);
      cmd.updatedAt = Date.now();
      enqueueWrite('saveCommande', cmd).catch(() => {});
    }
  }
  showToast('Tout marqué prêt ✓', 'success');
  renderCurrentView();
}
