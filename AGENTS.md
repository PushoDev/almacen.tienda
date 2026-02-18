# AGENTS.md

Laravel 12 + React 19 + Inertia.js + Tailwind CSS v4 inventory management system.

## Commands

### PHP/Laravel

```bash
composer run dev        # Laravel server + queue + Vite dev server
composer run dev:ssr    # Laravel server + queue + Vite + SSR dev server
composer test           # Pest tests with config clear
php artisan test       # Direct test command
php artisan test --filter TestClassName         # Single test class
php artisan test --filter "test method name"    # Single test
php artisan test tests/Feature/                 # Run feature tests
php artisan test tests/Unit/                    # Run unit tests
php artisan pint        # Laravel Pint formatter (PSR-12)
php artisan migrate
php artisan migrate:fresh --seed
php artisan config:clear && php artisan cache:clear
```

### Frontend

```bash
npm run dev       # Vite dev server
npm run build     # Production build
npm run build:ssr # SSR build
npm run lint      # ESLint with auto-fix
npm run format    # Prettier formatting
npm run format:check  # Check formatting without fixing
npm run types     # TypeScript type checking
```

## Code Style

### PHP (Backend)

- **Standard**: PSR-12 via Laravel Pint
- **Testing**: Pest PHP (Spanish test names)
- **Models**: Eloquent with type hints and relationships
- **Validation**: Form Request classes for complex validation
- **PHPDoc**: Required on all classes/methods with `@param`, `@return`

**Naming**: Classes `PascalCase`, methods/variables `camelCase`, constants `UPPER_SNAKE_CASE`, tables `snake_case`.

```php
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Producto;
use App\Services\VentaService;
```

**Model Structure**:

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Producto extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = ['nombre', 'codigo', 'precio'];
    protected $casts = ['precio' => 'decimal:2'];

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(Categoria::class);
    }
}
```

### TypeScript/React (Frontend)

- **Framework**: React 19 + TypeScript + Inertia.js + Tailwind v4
- **Formatter**: Prettier (150 char width, single quotes, semicolons, 4-space tabs)
- **Linter**: ESLint with auto-fix
- **UI**: Radix UI + `cn()` utility for conditional classes
- **Notifications**: Sonner (`import { toast } from 'sonner';`)

**Naming**: Components `PascalCase`, hooks `useCamelCase`, types `PascalCase`, files `PascalCase` for components.

```typescript
import { Head, useForm } from '@inertiajs/react';
import { LiquidButton } from '@/components/animated/liquid-button';
import type { LoginForm } from '@/types/forms';
```

## Patterns

### Form Handling

```typescript
const { data, setData, post, processing, errors, reset } = useForm<LoginForm>({
    email: '',
    password: '',
});

const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('login'), { onFinish: () => reset('password') });
};
```

### Model Relationships

```php
public function productos(): BelongsToMany
{
    return $this->belongsToMany(Producto::class, 'producto_vendedors')
        ->withPivot('precio_venta', 'venta_ganancia');
}
```

### Page Props

```typescript
import type { PageProps } from '@/types';

interface DashboardPageProps extends PageProps {
    productos: Producto[];
    ventas: Venta[];
}
```

### Toast Notifications

```typescript
import { toast } from 'sonner';

toast.success('Producto creado correctamente');
toast.error('Error al guardar');
toast.warning('Stock bajo');
```

## Structure

```
app/
├── Models/          # Eloquent models
├── Controllers/     # HTTP controllers
├── Requests/        # Form request validation
├── Services/        # Business logic
├── Providers/       # Service providers
├── Middleware/      # Custom middleware
resources/js/
├── pages/           # Inertia pages
├── components/
│   ├── ui/          # Radix UI components
│   └── animated/    # Animation components
├── hooks/           # Custom React hooks
└── types/           # TypeScript types
tests/
├── Feature/         # Feature tests
└── Unit/            # Unit tests
```

## Error Handling

- Backend: Laravel exceptions, proper HTTP codes (400,401,403,404,422,500), Form Request validation
- Frontend: Inertia error handling, `InputError` components, toast notifications
- Use `try/catch` in services and bubble up exceptions with meaningful messages

## Database

- Tables/columns: `snake_case`
- Timestamps: `created_at`, `updated_at`, `deleted_at` for soft deletes
- Pivot tables: alphabetical order (`producto_vendedors`)
- Foreign keys: `{model}_id` (e.g., `categoria_id`)

## Security

- Validate input with Form Requests
- Use Gates/Policies for authorization
- Never commit secrets (.env, credentials)
- Sanitize user input before database queries

## Performance

- Eager load relationships (`with()`, `load()`) to avoid N+1
- Use React.memo for expensive components
- Paginate large datasets (`paginate()`, `cursorPaginate()`)
- Use `select()` to fetch only needed columns

## Testing

### Pest PHP

```php
it('creates a product', function () {
    loginAsAdmin();

    $response = post(route('productos.store'), [
        'nombre' => 'Test Product',
        'precio' => 100.00,
    ]);

    $response->assertRedirect();
    $this->assertDatabaseHas('productos', ['nombre' => 'Test Product']);
});
```

### React Testing

- Use `@testing-library/react` for component tests
- Test user interactions, not implementation details
