# AGENTS.md

Laravel 12 + React 19 + Inertia.js + Tailwind CSS v4 inventory management system.

**Cursor Rules**: See `.cursor/rules/` for additional patterns.

## Commands

### PHP/Laravel

```bash
composer run dev        # Dev: Laravel + queue + Vite
composer run dev:ssr    # Dev with SSR support
composer run test       # Run tests (clears config first)

php artisan test                       # Run all tests
php artisan test --filter TestClassName # Single test class
php artisan test --filter "test name"  # Single test method
php artisan test tests/Feature/        # Feature tests only
php artisan test tests/Unit/           # Unit tests only

php artisan pint        # Format code (PSR-12)
php artisan migrate
php artisan migrate:fresh --seed
```

### Frontend

```bash
npm run dev         # Vite dev server
npm run build       # Production build
npm run build:ssr   # SSR build
npm run lint        # ESLint --fix
npm run format      # Prettier --write
npm run format:check # Check formatting
npm run types       # TypeScript check
```

## Code Style

### PHP (Backend)

- **Standard**: PSR-12 via Laravel Pint
- **PHP**: 8.2+ - typed properties, `readonly` when applicable
- **Testing**: Pest PHP (tests in Spanish)
- **Validation**: Form Request classes for complex validation
- **Naming**: Classes `PascalCase`, methods/variables `camelCase`, tables/columns `snake_case`

### TypeScript/React (Frontend)

- **Stack**: React 19, TypeScript, Inertia.js, Tailwind v4
- **Formatter**: Prettier (150 char, single quotes, semicolons, 4-space tabs)
- **UI**: Radix UI / Shadcn with `cn()` utility
- **Notifications**: Sonner (`import { toast } from 'sonner'`)
- **Naming**: Components `PascalCase`, hooks `useCamelCase`, files `PascalCase.tsx`
- **Imports**: `@/` path alias, `route()` from Ziggy

## Patterns

### Inertia + React

```tsx
import { Head, Link, useForm, usePage } from '@inertiajs/react';

interface Props extends PageProps {
    categorias: { id: number; nombre: string }[];
}

export default function Create({ categorias }: Props) {
    const { data, setData, post, processing, errors } = useForm({ nombre: '' });
    // ...
}
```

### Persistent Layouts

```tsx
// AppLayout.tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
    return <Layout>{children}</Layout>;
}

// Page.tsx
Page.layout = (page) => <AppLayout>{page}</AppLayout>;
```

### Form Handling

```tsx
const submit: FormEventHandler = (e) => {
    e.preventDefault();
    post(route('productos.store'), { onFinish: () => reset() });
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

### Flash Messages & Redirects

- Use `->with('success', 'message')` or `->with('error', 'message')` for flash data
- Access in React via `usePage().props.flash`

### UI Components (Shadcn)

```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

<Button variant="default" size="sm" className={cn('base', cond && 'extra')}>
    Click
</Button>;
```

### React Hook Form + Zod (Formularios complejos)

```tsx
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const schema = z.object({
    nombre: z.string().min(1, 'Requerido'),
    precio: z.coerce.number().positive(),
});

type FormData = z.infer<typeof schema>;

const {
    register,
    handleSubmit,
    formState: { errors },
} = useForm<FormData>({
    resolver: zodResolver(schema),
});
```

### Laravel Eloquent

- Use `with()`, `load()` to avoid N+1 queries
- Use scopes for reusable queries
- Type hints on relationships
- `$fillable`, `$casts`, `$hidden` on models

### Middleware

- `HandleInertiaRequests` for shared props (auth, flash messages)
- Share data via `$page.props` in `share()` method

## Structure

```
app/
├── Models/       # Eloquent models
├── Http/
│   ├── Controllers/ # HTTP controllers
│   └── Requests/     # Form request validation
├── Middleware/   # HandleInertiaRequests for shared props
├── Services/     # Business logic
└── Providers/   # App service providers
resources/js/
├── pages/        # Inertia pages (Pages/*.tsx)
├── components/   # React components (ui/ = Shadcn)
├── hooks/        # Custom hooks
└── types/        # TypeScript types
tests/
├── Feature/      # Feature tests
└── Unit/         # Unit tests
```

## Database Conventions

- Tables/columns: `snake_case`
- Timestamps: `created_at`, `updated_at`, `deleted_at` (soft deletes)
- Pivot tables: alphabetical (`producto_vendedors`)
- Foreign keys: `{model}_id` (e.g., `categoria_id`)

## Security & Performance

- Validate input with Form Requests
- Use Gates/Policies for authorization
- Never commit secrets (.env)
- Eager load relationships (N+1 prevention)
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
- Use `try/catch` in services with meaningful messages

## Available Skills

| Skill                          | Purpose                         |
| ------------------------------ | ------------------------------- |
| `/skill laravel-inertia-react` | Laravel + Inertia.js + React    |
| `/skill shadcn-ui`             | Radix UI, React Hook Form + Zod |
| `/skill laravel-specialist`    | Eloquent, API Resources         |

## File Patterns

- PHP: `app/**/*.php`, `routes/**/*.php`
- React/TS: `resources/js/**/*.tsx`, `resources/js/**/*.ts`
- Tests: `tests/Feature/*.php`, `tests/Unit/*.php`
