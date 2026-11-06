// Genera las capturas y gráficos para la ficha de Google Play.
// Uso (desde la raíz del repo): node play-store/capturas.mjs [movil|tablet7|tablet10]
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OUT = ROOT + 'play-store/';
const APP = 'file://' + ROOT + 'www/index.html';
let b; try { b = await chromium.launch(); } catch (e) { b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome' }); }

// Datos de ejemplo: torneos terminados para el historial
const seed = () => {
  const names = ['Carlos', 'Tere', 'Aitor', 'Lola', 'Nieves', 'Domingo']; let s = 11; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const base = new Date(2026, 9, 1, 20).getTime();
  for (let i = 0; i < 24; i++) {
    const n = 3 + Math.floor(rnd() * 5), orden = [...Array(n).keys()].sort(() => rnd() - 0.5);
    S.archive.unshift({ id: 'demo' + i, created: base + i * 864e5 / 2, finished: base + i * 864e5 / 2 + 2400e3, mode: i % 3 ? 'ai' : 'online', level: 2, learn: i % 4 === 0, n,
      nombres: ['Carlos'].concat(names.slice(1)).slice(0, n), bots: names.slice(0, n).map((_, k) => k > 0 && i % 3 !== 0), orden, yo: 0, place: orden.indexOf(0) + 1, manos: 30 + Math.floor(rnd() * 60), fichas: 1500 });
  }
  save();
};
// Prepara cada pantalla dentro de la app (se ejecuta en el navegador)
const setup = async (name) => {
  const flop = (learn) => {
    S.draft.ai = Object.assign(S.draft.ai, { name: 'Carlos', rivals: 5, level: 2, learn });
    startAi();
    const gm = S.game, g = gm.st; let guard = 0;
    while (guard++ < 200 && !(g.fase === 'flop' && g.turno === 0)) {
      if (g.turno === 0) { const L = P.legal(g, 0); P.accion(g, 0, { tipo: L.check ? 'check' : 'call' }); } else botMove(gm);
      if (g.fase === 'mano_fin') { P.siguienteMano(g); }
    }
    LEARN.open = learn; render();
  };
  if (name === '1-partida') flop(false);
  if (name === '2-aprendizaje') flop(true);
  if (name === '3-inicio') { S.game = null; S.draft.mode = 'ai'; S.draft.ai = Object.assign(S.draft.ai, { name: 'Carlos', level: 2, rivals: 5, learn: true }); render(); }
  if (name === '4-final') {
    S.draft.ai = Object.assign(S.draft.ai, { name: 'Carlos', rivals: 5, level: 2, learn: false, fichas: 1000, manos: 5 }); startAi();
    const gm = S.game; gm.st.seats[0].bot = true; simular(gm); gm.st.seats[0].bot = false; render();
  }
  if (name === '5-historial') { S.game = null; render(); openArchive(); }
};
const SHOTS = ['1-partida', '2-aprendizaje', '3-inicio', '4-final', '5-historial'];
const SIZES = [
  ['movil', 405, 720, 1080 / 405],
  ['tablet7', 600, 960, 2],
  ['tablet10', 1280, 800, 1.5],
];
const only = process.argv[2];
for (const [dev, w, h, dsf] of SIZES) {
  if (only && only !== dev) continue;
  for (const name of SHOTS) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, isMobile: dev === 'movil', hasTouch: true });
    const p = await ctx.newPage();
    await p.addInitScript(() => { window.POKER_ONLINE_URL = ''; }); await p.addInitScript(() => { if (!sessionStorage.s) { localStorage.setItem('poker.v1', JSON.stringify({ onboarded: true, iosHint: true })); sessionStorage.s = 1; } });
    await p.goto(APP); await p.evaluate(seed); await p.evaluate(setup, name); await p.evaluate(() => document.querySelector('#toast').classList.remove('on')); await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}${dev}-${name}.png` });
    await ctx.close();
  }
}
// Icono 512 y gráfico destacado 1024×500
const p = await b.newPage({ viewport: { width: 512, height: 512 } });
await p.setContent(`<img src="data:image/png;base64,${readFileSync(ROOT + 'assets/icon-only.png').toString('base64')}" style="width:512px;height:512px;display:block">`);
await p.screenshot({ path: OUT + 'icono-512.png', clip: { x: 0, y: 0, width: 512, height: 512 } });
const q = await b.newPage({ viewport: { width: 1024, height: 500 } });
await q.setContent(`<html><body style="margin:0;width:1024px;height:500px;background:radial-gradient(circle at 30% 50%,#1a5a43,#0b2a20 70%);font-family:system-ui,Roboto,sans-serif;display:flex;align-items:center;gap:56px;padding:0 70px;box-sizing:border-box;color:#f8efe3">
  <img src="data:image/png;base64,${readFileSync(ROOT + 'assets/icon-only.png').toString('base64')}" style="width:300px;height:300px;border-radius:64px;box-shadow:0 18px 50px rgba(0,0,0,.45)">
  <div><div style="font-size:104px;font-weight:900;letter-spacing:2px;color:#e8b84a;line-height:1">PÓKER</div>
  <div style="font-size:31px;font-weight:600;margin-top:18px;line-height:1.3">Texas Hold'em: torneos<br>contra la máquina o en línea<br>con modo aprendizaje</div>
  <div style="font-size:24px;color:#a9c3b6;margin-top:18px">Fichas ficticias · 3 niveles · Sin anuncios</div></div></body></html>`, { waitUntil: 'domcontentloaded' });
await q.waitForTimeout(500);
await q.screenshot({ path: OUT + 'grafico-destacado-1024x500.png' });
await b.close();
console.log('Listo: play-store/');
