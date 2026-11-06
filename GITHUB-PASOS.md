# Qué tienes que hacer en GitHub (paso a paso)

Orden importante: **primero el servidor, luego la app de Póker, luego los demás juegos**. Todo el trabajo está hecho; esto solo es subirlo y activarlo. Cuenta de GitHub: `csuarezsm`.

> Antes de nada, en el ordenador: descomprime el zip que te he entregado. Dentro hay una carpeta por repositorio: `Poker/` (la app nueva), `juegos-servidor/` (con el póker añadido) y `otros-juegos/` (parches para Ajedrez, Damas, Chinchón, Pumba y Parchís).

## 1 · Servidor común (`juegos-servidor`)

1. Abre https://github.com/csuarezsm/juegos-servidor y mira que estás en la rama `main`.
2. Copia en tu clon local del repositorio los archivos nuevos o cambiados de `juegos-servidor/` del zip (se mantienen las rutas):
   `src/juegos/poker.js`, `src/salas.js`, `motores/poker/poker.js`, `test/poker.test.mjs`, `package.json`, `README.md` y `docs/juegos.json`.
3. En una terminal dentro del clon: `npm ci && npm test` (tienen que salir todas las pruebas en verde, también `poker.test.mjs`).
4. `git add -A && git commit -m "Póker en línea" && git push`.
5. En GitHub → pestaña **Actions**: espera a que el workflow salga en verde ✅.
6. Actualiza el servidor del VPS (solo cuando quieras que el póker en línea funcione): entra por SSH y ejecuta
   `cd /opt/juegos-servidor && git pull && bash despliegue/instalar-vps.sh`
   El script comprueba capacidad y no toca los demás contenedores. Si no lo haces, la app de Póker funciona igual contra la máquina; solo «En línea» dirá «El póker en línea estará disponible muy pronto».
7. Comprueba: https://juegos.itcanarias.com/salud debe responder bien y la lista de juegos debe incluir `poker`.
8. GitHub Pages del servidor (para el catálogo «Más juegos»): ya está activado desde `docs/`; al subir el commit, `https://csuarezsm.github.io/juegos-servidor/juegos.json` se actualiza solo.

## 2 · Crear el repositorio `Poker`

1. https://github.com/new → nombre **Poker** → **Public** → sin README ni .gitignore (vacío) → *Create repository*.
2. En la carpeta `Poker/` del zip, abre una terminal y ejecuta:
   ```
   git init -b main
   git add -A
   git commit -m "Póker 1.0.0"
   git remote add origin https://github.com/csuarezsm/Poker.git
   git push -u origin main
   ```
   (Todavía **no** saldrá bien el workflow: faltan los secretos del paso 3. Es normal.)

## 3 · Clave de firma y secretos

1. Crea la clave de firma (una sola vez; **guarda el archivo y la contraseña en un sitio seguro**, si se pierden no podrás actualizar la app):
   ```
   keytool -genkeypair -v -keystore poker-release.jks -alias poker -keyalg RSA -keysize 2048 -validity 10000
   ```
   Pon una contraseña (la misma para el almacén y la clave) y tus datos.
2. Conviértela a base64: en Linux/Mac `base64 -w0 poker-release.jks > poker.b64` (en Mac: `base64 -i poker-release.jks -o poker.b64`); en Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("poker-release.jks")) | Set-Content poker.b64`.
3. En GitHub → repositorio **Poker** → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - Nombre `ANDROID_KEYSTORE_BASE64` → pega todo el contenido de `poker.b64`.
   - Nombre `ANDROID_KEYSTORE_PASSWORD` → la contraseña.
4. Borra `poker.b64` del ordenador (el `.jks` guárdalo a salvo).

## 4 · GitHub Pages (versión para iPhone, páginas de descarga y privacidad)

1. Repositorio **Poker** → **Settings** → **Pages**.
2. *Source*: **Deploy from a branch** → Branch **main** → carpeta **/docs** → *Save*.
3. Espera 1–2 minutos y abre https://csuarezsm.github.io/Poker/ (página de descarga) y https://csuarezsm.github.io/Poker/app/ (la app web para iPhone).

## 5 · Primera versión (APK)

1. Pestaña **Actions** → ejecuta de nuevo el workflow que falló (*Re-run all jobs*) o haz cualquier commit pequeño.
2. Tarda 8–12 minutos: pasa las pruebas, compila el APK y el AAB, los firma y crea la Release **v1.0.0**.
3. Pestaña **Releases**: debe aparecer `poker.apk` y `poker-play.aab`.
4. En el móvil Android, abre https://csuarezsm.github.io/Poker/ desde **Chrome**, pulsa «Descargar para Android», instala y prueba. En iPhone: abre https://csuarezsm.github.io/Poker/app/ en Safari → Compartir → «Añadir a pantalla de inicio».

Si el workflow falla en las pruebas en línea porque el servidor aún no tiene el póker, haz primero el paso 1 (el servidor) y vuelve a ejecutarlo.

## 6 · Que el resto de juegos muestre el Póker

Cada juego tiene su lista «🎲 Más juegos de IT Canarias». Los parches están en `otros-juegos/<repo>/` del zip y cambian siempre lo mismo: `www/masjuegos.js`, `www/invitacion.js`, `www/juegos/poker.png`, `www/sw.js`, `android/app/src/main/AndroidManifest.xml`, la página `docs/index.html` y la versión (`+0.0.1`). Para cada repositorio (`Ajedrez`, `Damas`, `chinchon-marcador`, `Pumba`, `Parchis`):

1. Copia los archivos de `otros-juegos/<repo>/` sobre tu clon del repositorio.
2. `npm run web` (copia `www/` a `docs/app/`).
3. `git add -A && git commit -m "Más juegos: Póker" && git push`.
4. Espera el workflow en verde; saldrá una nueva Release con el Póker en la lista.

## 7 · Google Play (opcional, cuando quieras)

Sube `poker-play.aab` desde la Release a la Play Console y rellena la ficha con `play-store/FICHA-GOOGLE-PLAY.md` (las capturas ya están en `play-store/`).

## Si algo falla

- *Workflow en rojo en «Pruebas»*: abre el trabajo y mira qué comprobación falla (empieza por ✗).
- *«Faltan los secretos»*: repite el paso 3.
- *La página de Pages da 404*: repite el paso 4 y espera unos minutos.
- *«APP_VERSION no coincide»*: la versión de `www/index.html`, `build.gradle`, `sw.js` y `package.json` tiene que ser la misma.
