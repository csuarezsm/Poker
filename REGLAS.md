# Reglas del Póker de IT Canarias

Texas Hold'em sin límite, torneo «freezeout» con fichas ficticias. Estas reglas son la especificación de `www/poker.js` y de sus pruebas (`tests/motor.test.mjs`).

## Fuentes consultadas

1. **TDA — Poker Tournament Directors Association, Poker TDA Rules (edición 2024/2026)**: https://www.pokertda.com/?p=796 — reglas de torneo (subida mínima, all-in corto, botón muerto, botes laterales, eliminados en la misma mano).
2. **Robert's Rules of Poker (Robert Ciaffone)**, tal como las resume https://homepokertourney.org/betting.htm — reglas de apuestas, subidas y all-in.

Ambas coinciden en lo esencial. Donde una app digital obliga a decidir algo, se indica en «Decisiones de diseño».

## Reglas aplicadas

- **Mesa**: de 2 a 9 jugadores, mazo de 52 cartas, una carta quemada antes del flop, del turn y del river.
- **Botón y ciegas**: el botón (D) avanza un asiento cada mano. El ciego pequeño (SB) y el grande (BB) están a su izquierda. En la primera mano, el ciego grande se sortea.
- **Cara a cara (2 jugadores)**: el botón es el ciego pequeño y habla primero preflop (y último después); el ciego grande no se repite dos manos seguidas.
- **Botón muerto** (TDA): cuando se elimina a alguien, el botón sigue su camino aunque el asiento esté vacío; el ciego grande nunca se salta, por lo que el ciego pequeño o el botón pueden quedar «muertos».
- **Orden de palabra**: preflop, el primero a la izquierda del ciego grande; en flop, turn y river, el primero a la izquierda del botón que siga en la mano.
- **Apostar y subir**: la apuesta mínima es la ciega grande. La **subida mínima** es igual al tamaño de la última apuesta o subida completa de la ronda. Se puede subir hasta todas las fichas (all-in).
- **All-in corto** (TDA/Robert's): una subida all-in menor que la subida mínima **no reabre** las apuestas para quien ya había hablado (solo puede igualar o retirarse); varios all-in cortos que suman una subida completa sí las reabren.
- **Botes laterales**: se calculan por niveles de aportación; cada jugador solo gana lo que ha igualado. Un bote en el que solo queda un jugador con derecho se le devuelve.
- **Showdown**: cada jugador juega la mejor combinación de cinco cartas entre sus dos y las cinco de la mesa. El palo nunca desempata. Orden: escalera de color, póker, full, color, escalera (el as vale 1 o 14: A-2-3-4-5 es la más baja), trío, doble pareja, pareja, carta alta; desempatan los kickers.
- **Empates**: el bote se reparte a partes iguales; la ficha sobrante va al primer jugador a la izquierda del botón.
- **Eliminaciones**: quien se queda sin fichas queda eliminado. Si caen varios en la misma mano, el puesto se decide por las fichas con las que empezaron esa mano (más fichas, mejor puesto). Gana el último que queda.
- **Ciegas ascendentes**: tabla 10/20, 15/30, 25/50, 50/100, 75/150, 100/200, 150/300, 200/400, 300/600, 400/800, 500/1000… (a partir de ahí, se duplican).

## Decisiones de diseño (la app digital)

- **Sin antes** y **ciegas por manos, no por reloj**: suben cada 5, 10 o 15 manos a elección. Así el ritmo no depende de la prisa de cada uno.
- **Torneo simple**: una sola mesa, sin recompra ni «re-entry».
- **Showdown digital**: al llegar al final con varios jugadores se enseñan todas las manos (no se puede «esconder» una mano perdedora).
- **Reparto aleatorio**: barajado criptográfico (`crypto.getRandomValues`; en el servidor, `crypto.randomInt`).
- **Fichas ficticias**: no hay dinero real, premios ni compras.
- **En línea**: si el jugador no actúa en el tiempo de la mesa (20, 40 o 60 s), pasa si puede o se retira; si se desconecta, juega la máquina por él tras 30 s hasta que vuelva.

## Máquina por niveles

| Nivel | Cómo juega |
| --- | --- |
| Fácil | Decide con mucho «ruido»: juega muchas manos, se equivoca a menudo y simula poco. Para aprender sin presión. |
| Normal | Valora la mano inicial (fórmula de Chen) y calcula su equidad por simulación frente a rivales al azar; compara con las probabilidades del bote (pot odds); sube con manos fuertes. |
| Difícil | Selecciona más sus manos, tiene en cuenta la posición y las fichas que le quedan (en ciegas grandes), sube de nuevo con manos fuertes, se tira algún farol y estrecha el rango de quien apuesta fuerte. |

En los duelos cara a cara de las pruebas (cientos de torneos entre dos máquinas): el nivel difícil gana al fácil el 70 % de las veces, el normal al fácil el 69 % y el difícil al normal el 56 %. Además se simulan 120 torneos completos de 2 a 9 jugadores comprobando que las fichas se conservan y que los puestos son únicos.

## Modo aprendizaje

Calcula, sobre las cartas que tú ves (nunca las de los rivales): la mano que tienes, la fuerza de la mano inicial, tu probabilidad de ganar (simulación contra rivales al azar), la probabilidad que necesitas para que igualar compense (pot odds), tus «outs» (cartas que mejoran tu mano) y una sugerencia razonada. **Nunca juega por ti**; solo explica.
