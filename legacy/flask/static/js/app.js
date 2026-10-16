/* ════════════════════════════════════════════════════════════
   GNF-TOKEN DASHBOARD v2 — JavaScript
════════════════════════════════════════════════════════════ */

// ── Navigation ─────────────────────────────────────────────
const pages = { dashboard: 'Dashboard', transaction: 'Envoyer un transfert', chaine: 'Chaîne de blocs', mnbc: 'Smart Contract MNBC' };

document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-' + tab).classList.add('active');
    document.getElementById('topbar-title').textContent = pages[tab] || tab;
    if (tab === 'chaine') renderChaine();
    if (tab === 'mnbc')   renderMNBC();
  });
});

// ── Formatage ───────────────────────────────────────────────
const fmtUSD = n => '$' + Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtGNF = n => Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' GNF-D';
const fmtNum = n => Number(n).toLocaleString('fr-FR');
const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('fr-FR');

// ── API ─────────────────────────────────────────────────────
async function api(url, method = 'GET', body = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

// ── Mise à jour Dashboard ───────────────────────────────────
async function updateDashboard() {
  const stats = await api('/api/stats');
  if (!stats || stats.volume_total === undefined) return;

  // KPIs avec animation
  animateValue('kpi-volume',   stats.volume_total,    fmtUSD);
  animateValue('kpi-frais-bc', stats.frais_blockchain, fmtUSD);
  animateValue('kpi-frais-wu', stats.frais_wu,         fmtUSD);
  animateValue('kpi-economie', stats.economie_wu,      fmtUSD);

  document.getElementById('kpi-nb-tx').textContent = `${fmtNum(stats.nb_transactions)} transactions simulées`;
  document.getElementById('chip-volume').textContent = fmtUSD(stats.volume_total) + ' simulés';

  // Status sidebar
  const valid = stats.chaine_valide;
  const dot   = document.getElementById('status-dot');
  dot.className = 'status-dot' + (valid ? '' : ' invalid');
  document.getElementById('status-label').textContent = valid ? 'Chaîne valide' : 'Chaîne invalide';
  document.getElementById('status-blocs').textContent = `${stats.nb_blocs} blocs · ${stats.nb_transactions} tx`;

  // Barres frais
  if (stats.frais_wu > 0) {
    const max = stats.frais_wu;
    setBar('bar-bc',  stats.frais_blockchain / max * 100, fmtUSD(stats.frais_blockchain), 'bval-bc');
    setBar('bar-mtn', stats.frais_mtn        / max * 100, fmtUSD(stats.frais_mtn),        'bval-mtn');
    setBar('bar-wu',  100,                                 fmtUSD(stats.frais_wu),          'bval-wu');
  }

  // Géographie
  if (stats.repartition && Object.keys(stats.repartition).length > 0) {
    renderGeo(stats.repartition, stats.volume_total);
  }
}

function setBar(barId, pct, val, valId) {
  const bar = document.getElementById(barId);
  const label = document.getElementById(valId);
  bar.style.width = Math.max(pct, 2) + '%';
  if (label) label.textContent = val;
}

function animateValue(id, val, fmt) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = 'countUp .4s ease';
  el.textContent = fmt(val);
}

function renderGeo(repartition, total) {
  const container = document.getElementById('geo-list');
  container.innerHTML = '';
  Object.entries(repartition).forEach(([ville, vol], i) => {
    const pct = (vol / total * 100).toFixed(1);
    const el  = document.createElement('div');
    el.className = 'geo-row';
    el.style.animation = `fadeUp .4s ease ${i * .07}s both`;
    el.innerHTML = `
      <div class="geo-rank ${i === 0 ? 'rank-1' : ''}">${i + 1}</div>
      <div class="geo-ville-name">${ville}</div>
      <div class="geo-bar-wrap">
        <div class="geo-track">
          <div class="geo-fill" style="width:${pct}%"></div>
        </div>
      </div>
      <div class="geo-meta">
        <span class="geo-pct">${pct}%</span>
        <span class="geo-val">${fmtUSD(vol)}</span>
      </div>
    `;
    container.appendChild(el);
  });
}

// ── Simulation ──────────────────────────────────────────────
const slider = document.getElementById('sim-slider');
slider.addEventListener('input', () => {
  document.getElementById('nb-tx-label').textContent = slider.value;
});

document.getElementById('btn-simulation').addEventListener('click', async () => {
  const n   = parseInt(slider.value);
  const log = document.getElementById('sim-log');
  const btn = document.getElementById('btn-simulation');

  btn.disabled = true;
  btn.textContent = 'Minage…';
  log.innerHTML = `<span class="sim-ok">⚡ Lancement de ${n} transactions…</span>\n`;

  const res = await api('/api/simulation', 'POST', { nb_transactions: n });

  if (res.succes) {
    res.blocs.forEach(b => {
      log.innerHTML += `<span class="sim-ok">✓ Bloc #${b.index} · ${b.nb_transactions} tx · nonce=${fmtNum(b.nonce)} · ${b.hash.substring(0,14)}… · ${b.temps_minage}s</span>\n`;
    });
    log.innerHTML += `<span class="sim-ok">🔒 Chaîne valide — Économie : ${fmtUSD(res.stats.economie_wu)} vs Western Union</span>`;
    await updateDashboard();
    await renderTxFeed();
    // Forcer réaffichage chaîne si on est sur cet onglet
    if (document.getElementById('page-chaine').classList.contains('active')) renderChaine();
  } else {
    log.innerHTML += `<span class="sim-err">❌ Erreur lors de la simulation</span>`;
  }

  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 16 16" fill="none" width="14"><path d="M3 2l10 6-10 6V2z" fill="currentColor"/></svg> Lancer`;
});

document.getElementById('btn-reset').addEventListener('click', async () => {
  await api('/api/reset', 'POST');
  const log = document.getElementById('sim-log');
  log.innerHTML = '<span class="sim-ok">↺ Blockchain réinitialisée avec succès</span>';
  document.getElementById('tx-feed').innerHTML = '<div class="empty-state"><svg viewBox="0 0 40 40" fill="none" width="40"><path d="M8 20h24M20 8v24" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"/></svg><p>Aucune transaction encore</p></div>';
  document.getElementById('chaine-scroll').innerHTML = '<div class="empty-state"><p>Lancez une simulation pour voir la chaîne</p></div>';
  await updateDashboard();
});

// ── Transaction manuelle ────────────────────────────────────
const txMontant = document.getElementById('tx-montant');

function updatePreview() {
  const m = parseFloat(txMontant.value) || 0;
  document.getElementById('prev-montant').textContent = fmtUSD(m);
  document.getElementById('prev-frais').textContent   = fmtUSD(m * 0.001);
  document.getElementById('prev-wu').textContent      = fmtUSD(m * 0.08);
  document.getElementById('prev-eco').textContent     = fmtUSD(m * 0.08 - m * 0.001);
}
txMontant.addEventListener('input', updatePreview);
updatePreview();

document.getElementById('btn-envoyer').addEventListener('click', async () => {
  const source  = document.getElementById('tx-source').value;
  const dest    = document.getElementById('tx-dest').value;
  const montant = parseFloat(txMontant.value);
  if (!montant || montant <= 0) return;

  const btn = document.getElementById('btn-envoyer');
  btn.disabled = true;
  btn.textContent = '⏳ Minage en cours…';

  const res = await api('/api/transaction', 'POST', { source, destination: dest, montant });
  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 20 20" fill="none" width="16"><path d="M18 2L9 11M18 2l-6 16-3-7-7-3 16-6z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg> Envoyer via GNF-Token`;

  if (res.succes) {
    await renderTxFeed();
    await updateDashboard();
  }
});

async function renderTxFeed() {
  const chaine = await api('/api/chaine');
  const feed   = document.getElementById('tx-feed');
  const toutes = chaine.slice(1).flatMap(b => b.transactions).reverse().slice(0, 20);

  const badge = document.getElementById('tx-count-badge');
  if (badge) badge.textContent = toutes.length + ' tx';

  if (toutes.length === 0) {
    feed.innerHTML = '<div class="empty-state"><svg viewBox="0 0 40 40" fill="none" width="40"><path d="M8 20h24M20 8v24" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"/></svg><p>Aucune transaction encore</p></div>';
    return;
  }
  feed.innerHTML = '';
  toutes.forEach(tx => {
    const el = document.createElement('div');
    el.className = 'tx-item';
    el.innerHTML = `
      <div class="tx-top">
        <span class="tx-route">${tx.source_ville || '?'} → ${tx.ville_dest}</span>
        <span class="tx-amount">${fmtUSD(tx.montant)}</span>
      </div>
      <div class="tx-bottom">
        <span class="tx-fee">Frais : ${fmtUSD(tx.frais)}</span>
        <span class="tx-hash">#${tx.signature}</span>
        <span>${fmtTime(tx.horodatage)}</span>
      </div>
    `;
    feed.appendChild(el);
  });
}

// ── Chaîne de blocs ─────────────────────────────────────────
async function renderChaine() {
  const chaine    = await api('/api/chaine');
  const container = document.getElementById('chaine-scroll');
  const badge     = document.getElementById('chaine-badge');
  if (badge) badge.textContent = (chaine.length - 1) + ' blocs';

  if (chaine.length <= 1) {
    container.innerHTML = '<div class="empty-state"><p>Lancez une simulation pour voir la chaîne</p></div>';
    return;
  }
  container.innerHTML = '';

  chaine.forEach((bloc, i) => {
    // Connecteur
    if (i > 0) {
      const arrow = document.createElement('div');
      arrow.className = 'bloc-connector';
      arrow.textContent = '←';
      container.appendChild(arrow);
    }

    const el = document.createElement('div');
    el.className = 'bloc-node' + (bloc.index === 0 ? ' genesis' : '');
    el.style.animationDelay = (i * .04) + 's';

    const hashDisplay = bloc.hash.startsWith('000')
      ? `<span class="hash-zeros">000</span>${bloc.hash.substring(3, 14)}…`
      : bloc.hash.substring(0, 14) + '…';

    el.innerHTML = `
      <div class="bloc-node-header">
        <span class="bloc-num ${bloc.index === 0 ? 'genesis-num' : ''}">
          Bloc #${bloc.index}${bloc.index === 0 ? ' ⚙' : ''}
        </span>
        <span class="bloc-valid"></span>
      </div>
      <div class="bloc-hash">${hashDisplay}</div>
      <div class="bloc-meta">
        <span><strong>${bloc.nb_transactions}</strong> transaction(s)</span>
        <span>Nonce : <strong>${fmtNum(bloc.nonce)}</strong></span>
        ${bloc.index > 0 ? `<span>Minage : <strong>${bloc.temps_minage}s</strong></span>` : ''}
      </div>
    `;
    container.appendChild(el);
  });
}

// ── MNBC ────────────────────────────────────────────────────
async function renderMNBC() {
  const [portefeuilles, historique, aml] = await Promise.all([
    api('/api/mnbc/portefeuilles'),
    api('/api/mnbc/historique'),
    api('/api/mnbc/aml'),
  ]);

  // Compteur
  const count = document.getElementById('mnbc-count');
  if (count) count.textContent = Object.keys(portefeuilles).length;

  // Portefeuilles
  const pEl = document.getElementById('mnbc-portefeuilles');
  pEl.innerHTML = '';
  if (Object.keys(portefeuilles).length === 0) {
    pEl.innerHTML = '<div class="empty-state"><p>Aucun portefeuille</p></div>';
  } else {
    Object.entries(portefeuilles).forEach(([nif, data]) => {
      const el = document.createElement('div');
      el.className = 'mnbc-wallet';
      el.innerHTML = `
        <div class="mnbc-wallet-left">
          <div class="mnbc-nif">NIF ${nif}</div>
          <div class="mnbc-ville-tag">📍 ${data.ville}</div>
        </div>
        <div>
          <div class="mnbc-solde">${fmtGNF(data.solde)}</div>
          <div class="mnbc-solde-sub">Dépenses : ${fmtGNF(data.depenses_jour)}</div>
        </div>
      `;
      pEl.appendChild(el);
    });
  }

  // Historique
  const hEl = document.getElementById('mnbc-historique');
  hEl.innerHTML = '';
  if (historique.length === 0) {
    hEl.innerHTML = '<div class="empty-state"><p>Aucun transfert</p></div>';
  } else {
    [...historique].reverse().forEach(tx => {
      const el = document.createElement('div');
      el.className = 'mnbc-tx';
      el.innerHTML = `
        <div class="mnbc-tx-top">
          <span>${tx.ville_e} → ${tx.ville_r}</span>
          <span class="mnbc-tx-amount">${fmtGNF(tx.montant)}</span>
        </div>
        <div class="mnbc-tx-meta">#${tx.hash}${tx.motif ? ' · ' + tx.motif : ''} · ${fmtTime(tx.ts)}</div>
      `;
      hEl.appendChild(el);
    });
  }

  // AML
  const amlEl = document.getElementById('mnbc-aml');
  const amlCount = document.getElementById('aml-count');
  if (amlCount) amlCount.textContent = aml.length + ' incident' + (aml.length > 1 ? 's' : '');
  amlEl.innerHTML = '';
  if (aml.length === 0) {
    amlEl.innerHTML = '<div class="empty-state"><p>Aucun incident détecté</p></div>';
  } else {
    aml.forEach(inc => {
      const el = document.createElement('div');
      el.className = 'mnbc-aml-item';
      el.innerHTML = `
        <div class="mnbc-aml-nif">⚠ NIF ${inc.nif}</div>
        <div class="mnbc-aml-info">Tentative : ${fmtGNF(inc.montant)} · Plafond : ${fmtGNF(10000)}</div>
      `;
      amlEl.appendChild(el);
    });
  }
}

// Créer portefeuille
document.getElementById('btn-creer-mnbc').addEventListener('click', async () => {
  const nif   = document.getElementById('mnbc-nif').value.trim();
  const solde = document.getElementById('mnbc-solde').value;
  const ville = document.getElementById('mnbc-ville').value;
  const msg   = document.getElementById('mnbc-msg');

  const res = await api('/api/mnbc/creer', 'POST', { nif, solde, ville });
  msg.className = 'mnbc-msg ' + (res.succes ? 'show-ok' : 'show-err');
  msg.textContent = res.message;
  if (res.succes) { renderMNBC(); document.getElementById('mnbc-nif').value = ''; }
});

// Transfert MNBC
document.getElementById('btn-transfert-mnbc').addEventListener('click', async () => {
  const nif_e  = document.getElementById('mnbc-nif-e').value.trim();
  const nif_r  = document.getElementById('mnbc-nif-r').value.trim();
  const montant= document.getElementById('mnbc-montant').value;
  const motif  = document.getElementById('mnbc-motif').value;
  const msg    = document.getElementById('mnbc-msg');

  const res = await api('/api/mnbc/transfert', 'POST', { nif_e, nif_r, montant, motif });
  msg.className = 'mnbc-msg ' + (res.succes ? 'show-ok' : 'show-err');
  msg.textContent = res.succes
    ? `✅ Transfert réussi — hash : ${res.result.hash}`
    : `❌ ${res.result}`;
  if (res.succes) renderMNBC();
});

// ── Init ────────────────────────────────────────────────────
updateDashboard();
setInterval(updateDashboard, 5000);
