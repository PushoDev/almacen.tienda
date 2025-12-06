# App Directory Customization

This file contains customization settings specific to the app directory of the almacen.tienda Laravel project.

## Directory Purpose
The app directory is the heart of a Laravel application, containing:
- Core application logic
- Controllers
- Models
- Services
- Utilities

## Typical Subdirectories
- Http/: Contains controllers, middleware, and requests
- Models/: Eloquent models representing database tables
- Services/: Business logic classes
- Console/: Artisan commands
- Providers/: Service providers
- Traits/: PHP traits for code reuse
- Helpers/: Helper functions

## Laravel Best Practices for App Directory
- Follow the MVC pattern
- Use proper namespaces
- Keep controllers thin, move business logic to services/models
- Use Laravel's built-in validation and authorization features
- Implement proper error handling
- Follow PSR-12 coding standards

## Common Patterns in This Project
- Controllers likely handle the e-commerce/inventory logic
- Models probably represent products, categories, orders, users
- Services may handle payment processing, inventory management
- Middleware might handle authentication, permissions