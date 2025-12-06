# Database Directory Customization

This file contains customization settings specific to the database directory of the almacen.tienda Laravel project.

## Directory Purpose
The database directory contains:
- Migrations (schema changes)
- Seeders (test data)
- Factories (model templates for testing)

## Subdirectories
- migrations/: Version control for database schema
- seeders/: Populate database with initial/fake data
- factories/: Define how to create models for testing

## Migration Best Practices
- Each migration should be focused on a single change
- Use php artisan make:migration for generating new migrations
- Name migrations descriptively (e.g., create_products_table)
- Always test migrations before applying to production
- Write both up() and down() methods properly
- Use Laravel's schema builder for database-agnostic code

## Seeder Best Practices
- Create realistic sample data for development
- Use factories to create consistent test data
- Organize seeders hierarchically (DatabaseSeeder calls others)
- Use php artisan db:seed to run seeders
- Differentiate between development and production seeds

## Factory Best Practices
- Define realistic default values for models
- Use states to create variations (e.g., active/inactive users)
- Use Faker for generating realistic fake data
- Use factories in tests to create test data quickly

## Common Database Considerations for E-commerce Application
- Product catalog tables (products, categories, variants)
- User management tables (users, roles, permissions)
- Order management tables (orders, order items, payments)
- Inventory tracking tables
- Customer address tables
- Shopping cart temporary storage
- Customer reviews and ratings
- Tax and shipping calculation tables