# AGENTS.md

Laravel 12 + React 19 + Inertia.js + Tailwind CSS v4 inventory management system.

## Commands

### PHP/Laravel

```bash
composer run dev        # Laravel server + queue + Vite dev server
composer test           # Pest tests with config clear
php artisan test       # Direct test command
php artisan test --filter TestClassName         # Single test class
php artisan test --filter "test method name"    # Single test
php artisan pint        # Laravel Pint formatter (PSR-12)
php artisan migrate
php artisan migrate:fresh --seed
```

### Frontend

```bash
npm run dev       # Vite dev server
npm run build     # Production build
npm run build:ssr # SSR build
npm run lint      # ESLint with auto-fix
npm run format    # Prettier formatting
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
const { data, setData, post, processing, errors } = useForm<LoginForm>({
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

## Structure

```
app/Models/, Controllers/, Requests/, Services/
resources/js/pages/, components/ui/, components/animated/, hooks/, types/
```

## Error Handling

- Backend: Laravel exceptions, proper HTTP codes (400,401,403,404,422,500), Form Request validation
- Frontend: Inertia error handling, `InputError` components, toast notifications

## Database

- Tables/columns: `snake_case`
- Timestamps: `created_at`, `updated_at`, `deleted_at` for soft deletes
- Pivot tables: alphabetical order (`producto_vendedors`)

## Security

- Validate input with Form Requests
- Use Gates/Policies for authorization
- Never commit secrets

## Performance

- Eager load relationships (avoid N+1)
- Use React.memo for expensive components
- Paginate large datasets
