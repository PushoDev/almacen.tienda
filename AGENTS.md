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

### UI Components (Shadcn)
```tsx
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

<Button variant="default" size="sm" className={cn('base', cond && 'extra')}>
    Click
</Button>;
```

### Laravel Eloquent
- Use `with()`, `load()` to avoid N+1 queries
- Use scopes for reusable queries
- Type hints on relationships
- `$fillable`, `$casts`, `$hidden` on models

## Structure
```
app/
├── Models/       # Eloquent models
├── Controllers/ # HTTP controllers
├── Requests/     # Form request validation
├── Services/     # Business logic
resources/js/
├── pages/        # Inertia pages
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
| Skill                    | Purpose                              |
| ------------------------ | ------------------------------------ |
| `/skill laravel-inertia-react` | Laravel + Inertia.js + React |
| `/skill shadcn-ui`      | Radix UI, React Hook Form + Zod     |
| `/skill laravel-specialist` | Eloquent, API Resources          |
