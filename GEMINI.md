# GEMINI.md - Project Context for AI Assistant

This document provides a comprehensive overview of the `almacen.tienda` project, intended to serve as a foundational context for AI assistants.

## 🚀 Project Overview

**Project Name:** Almacén Tienda - Sistema de Gestión de Inventario

**Purpose:** A complete enterprise inventory management system designed to optimize product control, sales, purchases, and finances across multiple warehouses.

**Key Features:**
*   **Inventory Management:** Multi-warehouse support, barcode generation, stock control, categorization.
*   **Financial System:** Multi-currency support with automatic exchange rates, account management, detailed financial movements, financial reports.
*   **Point of Sale (POS):** Intuitive sales interface, multiple payment methods, customer management, invoicing.
*   **Purchase Management:** Supplier management, purchase orders, merchandise reception, cost and margin calculation.
*   **Access Control:** Role-based system (Admin, Moderator, Vendor), specific warehouse assignment, activity auditing.
*   **Reports & Analytics:** Interactive dashboard, detailed sales reports, cash closing control, data export (Excel, PDF).

**Technology Stack:**

*   **Backend:**
    *   **Framework:** Laravel 12 (PHP 8.2+)
    *   **Database:** MySQL 8.0+
    *   **Authentication:** Laravel Auth + Spatie Permission
    *   **Testing:** Pest PHP
    *   **Utilities:** Milon Barcode, Maatwebsite Excel, Barryvdh DOMPDF
*   **Frontend:**
    *   **Framework:** React 19
    *   **Language:** TypeScript
    *   **Routing:** Inertia.js
    *   **UI Components:** Radix UI
    *   **Styling:** Tailwind CSS v4
    *   **Charts:** Recharts
    *   **Build Tool:** Vite
    *   **Animations:** Motion + Animate.css

## 🏗️ Project Structure

The project follows a standard Laravel structure with a React frontend integrated via Inertia.js.

*   `app/`: Backend Laravel code (Controllers, Models, Services, Requests, Notifications).
*   `database/`: Database migrations, seeders, and factories.
*   `resources/js/`: Frontend React application (pages, components, hooks, layouts, types).
*   `routes/`: Application routes.
*   `public/`: Publicly accessible assets.
*   `tests/`: Pest PHP tests.

## ⚙️ Building and Running

### System Requirements

*   PHP: 8.2 or higher
*   Composer: 2.0+
*   Node.js: 18.0+
*   npm: 9.0+
*   MySQL: 8.0+
*   Web Server: Apache/Nginx

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd almacen.tienda
    ```
2.  **Configure Backend:**
    ```bash
    composer install
    cp .env.example .env
    php artisan key:generate
    # Edit .env for database configuration (DB_DATABASE, DB_USERNAME, DB_PASSWORD)
    php artisan migrate
    # php artisan db:seed (optional)
    ```
3.  **Configure Frontend:**
    ```bash
    npm install
    npm run dev
    ```
4.  **Start Development Server:**
    ```bash
    # Start all services (Laravel server, queue worker, Vite)
    composer run dev

    # Or manually:
    php artisan serve
    php artisan queue:listen --tries=1
    npm run dev
    ```
5.  **Create Admin User (Example):**
    ```bash
    php artisan tinker
    User::create([
        'name' => 'Administrador',
        'email' => 'admin@example.com',
        'password' => Hash::make('password')
    ])->assignRole('admin');
    ```

### Useful Development Commands

*   **Clean Cache:**
    ```bash
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear
    ```
*   **Format PHP Code:**
    ```bash
    php artisan pint
    ```
*   **Format JavaScript/TypeScript Code:**
    ```bash
    npm run format
    ```
*   **Run All Tests:**
    ```bash
    composer test
    ```
*   **Run Specific Test:**
    ```bash
    php artisan test --filter TestClassName
    ```
*   **Check TypeScript Types:**
    ```bash
    npm run types
    ```
*   **Lint Code:**
    ```bash
    npm run lint
    ```
*   **Build for Production:**
    ```bash
    npm run build
    ```

## 📐 Development Conventions

**Coding Standards:**
*   **PHP:** PSR-12 (enforced with `php artisan pint`).
*   **TypeScript:** ESLint + Prettier (enforced with `npm run format`).
*   **Commits:** Conventional Commits (e.g., `feat:`, `fix:`, `docs:`).

**Testing:**
*   Tests are written using Pest PHP.
*   New functionalities should include tests.
*   Commands available for running all tests, specific tests, and checking test coverage.

**Contribution Workflow:**
1.  Fork the project.
2.  Create a feature branch: `git checkout -b feature/new-feature`
3.  Descriptive commits.
4.  Push to the branch.
5.  Submit a Pull Request with a detailed description.

**Code Review:**
*   Code review is required for changes.
*   Verification of passing types and tests.
*   Documentation of complex changes.
*   Maintain backward compatibility.

**Issue Reporting:**
*   Detailed description of the problem.
*   Steps to reproduce.
*   Expected vs. actual behavior.
*   Environment information (PHP, Node.js, OS).
*   Screenshots if applicable.