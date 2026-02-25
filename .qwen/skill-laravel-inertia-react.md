# Skill: laravel-inertia-react

## Descripción
Especializado en patrones de Laravel + Inertia.js + React para aplicaciones SPA monolíticas.

## Cuándo usar
- Crear páginas Inertia.js con React
- Manejar formularios con useForm hook
- Trabajar con rutas de Laravel desde frontend (Ziggy)
- Implementar autenticación y autorización
- Coordinar backend Laravel con frontend React

## Patrones comunes

### Formulario Inertia
```typescript
import { useForm, Head } from '@inertiajs/react';

const { data, setData, post, processing, errors, reset } = useForm({
  nombre: '',
  email: '',
  password: '',
});

const submit = (e: React.FormEvent) => {
  e.preventDefault();
  post(route('usuarios.store'), {
    onSuccess: () => reset('password'),
    onError: (errors) => console.error(errors),
  });
};
```

### Page Props con TypeScript
```typescript
import { PageProps } from '@/types';
import { User, Producto } from '@/types/models';

interface UsuariosIndexProps extends PageProps {
  usuarios: User[];
  productos: Producto[];
}

export default function UsuariosIndex({ usuarios, productos }: UsuariosIndexProps) {
  // ...
}
```

### Controller Laravel
```php
use Inertia\Inertia;
use App\Http\Requests\StoreUserRequest;

public function index()
{
    return Inertia::render('Usuarios/Index', [
        'usuarios' => User::with('roles')->get(),
    ]);
}

public function store(StoreUserRequest $request)
{
    User::create($request->validated());
    return redirect()->route('usuarios.index')
        ->with('success', 'Usuario creado correctamente');
}
```

### Rutas con Ziggy
```typescript
// Frontend
route('usuarios.index');
route('usuarios.show', { id: 1 });
route('usuarios.store');

// Backend
redirect()->route('usuarios.index');
```

### Shared Data (AppServiceProvider)
```php
Inertia::share([
    'flash' => [
        'success' => fn () => $request->session()->get('success'),
        'error' => fn () => $request->session()->get('error'),
    ],
    'auth.user' => fn () => $request->user(),
]);
```

### Manejo de errores
```typescript
// Frontend
{errors.nombre && (
  <InputError message={errors.nombre} />
)}

// Backend
return back()->withErrors([
  'email' => 'El email ya está registrado',
]);
```

## Archivos clave
- `resources/js/app.tsx` - Entry point
- `resources/js/pages/` - Páginas Inertia
- `app/Http/Controllers/` - Controladores
- `app/Http/Requests/` - Form Requests
- `routes/web.php` - Rutas web
