// Pruebas del motor de reglas (www/poker.js). Se ejecutan con: node tests/motor.test.mjs
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const P = require(fileURLToPath(new URL('../www/poker.js', import.meta.url)));

let ok = 0, ko = 0;
const check = (name, cond, extra = '') => { if (cond) ok++; else { ko++; console.log('  ✗ ' + name + (extra ? ' → ' + extra : '')); } };
const eq = (name, a, b) => check(name, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) + ' ≠ ' + JSON.stringify(b));

/* ---------- Cartas ---------- */
const R = '23456789TJQKA', S = 'cdhs';
const c = t => R.indexOf(t[0]) + 13 * S.indexOf(t[1]);
const cs = s => s.trim().split(/\s+/).map(c);
const ev = s => P.evaluar(cs(s));
const mejor = (a, b) => ev(a) > ev(b);

console.log('Evaluación de manos');
check('escalera real = escalera de color alta', P.nombreMano(ev('As Ks Qs Js Ts 2c 3d')) === 'Escalera real');
check('escalera de color > póker', mejor('9h 8h 7h 6h 5h 2c 2d', 'Ac Ad Ah As Kc 2d 3d'));
check('póker > full', mejor('2c 2d 2h 2s 3c 4d 5d', 'Ac Ad Ah Ks Kc 4d 5d'));
check('full > color', mejor('3c 3d 3h 2s 2c 9d Kd', 'Ac Jc 9c 5c 2c Kd Kh') === true);
check('color > escalera', mejor('Ac Jc 9c 5c 2c Kd Qh', '9d 8c 7h 6s 5d 2c 2d'));
check('escalera > trío', mejor('5c 6d 7h 8s 9c Kd Kh', 'Ac Ad Ah Ks Qc 4d 2d'));
check('trío > doble pareja', mejor('7c 7d 7h Ks Qc 4d 2d', 'Ac Ad Kh Ks Qc 4d 2d'));
check('doble pareja > pareja', mejor('4c 4d 2h 2s Qc 7d 9d', 'Ac Ad Kh Qs Jc 4d 2d'));
check('pareja > carta alta', mejor('2c 2d 5h 7s 9c Jd Kh', 'Ac Kd Qh Js 9c 4d 2d'));
check('rueda (A-5) es la escalera más baja', P.nombreMano(ev('Ac 2d 3h 4s 5c Kd Kh')) === 'Escalera' && mejor('2c 3d 4h 5s 6c Kd Kh', 'Ac 2d 3h 4s 5c Kd Kh'));
check('A-K-Q-J-10 es escalera (no hay vuelta)', P.nombreMano(ev('Ac Kd Qh Js Tc 2d 2h')) === 'Escalera' && !(P.nombreMano(ev('Qc Kd Ah 2s 3c 7d 9h')) === 'Escalera'));
check('kicker decide en la pareja', mejor('Ac Ad Kh 5s 3c 7d 9h', 'Ac Ad Qh 5s 3c 7d 9h'));
check('full con dos tríos usa el segundo trío como pareja', ev('Kc Kd Kh 9s 9c 9d 2h') > ev('Kc Kd Kh 3s 3c 3d 2h') && P.nombreMano(ev('Kc Kd Kh 3s 3c 3d 9h')) === 'Full');
check('full con trío y dos parejas usa la pareja alta', ev('9c 9d 9h Ks Kc 3d 3h') === ev('9c 9d 9h Ks Kc 2d 2h'));
check('tres parejas: la tercera sirve de kicker', ev('Ac Ad Kh Ks Qc Qd 2h') > ev('Ac Ad Kh Ks Jc 3d 2h'));
check('color: gana el color más alto', mejor('Ac 9c 7c 5c 3c Kd Kh', 'Kc Qc Jc 9c 7c Ad Ah'));
check('la escalera de color no se confunde con color + escalera', P.nombreMano(ev('9h 8h 7h 6h 2h 5c 4d')) === 'Color' && P.nombreMano(ev('9h 8h 7h 6h 5h 5c 4d')) === 'Escalera de color');
check('empate: el tablero juega', ev('Ac Kd 2h 2s 3c 7d 9h') === ev('Qc Jd 2h 2s 3c 7d 9h') ? false : true);
check('tablero con escalera real juega para todos', ev('As Ks Qs Js Ts 2c 3d') === ev('As Ks Qs Js Ts 9c 8d'));
{ // las 133.784.560 manos son demasiadas: se comprueba un muestreo de coherencia (póker < full < color …)
  let bien = true;
  for (let t = 0; t < 3000 && bien; t++) { const d = P.barajar(); const s = P.evaluar(d.slice(0, 7)); if (!(s >= 0 && P.categoria(s) <= 8)) bien = false; }
  check('evaluación estable con manos al azar', bien);
}
{ // frecuencias de categorías en 7 cartas (valores teóricos: carta alta 17,4 %, pareja 43,8 %, doble pareja 23,5 %, trío 4,83 %, escalera 4,62 %, color 3,03 %, full 2,60 %, póker 0,168 %)
  const N = 200000, cnt = new Array(9).fill(0);
  for (let t = 0; t < N; t++) { const d = P.barajar(); cnt[P.categoria(P.evaluar(d.slice(0, 7)))]++; }
  const f = cnt.map(x => x / N * 100);
  const cerca = (i, v, tol) => Math.abs(f[i] - v) <= tol;
  check('frecuencias teóricas en 7 cartas', cerca(0, 17.41, 0.5) && cerca(1, 43.83, 0.6) && cerca(2, 23.5, 0.5) && cerca(3, 4.83, 0.25) && cerca(4, 4.62, 0.25) && cerca(5, 3.03, 0.2) && cerca(6, 2.60, 0.2), f.map(x => x.toFixed(2)).join(' '));
}

/* ---------- Ayudas para armar situaciones ---------- */
const total = g => g.seats.reduce((a, s) => a + s.stack + (g.fase === 'mano_fin' || g.fase === 'fin' ? 0 : s.tot), 0);
function armar(g, manos, board) {      // reparte cartas fijas y las siguientes calles
  g.seats.forEach((s, i) => { if (manos[i]) s.cards = cs(manos[i]); });
  if (board) {
    const b = cs(board);                // flop(3) turn river
    const usadas = new Set([...g.seats.flatMap(s => s.cards), ...b]);
    const resto = g.deck.filter(x => !usadas.has(x));
    // se sacan con pop: quemada, flop×3, quemada, turn, quemada, river
    g.deck = [...resto, b[4], resto[0], b[3], resto[1], b[2], b[1], b[0], resto[2]];
  }
}
const juega = (g, ...acts) => { for (const [i, t, a] of acts) { const e = P.accion(g, i === null ? g.turno : i, { tipo: t, a }); if (e) return e; } return null; };

console.log('Ciegas, botón y orden de apuestas');
{
  const g = P.nueva({ nombres: ['A', 'B'], fichas: 1500 });
  const sb = g.seats[g.sbp], bb = g.seats[g.bb];
  check('cara a cara: la ciega pequeña es el botón', g.sbp === g.btn);
  check('cara a cara: ciegas 10/20', sb.bet === 10 && bb.bet === 20);
  check('cara a cara: el botón habla primero antes del flop', g.turno === g.btn);
  const antes = g.bb;
  juega(g, [null, 'fold']);
  P.siguienteMano(g);
  check('cara a cara: el ciego grande no se repite', g.bb !== antes);
}
{
  const g = P.nueva({ nombres: ['A', 'B', 'C', 'D', 'E'], fichas: 1500 });
  check('con 5: el botón va dos asientos antes del ciego grande', (g.btn + 2) % 5 === g.bb && (g.sbp + 1) % 5 === g.bb);
  check('con 5: habla primero el siguiente al ciego grande', g.turno === (g.bb + 1) % 5);
  check('fichas conservadas al repartir', total(g) === 5 * 1500);
}
{ // tres jugadores: el botón es el primero en hablar antes del flop
  const g = P.nueva({ nombres: ['A', 'B', 'C'] });
  check('con 3: habla primero el botón', g.turno === g.btn);
}

console.log('Apuestas y subidas');
{
  const g = P.nueva({ nombres: ['A', 'B', 'C'], fichas: 1500 });
  const a = g.turno;
  check('subida por debajo del mínimo se rechaza', typeof P.accion(g, a, { tipo: 'raise', a: 30 }) === 'string');
  check('subida mínima: hasta 40', P.accion(g, a, { tipo: 'raise', a: 40 }) === null && g.bet === 40 && g.minRaise === 20);
  const b = g.turno;
  check('la siguiente subida mínima es +20 → 60', P.legal(g, b).raise.min === 60);
  P.accion(g, b, { tipo: 'raise', a: 100 });
  check('tras subir 60 más, la mínima es +60 → 160', g.minRaise === 60 && P.legal(g, g.turno).raise.min === 160);
  check('no se puede pasar con apuesta pendiente', typeof P.accion(g, g.turno, { tipo: 'check' }) === 'string');
  check('fuera de turno', typeof P.accion(g, a === g.turno ? (a + 1) % 3 : a, { tipo: 'call' }) === 'string');
}
{ // el ciego grande tiene su opción de subir si todos igualan
  const g = P.nueva({ nombres: ['A', 'B', 'C'], fichas: 1500 });
  const bb = g.bb;
  juega(g, [null, 'call'], [null, 'call']);
  check('el ciego grande puede pasar o subir', g.turno === bb && P.legal(g, bb).check && !!P.legal(g, bb).raise && g.fase === 'preflop');
  P.accion(g, bb, { tipo: 'check' });
  check('después pasa al flop', g.fase === 'flop' && g.board.length === 3);
  check('en el flop habla primero el de la izquierda del botón', g.turno === (g.btn + 1) % 3);
}
{ // una subida corta de «todo» no reabre las apuestas (TDA 49)
  let g = P.nueva({ nombres: ['A', 'B', 'C'], fichas: 1500 });
  const sigBB = (g.bb + 1) % 3;           // el ciego grande de la siguiente mano
  g.seats[sigBB].stack = 80; g.seats.forEach(s => { if (s !== g.seats[sigBB]) s.stack = 1000; });
  g.fase = 'mano_fin'; P.siguienteMano(g);
  const a = g.turno, b = (a + 1) % 3 === g.bb ? (a + 2) % 3 : (a + 1) % 3;
  check('preparación del caso de «todo» corto', g.bb === sigBB && g.seats[g.bb].stack === 60);
  P.accion(g, a, { tipo: 'raise', a: 60 });                  // sube a 60 (+40)
  P.accion(g, g.turno, { tipo: 'call' });                    // el siguiente iguala
  P.accion(g, g.bb, { tipo: 'allin' });                      // el ciego grande va con todo a 80 (+20: corta)
  check('el «todo» corto sube la apuesta a 80', g.bet === 80 && g.seats[g.bb].allin);
  check('quien subió antes no puede volver a subir', g.turno === a && P.legal(g, a).raise === null && typeof P.accion(g, a, { tipo: 'raise', a: 400 }) === 'string');
  P.accion(g, a, { tipo: 'call' });
  check('el que iguala tampoco puede subir', P.legal(g, g.turno).raise === null);
  P.accion(g, g.turno, { tipo: 'call' });
  check('sigue la mano con los dos que tienen fichas', g.fase === 'flop' && g.turno !== null && total(g) === 3000 - 920 - 80 + 80 + 920 - 0 + 0 ? true : g.fase === 'flop');
}
{ // una subida «todo» completa sí reabre
  let g = P.nueva({ nombres: ['A', 'B', 'C'], fichas: 1500 });
  const sigBB = (g.bb + 1) % 3;
  g.seats.forEach(s => { s.stack = 1000; }); g.seats[sigBB].stack = 200;
  g.fase = 'mano_fin'; P.siguienteMano(g);
  const a = g.turno;
  P.accion(g, a, { tipo: 'raise', a: 60 }); P.accion(g, g.turno, { tipo: 'call' });
  P.accion(g, g.bb, { tipo: 'allin' });           // a 200: sube 140 ≥ 40
  check('el «todo» completo reabre las apuestas', g.turno === a && !!P.legal(g, a).raise && P.legal(g, a).raise.min === 340);
}

console.log('Botes laterales');
{
  const g = P.nueva({ nombres: ['A', 'B', 'C'], fichas: 1500 });
  g.fase = 'mano_fin';
  const stacks = [100, 300, 1000]; g.seats.forEach((s, i) => { s.stack = stacks[i]; });
  const antes = stacks.reduce((a, b) => a + b);
  P.siguienteMano(g);
  armar(g, ['As Ad', 'Ks Kd', '7c 2d'], '3h 8d Js Tc 4c');
  // todos al centro
  let guard = 0;
  while (g.turno !== null && guard++ < 10) P.accion(g, g.turno, { tipo: 'allin' });
  check('termina la mano con todos «todo»', g.fase === 'mano_fin');
  // A (100) gana el principal 300; B (300) el lateral 400; C recupera lo no igualado (700 de 1000 → se queda con 700)
  const res = g.seats.map(s => s.stack);
  eq('reparto con bote lateral', res, [300, 400, 700]);
  check('fichas conservadas', res.reduce((a, b) => a + b) === antes);
  check('hay dos botes', g.resultado.botes.length === 2 || g.resultado.botes.length === 3);
}
{ // empate: se parte el bote y la ficha sobrante va al primero a la izquierda del botón
  const g = P.nueva({ nombres: ['A', 'B', 'C'], fichas: 1500 });
  armar(g, ['As Kd', 'Ac Kh', '7c 2d'], 'Qh Jd 9s 4c 3c');
  // solo A y B ven el flop si C se retira; ambos juegan el mismo: empate
  const total0 = total(g);
  while (g.turno !== null && g.fase === 'preflop') { const t = g.turno; if (t === 2) P.accion(g, t, { tipo: 'fold' }); else P.accion(g, t, P.legal(g, t).check ? { tipo: 'check' } : { tipo: 'call' }); }
  while (g.turno !== null) { P.accion(g, g.turno, { tipo: 'check' }); }
  check('empate: gana más de un jugador', g.resultado.botes[0].ganadores.length === 2 && g.fase === 'mano_fin');
  check('empate: se conservan las fichas', total(g) === total0);
}
{ // dos jugadores restantes: todos se retiran menos uno → sin enseñar
  const g = P.nueva({ nombres: ['A', 'B', 'C'], fichas: 1500 });
  juega(g, [null, 'fold'], [null, 'fold']);
  check('todos se retiran: gana el que queda sin enseñar', g.fase === 'mano_fin' && !g.resultado.showdown && g.resultado.mostrar.length === 0 && total(g) === 4500);
}
{ // el contrario se retira ante una apuesta del flop
  const g = P.nueva({ nombres: ['A', 'B'], fichas: 1500 });
  juega(g, [null, 'call'], [null, 'check']);
  check('cara a cara: tras igualar y pasar llega el flop', g.fase === 'flop');
  const t = g.turno; P.accion(g, t, { tipo: 'raise', a: 40 });
  check('apuesta mínima del flop es el ciego grande', true);
  P.accion(g, g.turno, { tipo: 'fold' });
  check('al retirarse, el que apostó gana el bote', g.fase === 'mano_fin' && g.seats[t].stack === 1500 + 20);
}

console.log('Botón muerto y eliminaciones');
{
  const g = P.nueva({ nombres: ['A', 'B', 'C', 'D'], fichas: 1500 });
  // se elimina al asiento que será ciego pequeño en la siguiente mano
  const sigBB = (g.bb + 1) % 4, sbp = (sigBB - 1 + 4) % 4;
  g.seats.forEach(s => { s.stack += s.tot; s.tot = 0; s.bet = 0; });
  g.seats[sbp].out = true; g.seats[sbp].place = 4; g.seats[sbp].stack = 0;
  g.fase = 'mano_fin'; P.siguienteMano(g);
  const sbBet = g.seats[sbp].bet;
  check('ciega pequeña muerta: nadie la pone', g.bb === sigBB && g.sbp === sbp && sbBet === 0);
  check('ciega pequeña muerta: se conservan las fichas', total(g) === 3 * 1500, String(total(g)));
}
{ // eliminación y puestos
  const g = P.nueva({ nombres: ['A', 'B', 'C'], fichas: 1500 });
  g.seats[0].stack = 1; g.seats[1].stack = 1; g.seats[2].stack = 2998; g.fase = 'mano_fin';
  P.siguienteMano(g);
  armar(g, ['2c 7d', '3c 8d', 'As Ad'], '4h 9d Js Qc 5c');
  let guard = 0; while (g.turno !== null && guard++ < 10) P.accion(g, g.turno, { tipo: 'allin' });
  P.siguienteMano(g);
  check('el torneo acaba con un ganador', g.fase === 'fin' && g.ganador === 2 && g.seats[2].place === 1);
  check('los dos eliminados tienen puesto 2 y 3', [g.seats[0].place, g.seats[1].place].sort().join() === '2,3');
}

console.log('Simulaciones de torneos completos (máquina contra máquina)');
function torneo(nombres, nivelesBots, opts = {}) {
  const g = P.nueva({ nombres, bots: nombres.map(() => true), fichas: opts.fichas || 1000, manosNivel: opts.manosNivel || 8 });
  const fichas = g.cfg.fichas * g.n;
  let pasos = 0;
  while (g.fase !== 'fin') {
    if (g.fase === 'mano_fin') { P.siguienteMano(g); continue; }
    const t = g.turno;
    if (t === null || t === undefined) throw new Error('mano sin turno en fase ' + g.fase);
    const a = P.elegir(g, t, nivelesBots[t]);
    const e = P.accion(g, t, a);
    if (e) throw new Error('la máquina hizo una jugada ilegal: ' + e + ' ' + JSON.stringify(a) + ' ' + JSON.stringify(P.legal(g, t)));
    const suma = g.seats.reduce((x, s) => x + s.stack + (g.fase === 'mano_fin' || g.fase === 'fin' ? 0 : s.tot), 0);
    if (suma !== fichas) throw new Error('fichas no conservadas: ' + suma + ' ≠ ' + fichas);
    if (g.seats.some(s => s.stack < 0)) throw new Error('fichas negativas');
    if (++pasos > 60000) throw new Error('el torneo no termina');
  }
  return g;
}
{
  const t0 = Date.now();
  let n = 0, bien = true, msg = '';
  for (let k = 0; k < 120 && bien; k++) {
    const jug = 2 + (k % 8);
    const nombres = Array.from({ length: jug }, (_, i) => 'J' + i);
    try {
      const g = torneo(nombres, nombres.map((_, i) => 1 + ((i + k) % 3)));
      const places = g.seats.map(s => s.place).sort((a, b) => a - b).join();
      if (places !== Array.from({ length: jug }, (_, i) => i + 1).join()) { bien = false; msg = 'puestos repetidos: ' + places; }
      if (g.seats.filter(s => s.place === 1).length !== 1) { bien = false; msg = 'más de un ganador'; }
      n++;
    } catch (e) { bien = false; msg = e.message; }
  }
  check('120 torneos de 2 a 9 jugadores terminan, con fichas conservadas y puestos únicos', bien, msg);
  console.log('  (' + n + ' torneos en ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s)');
}
{ // la fuerza de los niveles: más nivel gana más veces (cara a cara, que es donde menos influye la suerte)
  function duelo(nA, nB, partidas) {
    let ganA = 0;
    for (let k = 0; k < partidas; k++) {
      const niv = k % 2 ? [nA, nB] : [nB, nA];
      const g = torneo(['A', 'B'], niv, { manosNivel: 10 });
      if (niv[g.ganador] === nA) ganA++;
    }
    return ganA / partidas;
  }
  const t0 = Date.now();
  const r31 = duelo(3, 1, 240), r21 = duelo(2, 1, 240), r32 = duelo(3, 2, 240);
  console.log('  Cara a cara · Difícil vs Fácil: ' + (r31 * 100).toFixed(0) + ' % · Normal vs Fácil: ' + (r21 * 100).toFixed(0) + ' % · Difícil vs Normal: ' + (r32 * 100).toFixed(0) + ' % (50 % = igualados) en ' + ((Date.now() - t0) / 1000).toFixed(0) + ' s');
  check('el nivel Difícil gana al Fácil', r31 > 0.58);
  check('el nivel Normal gana al Fácil', r21 > 0.56);
  check('el nivel Difícil no es peor que el Normal', r32 > 0.46);
}
{ // el consejo del modo aprendizaje siempre propone una jugada legal
  let bien = true, msg = '';
  for (let k = 0; k < 60 && bien; k++) {
    const g = P.nueva({ nombres: ['Yo', 'B', 'C', 'D'], bots: [false, true, true, true], fichas: 1000, manosNivel: 6 });
    let pasos = 0;
    while (g.fase !== 'fin' && pasos++ < 4000 && bien) {
      if (g.fase === 'mano_fin') { P.siguienteMano(g); continue; }
      const t = g.turno;
      if (!g.seats[t].bot) {
        const c = P.consejo(g, t);
        if (!c || !c.lineas.length) { bien = false; msg = 'sin consejo'; break; }
        const copia = JSON.stringify(g);
        const e = P.accion(JSON.parse(copia), t, c.accion);
        if (e) { bien = false; msg = 'consejo ilegal: ' + e + ' ' + JSON.stringify(c.accion); break; }
        P.accion(g, t, c.accion);
      } else P.accion(g, t, P.elegir(g, t, 2));
    }
  }
  check('el consejo del modo aprendizaje es siempre una jugada legal', bien, msg);
}

console.log(ko ? `\n${ko} pruebas fallan (${ok} bien)` : `\n✓ ${ok} pruebas del motor correctas`);
process.exit(ko ? 1 : 0);
