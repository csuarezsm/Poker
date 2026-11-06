function openThemes() {
  const cur = S.theme || 'tapete';
  openModal(`<h3>🎨 Aspecto y sonido</h3>
    <label class="f"><span>Velocidad de la máquina<em>Cuánto tarda en decidir y en repartir</em></span><span class="kinds" style="flex:none;width:50%;margin:0">${[['normal', 'Normal'], ['rapida', 'Rápida']].map(([v, l]) => `<button data-speed="${v}" class="${(S.speed || 'normal') === v ? 'on' : ''}">${l}</button>`).join('')}</span></label>
    <label class="f" style="margin-bottom:10px"><span>Sonidos<em>Cartas, fichas y fin de mano</em></span><input type="checkbox" class="tg" id="thSound" ${S.sound !== false ? 'checked' : ''}></label>
    ${AvisoTurno.opcionHtml()}
    <h3>🔠 Tamaño de letra</h3>
    <div class="kinds" style="margin:6px 0 16px">${FONT_SIZES.map(([v, l]) => `<button data-fs="${v}" class="${String(S.fontScale || '1') === v ? 'on' : ''}" style="font-size:${13 * parseFloat(v)}px">${l}</button>`).join('')}</div>
    <h3>🎨 Colores de la app</h3><div class="sub">Toca un tema y se aplica al momento.</div>
    <div class="themes">${Object.entries(THEMES).map(([k, t]) => `
      <button class="th ${k === cur ? 'on' : ''}" data-theme="${k}" style="background:${t.card}">
        <div class="pv" style="background:${t.bg}"><i style="background:${t.card}"></i><i style="background:${t.card2}"></i><b style="background:${t.gold}"></b></div>
        <div class="tn" style="color:${t.txt}">${esc(t.name)}<span style="color:${t.gold}">${k === cur ? '✓' : ''}</span></div>
      </button>`).join('')}</div>
    <div class="acts"><button class="btn-gold" id="thOk">Listo</button></div>`);
  document.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { S.theme = b.dataset.theme; applyTheme(S.theme); save(); openThemes(); });
  document.querySelectorAll('[data-fs]').forEach(b => b.onclick = () => { S.fontScale = b.dataset.fs; applyFont(); save(); openThemes(); });
  document.querySelectorAll('[data-speed]').forEach(b => b.onclick = () => { S.speed = b.dataset.speed; save(); openThemes(); });
  $('#thSound').onchange = e => { S.sound = e.target.checked; save(); if (S.sound) Sound.play('chip'); };
  $('#thOk').onclick = closeModal;
  AvisoTurno.enlazar();
}
