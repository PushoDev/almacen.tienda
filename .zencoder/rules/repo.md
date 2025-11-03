---
description: Repository Information Overview
alwaysApply: true
---

# Sist-Glorieta - Laravel React Application

## Summary
Modern full-stack web application built with Laravel 12 and React 19. The application serves as a warehouse management system (Almacén) with a sophisticated frontend UI using TypeScript, TailwindCSS, and Shadcn components, combined with a robust PHP backend.

## Structure
The project follows a monolithic architecture with clear separation of concerns:

- **pp/** - Laravel application code (Console, Http Controllers, Models, Services, Exports, Imports)
- **esources/** - Frontend assets (CSS, JavaScript/TypeScript, and React views)
- **database/** - Database migrations, seeders, and factories
- **	ests/** - Test suites (Unit and Feature tests)
- **config/** - Application configuration files
- **public/** - Public web root
- **outes/** - Application route definitions
- **ootstrap/** - Application bootstrap files
- **storage/** - File storage and cache
- **docs/** - Documentation files

## Language & Runtime

**Languages**:
- PHP 8.2+ (Backend)
- TypeScript 5.7 (Frontend)
- React 19 (UI Framework)

**Build System**: 
- Vite 6 (Frontend build and dev server)
- Laravel Artisan (Backend)

**Package Managers**:
- Composer (PHP dependencies)
- npm (JavaScript dependencies)

## Dependencies

### Backend (PHP)

**Main Dependencies**:
- laravel/framework ^12.0 - Web application framework
- inertiajs/inertia-laravel ^2.0 - Server-side React component rendering
- laravel/tinker ^2.10.1 - Interactive PHP shell
- spatie/laravel-permission ^6.18 - Role and permission management
- barryvdh/laravel-dompdf ^3.1 - PDF generation
- maatwebsite/excel ^3.1 - Excel file handling
- milon/barcode ^12.0 - Barcode generation
- tightenco/ziggy ^2.4 - Route helper for frontend

**Development Dependencies**:
- pestphp/pest ^3.8 - Testing framework
- pestphp/pest-plugin-laravel ^3.2 - Pest Laravel plugin
- fakerphp/faker ^1.23 - Fake data generation
- laravel/pint ^1.18 - Code style fixer
- laravel/sail ^1.41 - Docker development environment
- barryvdh/laravel-ide-helper ^3.5 - IDE helper generation

### Frontend (JavaScript/TypeScript)

**Main Dependencies**:
- react 19 & react-dom 19 - UI library
- @inertiajs/react ^2.0 - Inertia adapter for React
- typescript ^5.7 - Language support
- vite ^6.0 - Build tool
- tailwindcss ^4.0 - Utility CSS framework
- @tailwindcss/vite ^4.0 - TailwindCSS Vite plugin
- @radix-ui/* - Headless UI component library (accordion, alert, avatar, checkbox, etc.)
- @headlessui/react ^2.2 - Headless UI components
- @tanstack/react-table ^8.21 - Advanced table component
- lucide-react ^0.475 - Icon library
- recharts ^2.15 - Chart library
- sonner ^2.0 - Toast notifications
- date-fns ^3.6 - Date utility library
- animate.css ^4.1 - Animation library
- motion ^12.19 - Animation framework
- next-themes ^0.4 - Theme management

**Development Dependencies**:
- @vitejs/plugin-react ^4.3 - Vite React plugin
- eslint ^9.17 - Code linting
- prettier ^3.4 - Code formatting
- typescript-eslint ^8.23 - TypeScript linting

## Build & Installation

### Prerequisites
- PHP 8.2 or higher
- Node.js 18+
- MySQL 5.7+
- Composer installed globally

### Installation Steps

`ash
# Clone repository
git clone <repository-url>
cd almacen.tienda

# Install PHP dependencies
composer install

# Install JavaScript dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate application key
php artisan key:generate

# Run database migrations
php artisan migrate

# Build frontend assets
npm run build

# For development with hot reload
npm run dev
`

### Build Commands

`ash
# Production build
npm run build

# Production build with SSR
npm run build:ssr

# Development server (with hot reload)
npm run dev

# Development with SSR
composer dev:ssr

# Format code with Prettier
npm run format

# Lint and fix code
npm run lint

# Type checking
npm run types
`

### Starting Development

`ash
# Start all services (server, queue, Vite)
composer dev

# Alternative: Run services separately
# Terminal 1: PHP server
php artisan serve

# Terminal 2: Queue listener
php artisan queue:listen --tries=1

# Terminal 3: Vite dev server
npm run dev
`

## Main Files & Entry Points

**Backend**:
- rtisan - Laravel command line interface
- pp/Http/Controllers/ - HTTP request handlers
- pp/Models/ - Eloquent ORM models
- pp/Services/ - Business logic services
- outes/web.php - Web route definitions
- outes/api.php - API route definitions

**Frontend**:
- esources/js/app.tsx - React application entry point
- esources/js/ssr.tsx - Server-side rendering entry point
- esources/js/Pages/ - React page components
- esources/css/app.css - Global styles with TailwindCSS
- ite.config.ts - Vite build configuration

**Database**:
- database/migrations/ - Schema migrations
- database/seeders/ - Database seeders
- database/factories/ - Model factories

## Testing

**Framework**: Pest PHP 3.8 (Laravel wrapper around PHPUnit)

**Test Structure**:
- 	ests/Unit/ - Unit tests for individual components
- 	ests/Feature/ - Feature/integration tests

**Test Configuration**: phpunit.xml
- Bootstrap: endor/autoload.php
- In-memory SQLite database for testing
- Code coverage source: pp/ directory
- Email driver: array
- Cache store: array

**Run Commands**:
`ash
# Run all tests
php artisan test

# Run specific test file
php artisan test tests/Feature/SomeTest.php

# Run tests with coverage
php artisan test --coverage
`

## Configuration Files

- .env.example - Environment variable template
- composer.json - PHP dependencies and scripts
- package.json - JavaScript dependencies and build scripts
- ite.config.ts - Vite build configuration
- 	sconfig.json - TypeScript configuration
- slint.config.js - ESLint configuration
- .prettierrc - Prettier formatting configuration
- phpunit.xml - PHPUnit/Pest test configuration
- components.json - Component library configuration

## Development Database

**Default Configuration** (from .env.example):
- Connection: MySQL
- Host: 127.0.0.1
- Port: 3306
- Database: sistalmacen
- Session Driver: Database
- Cache Store: Database
- Queue Connection: Database

## Key Features

- **Full-Stack React Integration**: Server-side rendered React components via Inertia.js
- **Type Safety**: Full TypeScript support on frontend
- **Modern UI**: Shadcn UI components with TailwindCSS
- **Excel & PDF Export**: File export capabilities
- **Barcode Generation**: Barcode support for inventory management
- **Role-Based Access Control**: Spatie permission package
- **Real-time Updates**: Database queue system for async operations
