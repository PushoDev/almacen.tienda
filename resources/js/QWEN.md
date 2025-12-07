# Resources/JS Directory Customization

This file contains customization settings specific to the resources/js directory of the almacen.tienda Laravel project.

## Directory Purpose
The resources/js directory contains all frontend JavaScript/TypeScript code for the Laravel application:
- React components built with TypeScript
- Inertia.js integration for Laravel frontend
- UI components and design system
- Layout components
- Page components
- Custom hooks
- Type definitions
- Utility functions
- Asset files

## Component Architecture

### Component Organization
The components are organized into several key directories:

1. **UI Components** (`/components/ui`): Reusable UI components based on shadcn/ui
2. **Animated Components** (`/components/animated`): Components with motion and animation effects
3. **Business Components** (`/components/Ecommerce`): E-commerce specific components
4. **Layout Components** (`/components`): Application layout building blocks
5. **Hook Components** (`/hooks`): Custom React hooks

### UI Components
Located in `/components/ui`, these are foundational components that implement design system elements:
- Accordion, Alert, AlertDialog, Avatar, Badge, Breadcrumb
- Button, ButtonGroup, Calendar, Card, Checkbox, Collapsible
- Command, Cursor, Dialog, DropdownMenu, Select
- Input, InputGroup, Label, Field, Textarea
- Navigation components (NavigationMenu, Sidebar, Tabs, Tooltip)
- Data display components (Table, Chart, Pagination)
- Feedback components (Spinner, Skeleton, Sonner)

### Animated Components
Located in `/components/animated`, these provide enhanced user experience with motion:
- CounterNumber: Animated number counting effect
- FlipButton: 3D flip animation button
- LiquidButton: Liquid wave effect button
- PinList: Animated pin entry component
- Rolling: Rolling animation effects

### E-commerce Components
Located in `/components/Ecommerce`:
- StoreHeader: Navigation header for store
- StoreSelector: Component for selecting physical stores

### Layout Components
Key layout components in the main `/components` directory:
- AppShell: Main application shell container
- AppLayout: Standard application layout
- AppSidebar: Sidebar navigation component
- AppHeader: Application header with breadcrumbs
- AppContent: Main content area
- Breadcrumbs: Breadcrumb navigation

### Hook Components
Custom React hooks in the `/hooks` directory:
- useAppearance: Manages theme/light/dark mode settings
- useInitials: Generates user initials from name
- useMobile: Detects mobile viewports
- useMobileNavigation: Mobile navigation utilities

## Inertia.js Integration

### Application Setup
The application uses Inertia.js to provide a single-page application experience with Laravel:
- `app.tsx` - Main application entry point
- `ssr.tsx` - Server-side rendering setup
- `types/index.d.ts` - Type definitions for the application

### Page Structure
Pages are organized in the `/pages` directory:
- Auth pages (login, register, password reset)
- Dashboard and main application views
- CRUD operations for different entities (Almacenes, Categorias, Clientes, etc.)
- E-commerce functionality (Comprar, Vendor, Punto de Venta)
- Reporting and analytics views
- Settings and user management

### Layout System
The application uses a flexible layout system:
- AppLayout: Base application layout with sidebar and header
- AuthLayout: Authentication-specific layout
- Various layout templates in `/layouts`

## Styling and Theming
- Tailwind CSS for utility-first styling
- Shadcn/ui components for consistent design system
- Animate.css for additional animations
- Custom theme management through useAppearance hook
- Dark/light mode support

## TypeScript Usage
- Strict TypeScript configuration
- Comprehensive type definitions in `/types`
- Interface definitions for all major data structures
- Strict typing for components and hooks

## Key Libraries and Tools
- React 18 for component architecture
- Inertia.js for Laravel integration
- Vite for build tooling
- Tailwind CSS for styling
- Shadcn/ui for component library
- Radix UI for accessible base components
- Lucide React for icon system
- Recharts for data visualization
- Motion for animation capabilities

## File Structure Conventions
1. Components use PascalCase naming convention (e.g., `Button.tsx`)
2. Hooks use camelCase with 'use' prefix (e.g., `useAppearance.tsx`)
3. Pages use PascalCase and are organized by feature (e.g., `/pages/Clientes/Index.tsx`)
4. All components use TypeScript (.tsx extension)
5. Component exports follow default export pattern when appropriate

## Inertia.js Data Flow
1. Laravel controllers pass data to Inertia using `Inertia::render()`
2. Data is made available to React components via `usePage()` hook
3. Forms use Inertia's `useForm()` hook for seamless submission
4. Links between pages use Inertia's `Link` component for SPA navigation

## Component Reusability
The component structure is designed for maximum reusability:
- UI components are generic building blocks
- Layout components provide consistent structure
- Business components encapsulate specific functionality
- Hooks provide shared state logic
- All components follow consistent prop interfaces