# AGENTS.md

This file contains guidelines and commands for agentic coding agents working in this Laravel + React inventory management system.

## Project Overview

Laravel 12 + React 19 + Inertia.js + Tailwind CSS v4 inventory management system (almacen.tienda). Manages products, sales, purchases, warehouses, vendors, and financial movements. Uses Pest PHP for testing, ESLint/Prettier for frontend formatting, Laravel Pint for backend.

## Build Commands

### PHP/Laravel Commands

```bash
# Development server
composer run dev  # Starts Laravel server, queue worker, and Vite dev server

# Testing
composer test     # Runs Pest tests with config clear
php artisan test  # Direct test command

# Single test execution
php artisan test --filter TestClassName
php artisan test --filter "test method name"

# Code quality
php artisan pint  # Laravel Pint formatter (PSR-12)

# Database
php artisan migrate
php artisan migrate:fresh --seed
php artisan db:seed

# Cache/config
php artisan config:clear
php artisan config:cache
php artisan route:clear
php artisan view:clear
```

### Frontend Commands

```bash
# Development
npm run dev       # Vite dev server
npm run build     # Production build
npm run build:ssr # SSR build

# Code quality
npm run lint      # ESLint with auto-fix
npm run format    # Prettier formatting
npm run format:check  # Check formatting
npm run types     # TypeScript type checking
```

## Code Style Guidelines

### PHP (Backend)

- **Framework**: Laravel 12 with PSR-12 coding standards
- **Formatter**: Laravel Pint (runs automatically with `php artisan pint`)
- **Testing**: Pest PHP (not PHPUnit)
- **Models**: Use Eloquent with proper relationships and type hints
- **Controllers**: Follow Laravel resource controller patterns
- **Validation**: Use Form Request classes for complex validation
- **Documentation**: Use PHPDoc blocks with proper `@var`, `@param`, `@return` annotations

#### PHP Naming Conventions

- Classes: `PascalCase` (e.g., `ProductoController`, `MovimientoFinanciero`)
- Methods: `camelCase` (e.g., `getProductosByAlmacen`, `calculateTotal`)
- Variables: `camelCase` (e.g., `$productoId`, `$totalVenta`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_WAREHOUSE_ID`)
- Database tables: `snake_case` (e.g., `producto_vendedors`, `movimiento_detalles`)

#### PHP Import Organization

```php
<?php

// External libraries (Laravel, third-party)
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;

// Internal App classes
use App\Models\Producto;
use App\Models\Almacen;
use App\Services\VentaService;
```

### TypeScript/React (Frontend)

- **Framework**: React 19 with TypeScript, Inertia.js, and Tailwind CSS
- **UI Library**: Radix UI components with custom styling
- **State Management**: React hooks and Inertia.js page props
- **Notifications**: Sonner toast notifications
- **Formatter**: Prettier with 150 character line width, single quotes, semicolons, 4-space tabs
- **Linter**: ESLint with React and TypeScript rules, auto-fix enabled

#### TypeScript Import Organization

```typescript
// External libraries (React, Inertia, third-party)
import { Head, useForm } from '@inertiajs/react';
import { DoorOpen, LoaderCircle } from 'lucide-react';
import { FormEventHandler } from 'react';

// Internal App components (absolute imports with @)
import { LiquidButton } from '@/components/animated/liquid-button';
import InputError from '@/components/input-error';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

// Types and interfaces
import type { LoginForm } from '@/types/forms';
import type { LoginProps } from '@/types/auth';
```

#### TypeScript Naming Conventions

- Components: `PascalCase` (e.g., `LiquidButton`, `ProductTable`)
- Hooks: `camelCase` with `use` prefix (e.g., `useMobile`, `useAppearance`)
- Types/Interfaces: `PascalCase` (e.g., `LoginForm`, `ProductData`)
- Variables/Functions: `camelCase` (e.g., `handleSubmit`, `productList`)
- Files: `PascalCase` for components, `camelCase` for utilities

### CSS/Tailwind

- **Framework**: Tailwind CSS v4 with custom configuration
- **Utilities**: Use Tailwind utility classes, avoid custom CSS when possible
- **Components**: Use `cn()` utility for conditional class merging
- **Animation**: Animate.css for page transitions, Motion library for micro-interactions

## File Structure Patterns

### Backend (Laravel)

```
app/
├── Models/           # Eloquent models with relationships
├── Controllers/      # HTTP controllers
├── Requests/         # Form request validation
├── Services/         # Business logic services
├── Notifications/    # Email/push notifications
├── Console/Commands/ # Artisan commands
```

### Frontend (React)

```
resources/js/
├── pages/            # Inertia.js page components
├── components/       # Reusable UI components
│   ├── ui/          # Base UI components (buttons, inputs, etc.)
│   └── animated/    # Animated components
├── hooks/           # Custom React hooks
├── layouts/         # Page layout components
└── types/           # TypeScript type definitions
```

## Error Handling

### Backend

- Use Laravel's built-in exception handling
- Create custom exceptions for business logic errors
- Return proper HTTP status codes (400, 401, 403, 404, 422, 500)
- Validate input using Form Requests with proper error messages

### Frontend

- Use Inertia.js error handling for server-side errors
- Display validation errors using `InputError` components
- Handle loading states with `processing` from `useForm`
- Use toast notifications (Sonner) for user feedback
- Import toast: `import { toast } from 'sonner';`

## Testing Guidelines

### Backend (Pest PHP)

- Write feature tests for all user-facing functionality
- Use factory classes for test data generation
- Test both success and failure scenarios
- Use descriptive test names in Spanish to match business domain

```php
it('puede crear un nuevo producto', function () {
    $producto = Producto::factory()->make();

    $response = $this->post('/productos', $producto->toArray());

    $response->assertRedirect();
    $this->assertDatabaseHas('productos', [
        'nombre' => $producto->nombre,
        'codigo' => $producto->codigo,
    ]);
});
```

### Frontend

- Test component rendering and user interactions
- Mock Inertia.js responses for isolated component testing
- Test form validation and error states
- Use React Testing Library for DOM testing

## Database Conventions

- Use `snake_case` for table and column names
- Include `created_at` and `updated_at` timestamps
- Use `deleted_at` for soft deletes when applicable
- Foreign keys follow pattern: `{table}_id`
- Pivot tables use alphabetical order: `producto_vendedors`, `user_almacens`

## Security Best Practices

- Validate all user input using Form Requests
- Use Laravel's built-in CSRF protection
- Implement proper authorization using Gates/Policies
- Sanitize output to prevent XSS attacks
- Use parameterized queries (Eloquent handles this automatically)
- Never commit sensitive data like API keys or passwords

## Performance Considerations

- Eager load relationships to prevent N+1 queries
- Use database indexes for frequently queried columns
- Implement caching for expensive operations
- Optimize frontend bundle size with code splitting
- Use React.memo for expensive components
- Implement pagination for large datasets

## Development Workflow

1. Run `composer run dev` for full-stack development
2. Use `php artisan pint` and `npm run format` before commits
3. Run `composer test` to ensure all tests pass
4. Check TypeScript types with `npm run types`
5. Test in different screen sizes (responsive design)
6. Verify dark/light theme functionality

## Common Patterns

### Form Handling (Frontend)

```typescript
const { data, setData, post, processing, errors } = useForm<LoginForm>({
    email: '',
    password: '',
    remember: false,
});

const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('login'), {
        onFinish: () => reset('password'),
    });
};
```

### Model Relationships (Backend)

```php
public function productos(): BelongsToMany
{
    return $this->belongsToMany(Producto::class, 'producto_vendedors')
        ->using(ProductoVendedor::class)
        ->withPivot('precio_venta', 'venta_ganancia');
}
```

### Component Structure (Frontend)

```typescript
export default function ComponentName({ prop }: Props) {
    // Hooks and state
    const [state, setState] = useState();

    // Event handlers
    const handleSubmit = () => {};

    // Render
    return (
        <div className="flex flex-col gap-4">
            {/* Component JSX */}
        </div>
    );
}
```
