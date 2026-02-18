# AGENTS.md

Laravel 12 + React 19 + Inertia.js + Tailwind CSS v4 inventory management system.

## Commands

### PHP/Laravel

```bash
composer run dev        # Laravel server + queue + Vite dev server
composer run dev:ssr    # Laravel server + queue + Vite + SSR dev server
composer test           # Pest tests with config clear
php artisan test                       # Run all tests
php artisan test --filter TestClassName # Single test class
php artisan test --filter "test name"   # Single test method
php artisan test tests/Feature/         # Feature tests only
php artisan test tests/Unit/           # Unit tests only
php artisan pint        # Format code (PSR-12)
php artisan migrate
php artisan migrate:fresh --seed
php artisan config:clear && php artisan cache:clear
```

### Frontend

```bash
npm run dev         # Vite dev server
npm run build       # Production build
npm run build:ssr   # SSR build
npm run lint        # ESLint with auto-fix
npm run format      # Prettier formatting
npm run format:check # Check formatting
npm run types       # TypeScript type checking
```

## Code Style

### PHP (Backend)

- **Standard**: PSR-12 via Laravel Pint
- **Testing**: Pest PHP (Spanish test names)
- **PHPDoc**: Required on classes/methods with `@param`, `@return`
- **Validation**: Form Request classes for complex validation

**Naming**: Classes `PascalCase`, methods/variables `camelCase`, constants `UPPER_SNAKE_CASE`, tables `snake_case`.

```php
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

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
- **Linter**: ESLint with auto-fix + prettier
- **UI**: Radix UI + `cn()` utility for conditional classes
- **Notifications**: Sonner (`import { toast } from 'sonner';`)

**Naming**: Components `PascalCase`, hooks `useCamelCase`, types `PascalCase`, files `PascalCase` for components.

```typescript
import { Head, useForm } from '@inertiajs/react';
import { toast } from 'sonner';
import type { PageProps } from '@/types';
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

### Page Props

```typescript
interface DashboardPageProps extends PageProps {
    productos: Producto[];
    ventas: Venta[];
}
```

## Structure

```
app/
├── Models/          # Eloquent models
├── Controllers/     # HTTP controllers
├── Requests/        # Form request validation
├── Services/        # Business logic
resources/js/
├── pages/           # Inertia pages
├── components/      # React components
├── hooks/           # Custom hooks
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

## Security & Performance

- Validate input with Form Requests
- Use Gates/Policies for authorization
- Never commit secrets (.env, credentials)
- Eager load relationships (`with()`, `load()`) to avoid N+1
- Paginate large datasets (`paginate()`, `cursorPaginate()`)

## Testing

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

## Skills Available

Use `/skill` command to activate patterns:

| Skill                          | Purpose                                       |
| ------------------------------ | --------------------------------------------- |
| `/skill laravel-inertia-react` | Laravel + Inertia.js + React patterns         |
| `/skill shadcn-ui`             | Radix UI components, React Hook Form + Zod    |
| `/skill laravel-specialist`    | Eloquent optimizations, API Resources, Queues |
