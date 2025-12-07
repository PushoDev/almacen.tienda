# Resources Directory Customization

This file contains customization settings specific to the resources directory of the almacen.tienda Laravel project.

## Directory Purpose
The resources directory contains all frontend and backend resources for the Laravel application:
- Views (Blade templates) for traditional server-side rendering
- Assets (CSS, JS, images) for the frontend
- Language files for localization
- JavaScript/TypeScript code for the Inertia React frontend

## Subdirectory Structure
- views/: Blade templates for server-rendered pages
- css/: Stylesheet files
- js/: JavaScript files for the React/Inertia application
- images/: Image assets
- lang/: Language files for localization

## Laravel Specifics
- Views use Laravel's Blade templating engine
- JavaScript assets are compiled using Vite (as seen in vite.config.ts)
- Use Laravel's asset() helper function for linking to resources
- Blade templates support inheritance and sections
- Components and slots can be used for reusable UI elements

## React/Inertia Integration
- The js/ directory contains a complete React application
- Uses Inertia.js to bridge Laravel backend with React frontend
- Implements modern React patterns with TypeScript
- Uses Vite for asset compilation and development server
- Includes comprehensive component library with shadcn/ui

## Asset Management
- Frontend assets are built using Vite with separate app.tsx and ssr.tsx entry points
- CSS is compiled and processed through the Vite pipeline
- Images and other static assets are served from the public directory
- The application supports both client-side and server-side rendering

## Working with Views
- Traditional Blade templates coexist with Inertia-powered React pages
- Blade templates may be used for initial page loads or specific server-rendered sections
- Follow Laravel's naming conventions (e.g., welcome.blade.php)
- Use Blade syntax for dynamic content where needed

## Localization
- Language files in the lang/ directory support multi-language features
- Follow Laravel's localization patterns and best practices
- Inertia pages can access localized content through props from Laravel controllers