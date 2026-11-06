/* ---------- Menú ---------- */
$('#menuBtn').onclick = () => {
  const g = S.game, live = g && g.st.fase !== 'fin', onl = !g && ON.sala && ON.sala.estado === 'jugando';
  openModal(`<h3>Menú</h3><div class="menu">
      ${(() => { const h = `${live || onl ? `<button id="mLeave">🚪 Salir de la partida</button>` : ''}
      ${g && !live ? '<button id="mNew" class="btn-gold">✚ Nuevo torneo</button>' : ''}`; return h.trim() ? '<div class="mt">Esta partida</div>' + h : ''; })()}
      <div class="mt">Partidas</div>
      <button id="mArch">📊 Historial y estadísticas</button>
      <div class="mt">Ajustes y ayuda</div>
      <div class="mg2"><button id="mTheme">🎨 Colores y sonido</button><button id="mLang">🌐 Idioma · Language</button><button id="mHelp">❓ Cómo se usa</button><button id="mGameRules">📖 Reglas del póker</button><button id="mHands">🃏 Qué gana a qué</button><button id="mWipe">🗑 Borrar datos</button></div>
      <div class="mt">La app</div>
      ${isIOS() && !isStandalone() && !isNative() ? '<button id="mIOS" class="btn-gold">📲 Instalar en el iPhone</button>' : ''}
      ${isPlay() || !isNative() ? '' : hasUpd() ? `<button id="mUpd" class="btn-gold">🎉 Actualizar a v${esc(S.updAvail.v)} (nueva)</button>` : '<button id="mUpd">🔄 Buscar actualizaciones</button>'}
      <div class="mg2"><button id="mShareApp">📲 Compartir la app</button><button id="mMas">🎲 Más juegos de IT Canarias</button><button id="mAbout">ℹ️ Acerca de</button><button id="mImp">📥 Importar copia</button></div>
      <button class="btn-ghost" id="mClose">Cerrar</button></div>`);
  const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
  on('mClose', closeModal);
  on('mHelp', () => openWelcome(0));
  on('mGameRules', openGameRules);
  on('mHands', openHands);
  on('mWipe', openWipe);
  on('mTheme', openThemes);
  on('mUpd', () => hasUpd() ? openUpdAvail() : checkUpdates(true));
  on('mLang', () => Idioma.elegir());
  on('mMas', () => MasJuegos.abrir());
  on('mShareApp', () => { closeModal(); shareApp(); });
  on('mIOS', () => openIOSInstall(true));
  on('mImp', () => { closeModal(); importBackup(); });
  on('mArch', openArchive);
  on('mNew', () => { closeModal(); S.game = null; render(); });
  on('mLeave', () => S.game ? openLeave() : leaveOnline());
  on('mAbout', () => {
    openModal(`<h3>Póker</h3>
      <div class="sub">v${APP_VERSION}<br>© 2026 IT Canarias. Todos los derechos reservados.<br>itcanarias.com<br><br>Reglas y máquina propias de IT Canarias. Juego de entretenimiento con fichas ficticias: no se apuesta dinero real ni se puede ganar nada.</div>
      <details class="hrow" style="margin-bottom:10px"><summary style="cursor:pointer;font-weight:700">🔒 Privacidad</summary>
        <div class="mut" style="margin-top:8px;line-height:1.5">
        • Tus torneos y ajustes se guardan <b>solo en este móvil</b>. No hay cuentas ni registro.<br>
        • La app <b>no recoge ningún dato personal</b> ni de uso, y no lleva anuncios ni rastreadores.<br>
        ${!isNative() ? '• Esta es la <b>versión web</b>: se carga desde GitHub Pages (csuarezsm.github.io) y se actualiza sola al abrirla, sin enviar ningún dato tuyo. Instalada en la pantalla de inicio funciona sin conexión.<br>' : ''}
        ${ONLINE_URL ? '• Solo si juegas <b>en línea</b>, se envían al servidor de juegos de IT Canarias el nombre que pones y tus jugadas, para la partida (el mazo lo baraja el servidor y solo te manda tus cartas). No se guarda nada más.<br>' : ''}
        • La copia de seguridad automática se queda en el móvil; Android puede incluirla en tu copia de Google si la tienes activada.<br>
        • Al instalarla y al actualizarla, la app avisa de forma <b>anónima</b> al servidor de IT Canarias para contar instalaciones: solo el juego, el tipo de app (Android, iPhone o web) y la versión. Sin IP ni identificador.<br>
        • Responsable: IT Canarias · itcanarias.com</div></details>
      ${isPlay() ? '' : `<div class="donate">
        <div class="dt">💛 Apoya el desarrollo de esta app</div>
        <div class="dd">Es gratis y sin anuncios. Con 1&nbsp;€ nos ayudas a seguir mejorándola y a crear nuevas apps como esta. ¡Gracias!</div>
        <button class="btn-gold" id="donate">Apoyar con 1 € (PayPal)</button>
      </div>`}
      <div class="acts"><button class="btn-ghost" id="ok">Cerrar</button></div>`);
    $('#ok').onclick = closeModal;
    if ($('#donate')) $('#donate').onclick = () => openExternal(DONATE_URL);
  });
};

function openLeave() {
  openModal(`<h3>🚪 Salir de la partida</h3><div class="sub">El torneo no está terminado. Si sales sin abandonarlo, lo tienes aquí la próxima vez que abras la app.</div><div class="menu">
    <button id="lvDel" class="btn-red">Abandonar el torneo<br><small>No se guarda en el historial</small></button></div>
    <div class="acts"><button class="btn-gold" id="lvNo">Seguir jugando</button></div>`);
  $('#lvNo').onclick = closeModal;
  $('#lvDel').onclick = () => { closeModal(); clearTimeout(AIT); S.game = null; render(); toast('Torneo abandonado'); };
}
/* Botón «atrás» de Android: cierra lo que esté abierto o vuelve a la pantalla anterior.
   Devuelve false si ya no hay nada que cerrar (entonces la app se va al fondo). */
function goBack() {
  if (!$('#modal').classList.contains('hidden')) { closeModal(); return true; }
  if (S.game && S.game.st.fase === 'fin') { S.game = null; render(); return true; }
  if (S.game) { openLeave(); return true; }
  if (ON.sala) { if (ON.sala.estado === 'jugando') leaveOnline(); else onEnviar({ t: 'salir' }); return true; }
  if (S.draft.mode !== 'ai') { S.draft.mode = 'ai'; render(); return true; }
  return false;
}
try {
  const AppP = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
  if (AppP && AppP.addListener) AppP.addListener('backButton', () => { if (!goBack()) { if (AppP.minimizeApp) AppP.minimizeApp().catch(() => AppP.exitApp()); else AppP.exitApp(); } });
} catch (e) {}

/* ================= Arranque ================= */
applyTheme(S.theme);
applyFont();
refreshUpdBadge();
setTimeout(autoCheckUpdates, 2500);
setTimeout(async () => {
  try { await offerRestore(); } catch (e) {}
  if (!S.onboarded) {
    if (S.archive.length || S.game) { S.onboarded = true; save(); }
    else if ($('#modal').classList.contains('hidden')) openWelcome(0);
  }
  if ($('#modal').classList.contains('hidden')) openIOSInstall(false);
}, 400);
try { if (!isNative() && navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) {}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') autoBackup(false); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') autoCheckUpdates(); });
if (S.game && !cleanLive(S.game)) S.game = null;      // partida guardada dañada
render();
if (S.game) keepAwake();
if ('serviceWorker' in navigator && isNative()) {
  navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())).catch(() => {});
  if (window.caches) caches.keys().then(ks => ks.forEach(k => caches.delete(k))).catch(() => {});
} else if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
</script>
</body>
</html>
