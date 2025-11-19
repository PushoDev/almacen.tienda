# Project: almacen.tienda (Inventory Management System)

## Project Overview
A Laravel-based inventory management system built as a React starter kit with TypeScript frontend. The system manages products, warehouses, accounts, and financial transactions with multi-currency support and comprehensive import/export functionality.

## Technology Stack
- **Backend**: Laravel 12.x (PHP 8.2+)
- **Frontend**: React 19.x with TypeScript
- **Database**: SQLite (default), with support for MySQL
- **Styling**: Tailwind CSS v4.x with Radix UI components
- **State Management**: Inertia.js
- **Build Tool**: Vite 6.x
- **Additional**: Laravel Excel for import/export, DomPDF for PDF generation

## Project Structure
```
D:\APP_CREATED\PHP\almacen.tienda\
├── app/                      # Application core
│   ├── Console/              # Artisan commands
│   ├── Exports/              # Excel export classes
│   ├── Http/                 # Controllers, middleware
│   ├── Imports/              # Excel import classes
│   ├── Models/               # Eloquent models
│   └── Providers/            # Service providers
├── bootstrap/                # Framework bootstrap files
├── config/                   # Laravel configuration
├── database/                 # Migrations, seeds, factories
├── docs/                     # Documentation files
├── public/                   # Web root
├── resources/                # Frontend assets
│   └── js/                   # React components
├── routes/                   # API and web routes
├── storage/                  # Storage for files and logs
├── tests/                    # Test files
├── .env.example             # Environment configuration template
├── composer.json            # PHP dependencies
├── package.json             # Node.js dependencies
├── vite.config.ts           # Vite build configuration
└── artisan                  # Laravel CLI tool
```

## Key Features
1. **Multi-Warehouse Management**: Track products across multiple warehouses
2. **Multi-Currency Support**: Financial transactions in different currencies with exchange rates
3. **Import/Export Functionality**: Excel-based product import/export with validation and statistics
4. **Inventory Tracking**: Real-time stock levels and movement tracking
5. **Account Management**: Financial accounts with balance calculations and currency conversion
6. **PDF Generation**: Export financial reports and inventory data to PDF
7. **Barcode Integration**: Product barcode generation and management

## Core Functionality
### Product Management
- CRUD operations for products
- Category management
- Multi-warehouse stock tracking
- Barcode generation
- Import/export via Excel

### Warehouse Management
- Multiple warehouse support
- Stock level tracking
- Inter-warehouse transfers
- Inventory reconciliation

### Financial Management
- Multi-currency support with exchange rates
- Account balance calculations
- Currency conversion for reporting
- Financial reporting features

### Import/Export System
The system has a robust import/export mechanism:
- **Export**: Filtered by warehouse with specific quantities
- **Import**: Validates data, creates new products, updates existing ones
- **Statistics**: Tracks created, updated, and skipped records
- **Security**: File size limits (5MB), type validation, transaction safety

## Recent Changes & Improvements
1. **Currency Conversion System**: Implemented proper multi-currency handling with exchange rates
2. **Enhanced Import/Export**: Improved UX with drag-and-drop, validation, and statistics
3. **Financial Reporting**: Added proper conversion to principal currency for accurate reporting
4. **UI/UX Improvements**: Modern UI with dark mode support and better feedback

## Development Commands
- `php artisan serve` - Start development server
- `npm run dev` - Start Vite development server
- `npm run build` - Build production assets
- `php artisan migrate` - Run database migrations
- `php artisan db:seed` - Seed database with sample data
- `npm run test` - Run tests

## Documentation Files
- `docs/IMPORT_EXPORT_PRODUCTOS.md` - Comprehensive import/export guide
- `docs/PLANTILLA_PRODUCTOS_EJEMPLO.md` - Template and usage examples
- `CAMBIOS_CALCULO_SALDO_TOTAL.txt` - Multi-currency implementation details
- `CAMBIOS_IMPORT_EXPORT_RESUMEN.txt` - Import/export feature summary

## Architecture Notes
- **Frontend Framework**: React with TypeScript using Inertia.js for SSR
- **UI Components**: Radix UI primitives with Tailwind CSS styling
- **Data Fetching**: Inertia.js for server-side data binding
- **State Management**: React hooks and Inertia's page props
- **Security**: Laravel's built-in authentication and authorization
- **Testing**: PestPHP for backend, with React testing capabilities

## Environment Configuration
The application uses a `.env` file based on `.env.example` with settings for:
- Database connection (SQLite default)
- Application URL and debugging
- Session and cache configuration
- Mail and queue settings
- AWS S3 for file storage (if needed)

## Performance Optimizations
- Batch processing for import operations (100 records at a time)
- Efficient database queries with proper indexing
- Asset optimization through Vite build process
- Lazy loading for UI components where applicable

## Security Considerations
- CSRF protection for all forms
- Input validation and sanitization
- File upload validation (type and size limits)
- Database transactions for import operations
- Proper error handling without exposing sensitive data

## Future Enhancements
Based on the documentation, planned enhancements include:
- Historical exchange rate tracking
- Currency fluctuation alerts
- Enhanced financial reporting
- Detailed currency conversion audit trails