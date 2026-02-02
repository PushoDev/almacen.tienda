# Almacén Tienda - Sistema de Gestión de Inventario

Un sistema completo de gestión de inventario empresarial desarrollado con Laravel 12 y React 19, diseñado para optimizar el control de productos, ventas, compras y finanzas en múltiples almacenes.

## 🚀 Características Principales

### 📦 Gestión de Inventario

- **Multi-almacenes**: Gestiona inventario en múltiples ubicaciones
- **Códigos de barras**: Generación automática y gestión de códigos de barras
- **Control de stock**: Seguimiento detallado de entradas y salidas
- **Categorización**: Organización de productos por categorías y atributos

### 💰 Sistema Financiero

- **Multi-divisa**: Soporte para múltiples monedas con tasas de cambio automáticas
- **Gestión de cuentas**: Control de cuentas por tipo de moneda
- **Movimientos financieros**: Registro detallado de transacciones
- **Reportes financieros**: Análisis y auditoría completa

### 🛒 Punto de Venta (POS)

- **Ventas rápidas**: Interfaz intuitiva para procesar ventas
- **Múltiples métodos de pago**: Efectivo, tarjeta, transferencia, etc.
- **Gestión de clientes**: Base de datos de clientes con historial
- **Facturación**: Generación de facturas y comprobantes

### 🏢 Gestión de Compras

- **Proveedores**: Gestión completa de proveedores
- **Órdenes de compra**: Control del proceso de compras
- **Recepción de mercancía**: Validación y entrada de productos
- **Costos y márgenes**: Cálculo automático de ganancias

### 👥 Control de Acceso

- **Roles y permisos**: Sistema basado en roles (Admin, Moderator, Vendor)
- **Asignación por almacén**: Usuarios asignados a almacenes específicos
- **Auditoría**: Registro completo de actividades del sistema

### 📊 Reportes y Analíticas

- **Dashboard interactivo**: Visualización de datos en tiempo real
- **Reportes de ventas**: Análisis detallado de rendimiento
- **Control de cierres**: Gestión de cierres de caja diarios
- **Exportación de datos**: Exportación a Excel y PDF

## 🛠️ Stack Tecnológico

### Backend

- **Framework**: Laravel 12
- **PHP**: 8.2+
- **Base de datos**: MySQL
- **Autenticación**: Laravel Auth + Spatie Permission
- **Testing**: Pest PHP
- **Barcodes**: Milon Barcode
- **Excel**: Maatwebsite Excel
- **PDF**: Barryvdh DOMPDF

### Frontend

- **Framework**: React 19
- **Lenguaje**: TypeScript
- **Routing**: Inertia.js
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Build Tool**: Vite
- **Animations**: Motion + Animate.css

## 📋 Requisitos del Sistema

- **PHP**: 8.2 o superior
- **Composer**: 2.0+
- **Node.js**: 18.0+
- **npm**: 9.0+
- **MySQL**: 8.0+
- **Servidor Web**: Apache/Nginx

## 🚀 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd almacen.tienda
```

### 2. Configurar Backend

```bash
# Instalar dependencias de PHP
composer install

# Configurar variables de entorno
cp .env.example .env

# Generar clave de aplicación
php artisan key:generate

# Configurar base de datos en .env
DB_DATABASE=almacen_tienda
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Ejecutar migraciones
php artisan migrate

# Ejecutar seeders (opcional)
php artisan db:seed
```

### 3. Configurar Frontend

```bash
# Instalar dependencias de Node.js
npm install

# Compilar assets para desarrollo
npm run dev
```

### 4. Iniciar Servidor de Desarrollo

```bash
# Iniciar todos los servicios (servidor Laravel, queue worker, Vite)
composer run dev

# O iniciar manualmente cada servicio:
php artisan serve                    # Servidor Laravel
php artisan queue:listen --tries=1  # Worker de colas
npm run dev                         # Vite dev server
```

### 5. Crear Usuario Administrador

```bash
php artisan tinker
User::create([
    'name' => 'Administrador',
    'email' => 'admin@example.com',
    'password' => Hash::make('password')
])->assignRole('admin');
```

## 🏗️ Estructura del Proyecto

```
almacen.tienda/
├── app/                          # Backend Laravel
│   ├── Http/Controllers/         # Controladores HTTP
│   ├── Models/                   # Modelos Eloquent
│   ├── Services/                 # Lógica de negocio
│   ├── Requests/                 # Validación de formularios
│   └── Notifications/            # Notificaciones
├── database/
│   ├── migrations/               # Migraciones de base de datos
│   ├── seeders/                  # Datos de prueba
│   └── factories/                # Factories para testing
├── resources/
│   ├── js/                       # Frontend React
│   │   ├── pages/                # Páginas Inertia.js
│   │   ├── components/           # Componentes React
│   │   │   ├── ui/              # Componentes UI base
│   │   │   └── animated/        # Componentes animados
│   │   ├── hooks/               # Hooks personalizados
│   │   ├── layouts/             # Layouts de página
│   │   └── types/               # Definiciones TypeScript
│   └── views/                    # Vistas Blade
├── routes/                       # Rutas de la aplicación
├── storage/                      # Archivos storage
├── tests/                        # Tests (Pest PHP)
└── public/                       # Archivos públicos
```

## 🎯 Módulos Principales

### 📦 Productos (`/productos`)

- Gestión completa de catálogo de productos
- Generación automática de códigos de barras
- Control de precios y márgenes de ganancia
- Asignación a categorías y almacenes

### 🏪 Almacenes (`/almacenes`)

- Configuración de múltiples almacenes
- Control de inventario por ubicación
- Asignación de usuarios a almacenes
- Transferencias entre almacenes

### 💰 Ventas (`/ventas`)

- Punto de venta (POS) integrado
- Gestión de clientes y pedidos
- Múltiples métodos de pago
- Facturación y comprobantes

### 🛒 Compras (`/compras`)

- Gestión de proveedores
- Órdenes de compra
- Recepción de mercancía
- Control de costos

### 👥 Usuarios (`/usuarios`)

- Gestión de usuarios y roles
- Asignación de permisos
- Control de acceso a almacenes

### 📊 Reportes (`/reportes`)

- Dashboard con métricas clave
- Reportes de ventas y finanzas
- Análisis de inventario
- Exportación de datos

## 🔧 Comandos Útiles

### Desarrollo

```bash
# Iniciar servidor completo
composer run dev

# Limpiar caché
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Formatear código (PHP)
php artisan pint

# Formatear código (JavaScript/TypeScript)
npm run format
```

### Testing

```bash
# Ejecutar todos los tests
composer test

# Ejecutar test específico
php artisan test --filter TestClassName

# Ejecutar test con cobertura
php artisan test --coverage
```

### Base de Datos

```bash
# Fresh install con seeders
php artisan migrate:fresh --seed

# Crear nuevo modelo con migración
php artisan make:model Producto -m

# Crear nuevo controller
php artisan make:controller ProductoController --resource
```

### Frontend

```bash
# Verificar tipos TypeScript
npm run types

# Linting de código
npm run lint

# Build para producción
npm run build
```

## 🔐 Configuración de Roles

### Admin

- Acceso completo a todos los módulos
- Gestión de usuarios y permisos
- Configuración del sistema
- Acceso a todos los almacenes

### Moderator

- Gestión de productos y ventas
- Acceso a reportes
- Gestión limitada de usuarios
- Acceso asignado a almacenes específicos

### Vendor

- Punto de venta y gestión de ventas
- Gestión de clientes
- Acceso limitado a productos
- Solo su almacén asignado

## 📈 Monitoreo y Logging

- **Laravel Pail**: Logs en tiempo real
- **Queue Monitoring**: Monitor de tareas en background
- **Performance**: Optimización de consultas Eloquent
- **Error Handling**: Manejo centralizado de errores

## 🤝 Contribución

### Flujo de Trabajo

1. Fork del proyecto
2. Crear feature branch: `git checkout -b feature/nueva-funcionalidad`
3. Commits descriptivos: `git commit -m 'Agregar nueva funcionalidad'`
4. Push al branch: `git push origin feature/nueva-funcionalidad`
5. Pull Request con descripción detallada

### Estándares de Código

- **PHP**: PSR-12, usar `php artisan pint`
- **TypeScript**: ESLint + Prettier, usar `npm run format`
- **Commits**: Convencionales (feat:, fix:, docs:, etc.)
- **Tests**: Escribir tests para nueva funcionalidad

### Code Review

- Requerir revisión de código para cambios
- Verificar tipos y tests pasen
- Documentar cambios complejos
- Mantener compatibilidad con versiones anteriores

## 🐛 Reporte de Issues

### Información Requerida

- Descripción detallada del problema
- Pasos para reproducir
- Comportamiento esperado vs actual
- Ambiente (PHP, Node.js, Sistema Operativo)
- Screenshots si aplica

### Issues Comunes

- **N+1 Queries**: Revisar log de consultas
- **Memory Issues**: Monitorear uso de memoria
- **Frontend**: Verificar console del navegador
- **Backend**: Revisar logs de Laravel

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Autores

- **Desarrollador Principal** - [Tu Nombre]
- **Contribuidores** - [Lista de contribuidores]

## 🙏 Agradecimientos

- Laravel Framework por el excelente backend
- React y equipo de Inertia.js por el frontend moderno
- Tailwind CSS por el sistema de diseño
- Spatie por paquetes de calidad
- Comunidad de código abierto

---

**Para soporte técnico o preguntas, contacta a**: [tu-email@example.com]
