# Guía de Desarrollo — almacen.tienda

> Todo lo que necesitas para levantar el proyecto, trabajar y hacer deploy.

---

## Stack requerido

| Herramienta | Versión mínima |
|---|---|
| PHP | 8.2+ |
| Composer | 2.x |
| Node.js | 20+ |
| MySQL / MariaDB | 8.0+ |

---

## Levantar el proyecto por primera vez

```bash
# 1. Clonar y entrar
git clone <repo> almacen.tienda
cd almacen.tienda

# 2. Dependencias PHP
composer install

# 3. Dependencias JS
npm install

# 4. Variables de entorno
cp .env.example .env
php artisan key:generate

# 5. Configurar .env (ver sección Variables de entorno)

# 6. Migraciones y seeders
php artisan migrate
php artisan db:seed   # opcional — carga datos de prueba

# 7. Storage link (para imágenes)
php artisan storage:link

# 8. Levantar servidores de desarrollo
php artisan serve        # backend en :8000
npm run dev              # Vite en :5173 (hot reload)
```

---

## Variables de entorno clave

```env
# Base de datos
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=almacen_tienda
DB_USERNAME=root
DB_PASSWORD=

# App
APP_URL=http://localhost:8000
APP_ENV=local
APP_DEBUG=true

# Bot Telegram
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_SECRET=una_cadena_aleatoria_segura

# Queue (para notificaciones en background)
QUEUE_CONNECTION=database   # o redis en producción

# Mail (opcional)
MAIL_MAILER=smtp
```

---

## Comandos del día a día

```bash
# Migraciones
php artisan migrate                    # aplicar migraciones pendientes
php artisan migrate:status             # ver estado de cada migración
php artisan migrate:rollback           # revertir última migración

# Crear archivos nuevos
php artisan make:migration nombre      # nueva migración
php artisan make:model Nombre          # nuevo modelo
php artisan make:controller Nombre     # nuevo controlador
php artisan make:notification Nombre   # nueva notificación

# Limpiar cachés (hacer después de cambios en config o rutas)
php artisan config:clear
php artisan route:clear
php artisan view:clear
php artisan cache:clear

# Listar rutas
php artisan route:list                 # todas las rutas
php artisan route:list --path=api      # filtrar por prefijo

# Tinker (REPL PHP con contexto de Laravel — útil para probar lógica)
php artisan tinker

# Frontend
npm run dev        # desarrollo con hot reload
npm run build      # build de producción
npm run typecheck  # validar tipos TypeScript

# Bot Telegram — registrar webhook (solo en producción con HTTPS)
php artisan tinker
>>> Http::post("https://api.telegram.org/bot{TOKEN}/setWebhook", ['url' => 'https://dominio.com/api/telegram/webhook', 'secret_token' => '{SECRET}'])
```

---

## Estructura de rutas

Las rutas están divididas en múltiples archivos incluidos desde `routes/web.php`:

```
routes/
├── web.php               ← entrada principal, incluye los subdirectorios
├── api.php               ← API pública + webhook Telegram
├── crud/                 ← rutas CRUD estándar (productos, almacenes, clientes, etc.)
├── acciones/             ← rutas de acciones específicas (aprobar, anular, etc.)
├── shop/                 ← rutas del POS y ventas
└── empleados/            ← rutas de gestión de usuarios
```

---

## Convenciones de código

### PHP (Laravel)
- **PSR-12** para estilo de código.
- Controladores delgados — lógica compleja en métodos privados o servicios.
- Siempre usar `DB::beginTransaction()` con rollback en operaciones críticas.
- Validar con `$request->validate([...])` o Form Requests.
- Los roles se verifican con: `in_array($user->role, ['admin', 'moderador'])`.

### TypeScript (React + Inertia)
- Interfaces para todos los props tipados (copiar el patrón de `Vendor/Show.tsx`).
- Usar `usePage<PageProps>()` para acceder a datos globales de Inertia.
- Formularios con `useForm()` de Inertia.
- Navegación con `router.post/get()` de Inertia (no `fetch` directo para rutas web).
- Nombres de archivos y componentes en **PascalCase**.

### Base de datos
- Nombres de tablas y columnas en **snake_case español**.
- Siempre agregar `$table->timestamps()` en nuevas tablas.
- Campos nullable explícitos: `$table->string('campo')->nullable()`.
- Soft deletes solo si el módulo lo requiere explícitamente.

---

## Flujo de trabajo con Git

```bash
# Nueva feature
git checkout -b feature/nombre-descriptivo
# ... hacer cambios ...
git add archivo1.php archivo2.tsx
git commit -m "Descripción concisa del cambio"
git push origin feature/nombre-descriptivo

# Para merges, crear PR en GitHub
```

**Ramas activas:**
- `main` — producción estable
- `feature/desarrollo-caliente` — rama de desarrollo actual (transacciones, cuentas, logística)

---

## Roles de usuario — referencia rápida

| Rol | Acceso |
|---|---|
| `admin` | Total: modificar costos, saldos, aprobar ventas especiales, gestionar usuarios |
| `moderador` | Como admin sin operaciones destructivas. Ve todo |
| `vendedor` | Solo sus almacenes y cuentas asignadas. No ve precios de costo |

Para crear un admin desde Tinker:
```php
$user = \App\Models\User::create([
    'name' => 'Admin',
    'email' => 'admin@ejemplo.com',
    'password' => \Illuminate\Support\Facades\Hash::make('contraseña'),
    'role' => 'admin',
]);
```

---

## Notificaciones — cómo funcionan

El sistema usa **Laravel Notifications** con canal `database` como base y `TelegramChannel` opcional:

1. La notificación se crea en `app/Notifications/`.
2. Se envía con `$user->notify(new NombreNotification(...))` o `Notification::send($users, ...)`.
3. Las notificaciones database aparecen en el bell de la UI (`NotificationBell.tsx`).
4. Las de Telegram van al chat del usuario si tiene `telegram_chat_id` configurado.

Para que las notificaciones de Telegram funcionen, el usuario debe vincular su cuenta:
- El admin ingresa el chat_id manualmente en `Empleados → Edit`.
- O el usuario escribe `/vincular CODIGO` en el bot de Telegram.

---

## Imágenes de productos

- Se guardan en `public/productos/`.
- La imagen por defecto es `public/productos/producto-default.png`.
- Para servir imágenes en el frontend: `asset('productos/' + producto.imagen)`.

---

## Configuración del Bot de Telegram

Ver documento completo: [TELEGRAM_BOT_PLAN.md](TELEGRAM_BOT_PLAN.md)

**Resumen rápido:**
1. Crear bot en BotFather → obtener TOKEN.
2. Poner `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET` en `.env`.
3. En producción registrar el webhook:
   ```
   POST https://api.telegram.org/bot{TOKEN}/setWebhook
   Body: { url: "https://dominio.com/api/telegram/webhook", secret_token: "..." }
   ```
4. Para desarrollo local: usar ngrok para exponer el puerto 8000.

---

## Hosting (Hostinger)

- El paquete de Telegram es PHP puro — funciona sin configuración especial.
- No se necesitan workers ni daemons.
- Queue connection: `database` (sin Redis ni Supervisor).
- HTTPS obligatorio para el webhook de Telegram.
- Correr `php artisan config:cache && php artisan route:cache` después de cada deploy.

---

## Solución de problemas comunes

| Problema | Solución |
|---|---|
| `Class not found` después de crear archivo | `composer dump-autoload` |
| Cambios de CSS no se ven | `npm run build` o reiniciar `npm run dev` |
| Ruta no encontrada | `php artisan route:clear` |
| El webhook de Telegram no responde | Verificar que la URL sea HTTPS y el secret coincida en `.env` y en el registro del webhook |
| Error 500 al aprobar venta | Revisar que la venta tenga destinatario, mensajero_cuenta y mensajero_tipo si `mensajero_monto > 0` |
| Venta bloqueada por `almacen_incompleto` | El almacén tiene productos sin precio en `producto_vendedors` |
| Imagen de producto no carga | Verificar que existe `php artisan storage:link` y la ruta en `public/productos/` |
