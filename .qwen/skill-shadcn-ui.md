# Skill: shadcn-ui

## Descripción
Especializado en componentes Radix UI, React Hook Form + Zod, y patrones de UI modernos.

## Cuándo usar
- Crear/editar componentes UI con Radix UI primitives
- Implementar formularios con React Hook Form y validación Zod
- Trabajar con componentes shadcn (Button, Dialog, Collapsible, etc.)
- Estilizar con Tailwind CSS + cn() utility
- Manejar estados de formularios y validaciones

## Patrones comunes

### Componentes Radix UI
```typescript
import * as Dialog from '@radix-ui/react-dialog';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
```

### Formulario con validación
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

const schema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  email: z.string().email('Email inválido'),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

### Conditional classes con cn()
```typescript
import { cn } from '@/lib/utils';

<div className={cn(
  'bg-blue-500 text-white',
  isActive && 'bg-green-500',
  className
)} />
```

## Componentes disponibles
- Button, Input, Label, Textarea
- Dialog, AlertDialog
- Collapsible, Accordion
- Select, Checkbox, Switch
- Card, Separator, Badge
- Tooltip, Popover
- ScrollArea
- Toast/Sonner
