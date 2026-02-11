# Project Overview: Almacén Tienda

## 🎯 Purpose
Almacén Tienda is a comprehensive ERP (Enterprise Resource Planning) system specifically designed for inventory management, financial tracking, and point-of-sale (POS) operations. It is built to handle multi-warehouse environments with sophisticated financial reconciliation capabilities.

## 🚀 Key Modules

### 1. Inventory & Warehouse Management
- **Multi-Warehouse**: Full support for multiple physical locations.
- **Automated Barcodes**: Intelligent generation of EAN-128 barcodes based on product attributes (Name, Brand, Model, Capacity).
- **Stock Tracking**: Detailed history of stock movements including transfers between warehouses and "in transit" states.

### 2. Financial Ecosystem
- **Multi-Currency**: Integrated support for USD, CUP, and MLC with automated exchange rate history.
- **Account Management**: Monitoring of cash, bank, and digital accounts.
- **Reconciliation**: Detailed tracking of financial movements with before/after balance snapshots for total auditability.
- **Cierre de Caja**: Daily closures with detailed auditing of sales, payments, and discrepancies.

### 3. Sales & Purchases
- **POS (Point of Sale)**: Optimized interface for fast sales.
- **Procurement**: Management of suppliers, purchase orders, and cost distribution (calculating land costs).
- **Profit Tracking**: Automated calculation of gross and net profit margin per sale, considering exchange rate fluctuations.

### 4. Logistics & Security
- **Role-Based Access (RBAC)**: Admin, Moderator, and Vendor roles managed via Spatie Permissions.
- **Auditing**: Comprehensive logs of user activities and system changes.
- **Notifications**: System-wide notifications for low stock, large transactions, and system alerts.

## 💎 Design Philosophy
- **Rich User Experience**: High-density UI using Radix UI and Tailwind CSS v4.
- **Motion & Feedback**: Extensive use of micro-animations (Framer Motion, Animate.css) for a premium feel.
- **Data Integrity**: Heavy reliance on database transactions and balance tracking to ensure financial accuracy.
