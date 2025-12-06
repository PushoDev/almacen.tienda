# Project Customization File

This file contains project-specific information and settings for Qwen Code Assistant.

## Project Information
- **Project Name**: almacen.tienda
- **Project Type**: Laravel PHP Application
- **Description**: This appears to be an inventory/e-commerce application (almacen.tienda translates to "warehouse.store")
- **Main Technologies**: PHP, Laravel, Composer, Node.js

## Project Structure
```
D:\APP_CREATED\PHP\almacen.tienda\
├───.github
├───app
├───bootstrap
├───config
├───database
├───docs
├───public
├───resources
├───routes
├───storage
├───tests
```

## Key Configuration Files
- composer.json: PHP dependencies
- package.json: Node.js dependencies
- artisan: Laravel CLI tool
- .env.example: Environment configuration example
- docker-compose.yml: Docker configuration

## Common Commands
- `php artisan serve`: Start development server
- `php artisan migrate`: Run database migrations
- `php artisan db:seed`: Seed the database
- `npm run dev`: Run development build
- `npm run build`: Build production assets

## Laravel-Specific Notes
- Use `php artisan` commands for Laravel-specific tasks
- Controllers are in `app/Http/Controllers`
- Models are in `app/Models`
- Views are in `resources/views`
- Migrations are in `database/migrations`

## Development Guidelines
- Follow PSR-12 coding standards for PHP
- Use Laravel's built-in features when possible
- Respect the MVC pattern
- Use Eloquent ORM for database interactions
- Leverage Laravel's authentication and authorization systems