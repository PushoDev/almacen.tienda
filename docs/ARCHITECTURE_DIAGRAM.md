# Architecture Diagram: Almacén Tienda

The following diagram illustrates the relationship between the main modules of the system and how data flows between them.

```mermaid
graph TB
    subgraph "Frontend (React 19 + Inertia)"
        UI["User Interface (Radix + Tailwind)"]
        Pages["Inertia Pages"]
        Hooks["Custom Hooks"]
    end

    subgraph "Backend (Laravel 12)"
        Routes["Inertia Routes"]
        Controllers["Controllers"]
        Services["Business Logic (Services)"]
        Models["Eloquent Models"]
    end

    subgraph "Core Business Entities"
        Inventory["Inventory (Products, Warehouses)"]
        Finance["Financials (Accounts, Movements, Currencies)"]
        Sales["Sales & POS"]
        Procurement["Purchases & Suppliers"]
    end

    subgraph "Data Storage"
        DB[("MySQL Database")]
        Storage["File Storage (Images, Barcodes)"]
    end

    UI --> Pages
    Pages <--> Routes
    Routes --> Controllers
    Controllers --> Services
    Services --> Models
    Models <--> DB
    Models --> Storage

    %% Module Relationships
    Sales --> Inventory : "Stock Decrement"
    Sales --> Finance : "Income Entry"
    Procurement --> Inventory : "Stock Increment"
    Procurement --> Finance : "Expense Entry"
    Inventory --> Finance : "Cost Reconciliation"
```

## Module Interaction Details

### 1. Sale Process Flow
1. **User** initiates sale in POS (Frontend).
2. **Controller** validates stock availability via `Producto` model.
3. **Transaction** starts in Database.
4. **Inventory** is decremented in specific Warehouse.
5. **Financial Movement** is created with balance tracking.
6. **Notification** sent if stock reaches low threshold.

### 2. Purchase & Costing
1. **Supplier** delivery received.
2. **Purchase Order** updated.
3. **Cost Distribution** service calculates unit landed cost.
4. **Product** average cost updated.
5. **Account** balance updated.
