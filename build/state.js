const APP_VERSION = '1.0.0';
const REPO = 'csuarezsm/Poker';
const MAX_ARCHIVE = 500;
const uid = () => Math.random().toString(36).slice(2, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const $ = s => document.querySelector(s);
const nkey = n => String(n || '').trim().toLowerCase();
const pad2 = n => String(n).padStart(2, '0');
const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n) : d; };
const clampN = (v, a, b, d) => Math.max(a, Math.min(b, num(v, d)));
const cleanName = n => String(n == null ? '' : n).replace(/[<>"'`\u0000-\u001f]/g, '').trim().slice(0, 24);
const SAFE_ID = /^[A-Za-z0-9_-]{1,40}$/;

function load() { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; } }
let saveWarned = false;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); saveWarned = false; }
  catch (e) { if (!saveWarned) { saveWarned = true; setTimeout(() => toast('⚠️ No se pudo guardar. Exporta una copia y borra partidas antiguas.'), 0); } }
}
const DEF_DRAFT = () => ({ mode: 'ai', ai: { name: '', rivals: 3, level: 2, learn: false, fichas: 1500, manos: 10 } });
let S = load() || {};
S.game = S.game || null;
S.draft = Object.assign(DEF_DRAFT(), S.draft || {});
S.draft.ai = Object.assign(DEF_DRAFT().ai, S.draft.ai || {});
S.archive = Array.isArray(S.archive) ? S.archive : [];

/* ================= Utilidades UI ================= */
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200); }
function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }
let modalOnClose = null;
function openModal(html) { const m = $('#modal'); modalOnClose = null; m.innerHTML = '<div class="sheet">' + html + '</div>'; m.classList.remove('hidden'); }
function closeModal() { const m = $('#modal'); m.classList.add('hidden'); m.innerHTML = ''; const f = modalOnClose; modalOnClose = null; if (f) f(); }
$('#updBanner').onclick = () => openUpdAvail();
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeModal(); });
function confirmBox(title, text, okLabel, onOk, danger) {
  openModal(`<h3>${esc(title)}</h3><div class="sub">${esc(text)}</div>
    <div class="acts"><button class="btn-ghost" id="cNo">Cancelar</button><button class="${danger ? 'btn-red' : 'btn-gold'}" id="cOk">${esc(okLabel)}</button></div>`);
  $('#cNo').onclick = closeModal;
  $('#cOk').onclick = () => { closeModal(); onOk(); };
}
/* Mantener la pantalla encendida durante la partida */
let wakeLock = null;
async function keepAwake() {
  try { if ((S.game || (typeof ON !== 'undefined' && ON.sala)) && 'wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => wakeLock = null); } } catch (e) {}
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') keepAwake(); });

/* ================= Render principal ================= */
function render() {
  save();
  if (S.game) renderGame();
  else renderSetup();
}

/* ---------- Historial de torneos ---------- */
const MEDALS = ['🥇', '🥈', '🥉'];
function archiveRow(a, i) {
  const dt = new Date(a.finished || a.created);
  const pos = a.place || 0;
  const who = (a.orden || []).slice(0, 3).map((k, j) => MEDALS[j] + (k === a.yo ? 'Tú' : (a.bots && a.bots[k] ? '🤖' : '') + (a.nombres[k] || '')) ).join(' ');
  return `<div class="hrow"><div class="top"><div class="n">${esc(who)}<small>${dt.toLocaleDateString('es-ES')} ${dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · ${a.mode === 'online' ? 'en línea' : 'contra la máquina'} · ${a.n} jugadores · ${a.manos} manos${a.learn ? ' · 💡' : ''}</small></div><span class="res ${pos === 1 ? 'w' : ''}">${pos === 1 ? '🏆 1º' : pos + 'º'}</span></div></div>`;
}
function openArchive() {
  const A = S.archive.filter(a => a.place > 0);
  const wins = A.filter(a => a.place === 1).length, pod = A.filter(a => a.place <= 3).length;
  const best = A.length ? Math.min(...A.map(a => a.place)) : null;
  const avg = A.length ? (A.reduce((t, a) => t + a.place / a.n, 0) / A.length) : null;
  openModal(`<h3>📊 Historial y estadísticas</h3>
    <div class="sub">Tus torneos terminados, en este móvil.</div>
    ${A.length ? `<div class="stat4"><div><b>${A.length}</b><span>torneos</span></div><div><b>${wins}</b><span>victorias</span></div><div><b>${Math.round(100 * pod / A.length)}%</b><span>en el podio</span></div><div><b>${best}º</b><span>mejor puesto</span></div></div>` : ''}
    ${S.archive.slice(0, 60).map(archiveRow).join('') || '<div class="empty">Aún no has terminado ningún torneo.</div>'}
    <div class="acts"><button class="btn-ghost" id="arBk">💾 Copia de seguridad</button><button class="btn-gold" id="arOk">Cerrar</button></div>`);
  $('#arOk').onclick = closeModal;
  $('#arBk').onclick = () => exportBackup();
}

