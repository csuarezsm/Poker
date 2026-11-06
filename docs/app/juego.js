/* Póker — Texas Hold'em: torneo contra la máquina y en línea, con modo aprendizaje (IT Canarias)
   © 2026 IT Canarias. Todos los derechos reservados. */
'use strict';
const P = window.Poker;
const LEVELS = { 1: { name: 'Fácil', desc: 'Juega muchas manos y apuesta poco. Para aprender sin presión.' },
  2: { name: 'Normal', desc: 'Conoce el valor de las manos, calcula probabilidades y sube con las buenas.' },
  3: { name: 'Difícil', desc: 'Selecciona sus manos, se tira faroles y adivina las tuyas.' } };
const BOT_IDEAS = ['Pancho', 'Chano', 'Candelaria', 'Tomasa', 'Juanillo', 'Nieves', 'Pepito', 'Carmela', 'Domingo', 'Fefa', 'Agustín', 'Chona', 'Ramón', 'Pino', 'Chicho', 'Luci'];
const SPEEDS = { normal: { bot: 900, fin: 1200 }, rapida: { bot: 380, fin: 600 } };
const speed = () => SPEEDS[S.speed] || SPEEDS.normal;
// Servidor de juegos en línea (repo csuarezsm/juegos-servidor). Vacío = la opción «En línea» no aparece.
const ONLINE_URL = 'POKER_ONLINE_URL' in window ? window.POKER_ONLINE_URL : 'wss://juegos.itcanarias.com/ws';
const FICHAS_OP = [1000, 1500, 3000], MANOS_OP = [5, 10, 15];
const fmt = n => Number(n).toLocaleString('es-ES');
const botName = (name) => String(name || '').replace(/^🤖\s*/, '');

/* ================= Sonidos (sintetizados: sin archivos de audio) ================= */
const Sound = (() => {
  let ctx = null;
  const ac = () => {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { ctx = new C(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  };
  const out = c => (window.AudioSuave ? AudioSuave.salida(c) : c.destination);
  function knock(c, t, freq, vol, dur) {
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = vol;
    src.buffer = buf; src.connect(f); f.connect(g); g.connect(out(c)); src.start(t);
  }
  function tone(c, t, freq, dur, vol, type) {
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(out(c)); o.start(t); o.stop(t + dur + 0.02);
  }
  function play(kind) {
    if (S.sound === false) return;
    const c = ac(); if (!c) return;
    const t = c.currentTime + 0.01;
    try {
      if (kind === 'deal') { for (let k = 0; k < 2; k++) knock(c, t + k * 0.09, 2200, 0.3, 0.03); }
      else if (kind === 'check') { knock(c, t, 900, 0.5, 0.05); knock(c, t + 0.1, 900, 0.4, 0.05); }
      else if (kind === 'chip') { for (let k = 0; k < 3; k++) knock(c, t + k * 0.05, 3000 - k * 300, 0.3, 0.025); }
      else if (kind === 'fold') knock(c, t, 700, 0.4, 0.06);
      else if (kind === 'allin') { for (let k = 0; k < 6; k++) knock(c, t + k * 0.04, 3200 - k * 250, 0.3, 0.025); tone(c, t + 0.2, 330, 0.3, 0.05, 'sine'); }
      else if (kind === 'win') { [523, 659, 784].forEach((f, i) => tone(c, t + i * 0.12, f, 0.45, 0.07, 'sine')); }
      else if (kind === 'lose') tone(c, t, 220, 0.28, 0.06, 'sine');
      else if (kind === 'end') { [523, 659, 784, 1046].forEach((f, i) => tone(c, t + i * 0.13, f, 0.55, 0.07, 'sine')); }
    } catch (e) {}
  }
  return { play };
})();
const sonidoDe = tipo => ({ fold: 'fold', check: 'check', call: 'chip', bet: 'chip', raise: 'chip', allin: 'allin' })[tipo];

/* ================= Cartas y textos ================= */
const REDS = [1, 2];     // ♦ ♥
function cardHtml(c, cls) {
  if (c == null || c < 0) return `<i class="cd back ${cls || ''}"></i>`;
  const r = P.RANGOS[P.rk(c)].replace('T', '10'), s = P.st(c);
  return `<i class="cd ${REDS.includes(s) ? 'red' : ''} ${cls || ''}"><b>${r}</b><span>${P.PALOS[s]}</span></i>`;
}
function boardHtml(vm) {
  const slots = [];
  for (let k = 0; k < 5; k++) slots.push(vm.board[k] != null ? cardHtml(vm.board[k], 'pop') : '<i class="cd slot"></i>');
  return slots.join('');
}
const nm = (vm, i) => botName(vm.seats[i].nombre) || ('Jugador ' + (i + 1));
function describe(vm, u) {
  if (!u) return '';
  const n = nm(vm, u.i), you = vm.yo === u.i;
  const v = (a, b) => you ? a : b;
  switch (u.tipo) {
    case 'fold': return `${you ? 'Te retiras' : n + ' se retira'}`;
    case 'check': return `${you ? 'Pasas' : n + ' pasa'}`;
    case 'call': return `${you ? 'Igualas' : n + ' iguala'} (${fmt(u.a)})`;
    case 'bet': return `${you ? 'Apuestas' : n + ' apuesta'} ${fmt(u.a)}`;
    case 'raise': return `${you ? 'Subes' : n + ' sube'} a ${fmt(u.a)}`;
    case 'allin': return `${you ? 'Vas con todo' : n + ' va con todo'}: ${fmt(u.a)}`;
  }
  return '';
}
const FASES = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River', mano_fin: 'Fin de la mano', fin: 'Fin del torneo' };
function manoTexto(vm, i) {
  const s = vm.seats[i]; if (!s || s.cards.length < 2 || s.cards[0] < 0) return '';
  if (vm.board.length >= 3) return P.detalleMano(P.evaluar(s.cards.concat(vm.board)));
  return P.describirSalida(s.cards[0], s.cards[1]);
}
function posBadges(vm, i) {
  const b = [];
  if (vm.btn === i) b.push('<em class="bd d">D</em>');
  if (vm.sbp === i) b.push('<em class="bd sb">SB</em>');
  if (vm.bb === i) b.push('<em class="bd bb">BB</em>');
  return b.join('');
}
function resultadoHtml(vm) {
  const r = vm.resultado; if (!r) return '';
  const lineas = r.botes.map((b, k) => {
    const gan = b.ganadores.map(i => i === vm.yo ? 'Tú' : nm(vm, i));
    const sd = r.showdown && b.el.length > 1;
    const det = sd ? ' con ' + P.detalleMano(r.scores[b.ganadores[0]]).toLowerCase() : '';
    const t = gan.length > 1 ? gan.join(' y ') + ' se reparten' : gan[0] + (gan[0] === 'Tú' ? ' ganas' : ' gana');
    return `<div class="rl">${k ? '<small>Bote lateral · </small>' : ''}<b>${t}</b> ${fmt(b.monto)}${det}</div>`;
  });
  return lineas.join('');
}

/* ================= Pantalla de inicio (contra la máquina) ================= */
function uniqueBots(n) {
  const pool = BOT_IDEAS.slice().sort(() => Math.random() - 0.5);
  return pool.slice(0, n);
}
function levelBtns(cur, attr) {
  return `<div class="levels">${[1, 2, 3].map(l => `<button class="lvl ${cur === l ? 'on' : ''}" data-${attr}="${l}"><b>${l}</b><span>${LEVELS[l].name}<em>${LEVELS[l].desc}</em></span></button>`).join('')}</div>`;
}
function modeTabs() {
  const ms = [['ai', '🤖 Contra la máquina']].concat(ONLINE_URL ? [['online', '🌐 En línea con amigos']] : []);
  return `<div class="kinds modes">${ms.map(([k, l]) => `<button data-mode="${k}" class="${S.draft.mode === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
}
function bindModeTabs() { document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { syncDraft(); S.draft.mode = b.dataset.mode; render(); }); }
const optBtns = (vals, cur, attr, lab) => `<span class="kinds" data-opt="${attr}" style="flex:none;width:62%;margin:0">${vals.map(v => `<button data-v="${v}" class="${cur === v ? 'on' : ''}">${lab ? lab(v) : v}</button>`).join('')}</span>`;
function syncDraft() {
  const d = S.draft.ai, el = $('#aiName'); if (el) { d.name = cleanName(el.value).slice(0, 18); if (d.name) S.lastName = d.name; }
  const lr = $('#aiLearn'); if (lr) d.learn = lr.checked;
  save();
}
function renderSetup() {
  if (S.draft.mode === 'online' && ONLINE_URL) return renderOnline();
  S.draft.mode = 'ai';
  $('#subtitle').textContent = 'Torneo de Texas Hold\'em';
  const d = S.draft.ai;
  $('#app').innerHTML = `${modeTabs()}
    <div class="sec"><h2>Tu nombre</h2>
      <input id="aiName" maxlength="18" placeholder="Cómo te llamarás en la mesa" value="${esc(d.name || S.lastName || '')}" autocomplete="off" style="width:100%"></div>
    <div class="sec"><h2>Rivales</h2>
      <div class="kinds" data-opt="rivals" style="margin:0 0 6px">${[1, 2, 3, 4, 5, 6, 7, 8].map(n => `<button data-v="${n}" class="${d.rivals === n ? 'on' : ''}">${n}</button>`).join('')}</div>
      <div class="mut" id="aiRivTxt"></div>
      <h2 style="margin-top:14px">Nivel de la máquina</h2>${levelBtns(d.level, 'lvl')}</div>
    <div class="sec"><h2>El torneo</h2>
      <label class="f"><span>Fichas de cada uno<em>Fichas ficticias: no hay dinero real</em></span>${optBtns(FICHAS_OP, d.fichas, 'fichas', fmt)}</label>
      <label class="f"><span>Las ciegas suben cada<em>Sube el valor de las ciegas obligatorias</em></span>${optBtns(MANOS_OP, d.manos, 'manos', v => v + ' manos')}</label>
      <label class="f"><span>💡 Modo aprendizaje<em>Te explica cada mano: tus probabilidades, las cartas que te valen y qué conviene hacer. Nunca juega por ti.</em></span><input type="checkbox" class="tg" id="aiLearn" ${d.learn ? 'checked' : ''}></label></div>
    <button class="btn-gold" id="aiStart" style="width:100%;padding:16px;font-size:calc(17px * var(--fs, 1))">Repartir ♠</button>
    <div class="mut" style="text-align:center;margin:10px 0 24px">Torneo «freezeout»: cada uno empieza con las mismas fichas y quien se queda sin ellas queda eliminado. Gana el último que queda.</div>`;
  bindModeTabs();
  const upd = () => { $('#aiRivTxt').textContent = `Mesa de ${d.rivals + 1} jugadores (tú y ${d.rivals} ${d.rivals === 1 ? 'rival' : 'rivales'}).`; };
  upd();
  document.querySelectorAll('[data-opt="rivals"] button').forEach(b => b.onclick = () => { d.rivals = +b.dataset.v; save(); document.querySelectorAll('[data-opt="rivals"] button').forEach(x => x.classList.toggle('on', x === b)); upd(); });
  document.querySelectorAll('[data-lvl]').forEach(b => b.onclick = () => { syncDraft(); d.level = +b.dataset.lvl; save(); renderSetup(); });
  document.querySelectorAll('[data-opt="fichas"] button').forEach(b => b.onclick = () => { d.fichas = +b.dataset.v; save(); document.querySelectorAll('[data-opt="fichas"] button').forEach(x => x.classList.toggle('on', x === b)); });
  document.querySelectorAll('[data-opt="manos"] button').forEach(b => b.onclick = () => { d.manos = +b.dataset.v; save(); document.querySelectorAll('[data-opt="manos"] button').forEach(x => x.classList.toggle('on', x === b)); });
  $('#aiLearn').onchange = syncDraft;
  $('#aiStart').onclick = () => { syncDraft(); startAi(); };
}
function startAi() {
  const d = S.draft.ai;
  const nombres = [d.name || 'Tú'].concat(uniqueBots(d.rivals));
  const st = P.nueva({ nombres, bots: nombres.map((_, i) => i > 0), fichas: d.fichas, manosNivel: d.manos });
  S.game = { id: uid(), created: Date.now(), mode: 'ai', level: d.level, learn: !!d.learn, st };
  LAST.key = null; LEARN.open = false; RAISE.key = null;
  Sound.play('deal');
  render(); keepAwake();
}


/* ================= La mesa (la misma para la partida local y la de en línea) ================= */
const LAST = { key: null };
const RAISE = { key: null, val: 0, open: false };
const LEARN = { open: false, key: null, c: null };
let AIT = null;
const clampN2 = (v, a, b) => Math.max(a, Math.min(b, v));
const stateKey = vm => vm.mano + '|' + vm.fase + '|' + (vm.ultimo ? vm.ultimo.n : 0);

function oppHtml(vm, i) {
  const s = vm.seats[i], turn = vm.turno === i, r = vm.resultado;
  const shown = r && r.mostrar.includes(i);
  const cls = ['opp', s.out ? 'out' : '', s.fold ? 'fold' : '', turn ? 'turn' : '', s.allin ? 'allin' : ''].join(' ');
  let cards = '';
  if (s.out) cards = '<div class="ost">Eliminado · ' + s.place + 'º</div>';
  else if (s.fold) cards = '<div class="ost">Retirado</div>';
  else if (s.cards.length) cards = `<div class="ocs">${s.cards.map(c => cardHtml(c, 'sm')).join('')}</div>`;
  const win = r && r.botes.some(b => b.ganadores.includes(i));
  return `<div class="${cls} ${win ? 'win' : ''}"><div class="on">${posBadges(vm, i)}<span>${s.bot ? '🤖 ' : ''}${esc(botName(s.nombre))}</span></div>
    <div class="os">${fmt(s.stack)}${s.allin && !s.out ? ' <small>ALL-IN</small>' : ''}</div>${cards}
    ${s.bet > 0 ? `<div class="ob">${fmt(s.bet)}</div>` : ''}
    ${shown && r.scores[i] != null ? `<div class="oh">${esc(P.detalleMano(r.scores[i]))}</div>` : ''}</div>`;
}

function statusInfo(vm, ctx) {
  if (vm.fase === 'fin') return { t: '🏆 Fin del torneo', cls: 'end' };
  if (vm.fase === 'mano_fin') return { t: 'Fin de la mano ' + vm.mano, cls: '' };
  if (ctx.mine) return { t: 'Te toca' + (ctx.timer ? ' · <span id="pkTimer">' + ctx.timer + '</span>' : ''), cls: 'go' };
  if (vm.turno != null) return { t: 'Juega ' + esc(nm(vm, vm.turno)) + '…' + (ctx.timer ? ' · <span id="pkTimer">' + ctx.timer + '</span>' : ''), cls: '' };
  return { t: '', cls: '' };
}

function tableHtml(vm, ctx) {
  const yo = vm.yo, me = yo != null ? vm.seats[yo] : null;
  const [sb, bb] = P.ciegas(vm.nivel);
  const faltan = vm.cfg.manosNivel - ((vm.mano - 1) % vm.cfg.manosNivel);
  const vivos = P.vivos(vm).length;
  const opp = []; for (let k = 1; k < vm.n; k++) opp.push((yo == null ? 0 : yo) + k); 
  const order = opp.map(x => x % vm.n).filter(i => i !== yo);
  const S1 = statusInfo(vm, ctx);
  const ended = vm.fase === 'fin';
  const meOut = me && me.out && !ended;
  const oppsH = `<div class="pk-opps">${order.map(i => oppHtml(vm, i)).join('')}</div>`;
  const feltH = `<div class="pk-felt">
      <div class="pk-info">Mano ${vm.mano} · Ciegas ${fmt(sb)}/${fmt(bb)} · ${faltan} ${faltan === 1 ? 'mano' : 'manos'} para subirlas · ${vivos} en juego</div>
      <div class="pk-board">${boardHtml(vm)}</div>
      <div class="pk-pot">Bote <b>${fmt(P.bote(vm))}</b> <small>${FASES[vm.fase] || ''}</small></div>
      <div class="pk-say">${esc(describe(vm, vm.ultimo)) || '&nbsp;'}</div>
    </div>`;
  const stH = `<div class="gstatus ${S1.cls}">${S1.t}</div>`;
  const meH = me ? meHtml(vm, ctx) : '';
  if (ended) return `<div class="pk">${stH}${finHtml(vm, ctx)}${oppsH}${feltH}${meH}</div>`;
  return `<div class="pk">${oppsH}${feltH}${stH}${meH}
    ${vm.fase === 'mano_fin' ? manoFinHtml(vm, ctx) : meOut ? `<div class="sec" style="text-align:center">Has quedado <b>${me.place}º</b>. Puedes seguir mirando la partida.</div>` : actionHtml(vm, ctx)}
    ${ctx.learn && me ? learnHtml(vm, ctx) : ''}
    ${me ? `<label class="f pk-lt"><span>💡 Modo aprendizaje</span><input type="checkbox" class="tg" id="pkLearn" ${ctx.learn ? 'checked' : ''}></label>` : ''}
  </div>`;
}

function meHtml(vm, ctx) {
  const yo = vm.yo, s = vm.seats[yo], r = vm.resultado;
  const win = r && r.botes.some(b => b.ganadores.includes(yo));
  const cls = ['me', s.fold ? 'fold' : '', s.out ? 'out' : '', vm.turno === yo ? 'turn' : '', win ? 'win' : ''].join(' ');
  return `<div class="${cls}"><div class="mcs">${s.cards.length ? s.cards.map(c => cardHtml(c, 'big')).join('') : ''}</div>
    <div class="mi"><div class="on">${posBadges(vm, yo)}<span>${esc(botName(s.nombre))}${/^t[úu]$/i.test(botName(s.nombre)) ? '' : ' <small>(tú)</small>'}</span></div>
      <div class="os">${fmt(s.stack)}${s.allin && !s.out ? ' <small>ALL-IN</small>' : ''}</div>
      ${s.bet > 0 ? `<div class="ob">${fmt(s.bet)}</div>` : ''}
</div></div>`;
}

function actionHtml(vm, ctx) {
  const yo = vm.yo, me = vm.seats[yo];
  const L = ctx.mine ? P.legal(vm, yo) : null;
  if (!L) return `<div class="pk-act off"><button disabled>Retirarse</button><button disabled>Pasar</button><button disabled>Subir</button></div>`;
  const adv = ctx.learn && LEARN.open && ctx.mine ? getAdvice(vm) : null;
  const sug = adv ? adv.accion.tipo : null;
  const sg = t => sug === t || (sug === 'raise' && t === 'raise') ? ' sug' : '';
  const callAll = !L.check && L.call >= me.stack;
  const raiseOnlyAll = L.raise && L.raise.min >= L.raise.max;
  const apuesta = vm.bet === 0;
  let h = `<div class="pk-act">
    <button id="aFold" class="a-fold${sg('fold')}">Retirarse</button>
    ${L.check ? `<button id="aCall" class="a-call${sg('check')}">Pasar</button>` : `<button id="aCall" class="a-call${sg('call')}">Igualar ${fmt(L.call)}${callAll ? '<small> todo</small>' : ''}</button>`}
    ${L.raise ? (raiseOnlyAll ? `<button id="aRaise" class="a-raise${sg('raise')}">Todo ${fmt(L.raise.max)}</button>` : `<button id="aRaise" class="a-raise${sg('raise')} ${RAISE.open ? 'open' : ''}">${apuesta ? 'Apostar' : 'Subir'} ▾</button>`) : ''}
  </div>`;
  if (L.raise && !raiseOnlyAll && RAISE.open) {
    const key = stateKey(vm);
    if (RAISE.key !== key) { RAISE.key = key; RAISE.val = L.raise.min; }
    RAISE.val = clampN2(RAISE.val, L.raise.min, L.raise.max);
    const sb = P.ciegas(vm.nivel)[0];
    h += `<div class="pk-rz"><div class="rzq">
        <button data-q="min">Mín</button><button data-q="0.5">½ bote</button><button data-q="0.75">¾ bote</button><button data-q="1">Bote</button><button data-q="max">Todo</button></div>
      <div class="rzs"><button id="rzM" aria-label="Menos">−</button><input type="range" id="rzR" min="${L.raise.min}" max="${L.raise.max}" step="${sb}" value="${RAISE.val}"><button id="rzP" aria-label="Más">+</button></div>
      <button class="btn-gold" id="rzGo" style="width:100%;padding:14px"></button></div>`;
  }
  return h;
}

function bindAction(vm, ctx) {
  const yo = vm.yo; if (yo == null) return;
  const L = ctx.mine ? P.legal(vm, yo) : null;
  const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
  const lc = $('#pkLearn'); if (lc) lc.onchange = () => { ctx.setLearn(lc.checked); LEARN.open = false; ctx.redraw(); };
  if (L) {
    on('aFold', () => { if (L.check) confirmBox('¿Retirarte?', 'Puedes pasar gratis y ver la siguiente carta. Retirarte solo tiene sentido si hay que pagar.', 'Retirarme', () => ctx.act({ tipo: 'fold' })); else ctx.act({ tipo: 'fold' }); });
    on('aCall', () => ctx.act({ tipo: L.check ? 'check' : 'call' }));
    const rb = $('#aRaise');
    if (rb && L.raise) {
      if (L.raise.min >= L.raise.max) rb.onclick = () => ctx.act({ tipo: 'allin' });
      else {
        rb.onclick = () => {
          RAISE.open = !RAISE.open;
          if (RAISE.open) {
            RAISE.key = stateKey(vm); RAISE.val = L.raise.min;
            if (ctx.learn && LEARN.open && LEARN.c && LEARN.key === RAISE.key && LEARN.c.accion.tipo === 'raise') RAISE.val = clampN2(LEARN.c.accion.a, L.raise.min, L.raise.max);   // arranca en lo que aconseja el modo aprendizaje
          }
          ctx.redraw();
        };
        if (RAISE.open) {
          const sl = $('#rzR'), go = $('#rzGo'), sb = P.ciegas(vm.nivel)[0], bb = P.ciegas(vm.nivel)[1];
          const pot = P.bote(vm), toCall = vm.bet - vm.seats[yo].bet;
          const set = v => {
            v = clampN2(Math.round(v), L.raise.min, L.raise.max); if (L.raise.max - v < sb) v = L.raise.max;
            RAISE.val = v; sl.value = v;
            go.textContent = v >= L.raise.max ? 'Todo: ' + fmt(v) + ' ▶' : (vm.bet === 0 ? 'Apostar ' : 'Subir a ') + fmt(v) + ' ▶';
          };
          set(RAISE.val);
          sl.oninput = () => set(+sl.value);
          $('#rzM').onclick = () => set(RAISE.val - bb);
          $('#rzP').onclick = () => set(RAISE.val + bb);
          document.querySelectorAll('[data-q]').forEach(b => b.onclick = () => {
            const q = b.dataset.q;
            if (q === 'min') set(L.raise.min); else if (q === 'max') set(L.raise.max);
            else set(Math.round((vm.bet + (+q) * (pot + toCall)) / sb) * sb);
          });
          go.onclick = () => { const v = RAISE.val; RAISE.open = false; ctx.act(v >= L.raise.max ? { tipo: 'allin' } : { tipo: 'raise', a: v }); };
        }
      }
    }
  }
  on('pkAdvice', () => { LEARN.open = true; ctx.redraw(); });
  on('pkHands', openHands);
}

/* ---------- Modo aprendizaje ---------- */
function getAdvice(vm) {
  const key = stateKey(vm);
  if (LEARN.key !== key) { LEARN.key = key; LEARN.c = P.consejo(vm, vm.yo); }
  return LEARN.c;
}
function learnHtml(vm, ctx) {
  const yo = vm.yo, s = vm.seats[yo];
  if (s.out || s.fold || s.cards.length < 2 || s.cards[0] < 0) return `<div class="pk-learn"><b>💡 Consejos</b><div class="mut">Cuando juegues una mano te explicaré tus opciones.</div><button class="btn-ghost sm" id="pkHands">¿Qué gana a qué?</button></div>`;
  const key = stateKey(vm);
  let h = `<div class="pk-learn"><b>💡 Consejos</b>`;
  if (vm.fase === 'mano_fin') return h + '<div class="mut">Mira cómo ha terminado la mano. Cuando quieras, sigue.</div></div>';
  const cat = vm.board.length >= 3 ? P.detalleMano(P.evaluar(s.cards.concat(vm.board))) : P.describirSalida(s.cards[0], s.cards[1]);
  h += `<div>Tienes: <b>${esc(cat)}</b>${vm.board.length < 3 ? ' · salida <b>' + P.fuerzaSalida(P.chen(s.cards[0], s.cards[1])).toLowerCase() + '</b>' : ''}</div>`;
  if (ctx.mine) {
    if (LEARN.open) {
      const c = getAdvice(vm);
      if (c) h += `<div class="adv"><b>${esc(c.titulo)}</b>${c.lineas.map(l => `<div>• ${esc(l)}</div>`).join('')}</div>`;
    } else h += '<button class="btn-gold sm" id="pkAdvice" style="margin-top:8px">💡 ¿Qué hago?</button>';
  } else h += '<div class="mut">Espera tu turno. Mientras, piensa qué harías con esta mano.</div>';
  h += ' <button class="btn-ghost sm" id="pkHands" style="margin-top:8px">¿Qué gana a qué?</button></div>';
  return h;
}
function openHands() {
  const ej = [['Escalera de color', 'Cinco cartas seguidas del mismo palo (la mejor: escalera real, 10-J-Q-K-A)'], ['Cuatro iguales (póker)', 'Cuatro cartas del mismo valor'], ['Full', 'Un trío y una pareja'], ['Color', 'Cinco cartas del mismo palo'], ['Escalera', 'Cinco cartas seguidas de palos distintos'], ['Trío', 'Tres cartas iguales'], ['Doble pareja', 'Dos parejas distintas'], ['Pareja', 'Dos cartas iguales'], ['Carta alta', 'Ninguna de las anteriores: gana la carta más alta']];
  openModal(`<h3>🃏 Qué gana a qué</h3><div class="sub">De la mejor mano a la peor. Con siete cartas (tus dos y las cinco de la mesa) se juega la mejor combinación de cinco. Si empatan, decide la carta más alta; el palo nunca desempata.</div>
    ${ej.map(([n, d], k) => `<div class="hrow"><div class="top"><b style="width:22px;color:var(--gold)">${k + 1}</b><div class="n">${n}<small class="wrap">${d}</small></div></div></div>`).join('')}
    <div class="acts"><button class="btn-gold" id="hOk">Entendido</button></div>`);
  $('#hOk').onclick = closeModal;
}

/* ---------- Fin de la mano / del torneo ---------- */
function manoFinHtml(vm, ctx) {
  const yaListo = ctx.listos && ctx.listos.includes(ctx.miId);
  const quedan = (ctx.esperan || 0);
  return `<div class="sec pk-res"><h2>Resultado</h2>${resultadoHtml(vm)}
    <button class="btn-gold" id="pkNext" style="width:100%;margin-top:10px;padding:14px" ${yaListo ? 'disabled' : ''}>${yaListo ? '⏳ Esperando a los demás…' : 'Siguiente mano ▶'}</button></div>`;
}
function finHtml(vm, ctx) {
  const medals = ['🥇', '🥈', '🥉'];
  const rows = vm.orden.map((i, k) => `<div class="on-seat"><span style="width:34px;text-align:center;font-size:calc(20px * var(--fs,1))">${medals[k] || (k + 1) + 'º'}</span><span class="n">${i === vm.yo ? 'Tú' : esc(botName(vm.seats[i].nombre))}${i === vm.yo ? '' : ''}</span>${k === 0 ? '<b style="color:var(--gold)">Campeón</b>' : ''}</div>`).join('');
  const mi = vm.yo != null ? vm.seats[vm.yo].place : null;
  return `<div class="sec"><h2>Clasificación final</h2>${rows}
    <div class="mut" style="margin-top:8px">${mi === 1 ? '¡Has ganado el torneo! 🎉' : mi ? 'Has quedado ' + mi + 'º de ' + vm.n + '.' : ''} Guardado en tu historial.</div></div>
    <div class="gacts" style="display:flex;gap:8px;margin-top:8px">${ctx.finButtons}</div>`;
}

/* ================= Partida contra la máquina ================= */
function localCtx(gm) {
  const g = gm.st, vm = P.vista(g, 0);
  return { vm, ctx: { mine: g.turno === 0 && g.fase !== 'mano_fin' && g.fase !== 'fin', learn: !!gm.learn, mode: 'ai', miId: 'yo',
    act: a => humanAct(a), redraw: () => renderGame(), setLearn: v => { gm.learn = v; save(); },
    finButtons: '<button class="btn-gold" id="pkAgain" style="flex:1">🔁 Otro torneo igual</button><button class="btn-ghost" id="pkNew" style="flex:1">Cambiar ajustes</button>' } };
}
function humanAct(a) {
  const gm = S.game; if (!gm) return;
  const err = P.accion(gm.st, 0, a);
  if (err) { toast(err); return; }
  RAISE.open = false; LEARN.open = false;
  render();
}
function botMove(gm) {
  const g = gm.st, i = g.turno; if (i == null) return;
  const a = P.elegir(g, i, gm.level);
  if (P.accion(g, i, a)) { const L = P.legal(g, i); P.accion(g, i, L.check ? { tipo: 'check' } : { tipo: 'fold' }); }
}
function simular(gm) {
  const g = gm.st; let guard = 0;
  while (g.fase !== 'fin' && guard++ < 20000) {
    if (g.fase === 'mano_fin') { P.siguienteMano(g); continue; }
    if (g.turno == null) break;
    botMove(gm);
  }
}
function nextHand() {
  const gm = S.game; if (!gm) return;
  const g = gm.st;
  P.siguienteMano(g);
  if (g.fase !== 'fin' && g.seats[0].out) { toast('Resolviendo el torneo…'); simular(gm); }
  RAISE.open = false; LEARN.open = false;
  render();
}
function scheduleBots() {
  clearTimeout(AIT);
  const gm = S.game; if (!gm) return;
  const g = gm.st;
  if (g.fase === 'mano_fin' || g.fase === 'fin' || g.turno == null || !g.seats[g.turno].bot) return;
  const me = g.seats[0], d = speed().bot * (me.fold || me.out ? 0.5 : 1);
  AIT = setTimeout(() => { if (S.game !== gm) return; botMove(gm); render(); }, d);
}
function archiveLocal(gm) {
  const g = gm.st;
  if (gm.archived || S.archive.some(a => a.id === gm.id)) return;
  gm.archived = true;
  S.archive.unshift({ id: gm.id, created: gm.created, finished: Date.now(), mode: 'ai', level: gm.level, learn: !!gm.learn, n: g.n, nombres: g.seats.map(s => s.nombre), bots: g.seats.map(s => s.bot), orden: g.orden.slice(), yo: 0, place: g.seats[0].place, manos: g.mano, fichas: g.cfg.fichas });
  if (S.archive.length > MAX_ARCHIVE) S.archive.length = MAX_ARCHIVE;
  Sound.play('end'); save(); autoBackup(true);
}
function sonidosMesa(vm) {
  const key = stateKey(vm);
  if (LAST.key === key) return;
  const prev = LAST.key; LAST.key = key;
  if (prev === null) return;
  const ult = vm.ultimo, pm = prev.split('|');
  if (vm.fase === 'fin') return;
  if (vm.fase === 'mano_fin') { const gano = vm.resultado && vm.yo != null && vm.resultado.botes.some(b => b.ganadores.includes(vm.yo)); setTimeout(() => Sound.play(gano ? 'win' : 'lose'), 200); return; }
  if (+pm[0] !== vm.mano) { Sound.play('deal'); return; }
  if (pm[1] !== vm.fase) setTimeout(() => Sound.play('deal'), 250);
  const t = ult && sonidoDe(ult.tipo); if (t) Sound.play(t);
}
function bindTable(vm, ctx) {
  bindAction(vm, ctx);
  const on = (id, fn) => { const el = $('#' + id); if (el) el.onclick = fn; };
  on('pkNext', ctx.next || nextHand);
  on('pkAgain', () => { const gm = S.game; S.game = null; syncSame(gm); });
  on('pkNew', () => { S.game = null; render(); });
  on('onRe', () => onEnviar({ t: 'jugada', a: { tipo: 'revancha' } }));
  on('onLeave2', () => { onEnviar({ t: 'salir' }); S.draft.mode = 'online'; save(); });
}
function syncSame(gm) {
  if (gm) { const d = S.draft.ai; d.level = gm.level; d.learn = !!gm.learn; }
  startAi();
}
function renderGame() {
  const gm = S.game, g = gm.st;
  if (g.fase === 'fin') archiveLocal(gm);
  const { vm, ctx } = localCtx(gm);
  $('#subtitle').textContent = g.fase === 'fin' ? 'Torneo terminado' : 'Contra la máquina · ' + LEVELS[gm.level].name;
  sonidosMesa(vm);
  $('#app').innerHTML = tableHtml(vm, ctx);
  bindTable(vm, ctx);
  scheduleBots();
}
function renderGameShim() { return renderGame(); }


/* ================= Juego en línea (servidor común de IT Canarias) ================= */

const ON = { recibido: 0, ws: null, estado: 'desconectado', sala: null, quiere: false, intentos: 0, timer: null, ping: null, listo: null, rolling: false, ultimoTurno: null };
function onToken() {
  S.online = S.online || {};
  if (!S.online.token) { const a = new Uint8Array(18); crypto.getRandomValues(a); S.online.token = Array.from(a, b => 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[b & 63]).join(''); save(); }
  return S.online.token;
}
const onNombre = () => (S.online && S.online.nombre) || '';
function onConectar() {
  if (!ONLINE_URL) return;
  ON.quiere = true;
  if (ON.ws && (ON.ws.readyState === 0 || ON.ws.readyState === 1)) return;
  clearTimeout(ON.timer);
  onSetEstado('conectando');
  let ws;
  try { ws = new WebSocket(ONLINE_URL); } catch (e) { onReintentar(); return; }
  ON.ws = ws;
  ws.onopen = () => {
    ON.intentos = 0; onSetEstado('conectado');
    ws.send(JSON.stringify({ t: 'hola', token: onToken(), nombre: onNombre() }));
    clearInterval(ON.ping); ON.ping = setInterval(() => onEnviar({ t: 'ping' }), 25000);
  };
  ws.onmessage = ev => {
    let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.t === 'hola') {
      if (!Array.isArray(m.juegos) || !m.juegos.includes('poker')) { ON.listo = false; onSetEstado('preparando'); ON.ws = null; ws.close(); clearTimeout(ON.timer); if (ON.quiere) ON.timer = setTimeout(onConectar, 60000); return; }
      ON.listo = true; onSetEstado('conectado');
      return;
    }
    if (m.t === 'sala') { ON.listo = true; ON.recibido = Date.now(); onRecibirSala(m.sala); }
    else if (m.t === 'lista') Publicas.recibir(m);
    else if (m.t === 'error') { ON.rolling = false; if (!Publicas.error(m)) toast(m.msg); }
    else if (m.t === 'fuera') { toast(m.motivo || 'Has salido de la partida'); onRecibirSala(null); }
  };
  ws.onclose = () => { if (ON.ws !== ws) return; clearInterval(ON.ping); ON.ws = null; onSetEstado('desconectado'); if (ON.quiere) onReintentar(); };
  ws.onerror = () => {};
}
function onReintentar() { clearTimeout(ON.timer); const ms = Math.min(15000, 1000 * 2 ** ON.intentos++); ON.timer = setTimeout(onConectar, ms); }
function onEnviar(m) {
  if (!ON.ws || ON.ws.readyState !== 1) { if (m.t !== 'ping') toast('Sin conexión con el servidor. Reintentando…'); onConectar(); return false; }
  ON.ws.send(JSON.stringify(m)); return true;
}
function onSetEstado(e) {
  if (e === 'desconectado' && ON.listo === false) e = 'preparando';
  ON.estado = e;
  document.querySelectorAll('#onJoin, #onCreate').forEach(b => { b.disabled = e === 'preparando'; });
  const el = $('#onStatus'); if (el) el.innerHTML = onEstadoHtml();
}
const onEstadoHtml = () => ({ conectado: '🟢 Conectado', conectando: '🟡 Conectando…', desconectado: '🔴 Sin conexión · reintentando', preparando: '🛠 El póker en línea estará disponible muy pronto' })[ON.estado];
document.addEventListener('visibilitychange', () => { if (!document.hidden && ON.quiere && ON.estado !== 'conectado') { ON.intentos = 0; onConectar(); } });

function onRecibirSala(sala) {
  const antes = ON.sala;
  ON.sala = sala;
  S.online = S.online || {}; S.online.enSala = !!sala; save();
  if (sala && sala.partida) {
    const p = sala.partida;
    const miTurno = sala.estado === 'jugando' && p.turnoSilla === sala.yo;
    if (miTurno && ON.ultimoTurno !== sala.yo) AvisoTurno.sonar();          // sonido y vibración (se quita en ajustes)
    ON.ultimoTurno = sala.estado === 'jugando' ? p.turnoSilla : null;
    if (sala.estado === 'fin') onArchivar(sala);
  }
  if (!sala && !antes) return;
  const wait = ON.rolling ? Math.max(0, ON.rolling - Date.now()) : 0;
  ON.rolling = false;
  if (!S.game) { if (wait) setTimeout(() => { if (!S.game) render(); }, wait); else render(); }
}
// Al terminar: el torneo pasa al historial
function onArchivar(sala) {
  const p = sala.partida; if (!p || !p.partida) return;
  const pa = p.partida, id = 'on-' + pa.id;
  if (S.archive.some(a => a.id === id)) return;
  S.archive.unshift({ id, created: pa.created, finished: Date.now(), mode: 'online', level: 0, learn: !!(S.online && S.online.learn), n: pa.nombres.length, nombres: pa.nombres.map(botName), bots: pa.bots, orden: pa.orden.slice(), yo: p.yo == null ? 0 : p.yo, place: p.yo == null ? 0 : p.seats[p.yo].place, manos: pa.manos, fichas: pa.fichas });
  if (S.archive.length > MAX_ARCHIVE) S.archive.length = MAX_ARCHIVE;
  Sound.play('end'); save(); autoBackup(true);
}
function renderOnline() {
  S.online = S.online || {};
  if (!ON.quiere) onConectar();
  const s = ON.sala;
  if (!s) return onRenderInicio();
  if (s.estado === 'espera') return onRenderEspera(s);
  return onRenderMesa(s);
}

function renderOnline() {
  S.online = S.online || {};
  if (!ON.quiere) onConectar();
  const s = ON.sala;
  if (!s) return onRenderInicio();
  if (s.estado === 'espera') return onRenderEspera(s);
  return onRenderMesa(s);
}
function onRenderInicio() {
  $('#subtitle').textContent = 'Jugar en línea';
  const o = Object.assign({ nivel: 'normal', fichas: 1500, manosNivel: 10, ritmo: 'normal' }, (S.online && S.online.opciones) || {});
  $('#app').innerHTML = `${modeTabs()}
    <div class="sec"><h2>Tu nombre</h2>
      <input id="onName" maxlength="18" placeholder="Cómo te verán los demás" value="${esc(onNombre())}" autocomplete="off" style="width:100%"></div>
    ${Publicas.html()}
    <div class="sec"><h2>Unirse a una partida</h2>
      <div class="mut" style="margin-bottom:8px">Pide el código a quien la ha creado.</div>
      <div class="row" style="gap:8px"><input id="onCode" maxlength="4" placeholder="Código" value="${esc((S.online && S.online.codigo) || '')}" autocomplete="off" autocapitalize="characters" style="flex:1;min-width:0;width:auto;text-transform:uppercase;letter-spacing:4px;text-align:center">
      <button class="btn-gold" id="onJoin" style="flex:1;min-width:0" ${ON.estado === 'preparando' ? 'disabled' : ''}>Unirse</button></div></div>
    <div class="sec"><h2>Crear una partida</h2>
      <label class="f"><span>Nivel de la máquina<em>Si rellenas sillas con la máquina</em></span>${optBtns(['facil', 'normal', 'dificil'], o.nivel, 'nivel', v => ({ facil: 'Fácil', normal: 'Normal', dificil: 'Difícil' })[v])}</label>
      <label class="f"><span>Fichas de cada uno</span>${optBtns(FICHAS_OP, o.fichas, 'fichas', fmt)}</label>
      <label class="f"><span>Las ciegas suben cada</span>${optBtns(MANOS_OP, o.manosNivel, 'manosNivel', v => v + ' manos')}</label>
      <label class="f"><span>Tiempo por jugada<em>Si te pasas, pasas o te retiras solo</em></span>${optBtns(['relajado', 'normal', 'rapido'], o.ritmo, 'ritmo', v => ({ relajado: '60 s', normal: '40 s', rapido: '20 s' })[v])}</label>
      ${Publicas.casilla()}
      <button class="btn-gold" id="onCreate" style="width:100%;margin-top:8px" ${ON.estado === 'preparando' ? 'disabled' : ''}>Crear partida</button></div>
    <div class="mut" style="text-align:center;margin:0 0 4px">De 2 a 9 jugadores; las sillas libres las puede ocupar la máquina. El mazo lo baraja el servidor y nadie ve tus cartas.</div>
    <div class="mut" id="onStatus" style="text-align:center;margin:6px 0 20px">${onEstadoHtml()}</div>`;
  bindModeTabs();
  const nameOk = () => { const n = cleanName($('#onName').value).slice(0, 18); if (!n) { toast('Escribe tu nombre'); $('#onName').focus(); return null; } S.online.nombre = n; save(); return n; };
  $('#onName').onchange = () => { S.online.nombre = cleanName($('#onName').value).slice(0, 18); save(); };
  document.querySelectorAll('[data-opt] button').forEach(b => b.onclick = () => b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)));
  $('#onCode').oninput = e => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  $('#onJoin').onclick = () => {
    const n = nameOk(); if (!n) return;
    const c = $('#onCode').value.trim().toUpperCase(); if (c.length !== 4) { toast('El código tiene 4 letras o números'); return; }
    onEnviar({ t: 'unirse', codigo: c, nombre: n });
  };
  const leerOpciones = () => {
    const v = k => { const b = document.querySelector(`[data-opt="${k}"] .on`); return b ? b.dataset.v : undefined; };
    const opciones = { nivel: v('nivel'), fichas: +v('fichas'), manosNivel: +v('manosNivel'), ritmo: v('ritmo') };
    S.online.opciones = opciones; save(); return opciones;
  };
  $('#onCreate').onclick = () => {
    const n = nameOk(); if (!n) return;
    const opciones = leerOpciones();
    onEnviar({ t: 'crear', juego: 'poker', opciones, publica: Publicas.marcada(), nombre: n });
  };
  Publicas.montar({ juego: 'poker', enviar: onEnviar, nombre: nameOk, opciones: leerOpciones, conectado: () => ON.estado === 'conectado' });
}
function onRenderEspera(s) {
  $('#subtitle').textContent = 'Partida en línea · esperando';
  const host = s.asientos.find(a => a.anfitrion);
  const op = s.opciones || {};
  $('#app').innerHTML = `
    <div class="sec" style="text-align:center"><div class="mut">Código de la partida</div>
      <div class="on-code">${esc(s.codigo)}</div>
      <button class="btn-gold" id="onInvite" style="width:100%">📲 Enviar el código (WhatsApp…)</button>
      <div class="mut" style="margin-top:8px">Los demás abren Póker → <b>En línea</b> → <b>Unirse</b> y ponen el código.</div>
      <div class="mut" style="margin-top:6px">${fmt(op.fichas || 1500)} fichas · ciegas cada ${op.manosNivel || 10} manos · ${({ relajado: 60, normal: 40, rapido: 20 })[op.ritmo] || 40} s por jugada</div></div>
    ${Publicas.aviso(s)}
    <div class="sec"><h2>Jugadores (${s.asientos.length}/${s.max})</h2>
      ${s.asientos.map(a => `<div class="on-seat"><span class="on-dot ${a.conectado ? 'ok' : ''}"></span><span class="n">${esc(a.nombre)}${a.id === s.yo ? ' <small>(tú)</small>' : ''}${a.anfitrion ? ' 👑' : ''}</span>
        ${s.anfitrion && a.id !== s.yo ? `<button class="btn-ghost sm" data-quitar="${a.id}" aria-label="Quitar">✕</button>` : ''}</div>`).join('')}
      ${s.anfitrion && s.asientos.length < s.max ? '<button class="btn-ghost" id="onBot" style="width:100%;margin-top:8px">🤖 Añadir a la máquina</button>' : ''}</div>
    ${s.anfitrion
      ? `<button class="btn-gold" id="onStart" style="width:100%" ${s.asientos.length >= s.min ? '' : 'disabled'}>Repartir ♠</button>
         <div class="mut" style="text-align:center;margin-top:6px">${s.asientos.length < s.min ? 'Espera a que entre alguien o añade a la máquina.' : 'Cuando estéis todos, reparte.'}</div>`
      : `<div class="sec" style="text-align:center">⏳ Esperando a que ${esc(host ? host.nombre : 'el anfitrión')} reparta…</div>`}
    <button class="btn-ghost" id="onLeave" style="width:100%;margin-top:12px">Salir</button>
    <div class="mut" id="onStatus" style="text-align:center;margin:10px 0 20px">${onEstadoHtml()}</div>`;
  $('#onInvite').onclick = () => onInvitar(s.codigo);
  const b = $('#onBot'); if (b) b.onclick = () => onEnviar({ t: 'bot' });
  const st = $('#onStart'); if (st) st.onclick = () => onEnviar({ t: 'empezar' });
  document.querySelectorAll('[data-quitar]').forEach(x => x.onclick = () => onEnviar({ t: 'quitar', asiento: x.dataset.quitar }));
  $('#onLeave').onclick = () => confirmBox('Salir', 'Saldrás de esta partida.', 'Salir', () => onEnviar({ t: 'salir' }));
}

async function onInvitar(codigo) {
  const text = Invitacion.texto('♠️', 'Póker', codigo);
  try {
    if (isNative()) { await window.Capacitor.Plugins.Share.share({ title: 'Partida de póker', text, dialogTitle: 'Invitar' }); return; }
    if (navigator.share) { await navigator.share({ title: 'Partida de póker', text }); return; }
    await navigator.clipboard.writeText(text); toast('Invitación copiada');
  } catch (e) { if (!/cancel|abort/i.test(String(e && (e.message || e.name)))) toast('No se pudo compartir'); }
}

let TIMERI = null;
function onRenderMesa(s) {
  const p = s.partida, ended = s.estado === 'fin';
  $('#subtitle').textContent = ended ? 'En línea · terminado' : 'En línea · ' + s.codigo;
  const yaRev = (s.revancha || []).includes(s.yo);
  const mine = !ended && p.yo != null && p.turnoSilla === s.yo && p.fase !== 'mano_fin';
  const hasta = p.resta != null ? ON.recibido + p.resta : null;
  const seg = () => Math.max(0, Math.ceil((hasta - Date.now()) / 1000));
  const ctx = { mine, learn: !!(S.online && S.online.learn), mode: 'online', miId: s.yo, listos: p.listos || [],
    timer: hasta != null ? seg() + ' s' : '',
    act: a => { RAISE.open = false; LEARN.open = false; onEnviar({ t: 'jugada', a }); },
    redraw: () => { if (ON.sala && ON.sala.partida) onRenderMesa(ON.sala); },
    setLearn: v => { S.online = S.online || {}; S.online.learn = v; save(); },
    next: () => onEnviar({ t: 'jugada', a: { tipo: 'seguir' } }),
    finButtons: `<button class="btn-gold" id="onRe" style="flex:1" ${yaRev ? 'disabled' : ''}>${yaRev ? '⏳ Esperando a los demás' : '🔁 Revancha'}</button><button class="btn-ghost" id="onLeave2" style="flex:1">Salir</button>` };
  sonidosMesa(p);
  $('#app').innerHTML = tableHtml(p, ctx) + (ended ? '' : `<div class="mut" id="onStatus" style="text-align:center;margin:6px 0 20px">${onEstadoHtml()} · ${esc(s.codigo)}</div>`);
  bindTable(p, ctx);
  clearInterval(TIMERI);
  if (hasta != null) TIMERI = setInterval(() => { const el = $('#pkTimer'); if (!el) { clearInterval(TIMERI); return; } el.textContent = seg() + ' s'; }, 500);
}
let BUSY = false;

function leaveOnline() {
  const s = ON.sala;
  if (!s) return;
  if (s.estado === 'jugando') confirmBox('Abandonar la partida', 'Tu silla la ocupará la máquina hasta el final.', 'Abandonar', () => onEnviar({ t: 'salir' }));
  else onEnviar({ t: 'salir' });
}
/* ---------- Invitación con enlace: entrar directamente en la sala ---------- */
function onUnirsePendiente(t0) {
  if (!ON.unirse) return;
  if (ON.estado === 'conectado' && ON.listo) { const c = ON.unirse; ON.unirse = null; onEnviar({ t: 'unirse', codigo: c, nombre: onNombre() }); return; }
  if (Date.now() - t0 > 20000) { ON.unirse = null; toast('Sin conexión con el servidor. Prueba otra vez en un momento.'); return; }
  setTimeout(() => onUnirsePendiente(t0), 300);
}
window.unirseDesdeEnlace = function (codigo) {
  const go = () => {
    S.draft.mode = 'online'; save();
    if (ON.sala && ON.sala.codigo === codigo) { render(); return; }
    S.online = S.online || {}; S.online.codigo = codigo; save();
    if (!onNombre()) {
      render();
      // sin nombre todavía: se pide en una ventana y se entra directamente
      openModal(`<h3>🎟 Partida ${esc(codigo)}</h3><div class="sub">Te han invitado. Escribe tu nombre para entrar.</div>
        <input id="invName" maxlength="18" placeholder="Tu nombre" autocomplete="off" style="width:100%">
        <div class="acts"><button class="btn-ghost" id="invNo">Cancelar</button><button class="btn-gold" id="invOk">Entrar</button></div>`);
      const n = $('#invName'); setTimeout(() => n && n.focus(), 50);
      const ok = () => { const v = cleanName(n.value).slice(0, 18); if (!v) { toast('Escribe tu nombre'); n.focus(); return; } S.online.nombre = v; save(); closeModal(); go(); };
      $('#invOk').onclick = ok; n.onkeydown = e => { if (e.key === 'Enter') ok(); };
      $('#invNo').onclick = closeModal;
      return;
    }
    ON.unirse = codigo; onConectar(); render(); toast('Entrando en la partida ' + codigo + '…');
    onUnirsePendiente(Date.now());
  };
  if (ON.sala && ON.sala.codigo !== codigo && ON.sala.estado === 'jugando') { toast('Antes sal de la partida en línea en la que estás'); return; }
  if (S.game && S.game.st.fase === 'fin') S.game = null;
  if (S.game) confirmBox('Partida en línea', 'Tienes una partida empezada en este móvil. Se abandonará y entrarás en la partida a la que te invitan.', 'Entrar', () => { clearTimeout(AIT); S.game = null; go(); });
  else go();
};
setTimeout(() => { try { Invitacion.listo(); } catch (e) {} }, 0);

// Al abrir la app: si estabas en una partida en línea, vuelve a ella
document.addEventListener('DOMContentLoaded', () => { try { if (S.online && S.online.enSala) onConectar(); } catch (e) {} });
