# AGENTS.md

Laravel 12 + React 19 + Inertia.js + Tailwind CSS v4 inventory management system.

**Cursor Rules**: See `.cursor/rules/` for additional patterns.

## Commands

### PHP/Laravel

```bash
# Development servers (runs all: Laravel, queue, Vite)
composer run dev        # Standard dev
composer run dev:ssr    # With SSR support

# Testing
php artisan test                       # Run all tests
php artisan test --filter TestClassName # Single test class
php artisan test --filter "test name"  # Single test method
php artisan test tests/Feature/        # Feature tests only
php artisan test tests/Unit/            # Unit tests only

# Code quality
php artisan pint        # Format code (PSR-12)
php artisan config:clear && php artisan cache:clear

# Database
php artisan migrate
php artisan migrate:fresh --seed
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
- **PHP Version**: 8.2+ - use typed properties, `readonly` when applicable
- **Testing**: Pest PHP (tests in Spanish)
- **PHPDoc**: Required on classes/methods with `@param`, `@return`
- **Validation**: Form Request classes for complex validation

**Naming**: Classes `PascalCase`, methods/variables `camelCase`, constants `UPPER_SNAKE_CASE`, tables/columns `snake_case`.

### TypeScript/React (Frontend)

- **Framework**: React 19, TypeScript, Inertia.js, Tailwind v4
- **Formatter**: Prettier (150 char width, single quotes, semicolons, 4-space tabs)
- **Linter**: ESLint + prettier integration
- **UI**: Radix UI / Shadcn with `cn()` utility
- **Notifications**: Sonner (`import { toast } from 'sonner'`)

**Naming**: Components `PascalCase`, hooks `useCamelCase`, types `PascalCase`, files `PascalCase.tsx`.

**Imports**: Use `@/` path alias (`@/components/ui/button`). Use `route()` from Ziggy for internal routes.

## Patterns

### Inertia + React

```tsx
import { Head, Link, useForm, usePage } from '@inertiajs/react';

// Page props typing
interface Props extends PageProps {
    categorias: { id: number; nombre: string }[];
}

export default function Create({ categorias }: Props) {
    const { data, setData, post, processing, errors } = useForm({ nombre: '' });
    // ...
}
```

### Form Handling

```tsx
const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('productos.store'), { onFinish: () => reset('password') });
};
```

### Controller Pattern

```php
public function store(StoreProductoRequest $request): RedirectResponse
{
    $producto = Producto::create($request->validated());
    return redirect()->route('productos.index')->with('success', 'Creado.');
}
```

### UI Components (Shadcn)

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

<Button variant="default" size="sm" className={cn('base-class', condition && 'conditional')}>
    Click me
</Button>;
```

### Laravel Eloquent

- Always use `with()`, `load()` to avoid N+1 queries
- Use scopes for reusable queries
- Type hints on relationships
- `$fillable`, `$casts`, `$hidden` on models

## Structure

```
app/
├── Models/          # Eloquent models
├── Controllers/     # HTTP controllers
├── Requests/        # Form request validation
├── Services/       # Business logic
resources/js/
├── pages/           # Inertia pages
├── components/      # React components
│   └── ui/         # Shadcn/Radix components
├── hooks/          # Custom hooks
└── types/          # TypeScript types
tests/
├── Feature/        # Feature tests
└── Unit/          # Unit tests
```

## Database Conventions

- Tables/columns: `snake_case`
- Timestamps: `created_at`, `updated_at`, `deleted_at` (soft deletes)
- Pivot tables: alphabetical order (`producto_vendedors`)
- Foreign keys: `{model}_id` (e.g., `categoria_id`)

## Security & Performance

- Validate input with Form Requests
- Use Gates/Policies for authorization
- Never commit secrets (.env, credentials)
- Eager load relationships to avoid N+1
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

## Error Handling

- **Backend**: Laravel exceptions, proper HTTP codes (400,401,403,404,422,500)
- **Frontend**: Inertia error handling, `errors` from `useForm`, toast notifications
- Use `try/catch` in services and bubble up exceptions with meaningful messages

## Available Skills

| Skill                          | Purpose                                    |
| ------------------------------ | ------------------------------------------ |
| `/skill laravel-inertia-react` | Laravel + Inertia.js + React patterns      |
| `/skill shadcn-ui`             | Radix UI components, React Hook Form + Zod |
| `/skill laravel-specialist`    | Eloquent optimizations, API Resources      |
