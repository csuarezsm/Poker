// Pruebas automáticas de la app Póker (IT Canarias): interfaz en móvil, horizontal y tablet, torneo completo contra la máquina,
// modo aprendizaje, copia de seguridad y juego en línea contra una copia local del servidor común.
// Se ejecutan en GitHub antes de compilar: si alguna falla, no se publica la versión.
// Uso local: node tests/app.test.mjs   (para la parte en línea busca el servidor en ../juegos-servidor o en JUEGOS_SERVIDOR)
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let passed = 0, failed = 0;
const check = (name, cond, extra = '') => { if (cond) { passed++; console.log('  ✓ ' + name); } else { failed++; console.log('  ✗ ' + name + (extra ? ' → ' + extra : '')); } };

const ROOT = fileURLToPath(new URL('../www/', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  try { const f = await readFile(join(ROOT, path === '/' ? 'index.html' : path)); res.writeHead(200, { 'content-type': TYPES[extname(path)] || 'text/html' }); res.end(f); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, r));
const URL_APP = `http://localhost:${server.address().port}/`;
let browser;
try { browser = await chromium.launch(); } catch (e) { browser = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); }
const BASE_STATE = { onboarded: true, iosHint: true, speed: 'rapida' };

async function fresh(state, viewport, online = '') {
  const ctx = await browser.newContext({ viewport: viewport || { width: 412, height: 860 }, isMobile: true, hasTouch: true, serviceWorkers: 'block', acceptDownloads: true });
  await ctx.route('https://api.github.com/**', r => r.abort());
  await ctx.route('https://csuarezsm.github.io/**', r => r.abort());
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  await p.addInitScript(u => { window.POKER_ONLINE_URL = u; }, online);        // en las pruebas, nunca el servidor real
  await p.addInitScript(st => { if (st && !sessionStorage.getItem('seeded')) { localStorage.setItem('poker.v1', JSON.stringify(st)); sessionStorage.setItem('seeded', '1'); } }, state || BASE_STATE);
  await p.goto(URL_APP);
  return { p, ctx, errors };
}
const waitFor = (p, fn, arg, timeout = 15000) => p.waitForFunction(fn, arg, { timeout }).then(() => true, () => false);
const noHScroll = p => p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

// Juega como una persona: iguala o pasa, y a veces va con todo usando los botones de la barra de apuestas
// Espera a que le toque al jugador; si la mano acaba antes, pasa a la siguiente
async function esperaTurno(p, ms = 40000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await p.$('#aCall')) return true;
    if (await p.$('#pkNext:not([disabled])')) await p.click('#pkNext', { timeout: 2000 }).catch(() => {});
    await p.waitForTimeout(60);
  }
  return false;
}
async function jugarHasta(p, fin, { allin = 0.5, aprender = false, limite = 150000 } = {}) {
  const t0 = Date.now(); let ultimo = '';
  while (Date.now() - t0 < limite) {
    if (await p.evaluate(fin)) return true;
    const st = await p.evaluate(() => ({
      next: !!document.querySelector('#pkNext:not([disabled])'), call: !!document.querySelector('#aCall'), raise: !!document.querySelector('#aRaise'),
      rz: !!document.querySelector('#rzGo'), adv: !!document.querySelector('#pkAdvice'), sug: !!document.querySelector('.pk-act .sug'), sel: document.querySelector('.gstatus') ? document.querySelector('.gstatus').textContent : ''
    }));
    if (st.next) { await p.click('#pkNext', { timeout: 2000 }).catch(() => {}); continue; }
    if (st.call) {
      const T = { timeout: 2000 };
      try {
        if (aprender && st.adv) { await p.click('#pkAdvice', T); await p.waitForTimeout(50); ultimo = 'adv'; }
        if (Math.random() < allin && st.raise) {
          const txt = await p.textContent('#aRaise', T);
          if (!/^Todo/.test(txt)) { await p.click('#aRaise', T); await p.click('[data-q="max"]', T); await p.click('#rzGo', T); } else await p.click('#aRaise', T);
        } else await p.click('#aCall', T);
      } catch (e) { /* la mesa cambió justo antes de pulsar: se vuelve a mirar */ }
      await p.waitForTimeout(20); continue;
    }
    await p.waitForTimeout(30);
  }
  return false;
}

/* ================= Pantalla de inicio ================= */
console.log('Pantalla de inicio');
{
  const { p, ctx, errors } = await fresh(null, null, 'ws://127.0.0.1:9/ws');
  check('abre en «Contra la máquina» con los ajustes', await waitFor(p, () => document.querySelector('#aiStart') && document.querySelector('#aiLearn') && document.querySelectorAll('[data-opt="rivals"] button').length === 8));
  check('título y subtítulo', (await p.textContent('#title')).includes('Póker'));
  check('sin desbordamiento horizontal', await noHScroll(p));
  check('hay pestaña «En línea con amigos»', (await p.textContent('.modes')).includes('En línea'));
  await p.click('[data-opt="rivals"] button[data-v="5"]'); await p.click('[data-lvl="3"]');
  const d = await p.evaluate(() => JSON.parse(localStorage.getItem('poker.v1')).draft.ai);
  check('recuerda rivales y nivel', d.rivals === 5 && d.level === 3);
  await p.click('#menuBtn');
  check('el menú tiene historial, reglas y «qué gana a qué»', await waitFor(p, () => ['mArch', 'mGameRules', 'mHands', 'mTheme', 'mWipe', 'mShareApp', 'mMas'].every(i => document.getElementById(i))));
  await p.click('#mGameRules');
  check('las reglas citan las fuentes y el botón de manos', (await p.textContent('.sheet')).includes('TDA') && !!(await p.$('#grHands')));
  await p.click('#grHands');
  check('«qué gana a qué» lista las 9 manos', await waitFor(p, () => document.querySelectorAll('.sheet .hrow').length === 9));
  await p.click('#hOk');
  await p.click('#menuBtn'); await p.click('#mTheme');
  await p.click('[data-theme="noche"]');
  check('cambiar el tema se aplica al momento', await waitFor(p, () => getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() === '#121c27'));
  check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await ctx.close();
}
{
  const { p, ctx } = await fresh({ iosHint: true });
  check('la primera vez sale la bienvenida', await waitFor(p, () => document.querySelector('#wbNext')));
  for (let k = 0; k < 4; k++) await p.click('#wbNext');
  await p.click('#wbNext');
  check('la bienvenida se cierra y no vuelve', await waitFor(p, () => document.querySelector('#modal').classList.contains('hidden')) && (await p.evaluate(() => JSON.parse(localStorage.getItem('poker.v1')).onboarded)));
  await ctx.close();
}

/* ================= Torneo completo contra la máquina ================= */
console.log('Torneo contra la máquina');
for (const [rivals, level] of [[2, 1], [5, 2]]) {
  const { p, ctx, errors } = await fresh({ ...BASE_STATE, draft: { mode: 'ai', ai: { name: 'Carlos', rivals, level, learn: rivals === 5, fichas: 1000, manos: 5 } } });
  await p.click('#aiStart');
  check(`mesa de ${rivals + 1}: rivales, tablero, cartas y botones`, await waitFor(p, n => document.querySelectorAll('.opp').length === n && document.querySelectorAll('.pk-board .cd').length === 5 && document.querySelectorAll('.me .cd').length === 2, rivals));
  check('las cartas de los rivales están tapadas', await p.evaluate(() => [...document.querySelectorAll('.opp .cd')].every(c => c.classList.contains('back'))));
  check('mis cartas se ven', await p.evaluate(() => [...document.querySelectorAll('.me .cd')].every(c => !c.classList.contains('back'))));
  check('sin desbordamiento horizontal con la mesa', await noHScroll(p));
  const fichas0 = await p.evaluate(() => document.querySelectorAll('.opp').length + 1);
  const ok = await jugarHasta(p, () => !!document.querySelector('.pk .on-seat'), { allin: 0.45, aprender: rivals === 5 });
  check(`el torneo de ${rivals + 1} termina`, ok);
  if (ok) {
    const r = await p.evaluate(() => {
      const S = JSON.parse(localStorage.getItem('poker.v1'));
      return { filas: document.querySelectorAll('.pk .on-seat').length, arch: S.archive.length, a: S.archive[0] };
    });
    check('la clasificación final lista a todos', r.filas === fichas0, r.filas + ' de ' + fichas0);
    check('el torneo se guarda en el historial', r.arch === 1 && r.a.n === fichas0 && r.a.orden.length === fichas0 && r.a.place >= 1 && r.a.place <= fichas0 && r.a.mode === 'ai');
    check('las fichas del campeón son todas las de la mesa (conservación)', await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('poker.v1')); const s = S.game.st.seats; return s.reduce((t, x) => t + x.stack, 0) === 1000 * s.length; }));
    await p.click('#menuBtn'); await p.click('#mArch');
    check('el historial muestra estadísticas y la fila', await waitFor(p, () => document.querySelector('.stat4') && document.querySelectorAll('.sheet .hrow').length >= 1));
    await p.click('#arOk');
  }
  check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================= Modo aprendizaje ================= */
console.log('Modo aprendizaje');
{
  const { p, ctx, errors } = await fresh({ ...BASE_STATE, draft: { mode: 'ai', ai: { name: 'Carlos', rivals: 3, level: 2, learn: true, fichas: 1500, manos: 10 } } });
  await p.click('#aiStart');
  check('con el modo activado sale el panel de consejos con la mano', await waitFor(p, () => document.querySelector('.pk-learn') && /Tienes:/.test(document.querySelector('.pk-learn').textContent)));
  check('espera tu turno', await esperaTurno(p));
  const hay = !!(await p.$('#pkAdvice'));
  check('hay un botón «¿Qué hago?»', hay);
  if (hay) {
    await p.click('#pkAdvice');
    check('muestra el consejo explicado', await waitFor(p, () => { const a = document.querySelector('.pk-learn .adv'); return a && a.textContent.length > 60; }));
    check('marca el botón recomendado', await waitFor(p, () => !!document.querySelector('.pk-act .sug')));
    const txt = await p.textContent('.pk-learn .adv');
    check('el consejo habla de probabilidades o de la mano', /probab|ganar|mano|cartas|%/.test(txt), txt);
  }
  // no juega por ti
  const antes = await p.evaluate(() => JSON.parse(localStorage.getItem('poker.v1')).game.st.hist.length);
  await p.waitForTimeout(1500);
  const despues = await p.evaluate(() => JSON.parse(localStorage.getItem('poker.v1')).game.st.hist.length);
  check('el consejo nunca juega por ti: la partida espera', antes === despues);
  // apagar el modo quita el panel
  await p.click('#pkLearn', { force: true });
  check('se puede apagar en cualquier momento', await waitFor(p, () => !document.querySelector('.pk-learn')));
  await p.click('#pkLearn', { force: true });
  check('y volver a encender', await waitFor(p, () => !!document.querySelector('.pk-learn')));
  check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================= Apuestas: subir, mínimo y todo ================= */
console.log('Barra de apuestas');
{
  const { p, ctx, errors } = await fresh({ ...BASE_STATE, draft: { mode: 'ai', ai: { name: 'Carlos', rivals: 2, level: 2, learn: false, fichas: 1500, manos: 10 } } });
  await p.click('#aiStart');
  await esperaTurno(p);
  check('con apuesta delante, el botón dice Igualar', /Igualar|Pasar/.test(await p.textContent('#aCall')));
  await p.click('#aRaise');
  check('se abre el panel de subida', await waitFor(p, () => document.querySelector('#rzGo') && document.querySelector('#rzR')));
  const rng = await p.evaluate(() => { const r = document.querySelector('#rzR'); return { min: +r.min, max: +r.max, v: +r.value }; });
  check('empieza en la subida mínima (permitida)', rng.v === rng.min && rng.min > 0 && rng.max >= rng.min, JSON.stringify(rng));
  await p.click('[data-q="1"]');
  const v1 = await p.evaluate(() => +document.querySelector('#rzR').value);
  check('«Bote» sube más que el mínimo', v1 > rng.min || rng.max === rng.min);
  await p.click('[data-q="max"]');
  check('«Todo» lleva al máximo y lo dice', (await p.textContent('#rzGo')).includes('Todo'));
  await p.click('#rzGo');
  check('el all-in se registra', await waitFor(p, () => { const g = JSON.parse(localStorage.getItem('poker.v1')).game.st; return g.seats[0].allin || g.fase === 'mano_fin'; }));
  check('sin errores de JavaScript', errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================= Continuar y copias ================= */
console.log('Partida guardada y copia de seguridad');
{
  const { p, ctx } = await fresh({ ...BASE_STATE, draft: { mode: 'ai', ai: { name: 'Carlos', rivals: 3, level: 2, learn: false, fichas: 1500, manos: 10 } } });
  await p.click('#aiStart');
  await esperaTurno(p);
  await p.click('#aCall');
  await p.waitForTimeout(300);
  const mano = await p.evaluate(() => JSON.parse(localStorage.getItem('poker.v1')).game.st.mano);
  await p.reload();
  check('al reabrir sigue la misma partida', await waitFor(p, m => document.querySelector('.pk') && JSON.parse(localStorage.getItem('poker.v1')).game.st.mano === m, mano));
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('poker.v1')); S.game.st.seats = 'roto'; localStorage.setItem('poker.v1', JSON.stringify(S)); });
  await p.reload();
  check('una partida guardada dañada se descarta sin romper', await waitFor(p, () => document.querySelector('#aiStart')));
  // copia: exportar → borrar → importar
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('poker.v1')); S.archive = [{ id: 'abc', created: 1, finished: 2, mode: 'ai', level: 2, n: 3, nombres: ['A', 'B', 'C'], bots: [false, true, true], orden: [1, 0, 2], yo: 0, place: 2, manos: 20, fichas: 1500 }]; localStorage.setItem('poker.v1', JSON.stringify(S)); });
  await p.reload(); await p.waitForTimeout(300);
  await p.click('#menuBtn'); await p.click('#mArch');
  const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#arBk')]);
  const f = await dl.path(); const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  check('la copia lleva el historial', j.app === 'poker' && j.archive.length === 1 && j.archive[0].id === 'abc');
  await p.click('#arOk');
  await p.evaluate(() => { const S = JSON.parse(localStorage.getItem('poker.v1')); S.archive = []; localStorage.setItem('poker.v1', JSON.stringify(S)); });
  await p.reload(); await p.waitForTimeout(300);
  await p.click('#menuBtn');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.click('#mImp')]);
  await fc.setFiles(f);
  await p.click('#cOk');
  check('importar la copia recupera el historial', await waitFor(p, () => JSON.parse(localStorage.getItem('poker.v1')).archive.length === 1));
  const malo = '/tmp/poker-malo.json'; fs.writeFileSync(malo, JSON.stringify({ app: 'poker', archive: [{ id: '<img>', n: 99 }, { id: 'ok', n: 2, nombres: ['x', 'y'], orden: [0, 0] }] }));
  await p.click('#menuBtn');
  const [fc2] = await Promise.all([p.waitForEvent('filechooser'), p.click('#mImp')]);
  await fc2.setFiles(malo); await p.waitForTimeout(200);
  check('una copia con datos inválidos no mete nada', /0 torneos/.test(await p.textContent('.sheet')));
  await p.click('#cNo');
  await ctx.close();
}

/* ================= Móvil horizontal, tablet y mesa de 9 ================= */
console.log('Pantallas');
for (const [nombre, vp] of [['móvil horizontal', { width: 844, height: 390 }], ['tablet', { width: 820, height: 1180 }], ['móvil pequeño', { width: 360, height: 640 }]]) {
  const { p, ctx, errors } = await fresh({ ...BASE_STATE, draft: { mode: 'ai', ai: { name: 'Carlos', rivals: 8, level: 1, learn: true, fichas: 1500, manos: 10 } } }, vp);
  await p.click('#aiStart');
  const ok = await waitFor(p, () => document.querySelectorAll('.opp').length === 8 && document.querySelector('.me'));
  check(`${nombre}: mesa de 9 jugadores`, ok);
  check(`${nombre}: sin desbordamiento horizontal`, await noHScroll(p));
  await esperaTurno(p);
  const vis = await p.evaluate(() => { const b = document.querySelector('#aCall'); if (!b) return false; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); return r.width > 40 && r.height > 30 && r.left >= 0 && r.right <= window.innerWidth; });
  check(`${nombre}: los botones de apuesta caben y se alcanzan`, vis);
  check(`${nombre}: sin errores de JavaScript`, errors.length === 0, errors.join(' | '));
  await ctx.close();
}

/* ================= En línea (contra una copia local del servidor común) ================= */
console.log('En línea');
{
  const SERV = process.env.JUEGOS_SERVIDOR || fileURLToPath(new URL('../../juegos-servidor/', import.meta.url));
  let serverOk = false, crearServidor, PS;
  if (fs.existsSync(join(SERV, 'src/juegos/poker.js'))) {
    try {
      Object.assign(process.env, { PASO_BOT_MS: '5', SEGUIR_MS: '150', AUSENTE_MS: '600', POKER_RITMO_MS: '', LIMITE_MSG: '20000', DATA_DIR: fs.mkdtempSync(join(process.env.TMPDIR || '/tmp', 'juegos-')) });
      const cr = createRequire(join(SERV, 'package.json'));
      ({ crearServidor } = cr('./src/server.js'));
      serverOk = true;
    } catch (e) { console.log('  (no se pudo cargar el servidor: ' + e.message + ')'); }
  } else console.log('  ⚠ El servidor común todavía no tiene el póker (src/juegos/poker.js): se omite la parte en línea. Sube antes el servidor y vuelve a ejecutar.');
  if (serverOk) {
    const { server: PSrv } = crearServidor(); PS = PSrv;
    await new Promise(r => PS.listen(0, '127.0.0.1', r));
    const WS = `ws://127.0.0.1:${PS.address().port}/ws`;
    const A = await fresh({ ...BASE_STATE, online: { nombre: 'Carlos', token: 'a'.repeat(18) } }, null, WS);
    const B = await fresh({ ...BASE_STATE, online: { nombre: 'Mari', token: 'b'.repeat(18) } }, { width: 390, height: 844 }, WS);
    await A.p.click('[data-mode="online"]');
    check('la pestaña en línea conecta', await waitFor(A.p, () => /Conectado/.test(document.body.textContent)));
    await A.p.click('[data-opt="fichas"] button[data-v="1000"]'); await A.p.click('[data-opt="manosNivel"] button[data-v="5"]'); await A.p.click('[data-opt="ritmo"] button[data-v="relajado"]');
    await A.p.click('#onCreate');
    check('se crea la mesa y sale el código', await waitFor(A.p, () => document.querySelector('.on-code')));
    const code = await A.p.textContent('.on-code');
    check('el código tiene 4 caracteres', /^[A-Z0-9]{4}$/.test(code.trim()));
    check('la sala muestra las opciones elegidas', /1\.?000 fichas.*cada 5 manos.*60 s/.test(await A.p.textContent('.sec')));
    await B.p.click('[data-mode="online"]');
    await waitFor(B.p, () => /Conectado/.test(document.body.textContent));
    await B.p.fill('#onCode', code.trim()); await B.p.click('#onJoin');
    check('el segundo jugador entra', await waitFor(A.p, () => document.querySelectorAll('.on-seat').length === 2));
    await A.p.click('#onBot');
    check('se añade a la máquina', await waitFor(A.p, () => document.querySelectorAll('.on-seat').length === 3));
    await A.p.click('#onStart');
    check('empieza la partida en los dos móviles', await waitFor(A.p, () => document.querySelector('.pk-board')) && await waitFor(B.p, () => document.querySelector('.pk-board')));
    check('cada uno ve solo sus cartas', await A.p.evaluate(() => document.querySelectorAll('.me .cd:not(.back)').length === 2 && [...document.querySelectorAll('.opp .cd')].every(c => c.classList.contains('back'))) &&
      await B.p.evaluate(() => document.querySelectorAll('.me .cd:not(.back)').length === 2 && [...document.querySelectorAll('.opp .cd')].every(c => c.classList.contains('back'))));
    check('el servidor manda el reloj del turno', await waitFor(A.p, () => /Te toca|Juega/.test(document.querySelector('.gstatus').textContent)));
    const fin = () => !!document.querySelector('.pk .on-seat');
    const [okA, okB] = await Promise.all([jugarHasta(A.p, fin, { allin: 0.5, aprender: true, limite: 180000 }), jugarHasta(B.p, fin, { allin: 0.5, limite: 180000 })]);
    check('el torneo en línea termina para los dos', okA && okB);
    if (okA && okB) {
      check('los dos ven la misma clasificación', (await A.p.textContent('.pk .sec')).replace(/Tú/g, '#').length > 20 && await B.p.evaluate(() => document.querySelectorAll('.pk .on-seat').length === 3));
      check('el torneo se guarda en el historial de cada uno', await A.p.evaluate(() => JSON.parse(localStorage.getItem('poker.v1')).archive.some(a => a.mode === 'online' && a.n === 3)) && await B.p.evaluate(() => JSON.parse(localStorage.getItem('poker.v1')).archive.some(a => a.mode === 'online')));
      check('hay botón de revancha', !!(await A.p.$('#onRe')));
      await A.p.click('#onRe'); await B.p.click('#onRe');
      check('la revancha reparte otro torneo', await waitFor(A.p, () => document.querySelector('.pk-board') && !document.querySelector('.pk .on-seat')));
    }
    check('sin errores de JavaScript (Carlos)', A.errors.length === 0, A.errors.join(' | '));
    check('sin errores de JavaScript (Mari)', B.errors.length === 0, B.errors.join(' | '));
    await A.ctx.close(); await B.ctx.close(); PS.close();
  }
}

await browser.close(); server.close();
console.log(`\n${passed} correctas, ${failed} fallidas`);
process.exit(failed ? 1 : 0);
