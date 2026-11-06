# Póker

Texas Hold'em para Android e iPhone: **torneo con fichas ficticias** (no hay dinero real) contra la máquina o en línea con amigos, con **modo aprendizaje**.
App Capacitor + web (`www/`). Todos los datos se guardan en el móvil; solo el juego en línea usa el servidor de juegos (nombre y jugadas, sin guardarlos).
Paquete: `com.itcanarias.poker` · versión 1.0.0

**iPhone y navegadores**: la misma app se publica como versión web instalable en https://csuarezsm.github.io/Poker/app/ (GitHub Pages, carpeta `docs/app`, copia de `www/`). En Safari: Compartir → «Añadir a pantalla de inicio». Tras cambiar `www/`, ejecuta `npm run web` antes del commit (el workflow lo comprueba).

© 2026 IT Canarias. Todos los derechos reservados.

Hecha con la misma plantilla que Ajedrez, Damas, Chinchón, Pumba y Parchís (tema por defecto: tapete verde). Las reglas, con sus fuentes, están en [REGLAS.md](REGLAS.md).

## Qué hace

- **Torneo «freezeout»** de Texas Hold'em sin límite: todos empiezan con las mismas fichas (1000, 1500 o 3000), las ciegas suben cada 5, 10 o 15 manos y gana el último en pie.
- **Contra la máquina**: de 1 a 8 rivales y tres niveles (fácil, normal y difícil). Los rivales calculan sus probabilidades (Monte Carlo) y el nivel difícil selecciona manos, juega según su posición, se tira algún farol y estrecha el rango de quien apuesta fuerte. Si te eliminan, el torneo se resuelve solo.
- **En línea con amigos**: hasta 9 personas, cada una en su móvil, con el servidor común (`wss://juegos.itcanarias.com/ws`, repo `csuarezsm/juegos-servidor`, juego `poker`). Crear mesa y pasar el código por WhatsApp, partidas públicas, la máquina puede ocupar sillas libres y juega por quien se desconecta; reloj de turno (20/40/60 s) y revancha. El mazo lo baraja el servidor y cada uno solo recibe sus cartas.
- **💡 Modo aprendizaje** (se activa al empezar o en cualquier momento): te dice qué mano tienes, la fuerza de tus cartas iniciales y, con «¿Qué hago?», tus probabilidades de ganar frente a las que necesitas (pot odds), tus «outs» y qué conviene hacer y por qué; resalta el botón aconsejado y la subida arranca en la cantidad sugerida. **Nunca juega por ti.** Incluye «Qué gana a qué».
- **Barra de apuestas**: retirarse, pasar/igualar y subir con deslizador, ± ciega grande y atajos (mín., ½, ¾, bote, todo). Subida mínima, all-in y botes laterales según las reglas.
- **Historial y estadísticas** (torneos, victorias, podios, mejor puesto), copia de seguridad (exportar/importar, copia automática en Android), temas, tamaño de letra, sonidos sintetizados, aviso de turno, actualizador del APK, compartir la app y borrar datos.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `www/poker.js` | Reglas y máquina (el **mismo archivo** va en el servidor: `juegos-servidor/motores/poker/poker.js`). Mazo, evaluador de manos, botes y laterales, torneo, bots por niveles y consejos del modo aprendizaje. |
| `www/juego.js` | Mesa, apuestas, modo aprendizaje, partida contra la máquina y cliente en línea. |
| `www/index.html` | Estilos, menú, temas, historial, copia de seguridad, actualizador y arranque. |
| Archivos comunes | `idioma.js` + `i18n-*.js`, `masjuegos.js`, `turno.js`, `audio-suave.js`, `contador.js`, `invitacion.js`, `publicas.js`: idénticos en todas las apps. |
| `tests/motor.test.mjs` | 63 pruebas del motor: evaluación de manos (200 000 manos de frecuencia), ciegas y botón, subida mínima, all-in corto, botes laterales, empates, botón muerto, 120 torneos simulados y fuerza de los niveles. |
| `tests/app.test.mjs` | La app en el navegador (móvil, horizontal, tablet, mesa de 9), torneos completos, modo aprendizaje, barra de apuestas, copias y torneo en línea entre dos móviles contra el servidor. |

## Publicar una versión

1. Sube `versionCode` y `versionName` en `android/app/build.gradle`, `APP_VERSION` en `www/index.html`, `CACHE` en `www/sw.js` y `version` en `package.json`.
2. `npm run web` (versión web) y push a `main`. El workflow pasa las pruebas, compila el **APK** (`poker.apk`, con actualizador) y el **AAB** de Google Play (`poker-play.aab`), los firma y crea la Release `vX.Y.Z`.

Secretos del repositorio (Settings → Secrets and variables → Actions):
- `ANDROID_KEYSTORE_BASE64`: el archivo `poker-release.jks` en base64.
- `ANDROID_KEYSTORE_PASSWORD`: su contraseña (alias de la clave: `poker`).

**Guarda el `.jks` y la contraseña a salvo: si se pierden, las apps instaladas no se pueden actualizar.** Los pasos completos, en [GITHUB-PASOS.md](GITHUB-PASOS.md).

## Pruebas

```bash
npm ci && npx playwright install --with-deps chromium
npm test        # motor + app (la parte en línea usa ../juegos-servidor o JUEGOS_SERVIDOR)
```

## Más juegos

En el menú ⋮ → «🎲 Más juegos de IT Canarias» y en la página de descarga aparecen los otros juegos (Ajedrez, Damas, Chinchón, Pumba y Parchís). El código es `www/masjuegos.js`, **el mismo en todas las apps**, y el catálogo se lee de https://csuarezsm.github.io/juegos-servidor/juegos.json.
