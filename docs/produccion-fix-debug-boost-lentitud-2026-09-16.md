# Producción lenta — causa real: `APP_ENV`/`APP_DEBUG` mal puestos + Laravel Boost activo

> Aplicado en producción el 2026-09-16. Guardar este documento porque el próximo deploy
> (o un `.env` restaurado desde un backup viejo) puede volver a dejar estos valores mal —
> si el sitio se pone lento otra vez y `storage/logs/browser.log` vuelve a crecer rápido,
> empezar por acá.

## Qué estaba pasando

`.env` de producción tenía:

```
APP_ENV=local
APP_DEBUG=true
LOG_LEVEL=debug
```

Estos 3 valores nunca deben estar así en producción. El problema real no era solo el debug
en sí — es que **`laravel/boost`** (herramienta de desarrollo con IA, declarada en
`require-dev` de `composer.json`, nunca debería llegar a producción) estaba instalada en el
servidor y se activa solo cuando `app()->environment('local')` **o** `config('app.debug')`
es `true` (`vendor/laravel/boost/src/BoostServiceProvider.php::shouldRun()`). Con ambas
condiciones mal en `.env`, Boost quedó corriendo de lleno:

- Inyectaba un script de monitoreo en **cada página HTML servida a cada usuario real**
  (middleware `InjectBoost` enganchado a todo el grupo `web`).
- Ese script mandaba cada error/warning de consola del navegador de vuelta al servidor
  (`POST /_boost/browser-logs`) sin parar — confirmado en `storage/logs/browser.log`:
  8 días acumulando, 13 164 entradas, 17.8 MB, ~1 petición cada 20-40s por pestaña activa.
- Con `APP_DEBUG=true`, cada excepción real de PHP en producción renderiza la página de
  error completa de Laravel (cara en CPU) y expone código fuente/config a quien la vea.
- Con `LOG_LEVEL=debug` y `LOG_CHANNEL=stack` (→ `single`, nunca rota), `laravel.log`
  crecía sin límite (8.4 MB al momento de revisar).

Nada de esto tenía que ver con las imágenes de productos (correcto, no estaban subidas
todavía) ni con las tablas de sesión/caché/cola (revisadas, sin acumulación real).

## Pasos aplicados (repetibles si vuelve a pasar)

Todo por SSH: `ssh almacen-tienda`, luego:

```bash
cd /home/u706356131/domains/posglorietashop.com/public_html/proyectos/almacen.tienda

# 1. Respaldar .env antes de tocar nada
cp .env .env.bak-$(date +%Y%m%d-%H%M%S)

# 2. Corregir los 3 valores
sed -i 's/^APP_ENV=local/APP_ENV=production/' .env
sed -i 's/^APP_DEBUG=true/APP_DEBUG=false/' .env
sed -i 's/^LOG_LEVEL=debug/LOG_LEVEL=error/' .env

# 3. Reconstruir el cache de config (obligatorio — bootstrap/cache/config.php
#    ya tenía los valores viejos cacheados, el cambio en .env solo no alcanza)
php artisan config:clear
php artisan config:cache

# 4. Respaldar y vaciar los logs inflados (no borrarlos, solo rotarlos a mano)
cd storage/logs
mv laravel.log laravel.log.bak-20260916
mv browser.log browser.log.bak-20260916
touch laravel.log browser.log
chmod 664 laravel.log browser.log
```

## Verificación

Desde cualquier máquina (no hace falta estar en el servidor):

```bash
curl -s -o /tmp/check.html -w "HTTP %{http_code}\n" https://gestion.posglorietashop.com/login
grep -c "browser-logger-active" /tmp/check.html   # debe dar 0 — confirma que Boost ya no se inyecta
```

Resultado el 2026-09-16: `HTTP 200`, `0` coincidencias de `browser-logger-active` — confirmado
que el script de Boost dejó de inyectarse y el sitio sigue respondiendo normal.

## Pendiente, no aplicado todavía (decidir aparte)

- **Cambiar el proceso de deploy** para usar `composer install --no-dev --optimize-autoloader`
  en vez de `composer install` a secas — así `laravel/boost`, `laravel/pail`,
  `barryvdh/laravel-ide-helper`, `laravel/sail`, `mockery/mockery`, `pestphp/*` ni siquiera se
  instalan en el servidor de producción. Más agresivo que lo de arriba (borra paquetes del
  `vendor/` del servidor), por eso se dejó fuera de esta pasada.
- **Bug real encontrado dentro de `browser.log` antes de vaciarlo**: un `AxiosError Network
  Error` se repetía constantemente en `/vendor/cierres/crear` (Cierre de Caja) — vale la pena
  investigarlo aparte ahora que ese ruido de fondo ya no lo va a tapar. Ver
  `laravel.log.bak-20260916`/`browser.log.bak-20260916` en el servidor si hace falta revisar
  el historial de errores de antes de este cambio.
- Ver también `docs/ESTADO_DESARROLLO.md` (sección "Bugs activos pendientes") para el hallazgo
  de `MonedaController` sin chequeo de rol y el CSRF roto en 10 `fetch()` — encontrados en la
  misma sesión, documentados ahí, sin corregir todavía.
