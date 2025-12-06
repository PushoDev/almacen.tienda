# Resources Directory Customization

This file contains customization settings specific to the resources directory of the almacen.tienda Laravel project.

## Directory Purpose
The resources directory contains:
- Views (Blade templates)
- Assets (CSS, JS, images)
- Language files
- Other uncompiled resources

## Subdirectory Structure
- views/: Blade templates for the application
- css/: Stylesheet files
- js/: JavaScript files
- images/: Image assets
- lang/: Language files for localization

## Laravel Specifics
- Views use Laravel's Blade templating engine
- Assets are typically compiled using Laravel Mix or Vite (as seen in vite.config.ts)
- Use Laravel's asset() helper function for linking to resources
- Blade templates support inheritance and sections
- Components and slots can be used for reusable UI elements

## Working with Views
- Follow Laravel's naming conventions (e.g., welcome.blade.php)
- Use Blade syntax for dynamic content
- Organize views in subdirectories by feature/module
- Use layouts and components for consistency
- Leverage Laravel's form helpers and CSRF protection

## Asset Management
- Use Vite for asset compilation (based on vite.config.ts in the project)
- Import CSS and JS files according to Vite configuration
- Optimize images for web use
- Use Laravel's mix() or @vite directive for linking compiled assets