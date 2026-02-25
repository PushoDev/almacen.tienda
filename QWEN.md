# Almacén Tienda - Context for AI Assistants

## Project Overview

**Almacén Tienda** is a comprehensive inventory management system built with **Laravel 12** and **React 19**, designed for multi-warehouse business operations. The application handles inventory control, sales (POS), purchases, financial management, and user access control.

### Core Features

- **Multi-warehouse Inventory**: Product tracking across multiple locations with barcode generation
- **Point of Sale (POS)**: Fast checkout with multiple payment methods and customer management
- **Financial System**: Multi-currency support with exchange rates, account management, transaction tracking
- **Purchase Management**: Supplier management, purchase orders, merchandise reception
- **Access Control**: Role-based permissions (Admin, Moderator, Vendor) with warehouse-specific assignments
- **Reports & Analytics**: Real-time dashboards, sales reports, export to Excel/PDF

## Technology Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| PHP | 8.2+ | Runtime |
| Laravel | 12.x | Framework |
| MySQL/SQLite | 8.0+ | Database |
| Pest PHP | 3.x | Testing |
| Spatie Permission | 6.x | Roles & Permissions |
| Inertia.js | 2.x | Server-driven SPA |
| Maatwebsite Excel | 3.x | Excel export/import |
| DOMPDF | 3.x | PDF generation |
| Milon Barcode | 12.x | Barcode generation |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI Framework |
| TypeScript | 5.9+ | Type safety |
| Tailwind CSS | 4.x | Styling |
| Radix UI | latest | Headless components |
| Inertia.js | 2.x | Routing & SSR |
| Vite | 7.x | Build tool |
| Recharts | 3.x | Charts & graphs |
| Sonner | 2.x | Toast notifications |
| Motion | 12.x | Animations |

## Project Structure

```
almacen.tienda/
├── app/
│   ├── Http/
│   │   ├── Controllers/      # HTTP controllers (AdminController, VentaController, etc.)
│   │   ├── Requests/         # Form request validation classes
│   │   └── Middleware/       # Custom middleware
│   ├── Models/               # Eloquent models (32 models including Venta, Producto, User, etc.)
│   ├── Services/             # Business logic services
│   ├── Policies/             # Authorization policies
│   ├── Enums/                # PHP enums
│   ├── Exports/              # Excel export classes
│   ├── Imports/              # Excel import classes
│   └── Notifications/        # Notification classes
├── database/
│   ├── migrations/           # Database migrations
│   ├── seeders/              # Database seeders
│   └── factories/            # Model factories for testing
├── resources/
│   ├── js/
│   │   ├── pages/            # Inertia.js page components
│   │   │   ├── auth/         # Authentication pages
│   │   │   ├── dashboard/    # Dashboard pages
│   │   │   ├── Vendor/       # POS/Vendor pages (Index.tsx, Show.tsx, Listado.tsx)
│   │   │   └── settings/     # Settings pages
│   │   ├── components/
│   │   │   ├── ui/           # Shadcn/Radix UI components
│   │   │   └── animated/     # Animated components
│   │   ├── hooks/            # Custom React hooks
│   │   ├── layouts/          # Page layouts
│   │   ├── types/            # TypeScript type definitions
│   │   └── lib/              # Utility functions
│   └── views/                # Blade templates
├── routes/
│   ├── web.php               # Main routes file
│   ├── empleados/            # Employee routes
│   ├── crud/                 # CRUD routes
│   ├── acciones/             # Action routes
│   └── shop/                 # Shop/POS routes
├── tests/
│   ├── Feature/              # Feature tests (Pest)
│   └── Unit/                 # Unit tests (Pest)
└── config/                   # Laravel configuration files
```

## Building and Running

### Development Setup

```bash
# Install PHP dependencies
composer install

# Install Node.js dependencies
npm install

# Setup environment
cp .env.example .env
php artisan key:generate

# Setup database (SQLite for development)
php artisan migrate

# Start development servers (Laravel + Queue + Vite)
composer run dev
```

### Key Commands

#### PHP/Laravel
```bash
composer run dev              # Laravel server + queue worker + Vite dev server
composer run dev:ssr          # Full stack with SSR
composer test                 # Run Pest tests with config clear
php artisan serve             # Start Laravel development server
php artisan queue:listen --tries=1  # Start queue worker
php artisan migrate           # Run database migrations
php artisan migrate:fresh --seed     # Fresh database with seeders
php artisan pint              # Format PHP code (PSR-12)
php artisan config:clear      # Clear configuration cache
php artisan route:clear       # Clear route cache
php artisan view:clear        # Clear view cache
php artisan make:model ModelName -m  # Create model with migration
php artisan make:controller ControllerName --resource  # Create resource controller
```

#### Frontend
```bash
npm run dev                   # Start Vite dev server
npm run build                 # Production build
npm run build:ssr             # SSR production build
npm run lint                  # ESLint with auto-fix
npm run format                # Prettier formatting
npm run format:check          # Check formatting without changes
npm run types                 # TypeScript type checking
```

#### Testing
```bash
composer test                          # Run all tests
php artisan test                       # Run all tests via artisan
php artisan test --filter TestName     # Run specific test
php artisan test tests/Feature/        # Feature tests only
php artisan test tests/Unit/           # Unit tests only
```

## Development Conventions

### PHP (Backend)

**Code Style:**
- Standard: **PSR-12** (enforced via Laravel Pint)
- PHP Version: **8.2+** (use typed properties, `readonly` when applicable)
- Naming: Classes `PascalCase`, methods/variables `camelCase`, constants `UPPER_SNAKE_CASE`, tables `snake_case`

**Documentation:**
- PHPDoc required on classes/methods with `@param` and `@return` tags
- Use Form Request classes for complex validation

**Example:**
```php
<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProductoRequest;
use App\Models\Producto;
use Illuminate\Http\RedirectResponse;

class ProductoController extends Controller
{
    /**
     * Store a newly created resource in storage.
     *
     * @param StoreProductoRequest $request
     * @return RedirectResponse
     */
    public function store(StoreProductoRequest $request): RedirectResponse
    {
        $producto = Producto::create($request->validated());
        return redirect()->route('productos.index')->with('success', 'Producto creado.');
    }
}
```

### TypeScript/React (Frontend)

**Code Style:**
- Formatter: **Prettier** (150 char width, single quotes, semicolons, 4-space tabs)
- Linter: **ESLint** with auto-fix
- Naming: Components `PascalCase`, hooks `useCamelCase`, types `PascalCase`, files `PascalCase`

**Imports:**
- Use `@/` path alias (e.g., `@/components/ui/button`, `@/types/models`)

**Form Handling Pattern:**
```typescript
import { useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

interface LoginForm {
    email: string;
    password: string;
}

const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
    email: '',
    password: '',
});

const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('login'), { onFinish: () => reset('password') });
};
```

**Page Props Pattern:**
```typescript
import { PageProps } from '@/types';
import { Producto, Venta } from '@/types/models';

interface DashboardPageProps extends PageProps {
    productos: Producto[];
    ventas: Venta[];
}

export default function Dashboard({ productos, ventas }: DashboardPageProps) {
    // ...
}
```

**UI Components:**
- Use Radix UI primitives via Shadcn components
- Use `cn()` utility for conditional class names
- Notifications via Sonner: `import { toast } from 'sonner';`

### Database Conventions

- Tables/columns: `snake_case`
- Timestamps: `created_at`, `updated_at`, `deleted_at` (for soft deletes)
- Pivot tables: alphabetical order (e.g., `producto_vendedors`)
- Foreign keys: `{model}_id` (e.g., `categoria_id`)

### Testing Practices

**Pest PHP (Spanish test names):**
```php
it('crea un producto correctamente', function () {
    loginAsAdmin();
    
    $response = post(route('productos.store'), [
        'nombre' => 'Producto Test',
        'precio' => 100.00,
    ]);
    
    $response->assertRedirect();
    $this->assertDatabaseHas('productos', ['nombre' => 'Producto Test']);
});
```

## Security & Performance

### Security
- Validate all input with Form Request classes
- Use Gates/Policies for authorization (Spatie Permission)
- Never commit secrets (.env, credentials, API keys)
- CSRF protection enabled by default

### Performance
- Eager load relationships (`with()`, `load()`) to avoid N+1 queries
- Use scopes for reusable query constraints
- Paginate large datasets (`paginate()`, `cursorPaginate()`)
- Use database indexes on frequently queried columns
- Cache expensive queries when appropriate

## Error Handling

### Backend
- Return proper HTTP status codes (400, 401, 403, 404, 422, 500)
- Use Form Request validation for automatic 422 responses
- Throw meaningful exceptions in services

### Frontend
- Use Inertia error handling with `InputError` components
- Display toast notifications for user feedback
- Wrap async operations in try/catch blocks

## Key Models

| Model | Description |
|-------|-------------|
| `Producto` | Product catalog with pricing |
| `Venta` | Sales transactions |
| `VentaDetalle` | Sale line items |
| `Compra` | Purchase orders |
| `Almacen` | Warehouse locations |
| `AlmacenProducto` | Warehouse-product inventory |
| `Cuenta` | Financial accounts |
| `Moneda` | Currencies with exchange rates |
| `User` | Application users |
| `Cliente` | Customer records |
| `Proveedor` | Supplier records |
| `Categoria` | Product categories |
| `MovimientoFinanciero` | Financial transactions |
| `CierreCaja` | Cash register closings |

## Role System

| Role | Permissions |
|------|-------------|
| **Admin** | Full access to all modules, user management, system configuration |
| **Moderator** | Product/sales management, reports, limited user management |
| **Vendor** | POS access, customer management, limited product access |

## Available Skills

Use `/skill` command for specialized assistance:

| Skill | Purpose |
|-------|---------|
| `/skill laravel-inertia-react` | Laravel + Inertia.js + React patterns |
| `/skill shadcn-ui` | Radix UI components, form handling |
| `/skill laravel-specialist` | Eloquent optimization, API Resources, Queues |

## Common Workflows

### Adding a New Feature

1. Create migration: `php artisan make:migration create_x_table`
2. Create model: `php artisan make:model ModelName -m`
3. Create controller: `php artisan make:controller ControllerName --resource`
4. Create Form Request: `php artisan make:request StoreModelNameRequest`
5. Add routes in appropriate route file
6. Create Inertia page component in `resources/js/pages/`
7. Write tests in `tests/Feature/`
8. Format code: `php artisan pint && npm run format`
9. Run tests: `composer test`

### Database Operations

```bash
# Create model with migration and factory
php artisan make:model ModelName -mf

# Create migration only
php artisan make:migration add_column_to_table --table=table_name

# Run migrations
php artisan migrate

# Rollback last batch
php artisan migrate:rollback

# Seed database
php artisan db:seed

# Fresh install with seeders
php artisan migrate:fresh --seed
```

## Environment Variables

Key `.env` configuration:

```env
APP_NAME="Almacén Tienda"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=sqlite
# Or MySQL:
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=almacen_tienda

SESSION_DRIVER=database
CACHE_STORE=database
QUEUE_CONNECTION=database
```

## Troubleshooting

### Common Issues

**N+1 Queries:**
- Check Laravel debugbar or query log
- Use `with()` for eager loading

**Memory Issues:**
- Use `cursorPaginate()` for large datasets
- Process in batches with `chunk()`

**Frontend Build Errors:**
- Clear cache: `rm -rf node_modules/.vite`
- Reinstall: `npm install`

**Backend Errors:**
- Clear caches: `php artisan optimize:clear`
- Check logs: `storage/logs/laravel.log`
