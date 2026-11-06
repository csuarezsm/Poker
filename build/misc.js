/* ---------- Borrar datos ---------- */
function openWipe() {
  openModal(`<h3>🗑 Borrar datos</h3><div class="sub">Elige qué quieres borrar. No se puede deshacer, así que antes puedes guardar una copia.</div>
    <div class="menu">
      ${S.archive.length ? '<button id="wCopy">💾 Guardar una copia antes</button>' : ''}
      <button id="wHist">Solo el historial de torneos<br><small class="mut">Se mantienen los ajustes y la partida en curso</small></button>
      <button id="wAll" class="btn-red">Todo: dejar la app como nueva<br><small>Partida, historial, ajustes y copias automáticas</small></button>
    </div>
    <div class="acts"><button class="btn-ghost" id="wNo">Cancelar</button></div>`);
  $('#wNo').onclick = closeModal;
  const cp = $('#wCopy'); if (cp) cp.onclick = () => exportBackup();
  $('#wHist').onclick = () => confirmBox('Borrar historial', `Se borrarán los ${S.archive.length} torneos guardados.`, 'Borrar historial', () => { S.archive = []; save(); render(); toast('Historial borrado'); }, true);
  $('#wAll').onclick = () => confirmBox('Borrar TODO', 'La app quedará como recién instalada. ¿Seguro?', 'Sí, borrar todo', () => confirmBox('Última confirmación', 'Se perderán la partida, el historial y los ajustes.', 'Borrar todo', wipeAll, true), true);
}
async function wipeAll() {
  if (isNative()) {
    const { Filesystem } = window.Capacitor.Plugins;
    for (const [path, directory] of [[AUTO_FILE, 'DATA'], ['Poker/' + AUTO_FILE, 'DOCUMENTS']]) { try { await Filesystem.deleteFile({ path, directory }); } catch (e) {} }
  }
  try { localStorage.removeItem(KEY); localStorage.setItem(KEY, JSON.stringify({ restoreOffered: true, onboarded: true })); } catch (e) {}
  location.reload();
}

/* ---------- Pantalla de bienvenida ---------- */
const WELCOME = [
  ['♠️', 'Bienvenido a Póker', 'Texas Hold\'em, el póker de los torneos: contra la máquina o en línea con amigos. Con fichas ficticias: aquí no se juega dinero. Gratis y sin anuncios.'],
  ['🏆', 'Un torneo', 'Todos empiezan con las mismas fichas. Las ciegas (apuestas obligatorias) suben cada cierto número de manos y quien se queda sin fichas queda eliminado. Gana el último que quede en pie.'],
  ['👆', 'Cómo se juega', 'Recibes dos cartas. En tu turno puedes retirarte, pasar o igualar, o subir con el botón dorado (hay atajos: ½ bote, bote, todo). La mejor mano de cinco cartas se lleva el bote.'],
  ['💡', 'Modo aprendizaje', 'Actívalo al empezar o en cualquier momento. Te dice qué mano tienes, tus probabilidades de ganar, las cartas que te valen y qué conviene hacer… y por qué. Nunca juega por ti.'],
  ['🌐', 'Con amigos', 'Crea una mesa en línea y pasa el código por WhatsApp: hasta 9 personas, cada una en su móvil. La máquina puede ocupar las sillas libres.']
];
function openWelcome(i) {
  i = Math.max(0, Math.min(WELCOME.length - 1, i || 0));
  const [ic, t, d] = WELCOME[i], last = i === WELCOME.length - 1;
  openModal(`<div style="text-align:center;padding:10px 4px 0">
      <div style="font-size:calc(64px * var(--fs, 1));line-height:1.2">${ic}</div>
      <h3 style="margin:10px 0 8px;font-size:calc(22px * var(--fs, 1))">${esc(t)}</h3>
      <div class="mut" style="font-size:calc(16px * var(--fs, 1));line-height:1.5;min-height:7em">${esc(d)}</div>
      <div style="display:flex;justify-content:center;gap:6px;margin:14px 0 4px">${WELCOME.map((_, k) => `<i style="width:${k === i ? 20 : 8}px;height:8px;border-radius:4px;background:${k === i ? 'var(--gold)' : 'var(--line)'}"></i>`).join('')}</div>
    </div>
    <div class="acts">${i ? '<button class="btn-ghost" id="wbPrev">‹ Atrás</button>' : '<button class="btn-ghost" id="wbSkip">Saltar</button>'}<button class="btn-gold" id="wbNext">${last ? '¡A jugar!' : 'Siguiente ›'}</button></div>`);
  const done = () => { S.onboarded = true; save(); closeModal(); openIOSInstall(false); };
  const sk = $('#wbSkip'); if (sk) sk.onclick = done;
  const pv = $('#wbPrev'); if (pv) pv.onclick = () => openWelcome(i - 1);
  $('#wbNext').onclick = () => last ? done() : openWelcome(i + 1);
}

/* ---------- Reglas del juego ---------- */
function openGameRules() {
  openModal(`<h3>📖 Reglas del póker</h3><div class="sub">Texas Hold'em sin límite, en formato torneo. Reglas de la TDA (Poker Tournament Directors Association) y de Robert's Rules of Poker.</div><div class="rules">
    <h4>Objetivo</h4><p>Ganar todas las fichas de la mesa. Se juega con fichas ficticias; quien se queda sin ellas queda eliminado.</p>
    <h4>Una mano</h4><ul>
      <li>El <b>botón (D)</b> marca quién reparte y avanza un asiento cada mano. A su izquierda, el <b>ciego pequeño (SB)</b> y el <b>ciego grande (BB)</b> ponen apuestas obligatorias.</li>
      <li>Cada jugador recibe <b>2 cartas privadas</b>. Hay cuatro rondas de apuestas: <b>preflop</b>, <b>flop</b> (3 cartas comunes), <b>turn</b> (1) y <b>river</b> (1).</li>
      <li>Preflop empieza a hablar el jugador a la izquierda del ciego grande; en las demás rondas, el primero a la izquierda del botón. Con dos jugadores, el botón es el ciego pequeño y habla primero preflop.</li></ul>
    <h4>Tus opciones</h4><ul>
      <li><b>Retirarte</b> (fold): sueltas las cartas y pierdes lo apostado.</li>
      <li><b>Pasar</b> (check): si nadie ha apostado, sigues sin pagar.</li>
      <li><b>Igualar</b> (call): pagas la apuesta actual. <b>Apostar / Subir</b> (bet / raise): pones más.</li>
      <li>La <b>subida mínima</b> es igual a la última subida de la ronda (y como mínimo, la ciega grande). Se puede subir hasta <b>todo</b> (all-in).</li></ul>
    <h4>All-in y botes laterales</h4><ul>
      <li>Si te quedas sin fichas, sigues en la mano pero solo puedes ganar lo que has igualado; el resto de la apuesta forma un <b>bote lateral</b> entre los demás.</li>
      <li>Una subida all-in menor que la mínima <b>no reabre</b> la apuesta a quien ya había hablado.</li></ul>
    <h4>Showdown</h4><ul>
      <li>Si queda más de uno tras la última ronda, se enseñan las cartas y gana la <b>mejor mano de cinco cartas</b> entre tus dos y las cinco de la mesa (en la app se destapan todas las manos). Si empatan, se reparte; una ficha sobrante va al primero a la izquierda del botón.</li>
      <li>Si todos se retiran menos uno, se lleva el bote sin enseñar.</li></ul>
    <h4>El torneo en la app</h4><ul>
      <li>Las ciegas <b>suben cada cierto número de manos</b> (5, 10 o 15, a tu elección) en vez de por reloj, y no hay antes.</li>
      <li>Los eliminados en la misma mano se ordenan por las fichas con las que empezaron esa mano (más fichas, mejor puesto).</li>
      <li>El botón sigue su camino aunque se vaya alguien («botón muerto»), como en los torneos reales.</li>
      <li>Contra la máquina, si te eliminan, el torneo se resuelve solo y ves la clasificación final.</li>
      <li>En línea, el servidor baraja y reparte; si no juegas en el tiempo de la mesa, pasas o te retiras solo.</li></ul>
  </div><div class="acts"><button class="btn-ghost" id="grHands">🃏 Qué gana a qué</button><button class="btn-gold" id="grOk">Entendido</button></div>`);
  $('#grOk').onclick = closeModal;
  $('#grHands').onclick = openHands;
}

/* ---------- Compartir la app ---------- */
const APK_URL = 'https://github.com/' + REPO + '/releases/latest/download/poker.apk';
const WEB_URL = 'https://csuarezsm.github.io/Poker/app/';
const DESCARGA_URL = 'https://csuarezsm.github.io/Poker/';
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
function openIOSInstall(force) {
  if (!force && (!isIOS() || isStandalone() || isNative() || S.iosHint)) return false;
  S.iosHint = true; save();
  openModal(`<h3>📲 Instala Póker en tu iPhone</h3><div class="sub">Así tendrás su icono como cualquier app, funcionará sin conexión y tus torneos quedarán guardados.</div>
    <ol class="rules" style="padding-left:22px;line-height:1.6"><li>Pulsa el botón <b>Compartir</b> de Safari (el cuadrado con la flecha hacia arriba).</li><li>Baja y elige <b>«Añadir a pantalla de inicio»</b>.</li><li>Abre la app desde el nuevo icono.</li></ol>
    <div class="mut">Si solo la usas desde Safari y pasan semanas sin abrirla, iOS puede borrar sus datos. Para no perder nada: ⋮ → Historial → Copia de seguridad.</div>
    <div class="acts"><button class="btn-gold" id="iosOk">Entendido</button></div>`);
  $('#iosOk').onclick = closeModal;
  return true;
}
async function shareApp() {
  const text = '♠️ Póker — Texas Hold\'em: torneos contra la máquina o en línea con amigos, y modo aprendizaje. Fichas ficticias, gratis y sin anuncios.\n\n'
    + (isPlay()
      ? '🤖 Android (Google Play): ' + PLAY_URL + '\n🍏 iPhone: ' + WEB_URL + '\n(en el iPhone, ábrelo en Safari y pulsa Compartir → «Añadir a pantalla de inicio»)'
      : '📲 Descárgala aquí, para Android o iPhone:\n' + DESCARGA_URL + '\n\n🤖 Android: «Descargar para Android» (mejor desde Chrome).\n🍏 iPhone: se abre en Safari; pulsa Compartir → «Añadir a pantalla de inicio».');
  try {
    if (isNative()) { await window.Capacitor.Plugins.Share.share({ title: 'Póker', text, dialogTitle: 'Compartir la app' }); return; }
    if (navigator.share) { await navigator.share({ title: 'Póker', text }); return; }
    await navigator.clipboard.writeText(text); toast('Enlace copiado');
  } catch (e) {
    if (!/cancel|abort/i.test(String(e && (e.message || e.name)))) toast('No se pudo compartir');
  }
}

/* ---------- Copia de seguridad ---------- */
function backupJSON() {
  return JSON.stringify({ app: 'poker', format: 1, version: APP_VERSION, exported: new Date().toISOString(), archive: S.archive, theme: S.theme, fontScale: S.fontScale, sound: S.sound, speed: S.speed, lastName: S.lastName, online: S.online && S.online.nombre ? { nombre: S.online.nombre } : undefined });
}
function cleanGameEntry(a) {
  if (!a || typeof a !== 'object') return null;
  const n = clampN(a.n, 2, 9, 0); if (!n) return null;
  const nombres = Array.isArray(a.nombres) ? a.nombres.slice(0, n).map(x => cleanName(x)) : []; if (nombres.length !== n) return null;
  const orden = Array.isArray(a.orden) ? a.orden.map(Number) : [];
  if (orden.length !== n || new Set(orden).size !== n || !orden.every(k => Number.isInteger(k) && k >= 0 && k < n)) return null;
  const created = num(a.created, Date.now());
  return { id: SAFE_ID.test(String(a.id)) ? String(a.id) : uid(), created, finished: num(a.finished, created), mode: a.mode === 'online' ? 'online' : 'ai', level: clampN(a.level, 0, 3, 0), learn: !!a.learn, n, nombres,
    bots: Array.isArray(a.bots) ? a.bots.slice(0, n).map(Boolean) : nombres.map(() => false), orden, yo: clampN(a.yo, 0, n - 1, 0), place: clampN(a.place, 0, n, 0), manos: clampN(a.manos, 0, 100000, 0), fichas: clampN(a.fichas, 1, 1e7, 1500) };
}
// Partida en curso guardada: solo si tiene la forma correcta
function cleanLive(g) {
  try {
    if (!g || typeof g !== 'object' || !g.st || typeof g.st !== 'object') return null;
    const t = g.st;
    if (!Array.isArray(t.seats) || t.seats.length < 2 || t.seats.length > 9 || !Array.isArray(t.board) || !Array.isArray(t.deck)) return null;
    if (!['preflop', 'flop', 'turn', 'river', 'mano_fin', 'fin'].includes(t.fase)) return null;
    if (!t.seats.every(s => s && Number.isFinite(s.stack) && Number.isFinite(s.bet) && Array.isArray(s.cards))) return null;
    if (!(t.turno === null || (Number.isInteger(t.turno) && t.turno >= 0 && t.turno < t.seats.length))) return null;
    if (!t.cfg || !(t.cfg.manosNivel > 0)) return null;
    return g;
  } catch (e) { return null; }
}
function mergeBackup(b) {
  const have = new Set(S.archive.map(a => a.id));
  const nuevas = b.archive.slice(0, MAX_ARCHIVE).map(cleanGameEntry).filter(a => a && !have.has(a.id));
  S.archive = S.archive.concat(nuevas).sort((x, y) => (y.finished || 0) - (x.finished || 0)).slice(0, MAX_ARCHIVE);
  if (!S.theme && THEMES[b.theme]) { S.theme = b.theme; applyTheme(S.theme); }
  if (!S.fontScale && FONT_SIZES.some(f => f[0] === String(b.fontScale))) { S.fontScale = String(b.fontScale); applyFont(); }
  if (!S.lastName && b.lastName) S.lastName = cleanName(b.lastName);
  if (b.online && b.online.nombre && !(S.online && S.online.nombre)) { S.online = S.online || {}; S.online.nombre = cleanName(b.online.nombre).slice(0, 18); }
  return nuevas.length;
}
const validBackup = b => b && b.app === 'poker' && Array.isArray(b.archive);

/* Copia automática (solo app Android): memoria interna de la app (Android la incluye en su copia de Google) y Documentos/Poker */
const AUTO_FILE = 'poker-copia-auto.json';
let autoBackupBusy = false;
async function autoBackup(force) {
  if (!isNative() || autoBackupBusy) return;
  if (!S.archive.length) return;
  if (!force && S.lastAutoBackup && Date.now() - S.lastAutoBackup < 3600e3) return;
  autoBackupBusy = true;
  try {
    const { Filesystem } = window.Capacitor.Plugins, data = backupJSON();
    await Filesystem.writeFile({ path: AUTO_FILE, data, directory: 'DATA', encoding: 'utf8' });
    try { await Filesystem.writeFile({ path: 'Poker/' + AUTO_FILE, data, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true }); S.autoBackupDocs = true; }
    catch (e) { S.autoBackupDocs = false; }
    S.lastAutoBackup = Date.now(); save();
  } catch (e) { /* se reintenta más tarde */ }
  autoBackupBusy = false;
}
async function offerRestore() {
  if (!isNative() || S.archive.length || S.game || S.restoreOffered) return;
  const { Filesystem } = window.Capacitor.Plugins;
  let b = null;
  for (const [path, directory] of [[AUTO_FILE, 'DATA'], ['Poker/' + AUTO_FILE, 'DOCUMENTS']]) {
    try { const r = await Filesystem.readFile({ path, directory, encoding: 'utf8' }); const j = JSON.parse(r.data); if (validBackup(j) && j.archive.length) { b = j; break; } } catch (e) {}
  }
  S.restoreOffered = true; save();
  if (!b) return;
  const when = new Date(b.exported).toLocaleString('es-ES', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  confirmBox('Recuperar tu historial', `Hay una copia de seguridad del ${when} con ${b.archive.length} torneo${b.archive.length === 1 ? '' : 's'}. ¿Quieres recuperarla?`, 'Recuperar', () => {
    const n = mergeBackup(b); save(); render(); toast(n + ' torneos recuperados');
  });
}
async function exportBackup() {
  const d = new Date(), stamp = d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes());
  const name = 'poker-copia-' + stamp + '.json', data = backupJSON();
  try {
    if (isNative()) {
      const { Filesystem, Share } = window.Capacitor.Plugins;
      const r = await Filesystem.writeFile({ path: name, data, directory: 'CACHE', encoding: 'utf8' });
      await Share.share({ title: 'Copia de Póker', text: 'Copia de seguridad de Póker', files: [r.uri], dialogTitle: 'Guardar copia de seguridad' });
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
      a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('Copia descargada');
    }
  } catch (e) { if (!/cancel/i.test(String(e && e.message))) toast('No se pudo exportar la copia'); }
}
function importBackup() {
  const inp = document.createElement('input');
  inp.type = 'file'; inp.accept = 'application/json,.json,text/plain';
  inp.onchange = () => {
    const f = inp.files && inp.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      let b; try { b = JSON.parse(rd.result); } catch (e) { b = null; }
      if (!validBackup(b)) { toast('Ese archivo no es una copia de Póker'); return; }
      const have = new Set(S.archive.map(a => a.id));
      const nuevas = b.archive.slice(0, MAX_ARCHIVE).map(cleanGameEntry).filter(a => a && !have.has(a.id));
      confirmBox('Importar copia', `Se añadirán ${nuevas.length} torneo${nuevas.length === 1 ? '' : 's'} nuevo${nuevas.length === 1 ? '' : 's'} al historial (los que ya tienes no se duplican).`, 'Importar', () => {
        const n = mergeBackup(b); save(); render(); toast(n + ' torneos importados'); autoBackup(true);
      });
    };
    rd.readAsText(f);
  };
  inp.click();
}
