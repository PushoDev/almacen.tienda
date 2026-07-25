# Análisis BaseSolida y docs

**Session ID:** ses_06910f4a6ffe2tywT3WNvadK5c
**Created:** 7/24/2026, 9:41:16 PM
**Updated:** 7/24/2026, 9:59:02 PM

---

## User

Analiza este proyecto @BaseSolida-Proyecto.md, y lo ultimo que hicimos en @docs/ solo analiza no hagas mas nada

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.5s)

_Thinking:_

The user wants me to analyze the project based on the BaseSolida-Proyecto.md file and the docs/ directory. They specifically say "solo analiza no hagas mas nada" (just analyze, don't do anything else). Let me read the docs files to understand the project better.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/BaseSolida-Proyecto.md",
  "limit": 500,
  "offset": 1765
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/BaseSolida-Proyecto.md</path>
<type>file</type>
<content>
1765:                 "name": "aa9b7743db4a829ef0f862fa7b6a8ff2ea23b6",
1766:                 "type": "file"
1767:               },
1768:               {
1769:                 "name": "c518c5d36f3d40fb23a3a9e499a24cc912758c",
1770:                 "type": "file"
1771:               }
1772:             ]
1773:           },
1774:           {
1775:             "name": "2e",
1776:             "type": "directory",
1777:             "children": [
1778:               {
1779:                 "name": "68886d16b364f341c96ee0a54558f4835065a0",
1780:                 "type": "file"
1781:               },
1782:               {
1783:                 "name": "aa1150e529cea2ffa1ea248f9a5c07a0cfc4f8",
1784:                 "type": "file"
1785:               },
1786:               {
1787: 
1788: ...10218545 bytes truncated...
1789: 
1790: The tool call succeeded but the output was truncated. Full output saved to: /home/pushodev/.local/share/opencode/tool-output/tool_f94e284f8001J7yTS0Wk3m7xmX
1791: Use the Task tool to have explore agent process this file with Grep and Read (with offset/limit). Do NOT read the full file yourself - delegate to save context.
1792: ```
1793: 
1794: **Tool: filesystem_read_text_file**
1795: 
1796: **Input:**
1797: ```json
1798: {
1799:   "path": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/README.md"
1800: }
1801: ```
1802: 
1803: **Output:**
1804: ```
1805: # Almacén Tienda - Sistema de Gestión de Inventario
1806: 
1807: Un sistema completo de gestión de inventario empresarial desarrollado con Laravel 12 y React 19, diseñado para optimizar el control de productos, ventas, compras y finanzas en múltiples almacenes.
1808: 
1809: ## 🚀 Características Principales
1810: 
1811: ### 📦 Gestión de Inventario
1812: 
1813: - **Multi-almacenes**: Gestiona inventario en múltiples ubicaciones
1814: - **Códigos de barras**: Generación automática y gestión de códigos de barras
1815: - **Control de stock**: Seguimiento detallado de entradas y salidas
1816: - **Categorización**: Organización de productos por categorías y atributos
1817: 
1818: ### 💰 Sistema Financiero
1819: 
1820: - **Multi-divisa**: Soporte para múltiples monedas con tasas de cambio automáticas
1821: - **Gestión de cuentas**: Control de cuentas por tipo de moneda
1822: - **Movimientos financieros**: Registro detallado de transacciones
1823: - **Reportes financieros**: Análisis y auditoría completa
1824: 
1825: ### 🛒 Punto de Venta (POS)
1826: 
1827: - **Ventas rápidas**: Interfaz intuitiva para procesar ventas
1828: - **Múltiples métodos de pago**: Efectivo, tarjeta, transferencia, etc.
1829: - **Gestión de clientes**: Base de datos de clientes con historial
1830: - **Facturación**: Generación de facturas y comprobantes
1831: 
1832: ### 🏢 Gestión de Compras
1833: 
1834: - **Proveedores**: Gestión completa de proveedores
1835: - **Órdenes de compra**: Control del proceso de compras
1836: - **Recepción de mercancía**: Validación y entrada de productos
1837: - **Costos y márgenes**: Cálculo automático de ganancias
1838: 
1839: ### 👥 Control de Acceso
1840: 
1841: - **Roles y permisos**: Sistema basado en roles (Admin, Moderator, Vendor)
1842: - **Asignación por almacén**: Usuarios asignados a almacenes específicos
1843: - **Auditoría**: Registro completo de actividades del sistema
1844: 
1845: ### 📊 Reportes y Analíticas
1846: 
1847: - **Dashboard interactivo**: Visualización de datos en tiempo real
1848: - **Reportes de ventas**: Análisis detallado de rendimiento
1849: - **Control de cierres**: Gestión de cierres de caja diarios
1850: - **Exportación de datos**: Exportación a Excel y PDF
1851: 
1852: ## 🛠️ Stack Tecnológico
1853: 
1854: ### Backend
1855: 
1856: - **Framework**: Laravel 12
1857: - **PHP**: 8.2+
1858: - **Base de datos**: MySQL
1859: - **Autenticación**: Laravel Auth + Spatie Permission
1860: - **Testing**: Pest PHP
1861: - **Barcodes**: Milon Barcode
1862: - **Excel**: Maatwebsite Excel
1863: - **PDF**: Barryvdh DOMPDF
1864: 
1865: ### Frontend
1866: 
1867: - **Framework**: React 19
1868: - **Lenguaje**: TypeScript
1869: - **Routing**: Inertia.js
1870: - **UI Components**: Radix UI
1871: - **Styling**: Tailwind CSS v4
1872: - **Charts**: Recharts
1873: - **Build Tool**: Vite
1874: - **Animations**: Motion + Animate.css
1875: 
1876: ## 📋 Requisitos del Sistema
1877: 
1878: - **PHP**: 8.2 o superior
1879: - **Composer**: 2.0+
1880: - **Node.js**: 18.0+
1881: - **npm**: 9.0+
1882: - **MySQL**: 8.0+
1883: - **Servidor Web**: Apache/Nginx
1884: 
1885: ## 🚀 Instalación
1886: 
1887: ### 1. Clonar el repositorio
1888: 
1889: ```bash
1890: git clone <repository-url>
1891: cd almacen.tienda
1892: ```
1893: 
1894: ### 2. Configurar Backend
1895: 
1896: ```bash
1897: # Instalar dependencias de PHP
1898: composer install
1899: 
1900: # Configurar variables de entorno
1901: cp .env.example .env
1902: 
1903: # Generar clave de aplicación
1904: php artisan key:generate
1905: 
1906: # Configurar base de datos en .env
1907: DB_DATABASE=almacen_tienda
1908: DB_USERNAME=your_username
1909: DB_PASSWORD=your_password
1910: 
1911: # Ejecutar migraciones
1912: php artisan migrate
1913: 
1914: # Ejecutar seeders (opcional)
1915: php artisan db:seed
1916: ```
1917: 
1918: ### 3. Configurar Frontend
1919: 
1920: ```bash
1921: # Instalar dependencias de Node.js
1922: npm install
1923: 
1924: # Compilar assets para desarrollo
1925: npm run dev
1926: ```
1927: 
1928: ### 4. Iniciar Servidor de Desarrollo
1929: 
1930: ```bash
1931: # Iniciar todos los servicios (servidor Laravel, queue worker, Vite)
1932: composer run dev
1933: 
1934: # O iniciar manualmente cada servicio:
1935: php artisan serve                    # Servidor Laravel
1936: php artisan queue:listen --tries=1  # Worker de colas
1937: npm run dev                         # Vite dev server
1938: ```
1939: 
1940: ### 5. Crear Usuario Administrador
1941: 
1942: ```bash
1943: php artisan tinker
1944: User::create([
1945:     'name' => 'Administrador',
1946:     'email' => 'admin@example.com',
1947:     'password' => Hash::make('password')
1948: ])->assignRole('admin');
1949: ```
1950: 
1951: ## 🏗️ Estructura del Proyecto
1952: 
1953: ```
1954: almacen.tienda/
1955: ├── app/                          # Backend Laravel
1956: │   ├── Http/Controllers/         # Controladores HTTP
1957: │   ├── Models/                   # Modelos Eloquent
1958: │   ├── Services/                 # Lógica de negocio
1959: │   ├── Requests/                 # Validación de formularios
1960: │   └── Notifications/            # Notificaciones
1961: ├── database/
1962: │   ├── migrations/               # Migraciones de base de datos
1963: │   ├── seeders/                  # Datos de prueba
1964: │   └── factories/                # Factories para testing
1965: ├── resources/
1966: │   ├── js/                       # Frontend React
1967: │   │   ├── pages/                # Páginas Inertia.js
1968: │   │   ├── components/           # Componentes React
1969: │   │   │   ├── ui/              # Componentes UI base
1970: │   │   │   └── animated/        # Componentes animados
1971: │   │   ├── hooks/               # Hooks personalizados
1972: │   │   ├── layouts/             # Layouts de página
1973: │   │   └── types/               # Definiciones TypeScript
1974: │   └── views/                    # Vistas Blade
1975: ├── routes/                       # Rutas de la aplicación
1976: ├── storage/                      # Archivos storage
1977: ├── tests/                        # Tests (Pest PHP)
1978: └── public/                       # Archivos públicos
1979: ```
1980: 
1981: ## 🎯 Módulos Principales
1982: 
1983: ### 📦 Productos (`/productos`)
1984: 
1985: - Gestión completa de catálogo de productos
1986: - Generación automática de códigos de barras
1987: - Control de precios y márgenes de ganancia
1988: - Asignación a categorías y almacenes
1989: 
1990: ### 🏪 Almacenes (`/almacenes`)
1991: 
1992: - Configuración de múltiples almacenes
1993: - Control de inventario por ubicación
1994: - Asignación de usuarios a almacenes
1995: - Transferencias entre almacenes
1996: 
1997: ### 💰 Ventas (`/ventas`)
1998: 
1999: - Punto de venta (POS) integrado
2000: - Gestión de clientes y pedidos
2001: - Múltiples métodos de pago
2002: - Facturación y comprobantes
2003: 
2004: ### 🛒 Compras (`/compras`)
2005: 
2006: - Gestión de proveedores
2007: - Órdenes de compra
2008: - Recepción de mercancía
2009: - Control de costos
2010: 
2011: ### 👥 Usuarios (`/usuarios`)
2012: 
2013: - Gestión de usuarios y roles
2014: - Asignación de permisos
2015: - Control de acceso a almacenes
2016: 
2017: ### 📊 Reportes (`/reportes`)
2018: 
2019: - Dashboard con métricas clave
2020: - Reportes de ventas y finanzas
2021: - Análisis de inventario
2022: - Exportación de datos
2023: 
2024: ## 🔧 Comandos Útiles
2025: 
2026: ### Desarrollo
2027: 
2028: ```bash
2029: # Iniciar servidor completo
2030: composer run dev
2031: 
2032: # Limpiar caché
2033: php artisan config:clear
2034: php artisan route:clear
2035: php artisan view:clear
2036: 
2037: # Formatear código (PHP)
2038: php artisan pint
2039: 
2040: # Formatear código (JavaScript/TypeScript)
2041: npm run format
2042: ```
2043: 
2044: ### Testing
2045: 
2046: ```bash
2047: # Ejecutar todos los tests
2048: composer test
2049: 
2050: # Ejecutar test específico
2051: php artisan test --filter TestClassName
2052: 
2053: # Ejecutar test con cobertura
2054: php artisan test --coverage
2055: ```
2056: 
2057: ### Base de Datos
2058: 
2059: ```bash
2060: # Fresh install con seeders
2061: php artisan migrate:fresh --seed
2062: 
2063: # Crear nuevo modelo con migración
2064: php artisan make:model Producto -m
2065: 
2066: # Crear nuevo controller
2067: php artisan make:controller ProductoController --resource
2068: ```
2069: 
2070: ### Frontend
2071: 
2072: ```bash
2073: # Verificar tipos TypeScript
2074: npm run types
2075: 
2076: # Linting de código
2077: npm run lint
2078: 
2079: # Build para producción
2080: npm run build
2081: ```
2082: 
2083: ## 🔐 Configuración de Roles
2084: 
2085: ### Admin
2086: 
2087: - Acceso completo a todos los módulos
2088: - Gestión de usuarios y permisos
2089: - Configuración del sistema
2090: - Acceso a todos los almacenes
2091: 
2092: ### Moderator
2093: 
2094: - Gestión de productos y ventas
2095: - Acceso a reportes
2096: - Gestión limitada de usuarios
2097: - Acceso asignado a almacenes específicos
2098: 
2099: ### Vendor
2100: 
2101: - Punto de venta y gestión de ventas
2102: - Gestión de clientes
2103: - Acceso limitado a productos
2104: - Solo su almacén asignado
2105: 
2106: ## 📈 Monitoreo y Logging
2107: 
2108: - **Laravel Pail**: Logs en tiempo real
2109: - **Queue Monitoring**: Monitor de tareas en background
2110: - **Performance**: Optimización de consultas Eloquent
2111: - **Error Handling**: Manejo centralizado de errores
2112: 
2113: ## 🤝 Contribución
2114: 
2115: ### Flujo de Trabajo
2116: 
2117: 1. Fork del proyecto
2118: 2. Crear feature branch: `git checkout -b feature/nueva-funcionalidad`
2119: 3. Commits descriptivos: `git commit -m 'Agregar nueva funcionalidad'`
2120: 4. Push al branch: `git push origin feature/nueva-funcionalidad`
2121: 5. Pull Request con descripción detallada
2122: 
2123: ### Estándares de Código
2124: 
2125: - **PHP**: PSR-12, usar `php artisan pint`
2126: - **TypeScript**: ESLint + Prettier, usar `npm run format`
2127: - **Commits**: Convencionales (feat:, fix:, docs:, etc.)
2128: - **Tests**: Escribir tests para nueva funcionalidad
2129: 
2130: ### Code Review
2131: 
2132: - Requerir revisión de código para cambios
2133: - Verificar tipos y tests pasen
2134: - Documentar cambios complejos
2135: - Mantener compatibilidad con versiones anteriores
2136: 
2137: ## 🐛 Reporte de Issues
2138: 
2139: ### Información Requerida
2140: 
2141: - Descripción detallada del problema
2142: - Pasos para reproducir
2143: - Comportamiento esperado vs actual
2144: - Ambiente (PHP, Node.js, Sistema Operativo)
2145: - Screenshots si aplica
2146: 
2147: ### Issues Comunes
2148: 
2149: - **N+1 Queries**: Revisar log de consultas
2150: - **Memory Issues**: Monitorear uso de memoria
2151: - **Frontend**: Verificar console del navegador
2152: - **Backend**: Revisar logs de Laravel
2153: 
2154: ## 📝 Licencia
2155: 
2156: Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.
2157: 
2158: ## 👥 Autores
2159: 
2160: - **Desarrollador Principal** - [Tu Nombre]
2161: - **Contribuidores** - [Lista de contribuidores]
2162: 
2163: ## 🙏 Agradecimientos
2164: 
2165: - Laravel Framework por el excelente backend
2166: - React y equipo de Inertia.js por el frontend moderno
2167: - Tailwind CSS por el sistema de diseño
2168: - Spatie por paquetes de calidad
2169: - Comunidad de código abierto
2170: 
2171: ---
2172: 
2173: **Para soporte técnico o preguntas, contacta a**: [tu-email@example.com]
2174: 
2175: ```
2176: 
2177: ---
2178: 
2179: ## Assistant (Plan · DeepSeek V4 Flash Free · 182.3s)
2180: 
2181: _Thinking:_
2182: 
2183: The project is a Laravel 12 + React 19 inventory management system. Let me explore the codebase more thoroughly to provide a comprehensive analysis. Let me look at the key files and structure.
2184: 
2185: **Tool: task**
2186: 
2187: **Input:**
2188: ```json
2189: {
2190:   "description": "Explore Laravel backend structure",
2191:   "subagent_type": "explore",
2192:   "prompt": "Thoroughly explore the Laravel backend of this project at /mnt/datos/APP_CREATED/PHP/almacen.tienda. I need a comprehensive analysis. Do NOT modify any files.\n\nPlease examine and return:\n1. List all files in app/Models/ directory (just filenames)\n2. List all files in app/Http/Controllers/ directory (just filenames) \n3. Read the main routes file: routes/web.php (full content)\n4. Read routes/api.php if it exists\n5. Read app/Providers/AppServiceProvider.php\n6. List all migration files from database/migrations/ (just filenames)\n7. Read config/app.php (just providers and aliases sections)\n8. Read composer.json (full content)\n9. Check if there's a .gitignore file and read it\n10. Read the file .agent.md if it exists\n\nReturn ALL the content you find, do not summarize. This is for analysis purposes only."
2193: }
2194: ```
2195: 
2196: **Output:**
2197: ```
2198: <task id="ses_06b1d6948ffemmrLVJUjIOnpc4" state="completed">
2199: <task_result>
2200: Here is the comprehensive analysis of the Laravel backend for `almacen.tienda`:
2201: 
2202: ---
2203: 
2204: ## 1. Models (`app/Models/`) — 37 files
2205: 
2206: ```
2207: Almacen.php
2208: AlmacenProducto.php
2209: Categoria.php
2210: CierreCaja.php
2211: Cliente.php
2212: Compra.php
2213: CompraPago.php
2214: CompraProducto.php
2215: CostDistribution.php
2216: CostDistributionItem.php
2217: CostoHistorial.php
2218: Cuenta.php
2219: DestinatarioVenta.php
2220: HistorialComparacionMensual.php
2221: HistorialPrecioCosto.php
2222: HistorialStock.php
2223: HistorialTasaCambio.php
2224: Moneda.php
2225: Movimiento.php
2226: MovimientoDetalle.php
2227: MovimientoFinanciero.php
2228: MovimientoSeguimiento.php
2229: MovimientosPendiente.php
2230: PagoVenta.php
2231: PrecioHistorial.php
2232: Producto.php
2233: ProductoCodigo.php
2234: ProductoVendedor.php
2235: Proveedor.php
2236: TasaCambio.php
2237: TasaCambioMLC.php
2238: TipoMovimientoFinanciero.php
2239: TransaccionCuenta.php
2240: User.php
2241: UserAlmacen.php
2242: Venta.php
2243: VentaDetalle.php
2244: ```
2245: 
2246: ---
2247: 
2248: ## 2. Controllers (`app/Http/Controllers/`) — 27 entries (includes subdirs)
2249: 
2250: ```
2251: AdminController.php
2252: AlmacenController.php
2253: Api/                  (subdirectory)
2254: Auth/                 (subdirectory)
2255: CategoriaController.php
2256: CierreCajaController.php
2257: ClienteController.php
2258: CompraController.php
2259: Controller.php
2260: CuentaController.php
2261: DestinatarioVentaController.php
2262: EcommerceController.php
2263: LogisticaController.php
2264: MonedaController.php

(Showing lines 1765-2264 of 7279. Use offset=2265 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/PROJECT_OVERVIEW.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/PROJECT_OVERVIEW.md</path>
<type>file</type>
<content>
1: # Project Overview: Almacén Tienda
2: 
3: ## 🎯 Purpose
4: Almacén Tienda is a comprehensive ERP (Enterprise Resource Planning) system specifically designed for inventory management, financial tracking, and point-of-sale (POS) operations. It is built to handle multi-warehouse environments with sophisticated financial reconciliation capabilities.
5: 
6: ## 🚀 Key Modules
7: 
8: ### 1. Inventory & Warehouse Management
9: - **Multi-Warehouse**: Full support for multiple physical locations.
10: - **Automated Barcodes**: Intelligent generation of EAN-128 barcodes based on product attributes (Name, Brand, Model, Capacity).
11: - **Stock Tracking**: Detailed history of stock movements including transfers between warehouses and "in transit" states.
12: 
13: ### 2. Financial Ecosystem
14: - **Multi-Currency**: Integrated support for USD, CUP, and MLC with automated exchange rate history.
15: - **Account Management**: Monitoring of cash, bank, and digital accounts.
16: - **Reconciliation**: Detailed tracking of financial movements with before/after balance snapshots for total auditability.
17: - **Cierre de Caja**: Daily closures with detailed auditing of sales, payments, and discrepancies.
18: 
19: ### 3. Sales & Purchases
20: - **POS (Point of Sale)**: Optimized interface for fast sales.
21: - **Procurement**: Management of suppliers, purchase orders, and cost distribution (calculating land costs).
22: - **Profit Tracking**: Automated calculation of gross and net profit margin per sale, considering exchange rate fluctuations.
23: 
24: ### 4. Logistics & Security
25: - **Role-Based Access (RBAC)**: Admin, Moderator, and Vendor roles managed via Spatie Permissions.
26: - **Auditing**: Comprehensive logs of user activities and system changes.
27: - **Notifications**: System-wide notifications for low stock, large transactions, and system alerts.
28: 
29: ## 💎 Design Philosophy
30: - **Rich User Experience**: High-density UI using Radix UI and Tailwind CSS v4.
31: - **Motion & Feedback**: Extensive use of micro-animations (Framer Motion, Animate.css) for a premium feel.
32: - **Data Integrity**: Heavy reliance on database transactions and balance tracking to ensure financial accuracy.

(End of file - total 32 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/ESTADO_DESARROLLO.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/ESTADO_DESARROLLO.md</path>
<type>file</type>
<content>
1: # Estado del Desarrollo — almacen.tienda
2: 
3: > **Actualizar este archivo cada vez que se resuelva un bug, se complete una feature o aparezca algo nuevo.**
4: > Fecha de última actualización: 2026-07-24
5: 
6: ---
7: 
8: ## Rama activa
9: 
10: `feature/bot-telegram`
11: 
12: ---
13: 
14: ## ✅ Módulos completos y estables
15: 
16: | Módulo | Descripción |
17: |---|---|
18: | Productos | CRUD, códigos de barras automáticos, import/export Excel, historial de costos |
19: | Almacenes | CRUD, inventario por almacén, asignación de usuarios |
20: | Compras | Registro, pagos múltiples, distribución de costos, relación proveedor/cliente |
21: | Movimientos de stock | Traslados entre almacenes, estados, discrepancias, auditoría |
22: | Categorías / Proveedores / Clientes | CRUD completo |
23: | Cuentas financieras | CRUD, control de saldo con contraseña, tipos de instrumento |
24: | Monedas y tasas | CRUD, historial de cambio de tasa, impacto en cuentas |
25: | Transacciones financieras | Gastos, ingresos, transferencias bidireccionales |
26: | Reportes | Inventario, ventas, compras, ganancias, historial, rastreo |
27: | API pública | Catálogo sin autenticación (`/api/tienda/*`) |
28: | Notificaciones | Base de datos, bell en UI, lectura y marcado |
29: | Ecommerce (básico) | Vista de catálogo pública — en desarrollo |
30: 
31: ---
32: 
33: ## ✅ Módulo de Ventas — Implementado
34: 
35: | Feature | Estado |
36: |---|---|
37: | POS — crear venta con carrito | ✅ |
38: | Multi-moneda en pagos | ✅ |
39: | Comisión vendedor por item | ✅ |
40: | Venta especial (precio bajo mínimo) | ✅ |
41: | Aprobación/rechazo venta especial | ✅ |
42: | Venta con gestor (intermediario) | ✅ |
43: | Pago a cliente (deuda diferida) | ✅ |
44: | Edición de venta pendiente | ✅ |
45: | Anulación con motivo y reversión | ✅ |
46: | Mensajero multi-moneda en POS | ✅ (2026-06-25) |
47: | Monto final CUP editable en Show | ✅ (2026-06-28) |
48: | Validaciones al aprobar (mensajero) | ✅ (2026-06-28) |
49: | Widget TasasFlotante global | ✅ (2026-06-28) |
50: | Destinatario de venta | ✅ |
51: | Listado de ventas con filtros | ✅ |
52: 
53: ---
54: 
55: ## ✅ Módulo de Cierre de Caja — Implementado
56: 
57: | Feature | Estado |
58: |---|---|
59: | Cálculo de saldo esperado | ✅ |
60: | Separación mensajero del saldo | ✅ (2026-06-28) |
61: | Snapshot de cuentas y clientes | ✅ |
62: | Snapshot de mensajero | ✅ (2026-07-01) |
63: | Resumen financiero del turno (tarjeta verde) | ✅ (2026-07-01) |
64: | Desglose per-venta comisión PV y Gestor | ✅ (2026-07-01) |
65: | Mensajero en modal "Por dónde entraron" | ✅ (2026-07-01) |
66: | Comparativa con cierre anterior | ✅ |
67: | Vista Create.tsx actualizada | ✅ |
68: | Vista Show.tsx actualizada | ✅ |
69: 
70: ---
71: 
72: ## ✅ Bot de Telegram — Implementado (rama feature/bot-telegram)
73: 
74: | Feature | Estado |
75: |---|---|
76: | Infraestructura: paquete, webhook, secret | ✅ |
77: | Campo `telegram_chat_id` en usuarios | ✅ |
78: | Comando `/vincular CODIGO` | ✅ |
79: | Comando `/start` | ✅ |
80: | Comando `/reporte` | ✅ |
81: | Comando `/cierres` | ✅ |
82: | Comando `/ayuda` | ✅ |
83: | Notificación cierre de caja | ✅ |
84: | Notificación venta especial + botones Aprobar/Rechazar | ✅ |
85: | Notificación decisión venta especial al vendedor | ✅ (database only) |
86: | Notificación venta creada | ✅ |
87: | Notificación movimiento de stock | ✅ |
88: | Notificación cambio precio vendedor | ✅ |
89: | Notificación movimiento financiero | ✅ |
90: 
91: ---
92: 
93: ## 🐛 Bugs conocidos pendientes
94: 
95: ### VentaController
96: 
97: | ID | Método | Descripción | Impacto |
98: |---|---|---|---|
99: | **B1** | `guardarDistribucion` (~L1759) | Devuelve `saldo_actual` en la respuesta pero el campo real del modelo es `saldo_cuenta` | UI muestra saldo incorrecto en el modal de distribución |
100: | **B2** | `aprobarVenta` + `anularVenta` | Falta guardia XOR: el bloque de comisión vendedor no tiene `&& !$venta->es_venta_gestor` | Doble débito potencial si gestor y comisión PV están ambos configurados |
101: | **B3** | `procesarVenta` (~L803) | `foreach ($validatedData['pagos'] as $pago)` sin `?? []` | Crash si el frontend envía `pagos: null` |
102: 
103: ### Mensajero
104: 
105: | ID | Módulo | Descripción | Impacto |
106: |---|---|---|---|
107: | **B4** | `AlmacenController@edit` | Carga todas las cuentas (USD, CUP, MLC mezcladas) en el selector de cuenta mensajero | El usuario puede seleccionar una cuenta no-CUP y romper la lógica |
108: | **B5** | Config mensajero | La cuenta de mensajero se configura en `Almacenes → Edit`. Debería estar en `Empleados → Edit` | UX confusa, admin tiene que ir a dos lugares |
109: 
110: ---
111: 
112: ## 🔧 Features pendientes
113: 
114: ### Show.tsx (Vendor/Show.tsx)
115: 
116: | ID | Descripción | Prioridad |
117: |---|---|---|
118: | **F1** | Selector XOR visual `[● Punto de Venta] / [○ Gestor]` en el panel de distribución. Actualmente el modo se infiere implícitamente de los campos en DB, lo que puede causar confusión | Alta |
119: | **F2** | Display mensajero multi-moneda completo — la interfaz TypeScript y el display deben soportar cualquier moneda del sistema, no solo USD/CUP | Media |
120: 
121: ### Empleados
122: 
123: | ID | Descripción | Prioridad |
124: |---|---|---|
125: | **F3** | Mover configuración de cuenta mensajero de `Almacenes/Edit` a `Empleados/Edit` — el admin asigna el almacén y configura la cuenta mensajero en el mismo formulario | Media |
126: 
127: ### Ganancia
128: 
129: | ID | Descripción | Prioridad |
130: |---|---|---|
131: | **F4** | `ganancia_real_total` muestra 0 en algunos casos — separar correctamente el cálculo | Media |
132: 
133: ---
134: 
135: ## 📋 Pendientes menores conocidos
136: 
137: - [ ] Validar que `anularVenta` desde estado `rechazada` no revierta el stock dos veces (el stock ya fue revertido por `rechazarSolicitudEspecial`). Verificar si la UI expone ese botón para ventas rechazadas.
138: - [ ] El commando `/reporte` del bot no filtra por almacén del usuario — devuelve todos los almacenes. Considerar filtro para admins con almacenes asignados.
139: - [ ] Ecommerce: vista pública del catálogo está en desarrollo, no vinculada al POS.
140: - [ ] **Reportes** — Revisar que todas las sub-rutas de `/reportes/*` funcionen y devuelvan datos correctos (productos-mas-comprados, compras-por-periodo, balance-gastos-mensuales, inventario-por-almacen, inventario-detallado-por-almacen, reporte-stock-bajo, valor-inventario, productos-mas-vendidos, ventas-por-periodo, ventas-por-vendedor, reporte-ganancias, rastreo-operaciones, historial-precios, historial-costo-precio, movimientos-financieros).
141: 
142: ---
143: 
144: ## 📁 Archivos clave por módulo
145: 
146: ### Ventas
147: ```
148: app/Http/Controllers/VentaController.php     ← controlador principal (más de 1800 líneas)
149: app/Models/Venta.php
150: app/Models/VentaDetalle.php
151: app/Models/PagoVenta.php
152: resources/js/pages/Vendor/Index.tsx          ← POS
153: resources/js/pages/Vendor/Show.tsx           ← gestión de venta pendiente
154: resources/js/pages/Vendor/Listado.tsx        ← listado con filtros
155: ```
156: 
157: ### Cierre de Caja
158: ```
159: app/Http/Controllers/CierreCajaController.php
160: app/Models/CierreCaja.php
161: resources/js/pages/Cierres/Create.tsx
162: resources/js/pages/Cierres/Show.tsx
163: ```
164: 
165: ### Bot Telegram
166: ```
167: app/Http/Controllers/TelegramWebhookController.php
168: app/Channels/TelegramChannel.php
169: app/Notifications/CierreCajaNotification.php
170: app/Notifications/VentaEspecialSolicitudNotification.php
171: app/Notifications/VentaEspecialDecisionNotification.php
172: app/Notifications/VentaCreadaNotification.php
173: app/Notifications/MovimientoStockNotification.php
174: app/Notifications/MovimientoFinancieroNotification.php
175: app/Notifications/CambioPrecioVendedorNotification.php
176: config/telegram.php
177: routes/api.php                               ← ruta /telegram/webhook
178: ```
179: 
180: ### Precios por vendedor
181: ```
182: app/Http/Controllers/ProductoVendedorController.php
183: app/Exports/PreciosVendedorExport.php
184: app/Imports/PreciosVendedorImport.php
185: resources/js/pages/Productos/Vendor/Index.tsx
186: ```
187: 
188: ### Usuarios y empleados
189: ```
190: app/Http/Controllers/UserController.php
191: app/Http/Controllers/UserAlmacenController.php
192: resources/js/pages/Empleados/Index.tsx
193: resources/js/pages/Empleados/Create.tsx
194: resources/js/pages/Empleados/Edit.tsx
195: ```
196: 
197: ---
198: 
199: ## 🔄 Historial de cambios recientes
200: 
201: | Fecha | Cambio |
202: |---|---|
203: | 2026-07-15 | `color_producto` añadido a tabla/tooltip en Productos, Movimientos, Compras y todas las vistas donde aparecía el producto |
204: | 2026-07-15 | `CompraController::show()` implementado — historial de compras recientes en `Comprar/Index`, vista detalle `Comprar/Show`. Fix: parámetro renombrado a `$comprar` para que el route model binding de `{comprar}` funcione correctamente |
205: | 2026-07-24 | Columnas **Marca, Modelo, Capacidad, Color** agregadas al Excel de export/import de precios (`PreciosVendedorExport`, `PreciosVendedorImport`). `UserController`: filtrado de cuentas para empleados solo `permanentes` |
206: | 2026-07-01 | Snapshot de mensajero en cierre_cajas, resumen financiero turno, desglose comisiones PV/Gestor |
207: | 2026-06-28 | `mensajero_monto_final_cup` editable, TasasFlotante global, validaciones mensajero en aprobar |
208: | 2026-06-25 | Mensajero multi-moneda en POS (selector moneda + tasa + equivalente USD) |
209: | 2026-06-23 | Lógica financiera unificada mensajero (propio/externo, USD/CUP) |
210: | 2026-06-22 | Migraciones mensajero en ventas y almacens |
211: | 2026-06-02 | Bot Telegram: infraestructura, webhook, notificaciones, comandos |
212: | 2026-05-30 | Refactor producto_vendedors (único por almacén), comisión en precio_historials |
213: | 2026-05-29 | Venta especial: campos de estado, flujo admin Telegram |
214: | 2026-05-25 | Comisión vendedor por item (`comision_unitaria`), tracking `total_comision` |
215: | 2026-05-21 | Códigos de barras en ventas, fixes de flujo |

(End of file - total 215 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/TECHNICAL_ANALYSIS.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/TECHNICAL_ANALYSIS.md</path>
<type>file</type>
<content>
1: # Technical Analysis: Almacén Tienda
2: 
3: ## 🛠 Stack Tecnológico
4: 
5: ### Backend (Laravel 12)
6: - **Engine**: PHP 8.2+
7: - **Architecture**: Service-Controller-Model pattern.
8: - **Key Packages**:
9:     - `spatie/laravel-permission`: For RBAC.
10:     - `inertiajs/inertia-laravel`: Glue between Laravel and React.
11:     - `milon/barcode`: For DNS1D barcode generation.
12:     - `barryvdh/laravel-dompdf` & `maatwebsite/excel`: For reporting.
13: - **Testing**: pestphp for modern, expressive testing.
14: 
15: ### Frontend (React 19)
16: - **Framework**: React 19 + TypeScript.
17: - **State/Routing**: Inertia.js (eliminates the need for a separate API layer for the main app).
18: - **UI Components**:
19:     - `Radix UI`: For accessible, unstyled primitives.
20:     - `Tailwind CSS v4`: Latest styling engine.
21:     - `Lucide React`: For consistent iconography.
22: - **Charts**: `Recharts` for sophisticated financial visualization.
23: 
24: ## 🏗 Architectural High-level
25: 
26: ### Financial Integrity Model
27: The system implements a **Balance Tracking** pattern in `MovimientoFinanciero`. Every movement records:
28: - `saldo_anterior_origen` / `saldo_posterior_origen`
29: - `saldo_anterior_destino` / `saldo_posterior_destino`
30: This ensures that the financial state can be reconstructed or audited at any point in time without relying solely on current sums.
31: 
32: ### Automated Barcode Generation
33: In `Producto.php`, a `boot` method automatically triggers barcode generation on creation and specific updates.
34: ```php
35: // Logic snippet
36: $parteFija = $nombre . $marca . $modelo . $capacidad;
37: // ... intelligent padding to 14 characters
38: ```
39: 
40: ### UI/UX Implementation
41: - **App Layout**: Uses a Sidebar/Header shell pattern with persistent navigation.
42: - **Inertia integration**: Seamless transitions with progress indicators and server-side state hydration.
43: 
44: ## 🔐 Security & Permissions
45: - **Middleware**: Custom middleware for warehouse-level isolation.
46: - **CSRF & XSS**: Standard Laravel protections enhanced with TypeScript typing for all props.
47: 
48: ## 📊 Database Design Highlights
49: - **60+ Migrations**: Indicating a highly granular and normalized database schema.
50: - **Pivot Tables with Metadata**: Tables like `almacen_producto` and `producto_vendedors` carry business logic (quantities, specific prices).

(End of file - total 50 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/ARCHITECTURE_DIAGRAM.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/ARCHITECTURE_DIAGRAM.md</path>
<type>file</type>
<content>
1: # Architecture Diagram: Almacén Tienda
2: 
3: The following diagram illustrates the relationship between the main modules of the system and how data flows between them.
4: 
5: ```mermaid
6: graph TB
7:     subgraph "Frontend (React 19 + Inertia)"
8:         UI["User Interface (Radix + Tailwind)"]
9:         Pages["Inertia Pages"]
10:         Hooks["Custom Hooks"]
11:     end
12: 
13:     subgraph "Backend (Laravel 12)"
14:         Routes["Inertia Routes"]
15:         Controllers["Controllers"]
16:         Services["Business Logic (Services)"]
17:         Models["Eloquent Models"]
18:     end
19: 
20:     subgraph "Core Business Entities"
21:         Inventory["Inventory (Products, Warehouses)"]
22:         Finance["Financials (Accounts, Movements, Currencies)"]
23:         Sales["Sales & POS"]
24:         Procurement["Purchases & Suppliers"]
25:     end
26: 
27:     subgraph "Data Storage"
28:         DB[("MySQL Database")]
29:         Storage["File Storage (Images, Barcodes)"]
30:     end
31: 
32:     UI --> Pages
33:     Pages <--> Routes
34:     Routes --> Controllers
35:     Controllers --> Services
36:     Services --> Models
37:     Models <--> DB
38:     Models --> Storage
39: 
40:     %% Module Relationships
41:     Sales --> Inventory : "Stock Decrement"
42:     Sales --> Finance : "Income Entry"
43:     Procurement --> Inventory : "Stock Increment"
44:     Procurement --> Finance : "Expense Entry"
45:     Inventory --> Finance : "Cost Reconciliation"
46: ```
47: 
48: ## Module Interaction Details
49: 
50: ### 1. Sale Process Flow
51: 1. **User** initiates sale in POS (Frontend).
52: 2. **Controller** validates stock availability via `Producto` model.
53: 3. **Transaction** starts in Database.
54: 4. **Inventory** is decremented in specific Warehouse.
55: 5. **Financial Movement** is created with balance tracking.
56: 6. **Notification** sent if stock reaches low threshold.
57: 
58: ### 2. Purchase & Costing
59: 1. **Supplier** delivery received.
60: 2. **Purchase Order** updated.
61: 3. **Cost Distribution** service calculates unit landed cost.
62: 4. **Product** average cost updated.
63: 5. **Account** balance updated.

(End of file - total 63 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/INDEX.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/INDEX.md</path>
<type>file</type>
<content>
1: # Documentación — almacen.tienda
2: 
3: > Índice central de toda la documentación del proyecto. Empieza aquí.
4: 
5: ---
6: 
7: ## Lectura obligatoria antes de tocar código
8: 
9: | Documento | Por qué leerlo |
10: |---|---|
11: | [context.md](context.md) | Contexto completo: dominio, entidades, roles, lógica de negocio |
12: | [ESTADO_DESARROLLO.md](ESTADO_DESARROLLO.md) | Qué está hecho, qué bugs existen, qué falta — **actualizar siempre** |
13: | [guia-desarrollo.md](guia-desarrollo.md) | Cómo levantar el proyecto, comandos, entorno |
14: 
15: ---
16: 
17: ## Por módulo
18: 
19: ### Ventas y POS
20: | Documento | Contenido |
21: |---|---|
22: | [ventas/flujos-venta.md](ventas/flujos-venta.md) | Flujos completos: normal, especial, gestor, mensajero |
23: | [ventas/contexto-actual.md](ventas/contexto-actual.md) | Estado actual del código de ventas, métodos del controlador, campos clave |
24: | [flujos-financieros-comision-mensajero.md](flujos-financieros-comision-mensajero.md) | Cómo funcionan los flujos financieros paralelos (comisión, mensajero, gestor) |
25: | [comision-vendedor-gestor-2026-05-25.md](comision-vendedor-gestor-2026-05-25.md) | Implementación del tracking de comisiones — fórmulas y cambios |
26: 
27: ### Cierre de Caja
28: | Documento | Contenido |
29: |---|---|
30: | [ventas/pendiente-cierre-caja.md](ventas/pendiente-cierre-caja.md) | Estado actual del cierre, problemas resueltos, features añadidos |
31: | [comparativa-cierres.md](comparativa-cierres.md) | Explicación de la sección de comparativa con cierre anterior |
32: | [PLAN_Actualizar_Show_Cierres.md](PLAN_Actualizar_Show_Cierres.md) | Plan original para actualizar la vista Show del cierre |
33: 
34: ### Mensajero
35: | Documento | Contenido |
36: |---|---|
37: | [pendiente-arreglar-mensajero.md](pendiente-arreglar-mensajero.md) | Ajustes pendientes del flujo de mensajero |
38: 
39: ### Bot de Telegram
40: | Documento | Contenido |
41: |---|---|
42: | [TELEGRAM_BOT_PLAN.md](TELEGRAM_BOT_PLAN.md) | Plan completo de implementación con código, paso a paso |
43: 
44: ### Base de Datos
45: | Documento | Contenido |
46: |---|---|
47: | [base-de-datos.md](base-de-datos.md) | Tablas principales, campos clave y relaciones |
48: 
49: ### Productos
50: | Documento | Contenido |
51: |---|---|
52: | [codebar-ventas-y-fixes-2026-05-21.md](codebar-ventas-y-fixes-2026-05-21.md) | Sistema de códigos de barras y fixes de ventas |
53: | [plantilla-importar-productos.md](plantilla-importar-productos.md) | Cómo funciona la importación masiva de productos |
54: | [precios-vendedor-export-import.md](precios-vendedor-export-import.md) | Export/import de precios por vendedor vía Excel |
55: 
56: ### Arquitectura y API
57: | Documento | Contenido |
58: |---|---|
59: | [ARCHITECTURE_DIAGRAM.md](ARCHITECTURE_DIAGRAM.md) | Diagrama de arquitectura del sistema |
60: | [API_PUBLIC_CATALOG.md](API_PUBLIC_CATALOG.md) | Endpoints de la API pública de catálogo (sin auth) |
61: | [TECHNICAL_ANALYSIS.md](TECHNICAL_ANALYSIS.md) | Análisis técnico del stack y patrones |
62: 
63: ### Otros
64: | Documento | Contenido |
65: |---|---|
66: | [cambios-cliente-proveedor.md](cambios-cliente-proveedor.md) | Cambios en el módulo de clientes/proveedores |
67: | [newforsale.md](newforsale.md) | Nuevas features para ventas |
68: 
69: ---
70: 
71: ## Convenciones del proyecto
72: 
73: - **Nombres en español**: modelos, columnas, rutas, vistas, variables.
74: - **Roles**: `admin` > `moderador` > `vendedor` — filtrar siempre con `in_array($user->role, [...])`.
75: - **Transacciones DB**: toda operación crítica usa `DB::beginTransaction()` con rollback.
76: - **Stock al crear**: el stock se descuenta al *crear* la venta (reserva), no al aprobar.
77: - **Financiero al aprobar**: saldos de cuentas y deudas de clientes solo se mueven al aprobar.
78: - **Mensajero es pass-through**: nunca incluir en cálculos de comisión ni cambiarios.
79: - **XOR comisión**: gestor Y vendedor son mutuamente excluyentes por venta.

(End of file - total 79 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/context.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/context.md</path>
<type>file</type>
<content>
1: # Contexto del Proyecto: almacen.tienda
2: 
3: ## Visión General
4: 
5: Sistema de gestión de inventario, punto de venta y logística multi-almacén diseñado para negocios que operan con **múltiples monedas** (USD, CUP, MLC) y varios puntos de venta simultáneos. Incluye control de comisiones por vendedor, gestión de mensajería, cierre de caja por turno y un bot de Telegram integrado para flujos de aprobación y reportes.
6: 
7: ---
8: 
9: ## Stack Tecnológico
10: 
11: | Capa | Tecnología |
12: |---|---|
13: | Backend | Laravel 12, PHP 8.2 |
14: | Frontend | React 19, TypeScript, Inertia.js v2, Vite 7 |
15: | UI | TailwindCSS 4, Radix UI, shadcn/ui, Lucide React |
16: | Tablas | @tanstack/react-table v8 |
17: | Gráficos | Recharts |
18: | Animaciones | Framer Motion, GSAP |
19: | PDFs | jsPDF + jspdf-autotable (client-side), barryvdh/laravel-dompdf |
20: | Excel | maatwebsite/excel |
21: | Códigos de barras | milon/barcode |
22: | Roles | spatie/laravel-permission |
23: | Auth | Laravel Sanctum |
24: | Bot | irazasyed/telegram-bot-sdk v3 |
25: | Ziggy | tightenco/ziggy (rutas Laravel en JS) |
26: 
27: ---
28: 
29: ## Roles de Usuario
30: 
31: | Rol | Permisos |
32: |---|---|
33: | `admin` | Acceso total. Puede modificar costos, saldos de cuentas, aprobar ventas especiales, eliminar registros |
34: | `moderador` | Similar a admin pero sin operaciones destructivas. Ve todos los datos |
35: | `vendedor` | Limitado a sus almacenes y cuentas asignadas. No ve precios de costo ni datos sensibles |
36: 
37: Los controladores filtran datos por rol directamente: `in_array($user->role, ['admin', 'moderador'])`.
38: 
39: ---
40: 
41: ## Entidades del Dominio
42: 
43: ### Almacén (`almacens`)
44: Tipos: `almacen`, `punto_venta`, `transportacion`.
45: - Tiene responsable (nombre, apellido, carnet, teléfono).
46: - `mensajero_cuenta_id`: cuenta destino para pagos de mensajería.
47: - Relación M:M con Productos a través de `almacen_producto` (guarda `cantidad` y `cantidad_en_transito`).
48: - Usuarios acceden a sus almacenes asignados via `user_almacens`.
49: 
50: ### Producto (`productos`)
51: - Atributos: nombre, marca, modelo, capacidad, categoria, `precio_compra_producto` (costo USD).
52: - Tiene múltiples **códigos de barras** (`producto_codigos`): cada código tiene cantidad propia y flag `es_default`.
53: - Stock real: suma de `almacen_producto.cantidad` a través de todos los almacenes.
54: - Imágenes en `public/productos/`. Default: `productos/producto-default.png`.
55: - Historial de cambios de costo en `historial_precio_costos` (requiere contraseña de admin).
56: - Importación/exportación masiva vía Excel.
57: 
58: ### Precio por Vendedor (`producto_vendedors`)
59: Una fila única por par `(producto_id, almacen_id)`:
60: - `precio_venta`: precio base del producto en ese almacén.
61: - `comision`: margen del vendedor incluido en el precio.
62: - **Precio mínimo vendible** = `precio_venta - comision`.
63: - No se puede crear una venta sin que todos los productos del almacén tengan precio asignado.
64: 
65: ### Compra (`compras`)
66: Tipos de pago:
67: - `deuda_proveedor`: genera deuda con proveedor o acumula deuda del cliente fuente.
68: - `pago_cash`: descuenta de cuentas USD permanentes/temporales o saldo de clientes.
69: 
70: Fuente: puede ser un `Proveedor` o un `Cliente físico` (reseller).
71: Al registrar compra: crea/actualiza `Producto`, genera `ProductoCodigo`, incrementa `almacen_producto.cantidad`.
72: Pagos múltiples soportados en `compra_pago`.
73: 
74: ### Venta (`ventas`)
75: 
76: **Flujo de estados:**
77: ```
78: solicitud_especial  (si es venta especial)
79: pendiente           → stock descontado inmediatamente al crear
80: completada          → saldos de cuentas actualizados, ganancia calculada
81: cancelada           → stock devuelto
82: ```
83: 
84: **Campos financieros clave:**
85: - `total`: en moneda principal de la venta.
86: - `total_ganancia`: suma de (precio_venta - costo) × cantidad.
87: - `total_comision`: comisión total del vendedor en USD.
88: - `ganancia_perdida_cambiaria`: diferencia entre CUP cobrado real vs a tasa oficial.
89: - `ganancia_real_total`: total_ganancia + ganancia_perdida_cambiaria.
90: - `total_esperado_usd`: costo + ganancia objetivo.
91: 
92: **Pagos (`pago_ventas`):**
93: - Destino: `cuenta_id` (afecta saldo de cuenta) **O** `cliente_id` (acumula deuda del cliente).
94: - Tipos: `efectivo`, `transferencia`.
95: - Cada pago tiene `moneda_id`, `monto`, `tasa_cambio_aplicada`, `monto_equivalente` (en moneda principal).
96: 
97: **Modos especiales:**
98: - **Venta Especial**: precio por debajo del mínimo. Requiere aprobación de admin. Notifica via Telegram con botones inline (Aprobar/Rechazar).
99: - **Venta Gestor**: venta a través de un intermediario. Descuenta `gestor_monto` de `gestor_cuenta_id` al aprobar.
100: - **Mensajero**: cargo de envío. Tipo `propio` (paga de cuenta interna) o `externo` (descuenta de cuenta). El mensajero es pass-through — no se incluye en ganancia cambiaria.
101: 
102: ### Cuenta (`cuentas`)
103: - Tipos de instrumento: `tarjeta`, `efectivo`, `otro`.
104: - Categorías: `permanentes`, `temporales`, `deudas`.
105: - Moneda vinculada via `moneda_id`.
106: - Vendedores solo ven sus cuentas asignadas (tabla `user_cuentas`).
107: - Modificar saldo requiere rol admin + contraseña de seguridad hardcoded (`glorietashop`).
108: 
109: ### Moneda (`monedas`)
110: - `codigo_moneda`: ej. `USD`, `CUP`, `MLC`.
111: - `tasa_cambio`: tasa de conversión relativa a USD (divisor).
112: - `principal`: flag — la moneda principal es la base de conversión.
113: - Estado: activa/inactiva.
114: - Historial de cambios en `historial_tasa_cambios` (registra impacto financiero en todas las cuentas).
115: 
116: ### Cliente (`clientes`)
117: Tipos: `fisico`, `asociado`.
118: - `deuda_pago_cliente`: saldo acumulado pendiente de pago.
119: - Pueden ser fuente de pagos en compras (descuenta su deuda).
120: - Pueden recibir pagos de ventas (acumula deuda en lugar de ir a cuenta).
121: 
122: ### Movimiento de Stock (`movimientos`)
123: Traslados entre almacenes.
124: 
125: **Estados:**
126: ```
127: pendiente_confirmacion → en_transito → recibido_completo | recibido_parcial | rechazado | cancelado
128: ```
129: - Al **enviar**: incrementa `almacen_producto.cantidad_en_transito` en origen.
130: - Al **recibir**: decrementa `cantidad` y `cantidad_en_transito` en origen, incrementa en destino.
131: - Soporta diferencias (recibido_parcial): excedentes/faltantes se reconcilian en el stock de origen.
132: - Auditoría completa en `movimiento_seguimientos`.
133: 
134: ### Cierre de Caja (`cierre_cajas`)
135: 
136: El backend es la **fuente de verdad** (los datos del frontend se ignoran para los cálculos).
137: 
138: Calcula desde el último cierre del usuario hasta ahora:
139: - Pagos de ventas separados por destino: **a cuentas** (afecta saldo) vs **a clientes** (deuda, no afecta saldo).
140: - Movimientos financieros: gastos (−), ingresos extra (+), transferencias salientes (−), entrantes (+).
141: - Comisiones a gestores (descontadas del saldo).
142: - Mensajero: informativo, ya descontado del saldo esperado.
143: - Ventas especiales completadas, ventas anuladas.
144: - `saldo_esperado` = ventas_a_cuentas + ingresos - gastos - transferencias - mensajero.
145: - Snapshot de saldos de cuentas y deudas de clientes al momento del cierre.
146: - Comparativa con cierre anterior.
147: 
148: ### Movimiento Financiero (`movimientos_financieros`)
149: Tipos (tabla `tipos_movimiento_financiero`):
150: - ID 1 → Gasto
151: - ID 2 → Ingreso
152: - ID 3 → Transferencia (bidireccional, soporta conversión de moneda)
153: 
154: ---
155: 
156: ## Lógica de Comisión del Vendedor
157: 
158: ```
159: precioBase = producto_vendedors.precio_venta
160: comisionBase = producto_vendedors.comision
161: precioMinimo = precioBase - comisionBase
162: 
163: Si precio_venta >= precioBase:
164:     comisionUnitaria = comisionBase + (precio_venta - precioBase)  // markup extra va al vendedor
165: 
166: Si precio_venta < precioBase (solo en Venta Especial):
167:     descuento = precioBase - precio_venta
168:     comisionUnitaria = max(0, comisionBase - descuento)  // descuento absorbe comisión
169: ```
170: 
171: ---
172: 
173: ## Lógica de Ganancia Cambiaria
174: 
175: Aplica cuando la venta se cobra en CUP pero los productos están valuados en USD:
176: 
177: ```
178: monto_esperado_oficial = total_usd × tasa_oficial_cup
179: monto_real_cobrado_cup = suma pagos en CUP (sin mensajero)
180: ganancia_cambiaria = monto_real_cobrado_cup - monto_esperado_oficial
181: ```
182: 
183: Positivo = cliente pagó a tasa mayor que oficial (ganancia). Negativo = pérdida cambiaria.
184: 
185: ---
186: 
187: ## Bot de Telegram
188: 
189: Webhook autenticado por `X-Telegram-Bot-Api-Secret-Token`.
190: 
191: **Comandos:**
192: - `/vincular CODIGO`: vincula cuenta de usuario con chat de Telegram.
193: - `/start`: saludo + estado.
194: - `/reporte`: resumen del día.
195: - `/cierres`: últimos cierres.
196: - `/ayuda`: listado de comandos.
197: 
198: **Notificaciones automáticas:**
199: - `VentaCreadaNotification`: al crear venta (a admins/moderadores).
200: - `VentaEspecialSolicitudNotification`: cuando se solicita venta especial (con botones inline Aprobar/Rechazar).
201: - `VentaEspecialDecisionNotification`: al vendedor cuando admin decide.
202: - `MovimientoStockNotification`: al crear/enviar/recibir movimientos.
203: - `CierreCajaNotification`: al realizar cierre de caja.
204: - `CambioPrecioVendedorNotification`: cuando cambia precio de vendedor.
205: - `MovimientoFinancieroNotification`: en movimientos financieros.
206: 
207: ---
208: 
209: ## API Pública (e-commerce)
210: 
211: Prefijo: `/api/tienda` — sin autenticación, throttle: 60 req/min.
212: 
213: | Endpoint | Descripción |
214: |---|---|
215: | `GET /almacenes` | Lista de almacenes activos |
216: | `GET /almacenes/{id}` | Detalle de almacén |
217: | `GET /almacenes/{id}/productos` | Productos del almacén con stock |
218: | `GET /productos` | Búsqueda de productos |
219: | `GET /productos/{id}` | Detalle de producto |
220: | `GET /productos/{id}/stock` | Stock por almacén |
221: | `GET /categorias` | Categorías |
222: | `GET /docs/openapi.json` | Spec OpenAPI |
223: | `GET /docs` | Swagger UI |
224: 
225: ---
226: 
227: ## Estructura de Controladores
228: 
229: | Controlador | Responsabilidad Principal |
230: |---|---|
231: | `AdminController` | Dashboard, tasas de cambio (USD y MLC), historial de comparaciones mensuales |
232: | `VentaController` | POS completo: crear venta, aprobar, anular, listado, datos JSON para el frontend |
233: | `CompraController` | Registro de compras, gestión inline de proveedores/clientes/almacenes/categorías |
234: | `ProductoController` | CRUD de productos, búsqueda, transferencia de códigos, import/export Excel |
235: | `AlmacenController` | CRUD de almacenes, vista de inventario por almacén |
236: | `MovimientosController` | Traslados de stock: crear, enviar, recibir, rechazar, discrepancias |
237: | `CuentaController` | CRUD de cuentas, control de saldo con contraseña |
238: | `CierreCajaController` | Pre-cierre (cálculos), store (persistencia), show (detalle histórico) |
239: | `ReporteController` | Todos los reportes: ventas, compras, inventario, ganancias, auditoría |
240: | `TransaccionController` | Movimientos financieros, distribución de costos de compra |
241: | `TelegramWebhookController` | Bot: comandos texto + callbacks inline de aprobación |
242: | `ProductoVendedorController` | Asignación/edición de precios y comisiones por almacén |
243: | `UserController` | Gestión de usuarios |
244: | `UserAlmacenController` | Asignación de usuarios a almacenes |
245: | `LogisticaController` | Vista de logística |
246: | `MonedaController` | CRUD de monedas, actualización de tasas |
247: | `MovimientosPendienteController` | Movimientos de stock pendientes |
248: | `NotificationController` | Lectura y marcado de notificaciones |
249: | `EcommerceController` | Vista de catálogo público (en desarrollo) |
250: | `Api/CatalogoPublicoController` | API REST pública sin auth |
251: | `DestinatarioVentaController` | Destinatarios/receptores de ventas |
252: | `ClienteController` | CRUD de clientes y gestión de deuda |
253: | `ProveedorController` | CRUD de proveedores |
254: | `CategoriaController` | CRUD de categorías |
255: 
256: ---
257: 
258: ## Middlewares Relevantes
259: 
260: | Middleware | Uso |
261: |---|---|
262: | `EnsureUserIsAdmin` | Protege rutas solo para `admin` |
263: | `EnsureUserIsModerator` | Rutas para `admin` o `moderador` |
264: | `EnsureUserIsVendor` | Rutas de vendedor |
265: | `CheckAlmacenPermission` | Verifica que el usuario tiene acceso al almacén solicitado |
266: | `CheckCuentaPermission` | Verifica que el usuario tiene acceso a la cuenta solicitada |
267: | `HandleInertiaRequests` | Comparte datos globales con Inertia (usuario, permisos) |
268: 
269: ---
270: 
271: ## Patrones y Convenciones
272: 
273: - **Inertia SSR**: Vistas PHP retornan `Inertia::render('Módulo/Vista', [...datos])`. El frontend recibe props tipadas.
274: - **Ziggy**: Rutas Laravel disponibles en JS como `route('nombre.ruta')`.
275: - **Transacciones DB**: todas las operaciones críticas (venta, compra, movimiento, cierre) usan `DB::beginTransaction()` con rollback en catch.
276: - **Stock inmediato**: al crear una venta (incluso pendiente), el stock se descuenta de inmediato para reservarlo.
277: - **Datos sensibles**: `precio_compra_producto` y `costo_unitario` solo se exponen a `admin` y `moderador` en respuestas JSON.
278: - **Nombres en español**: modelos, columnas, rutas y vistas siguen nomenclatura en español.
279: - **Rutas modularizadas**: `routes/web.php` incluye archivos de subdirectorio (`crud/`, `acciones/`, `shop/`, `empleados/`).
280: 
281: ---
282: 
283: ## Servicios
284: 
285: | Servicio | Función |
286: |---|---|
287: | `DashboardStatsService` | Calcula KPIs de ventas/compras por período (diario, semanal, mensual) |
288: | `NotificationService` | Determina destinatarios de notificaciones según contexto del movimiento/cierre |
289: 
290: ---
291: 
292: ## Branch Actual
293: 
294: `feature/bot-telegram` — Trabajo activo en integración del bot de Telegram.

(End of file - total 294 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 11.1s)

_Thinking:_

The user asked me to analyze the project based on BaseSolida-Proyecto.md and the docs/ directory. They said "solo analiza no hagas mas nada" (just analyze, don't do anything else). Let me now read the remaining key files from the docs directory that could provide more context.

Let me now synthesize a comprehensive analysis of the project based on what I've read so far.

Actually, the user said "y lo ultimo que hicimos en @docs/" - meaning they want me to look at the docs/ directory for what was last done. Let me check the most recent files in docs/.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/guia-desarrollo.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/guia-desarrollo.md</path>
<type>file</type>
<content>
1: # Guía de Desarrollo — almacen.tienda
2: 
3: > Todo lo que necesitas para levantar el proyecto, trabajar y hacer deploy.
4: 
5: ---
6: 
7: ## Stack requerido
8: 
9: | Herramienta | Versión mínima |
10: |---|---|
11: | PHP | 8.2+ |
12: | Composer | 2.x |
13: | Node.js | 20+ |
14: | MySQL / MariaDB | 8.0+ |
15: 
16: ---
17: 
18: ## Levantar el proyecto por primera vez
19: 
20: ```bash
21: # 1. Clonar y entrar
22: git clone <repo> almacen.tienda
23: cd almacen.tienda
24: 
25: # 2. Dependencias PHP
26: composer install
27: 
28: # 3. Dependencias JS
29: npm install
30: 
31: # 4. Variables de entorno
32: cp .env.example .env
33: php artisan key:generate
34: 
35: # 5. Configurar .env (ver sección Variables de entorno)
36: 
37: # 6. Migraciones y seeders
38: php artisan migrate
39: php artisan db:seed   # opcional — carga datos de prueba
40: 
41: # 7. Storage link (para imágenes)
42: php artisan storage:link
43: 
44: # 8. Levantar servidores de desarrollo
45: php artisan serve        # backend en :8000
46: npm run dev              # Vite en :5173 (hot reload)
47: ```
48: 
49: ---
50: 
51: ## Variables de entorno clave
52: 
53: ```env
54: # Base de datos
55: DB_CONNECTION=mysql
56: DB_HOST=127.0.0.1
57: DB_PORT=3306
58: DB_DATABASE=almacen_tienda
59: DB_USERNAME=root
60: DB_PASSWORD=
61: 
62: # App
63: APP_URL=http://localhost:8000
64: APP_ENV=local
65: APP_DEBUG=true
66: 
67: # Bot Telegram
68: TELEGRAM_BOT_TOKEN=your_bot_token_here
69: TELEGRAM_WEBHOOK_SECRET=una_cadena_aleatoria_segura
70: 
71: # Queue (para notificaciones en background)
72: QUEUE_CONNECTION=database   # o redis en producción
73: 
74: # Mail (opcional)
75: MAIL_MAILER=smtp
76: ```
77: 
78: ---
79: 
80: ## Comandos del día a día
81: 
82: ```bash
83: # Migraciones
84: php artisan migrate                    # aplicar migraciones pendientes
85: php artisan migrate:status             # ver estado de cada migración
86: php artisan migrate:rollback           # revertir última migración
87: 
88: # Crear archivos nuevos
89: php artisan make:migration nombre      # nueva migración
90: php artisan make:model Nombre          # nuevo modelo
91: php artisan make:controller Nombre     # nuevo controlador
92: php artisan make:notification Nombre   # nueva notificación
93: 
94: # Limpiar cachés (hacer después de cambios en config o rutas)
95: php artisan config:clear
96: php artisan route:clear
97: php artisan view:clear
98: php artisan cache:clear
99: 
100: # Listar rutas
101: php artisan route:list                 # todas las rutas
102: php artisan route:list --path=api      # filtrar por prefijo
103: 
104: # Tinker (REPL PHP con contexto de Laravel — útil para probar lógica)
105: php artisan tinker
106: 
107: # Frontend
108: npm run dev        # desarrollo con hot reload
109: npm run build      # build de producción
110: npm run typecheck  # validar tipos TypeScript
111: 
112: # Bot Telegram — registrar webhook (solo en producción con HTTPS)
113: php artisan tinker
114: >>> Http::post("https://api.telegram.org/bot{TOKEN}/setWebhook", ['url' => 'https://dominio.com/api/telegram/webhook', 'secret_token' => '{SECRET}'])
115: ```
116: 
117: ---
118: 
119: ## Estructura de rutas
120: 
121: Las rutas están divididas en múltiples archivos incluidos desde `routes/web.php`:
122: 
123: ```
124: routes/
125: ├── web.php               ← entrada principal, incluye los subdirectorios
126: ├── api.php               ← API pública + webhook Telegram
127: ├── crud/                 ← rutas CRUD estándar (productos, almacenes, clientes, etc.)
128: ├── acciones/             ← rutas de acciones específicas (aprobar, anular, etc.)
129: ├── shop/                 ← rutas del POS y ventas
130: └── empleados/            ← rutas de gestión de usuarios
131: ```
132: 
133: ---
134: 
135: ## Convenciones de código
136: 
137: ### PHP (Laravel)
138: - **PSR-12** para estilo de código.
139: - Controladores delgados — lógica compleja en métodos privados o servicios.
140: - Siempre usar `DB::beginTransaction()` con rollback en operaciones críticas.
141: - Validar con `$request->validate([...])` o Form Requests.
142: - Los roles se verifican con: `in_array($user->role, ['admin', 'moderador'])`.
143: 
144: ### TypeScript (React + Inertia)
145: - Interfaces para todos los props tipados (copiar el patrón de `Vendor/Show.tsx`).
146: - Usar `usePage<PageProps>()` para acceder a datos globales de Inertia.
147: - Formularios con `useForm()` de Inertia.
148: - Navegación con `router.post/get()` de Inertia (no `fetch` directo para rutas web).
149: - Nombres de archivos y componentes en **PascalCase**.
150: 
151: ### Base de datos
152: - Nombres de tablas y columnas en **snake_case español**.
153: - Siempre agregar `$table->timestamps()` en nuevas tablas.
154: - Campos nullable explícitos: `$table->string('campo')->nullable()`.
155: - Soft deletes solo si el módulo lo requiere explícitamente.
156: 
157: ---
158: 
159: ## Flujo de trabajo con Git
160: 
161: ```bash
162: # Nueva feature
163: git checkout -b feature/nombre-descriptivo
164: # ... hacer cambios ...
165: git add archivo1.php archivo2.tsx
166: git commit -m "Descripción concisa del cambio"
167: git push origin feature/nombre-descriptivo
168: 
169: # Para merges, crear PR en GitHub
170: ```
171: 
172: **Ramas activas:**
173: - `main` — producción estable
174: - `feature/bot-telegram` — rama de desarrollo actual
175: 
176: ---
177: 
178: ## Roles de usuario — referencia rápida
179: 
180: | Rol | Acceso |
181: |---|---|
182: | `admin` | Total: modificar costos, saldos, aprobar ventas especiales, gestionar usuarios |
183: | `moderador` | Como admin sin operaciones destructivas. Ve todo |
184: | `vendedor` | Solo sus almacenes y cuentas asignadas. No ve precios de costo |
185: 
186: Para crear un admin desde Tinker:
187: ```php
188: $user = \App\Models\User::create([
189:     'name' => 'Admin',
190:     'email' => 'admin@ejemplo.com',
191:     'password' => \Illuminate\Support\Facades\Hash::make('contraseña'),
192:     'role' => 'admin',
193: ]);
194: ```
195: 
196: ---
197: 
198: ## Notificaciones — cómo funcionan
199: 
200: El sistema usa **Laravel Notifications** con canal `database` como base y `TelegramChannel` opcional:
201: 
202: 1. La notificación se crea en `app/Notifications/`.
203: 2. Se envía con `$user->notify(new NombreNotification(...))` o `Notification::send($users, ...)`.
204: 3. Las notificaciones database aparecen en el bell de la UI (`NotificationBell.tsx`).
205: 4. Las de Telegram van al chat del usuario si tiene `telegram_chat_id` configurado.
206: 
207: Para que las notificaciones de Telegram funcionen, el usuario debe vincular su cuenta:
208: - El admin ingresa el chat_id manualmente en `Empleados → Edit`.
209: - O el usuario escribe `/vincular CODIGO` en el bot de Telegram.
210: 
211: ---
212: 
213: ## Imágenes de productos
214: 
215: - Se guardan en `public/productos/`.
216: - La imagen por defecto es `public/productos/producto-default.png`.
217: - Para servir imágenes en el frontend: `asset('productos/' + producto.imagen)`.
218: 
219: ---
220: 
221: ## Configuración del Bot de Telegram
222: 
223: Ver documento completo: [TELEGRAM_BOT_PLAN.md](TELEGRAM_BOT_PLAN.md)
224: 
225: **Resumen rápido:**
226: 1. Crear bot en BotFather → obtener TOKEN.
227: 2. Poner `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET` en `.env`.
228: 3. En producción registrar el webhook:
229:    ```
230:    POST https://api.telegram.org/bot{TOKEN}/setWebhook
231:    Body: { url: "https://dominio.com/api/telegram/webhook", secret_token: "..." }
232:    ```
233: 4. Para desarrollo local: usar ngrok para exponer el puerto 8000.
234: 
235: ---
236: 
237: ## Hosting (Hostinger)
238: 
239: - El paquete de Telegram es PHP puro — funciona sin configuración especial.
240: - No se necesitan workers ni daemons.
241: - Queue connection: `database` (sin Redis ni Supervisor).
242: - HTTPS obligatorio para el webhook de Telegram.
243: - Correr `php artisan config:cache && php artisan route:cache` después de cada deploy.
244: 
245: ---
246: 
247: ## Solución de problemas comunes
248: 
249: | Problema | Solución |
250: |---|---|
251: | `Class not found` después de crear archivo | `composer dump-autoload` |
252: | Cambios de CSS no se ven | `npm run build` o reiniciar `npm run dev` |
253: | Ruta no encontrada | `php artisan route:clear` |
254: | El webhook de Telegram no responde | Verificar que la URL sea HTTPS y el secret coincida en `.env` y en el registro del webhook |
255: | Error 500 al aprobar venta | Revisar que la venta tenga destinatario, mensajero_cuenta y mensajero_tipo si `mensajero_monto > 0` |
256: | Venta bloqueada por `almacen_incompleto` | El almacén tiene productos sin precio en `producto_vendedors` |
257: | Imagen de producto no carga | Verificar que existe `php artisan storage:link` y la ruta en `public/productos/` |

(End of file - total 257 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/base-de-datos.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/base-de-datos.md</path>
<type>file</type>
<content>
1: # Base de Datos — Tablas Principales
2: 
3: > Referencia rápida de las tablas más usadas, sus campos clave y relaciones.
4: > Para el esquema completo ver las migraciones en `database/migrations/`.
5: 
6: ---
7: 
8: ## Tablas principales
9: 
10: ### `users`
11: | Campo | Tipo | Descripción |
12: |---|---|---|
13: | `id` | PK | |
14: | `name` | string | |
15: | `email` | string | |
16: | `password` | string | |
17: | `role` | enum | `admin`, `moderador`, `vendedor` |
18: | `avatar` | string nullable | |
19: | `telegram_chat_id` | string nullable | Chat ID de Telegram para notificaciones |
20: | `telegram_link_token` | string nullable | Token temporal para vincular cuenta |
21: 
22: **Relaciones:** `hasMany(UserAlmacen)`, `hasMany(Venta)`, `hasMany(CierreCaja)`
23: 
24: ---
25: 
26: ### `almacens`
27: | Campo | Tipo | Descripción |
28: |---|---|---|
29: | `id` | PK | |
30: | `nombre_almacen` | string | |
31: | `tipo` | enum | `almacen`, `punto_venta`, `transportacion` |
32: | `activo` | boolean | |
33: | `responsable_nombre` | string nullable | |
34: | `responsable_apellido` | string nullable | |
35: | `responsable_carnet` | string nullable | |
36: | `responsable_telefono` | string nullable | |
37: | `mensajero_cuenta_id` | FK nullable | Cuenta CUP para pagos de mensajería |
38: 
39: **Relaciones:** `belongsToMany(Producto)` via `almacen_producto`, `hasMany(UserAlmacen)`, `belongsTo(Cuenta, 'mensajero_cuenta_id')`
40: 
41: ---
42: 
43: ### `almacen_producto` (pivot con datos)
44: | Campo | Tipo | Descripción |
45: |---|---|---|
46: | `almacen_id` | FK | |
47: | `producto_id` | FK | |
48: | `cantidad` | int | Stock disponible en este almacén |
49: | `cantidad_en_transito` | int | Stock reservado en traslado |
50: 
51: ---
52: 
53: ### `productos`
54: | Campo | Tipo | Descripción |
55: |---|---|---|
56: | `id` | PK | |
57: | `nombre` | string | |
58: | `marca` | string nullable | |
59: | `modelo` | string nullable | |
60: | `capacidad` | string nullable | |
61: | `descripcion` | text nullable | |
62: | `imagen` | string nullable | Ruta relativa desde `public/` |
63: | `precio_compra_producto` | decimal | Costo en USD — **solo visible para admin/moderador** |
64: | `categoria_id` | FK | |
65: | `activo` | boolean | |
66: 
67: **Relaciones:** `hasMany(ProductoCodigo)`, `hasMany(AlmacenProducto)`, `hasMany(ProductoVendedor)`, `belongsTo(Categoria)`
68: 
69: ---
70: 
71: ### `producto_codigos`
72: | Campo | Tipo | Descripción |
73: |---|---|---|
74: | `id` | PK | |
75: | `producto_id` | FK | |
76: | `codigo` | string | Código de barras EAN-128 |
77: | `cantidad` | int | Unidades que representa este código |
78: | `es_default` | boolean | Código principal del producto |
79: 
80: ---
81: 
82: ### `producto_vendedors` — **tabla crítica de precios**
83: | Campo | Tipo | Descripción |
84: |---|---|---|
85: | `id` | PK | |
86: | `producto_id` | FK | |
87: | `almacen_id` | FK | |
88: | `precio_venta` | decimal | Precio base del producto en este almacén |
89: | `comision` | decimal | Ganancia del vendedor por unidad al precio base |
90: | `user_id` | FK | Vendedor asignado (admin → user_id = 1) |
91: 
92: > Regla: `precio_minimo = precio_venta - comision`. No se puede vender por debajo sin venta especial.
93: > Una fila única por `(producto_id, almacen_id)`.
94: 
95: ---
96: 
97: ### `ventas`
98: 
99: #### Campos de estado e identificación
100: | Campo | Tipo | Descripción |
101: |---|---|---|
102: | `id` | PK | |
103: | `user_id` | FK | Vendedor que creó la venta |
104: | `almacen_id` | FK | |
105: | `cliente_id` | FK nullable | |
106: | `estado` | enum | `solicitud_especial`, `pendiente`, `completada`, `rechazada`, `cancelada` |
107: | `motivo_anulacion` | string nullable | Solo en ventas canceladas |
108: | `nota_venta_especial` | text nullable | Justificación de la venta especial |
109: | `decision_notificada` | boolean | Si el vendedor ya vio la decisión admin |
110: 
111: #### Campos financieros
112: | Campo | Tipo | Descripción |
113: |---|---|---|
114: | `total` | decimal | Total cobrado al cliente (productos + mensajero) |
115: | `total_ganancia` | decimal | Suma de `(precio_venta - costo) × cantidad` |
116: | `total_comision` | decimal | Comisión total del vendedor en USD |
117: | `ganancia_perdida_cambiaria` | decimal | Diferencia cambiaria (CUP real vs oficial) |
118: | `ganancia_real_total` | decimal | `total_ganancia + ganancia_perdida_cambiaria` |
119: | `total_esperado_usd` | decimal | Costo total + ganancia objetivo |
120: | `moneda_id` | FK | Moneda principal de la venta |
121: | `tasa_cambio_principal` | decimal | Tasa al momento de crear |
122: 
123: #### Campos de mensajero
124: | Campo | Tipo | Descripción |
125: |---|---|---|
126: | `mensajero_monto` | decimal nullable | Monto mensajero en USD equivalente |
127: | `mensajero_tipo` | enum nullable | `propio` o `externo` |
128: | `mensajero_cuenta_id` | FK nullable | Cuenta CUP que recibe/paga al mensajero |
129: | `mensajero_tasa` | decimal nullable | Tasa referencia (ya no dicta el monto final) |
130: | `mensajero_monto_final_cup` | decimal nullable | **Monto real en CUP** — editable en Show.tsx |
131: | `mensajero_moneda_id` | FK nullable | Moneda original del cliente |
132: | `mensajero_monto_original` | decimal nullable | Monto en moneda original del POS |
133: | `mensajero_tasa_entrada` | decimal nullable | Tasa usada en POS para convertir a USD |
134: 
135: #### Campos de comisión vendedor
136: | Campo | Tipo | Descripción |
137: |---|---|---|
138: | `comision_cuenta_id` | FK nullable | Cuenta CUP de donde sale la comisión |
139: | `comision_tasa` | decimal nullable | Tasa CUP/USD para la comisión |
140: 
141: #### Campos de gestor
142: | Campo | Tipo | Descripción |
143: |---|---|---|
144: | `es_venta_gestor` | boolean | XOR con comisión vendedor |
145: | `gestor_cuenta_id` | FK nullable | Cuenta del gestor |
146: | `gestor_monto` | decimal nullable | Monto a descontar al gestor |
147: | `gestor_comentario` | text nullable | |
148: | `tasa_aplicada_gestor` | decimal nullable | |
149: | `tasa_aplicada_venta` | decimal nullable | |
150: 
151: ---
152: 
153: ### `venta_detalles`
154: | Campo | Tipo | Descripción |
155: |---|---|---|
156: | `id` | PK | |
157: | `venta_id` | FK | |
158: | `producto_id` | FK | |
159: | `producto_codigo_id` | FK nullable | Código de barras específico usado |
160: | `cantidad` | int | |
161: | `precio_venta` | decimal | Precio aplicado en esta venta |
162: | `precio_compra` | decimal | Costo unitario al momento de la venta |
163: | `subtotal` | decimal | `precio_venta × cantidad` |
164: | `ganancia` | decimal | `(precio_venta - precio_compra) × cantidad` |
165: | `comision_unitaria` | decimal | Comisión por unidad calculada |
166: 
167: ---
168: 
169: ### `pago_ventas`
170: | Campo | Tipo | Descripción |
171: |---|---|---|
172: | `id` | PK | |
173: | `venta_id` | FK | |
174: | `cuenta_id` | FK nullable | **XOR** con cliente_id |
175: | `cliente_id` | FK nullable | **XOR** con cuenta_id |
176: | `moneda_id` | FK | |
177: | `tipo` | enum | `efectivo`, `transferencia` |
178: | `monto` | decimal | Monto en la moneda del pago |
179: | `tasa_cambio_aplicada` | decimal | |
180: | `monto_equivalente` | decimal | Monto convertido a moneda principal |
181: 
182: ---
183: 
184: ### `cierre_cajas`
185: | Campo | Tipo | Descripción |
186: |---|---|---|
187: | `id` | PK | |
188: | `user_id` | FK | Vendedor que hizo el cierre |
189: | `saldo_esperado` | decimal | Calculado por el sistema |
190: | `saldo_contado` | decimal | Ingresado por el vendedor |
191: | `diferencia` | decimal | `saldo_contado - saldo_esperado` |
192: | `snapshot_cuentas` | json | Saldos de cuentas al momento del cierre |
193: | `snapshot_clientes` | json | Deudas de clientes al momento del cierre |
194: | `mensajero_total_usd` | decimal | Total mensajero del turno en USD |
195: | `mensajero_total_cup` | decimal | Total mensajero del turno en CUP |
196: | `mensajero_count` | int | Número de ventas con mensajero |
197: | `mensajero_detalles` | json nullable | Detalles por venta `{venta_id, monto_usd, monto_cup, tipo}` |
198: 
199: ---
200: 
201: ### `cuentas`
202: | Campo | Tipo | Descripción |
203: |---|---|---|
204: | `id` | PK | |
205: | `nombre_cuenta` | string | |
206: | `tipo_instrumento` | enum | `tarjeta`, `efectivo`, `otro` |
207: | `categoria` | enum | `permanentes`, `temporales`, `deudas` |
208: | `moneda_id` | FK | |
209: | `saldo_cuenta` | decimal | Saldo actual |
210: | `activa` | boolean | |
211: 
212: ---
213: 
214: ### `monedas`
215: | Campo | Tipo | Descripción |
216: |---|---|---|
217: | `id` | PK | |
218: | `nombre` | string | |
219: | `codigo_moneda` | string | Ej: `USD`, `CUP`, `MLC` |
220: | `tasa_cambio` | decimal | Unidades de esta moneda por 1 USD |
221: | `principal` | boolean | La moneda base del sistema |
222: | `activa` | boolean | |
223: 
224: ---
225: 
226: ### `movimientos` (stock)
227: | Campo | Tipo | Descripción |
228: |---|---|---|
229: | `id` | PK | |
230: | `almacen_origen_id` | FK | |
231: | `almacen_destino_id` | FK | |
232: | `user_id` | FK | |
233: | `estado` | enum | `pendiente_confirmacion`, `en_transito`, `recibido_completo`, `recibido_parcial`, `rechazado`, `cancelado` |
234: | `notas` | text nullable | |
235: 
236: **Relaciones:** `hasMany(MovimientoDetalle)`, `hasMany(MovimientoSeguimiento)`
237: 
238: ---
239: 
240: ### `movimientos_financieros`
241: | Campo | Tipo | Descripción |
242: |---|---|---|
243: | `id` | PK | |
244: | `tipo_movimiento_financiero_id` | FK | 1=Gasto, 2=Ingreso, 3=Transferencia |
245: | `cuenta_origen_id` | FK nullable | |
246: | `cuenta_destino_id` | FK nullable | |
247: | `monto` | decimal | |
248: | `moneda_id` | FK | |
249: | `descripcion` | text nullable | |
250: | `saldo_anterior_origen` | decimal nullable | Snapshot para auditoría |
251: | `saldo_posterior_origen` | decimal nullable | |
252: | `saldo_anterior_destino` | decimal nullable | |
253: | `saldo_posterior_destino` | decimal nullable | |
254: 
255: ---
256: 
257: ### `clientes`
258: | Campo | Tipo | Descripción |
259: |---|---|---|
260: | `id` | PK | |
261: | `nombre_cliente` | string | |
262: | `tipo` | enum | `fisico`, `asociado` |
263: | `telefono` | string nullable | |
264: | `deuda_pago_cliente` | decimal | Deuda acumulada pendiente |
265: 
266: ---
267: 
268: ### `compras`
269: | Campo | Tipo | Descripción |
270: |---|---|---|
271: | `id` | PK | |
272: | `almacen_id` | FK | |
273: | `proveedor_id` | FK nullable | |
274: | `cliente_id` | FK nullable | Cuando la fuente es un cliente reseller |
275: | `tipo_pago` | enum | `deuda_proveedor`, `pago_cash` |
276: | `total` | decimal | |
277: 
278: **Relaciones:** `hasMany(CompraProducto)`, `hasMany(CompraPago)`
279: 
280: ---
281: 
282: ## Relaciones importantes
283: 
284: ```
285: users ─── user_almacens ─── almacens
286:        └── user_cuentas  ─── cuentas
287: 
288: almacens ─── almacen_producto ─── productos
289:           └── producto_vendedors
290: 
291: ventas ─── venta_detalles ─── productos
292:         └── pago_ventas ─── cuentas | clientes
293: 
294: cierre_cajas ─── users (el vendedor que cerró)
295: ```
296: 
297: ---
298: 
299: ## Índice de migraciones recientes (2026)
300: 
301: | Migración | Qué hace |
302: |---|---|
303: | `2026_07_01_000001_add_mensajero_snapshot_to_cierre_cajas` | 4 columnas mensajero en cierre_cajas |
304: | `2026_06_29_000001_add_mensajero_cuenta_origen_to_ventas` | Campo `mensajero_cuenta_origen` |
305: | `2026_06_28_000001_add_mensajero_monto_final_cup_to_ventas` | Campo `mensajero_monto_final_cup` |
306: | `2026_06_25_000001_add_mensajero_moneda_fields_to_ventas` | 3 campos de mensajero multi-moneda |
307: | `2026_06_23_000001_add_comision_cuenta_to_ventas` | Campos `comision_cuenta_id`, `comision_tasa` |
308: | `2026_06_22_000001_add_mensajero_cuenta_to_almacens` | `mensajero_cuenta_id` en almacens |
309: | `2026_06_22_000002_add_mensajero_fields_to_ventas` | Campos mensajero base en ventas |
310: | `2026_06_02_*` | `telegram_chat_id` y `telegram_link_token` en users |
311: | `2026_05_25_*` | `comision_unitaria` en venta_detalles, `total_comision` en ventas |
312: | `2026_05_14_*` | Tabla `producto_codigos` |

(End of file - total 312 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/ventas/flujos-venta.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/ventas/flujos-venta.md</path>
<type>file</type>
<content>
1: # Flujos de Venta — Contexto y Diseño
2: 
3: **Última actualización:** 2026-06-28
4: 
5: ---
6: 
7: ## Actor principal: El Vendedor
8: 
9: El vendedor gestiona el ciclo completo de una venta normal de principio a fin.
10: El admin solo interviene en ventas especiales (precio por debajo del mínimo permitido).
11: 
12: ---
13: 
14: ## Los tres flujos de dinero en una venta
15: 
16: Son independientes entre sí. No se tocan.
17: 
18: ```
19: CLIENTE PAGA: $115 (ejemplo)
20:      │
21:      ├─── $105 → FLUJO PRODUCTOS
22:      │           ├─ costo              → lo que costó el producto
23:      │           ├─ comisión vendedor  → su ganancia por vender
24:      │           └─ ganancia agencia   → margen neto de la tienda
25:      │
26:      └─── $10  → FLUJO MENSAJERO (pass-through)
27:                  → va directo a la cuenta del mensajero (propio o externo)
28:                  → NO es ingreso de la agencia
29:                  → NO entra en cálculo de comisiones
30:                  → NO entra en cálculo cambiario
31: ```
32: 
33: ---
34: 
35: ## Comisiones: vendedor O gestor, nunca ambos (XOR)
36: 
37: La comisión de los productos va siempre a UNO solo — decisión excluyente:
38: 
39: ```
40: Si hay gestor    → la comisión completa va al gestor
41: Si no hay gestor → la comisión completa va al vendedor (punto de venta)
42: ```
43: 
44: Esta regla se llama XOR: activar uno desactiva el otro automáticamente.
45: La UI debe reflejar esto con un selector visible (ver sección "Distribución").
46: 
47: ### Reglas de comisión por ítem según precio aplicado
48: 
49: ```
50: precio_base      = precio estándar asignado al vendedor
51: comision_base    = ganancia base del vendedor al precio estándar
52: precio_minimo    = precio_base - comision_base  (suelo sin venta especial)
53: ```
54: 
55: | Situación | Comisión vendedor |
56: |---|---|
57: | `precio = precio_base` | `comision_base` |
58: | `precio > precio_base` | `comision_base + (precio - precio_base)` |
59: | `precio_minimo ≤ precio < precio_base` | `max(0, comision_base - descuento)` |
60: | `precio < precio_minimo` | `0` — requiere venta especial |
61: 
62: La ganancia de la agencia es constante. Todo markup extra que ponga el vendedor
63: va a su propia comisión, no a la agencia.
64: 
65: ---
66: 
67: ## Cálculo cambiario (excluye mensajero)
68: 
69: ```php
70: usd_objetivo           = costo_productos + ganancia_productos   // solo productos
71: monto_esperado_oficial = usd_objetivo × tasa_oficial
72: monto_real_cobrado     = sum(pagos en moneda_cobro)
73: monto_real_productos   = monto_real_cobrado - mensajero_en_moneda_cobro
74: diferencia_cambiaria   = monto_real_productos - monto_esperado_oficial
75: ```
76: 
77: El mensajero se excluye porque es un pass-through y no es ingreso de la agencia.
78: 
79: ---
80: 
81: ## Qué se gestiona en cada pantalla
82: 
83: ### POS — Index.tsx
84: 
85: | Sección | Contenido |
86: |---|---|
87: | Almacén / Cliente | Selección inicial |
88: | Carrito | Productos, cantidades, precios individuales, comisión estimada en tiempo real |
89: | Mensajero | Checkbox opcional → selector de moneda (cualquiera del sistema) + monto |
90: | Resumen | Subtotal productos / + Mensajería (con equivalente USD si no es USD) / Total |
91: | Pagos | PaymentForm: múltiples métodos y monedas hasta cubrir el total completo |
92: 
93: **El mensajero en el POS es solo el monto que paga el cliente por el envío.**
94: No define quién lo recibe ni cómo se transfiere. Eso se configura en Show.tsx.
95: 
96: **Multi-moneda en mensajero (implementado 2026-06-25):**
97: - El usuario selecciona la moneda en que el cliente paga el mensajero (USD, CUP, CUF, etc.)
98: - Si no es USD: ingresa o edita la tasa de conversión → el sistema calcula el equivalente USD
99: - El equivalente USD se suma al total del carrito
100: - Se guardan tres campos nuevos: `mensajero_moneda_id`, `mensajero_monto_original`, `mensajero_tasa_entrada`
101: - `mensajero_monto` siempre se almacena como USD (para movimientos de cuentas y reportes)
102: 
103: ### Show.tsx — Panel "Distribución de la Venta"
104: 
105: Aparece solo en ventas `pendiente`. Se gestiona ANTES de aprobar.
106: 
107: | Sección | Contenido |
108: |---|---|
109: | Resumen de cobro | Productos / Mensajería / Total cliente / Pagos recibidos desglosados |
110: | Mensajero | Configura tipo (propio/externo) + cuenta CUP + **monto final CUP editable** (permite premio/sanción) |
111: | Comisión | Selector XOR: **Punto de Venta** O **Gestor** (nunca ambos) |
112: 
113: **Comisión — diseño propuesto (pendiente de implementar):**
114: El panel de distribución debe mostrar un selector explícito con dos botones:
115: 
116: ```
117: [● Punto de Venta]  [○ Gestor]
118: ```
119: 
120: - Al seleccionar **Punto de Venta**: muestra form cuenta CUP + tasa
121: - Al seleccionar **Gestor**: muestra info del gestor configurado, o botón para configurarlo
122: - Cambiar de modo → dialog de confirmación → limpia campos del modo anterior en backend
123: 
124: Actualmente el modo se infiere implícitamente de si existe `gestor` en la venta,
125: lo que genera confusión y riesgo de tener ambos configurados en DB simultáneamente.
126: 
127: **El mensajero siempre se paga en CUP:**
128: - **Propio:** `monto_final_cup` se acredita en la cuenta CUP (entra dinero)
129: - **Externo:** `monto_final_cup` se debita de la cuenta CUP (sale dinero para pagar al mensajero)
130: 
131: **Monto final CUP editable (implementado 2026-06-28):**
132: - `monto_original` del POS es la referencia inmutable — lo que el cliente pagó
133: - `monto_final_cup` en Show es el monto real que se mueve en la cuenta — editable
134: - Si `monto_final_cup > monto_original` → premio al mensajero (verde en UI)
135: - Si `monto_final_cup < monto_original` → sanción al mensajero (amarillo en UI)
136: - Si no se edita → backend usa `monto_original` como fallback
137: - La tasa ya no dicta el monto final — es solo referencia informativa
138: 
139: ### Show.tsx — Otras secciones
140: 
141: - **Editar precios/pagos:** ajuste de precio por ítem con comisión recalculada en tiempo real
142: - **Destinatario / Gestor:** modal con tabs — Receptor (datos físicos) + Gestor (switch + config)
143: - **Aprobar:** activo cuando hay destinatario y fondos suficientes
144: - **Anular:** disponible con motivo
145: 
146: ---
147: 
148: ## Flujos completos
149: 
150: ### Flujo A — Venta simple
151: ```
152: POS:   productos → pago USD → crear venta
153: Show:  (opcional) ajustar precio → configurar comisión [PV] cuenta CUP + tasa → aprobar
154: ```
155: 
156: ### Flujo B — Venta con mensajero propio
157: ```
158: POS:   productos ($100) + mensajero 5000 CUP (tasa 500 = $10 USD) = total cliente $110
159:        cliente paga $110 completo
160:        → mensajero_monto = $10 USD, mensajero_monto_original = 5000 CUP
161: 
162: Show:  mensajero: tipo=propio
163:        monto_final_cup = 5000 CUP (o ajustado: 5500 = premio, 4500 = sanción)
164:        cuenta CUP del vehículo/negocio → se acreditan los CUP
165:        comisión [PV]: cuenta CUP, tasa → X CUP debitados
166:        aprobar
167: ```
168: 
169: ### Flujo C — Venta con mensajero externo
170: ```
171: POS:   productos + mensajero 8000 CUP = total cliente
172:        cliente paga todo
173: 
174: Show:  mensajero: tipo=externo
175:        monto_final_cup = 8000 CUP (editable — permite premio o sanción)
176:        cuenta CUP de la empresa → 8000 CUP salen (se le pagan en mano al mensajero)
177:        comisión → [PV] o [Gestor]
178:        aprobar
179: ```
180: 
181: ### Flujo D — Venta con gestor
182: ```
183: POS:   productos → pago → crear venta
184: 
185: Show:  modal destinatario → tab Gestor → switch ON → configurar monto, cuenta, tasa
186:        comisión selector: cambiar a [Gestor]
187:        La comisión de productos va completa al gestor
188:        El vendedor no recibe comisión directa
189:        aprobar
190: ```
191: 
192: ### Flujo E — Venta especial (precio bajo mínimo)
193: ```
194: POS:   vendedor intenta precio bajo el mínimo → sistema activa modo especial
195:        vendedor escribe justificación → crear solicitud (estado: solicitud_especial)
196: 
197: Show vendedor:  ve "esperando decisión del admin" — sin comisión
198: Show admin:     análisis de pérdida, costos internos → aprueba o rechaza con nota
199: Vendedor:       recibe notificación de la decisión
200: ```
201: 
202: ---
203: 
204: ## Campos clave en tabla `ventas`
205: 
206: | Campo | Descripción |
207: |---|---|
208: | `mensajero_monto` | Monto mensajero en USD (siempre) |
209: | `mensajero_tipo` | `propio` / `externo` |
210: | `mensajero_cuenta_id` | Cuenta que recibe/paga el mensajero |
211: | `mensajero_tasa` | Tasa CUP/USD para el movimiento de cuenta (se pone en Show.tsx) |
212: | `mensajero_moneda_id` | Moneda original del cliente (CUP, CUF, USD, etc.) |
213: | `mensajero_monto_original` | Monto en la moneda original del cliente |
214: | `mensajero_tasa_entrada` | Tasa usada en el POS para convertir a USD |
215: | `comision_cuenta_id` | Cuenta CUP donde va la comisión del vendedor |
216: | `comision_tasa` | Tasa CUP/USD para la comisión del vendedor |
217: | `es_venta_gestor` | Boolean — XOR flag: true = comisión va al gestor |
218: | `gestor_cuenta_id` | Cuenta del gestor |
219: | `gestor_monto` | Monto en moneda local a descontar al gestor |
220: | `tasa_aplicada_gestor` | Tasa para calcular monto_usd del gestor |
221: 
222: ---
223: 
224: ## Endpoints clave
225: 
226: | Ruta | Método | Descripción |
227: |---|---|---|
228: | `/ventas/procesar` | POST | Crear venta — recibe items, total, pagos, mensajero multi-moneda |
229: | `/ventas/{venta}/distribucion` | POST | Guardar mensajero (tipo/cuenta/tasa) y/o comisión vendedor |
230: | `/ventas/{venta}/destinatario` | POST | Guardar destinatario y/o gestor |
231: | `/ventas/{venta}/aprobar` | POST | Aprobar venta pendiente — ejecuta todos los movimientos |
232: | `/ventas/{venta}/editar-pendiente` | POST | Editar precios/pagos de venta pendiente |
233: | `/ventas/{venta}/anular` | POST | Anular venta con motivo (revierte movimientos si completada) |
234: 
235: ---
236: 
237: ## Estado actual (2026-06-25)
238: 
239: ### Implementado y funcional
240: 
241: - **POS:** mensajero multi-moneda — selector de moneda + monto + tasa editable → equivalente USD se suma al total
242: - **POS:** desglose en resumen: `CUP5000 ≈ $10.00` cuando no es USD
243: - **POS:** campos `mensajero_moneda_id`, `mensajero_monto_original`, `mensajero_tasa_entrada` enviados al backend
244: - **Backend:** migración con 3 nuevos campos en `ventas`
245: - **Backend:** modelo `Venta` — fillable + casts + relación `mensajeroMoneda()`
246: - **Backend:** `procesarVenta` — valida y guarda los 3 nuevos campos
247: - **Backend:** `show()` — devuelve `moneda_codigo`, `moneda_id`, `monto_original`, `tasa_entrada` en mensajero
248: - **Backend:** `aprobarVenta` — lógica smart: usa `monto_original` si moneda no es USD, si no convierte via tasa
249: - **Backend:** `anularVenta` — misma lógica smart para reversión
250: - **Backend:** `guardarDistribucion` — fix bug: `mensajeroEnUSD` siempre se incluye si `monto > 0`
251: - **POS:** UI mensajero separada en filas (no cramped), selector + monto + tasa en bloques
252: - **Show:** comisión vendedor O gestor (XOR visual — gestor oculta el form de vendedor)
253: - **Show:** panel de distribución unificado con resumen de cobro + mensajero + comisión
254: - **Show:** validación de saldo antes de aprobar (gestor y comisión PV)
255: 
256: ### Pendiente / En progreso
257: 
258: #### Bugs críticos (VentaController)
259: 
260: | # | Bug | Ubicación | Descripción |
261: |---|---|---|---|
262: | B1 | `saldo_actual` vs `saldo_cuenta` | `guardarDistribucion` ~L1759 | Devuelve `saldo_actual` en `comision_pago.cuenta` pero el campo real es `saldo_cuenta` |
263: | B2 | Sin guardia XOR en aprobación | `aprobarVenta` + `anularVenta` | Falta `&& !$venta->es_venta_gestor` en el bloque de comisión vendedor → podría debitar ambas cuentas |
264: | B3 | `foreach` en null | `procesarVenta` ~L803 | `foreach ($validatedData['pagos'] as $pago)` sin `?? []` — crashea si pagos es null |
265: 
266: #### Features pendientes (Show.tsx)
267: 
268: | # | Feature | Descripción |
269: |---|---|---|
270: | F1 | Selector XOR comisión | Reemplazar lógica implícita por botones `[Punto de Venta] / [Gestor]` visibles en el panel de distribución |
271: | F2 | Display mensajero multi-moneda | Actualizar interface TypeScript y display: `moneda` puede ser CUF u otra, no solo USD/CUP |
272: | F3 | Form edición mensajero en Show.tsx | Actualmente solo ofrece USD/CUP — debe soportar cualquier moneda del sistema |
273: 
274: #### Pendientes generales
275: 
276: - Separar `ganancia_real_total` del cálculo (actualmente muestra 0 en algunos casos)
277: - Mover configuración de cuenta mensajero del almacén de Almacenes/Edit a Empleados/Edit
278: - Filtrar cuentas CUP-only en `AlmacenController@edit`
279: - Cierre de caja: problemas 2, 3, 4 (ver `pendiente-cierre-caja.md`)

(End of file - total 279 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/ventas/contexto-actual.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/ventas/contexto-actual.md</path>
<type>file</type>
<content>
1: # Contexto de Ventas — Estado Actual del Código
2: 
3: **Creado:** 2026-06-28
4: **Última actualización:** 2026-07-01
5: **Referencia:** Ver `flujos-venta.md` para diseño y flujos, `pendiente-cierre-caja.md` para cierre.
6: 
7: ---
8: 
9: ## Archivos involucrados en el sistema de ventas
10: 
11: | Archivo | Rol |
12: |---|---|
13: | `app/Http/Controllers/VentaController.php` | Controlador principal |
14: | `app/Models/Venta.php` | Modelo principal |
15: | `app/Models/VentaDetalle.php` | Ítem por producto |
16: | `app/Models/PagoVenta.php` | Pago individual (puede ir a cuenta o cliente) |
17: | `app/Models/AlmacenProducto.php` | Stock por almacén |
18: | `app/Models/HistorialStock.php` | Auditoría de movimientos de stock |
19: | `app/Models/ProductoCodigo.php` | Códigos de barras por producto |
20: | `app/Models/Cuenta.php` | Cuenta financiera (con moneda, tipo, saldo) |
21: | `app/Models/Cliente.php` | Cliente (físico o asociado, con deuda) |
22: | `app/Notifications/VentaCreadaNotification.php` | Notificación venta normal |
23: | `app/Notifications/VentaEspecialSolicitudNotification.php` | Notificación solicitud especial |
24: | `app/Notifications/VentaEspecialDecisionNotification.php` | Notificación decisión admin |
25: | `resources/js/pages/Vendor/Index.tsx` | POS — punto de venta |
26: | `resources/js/pages/Vendor/Show.tsx` | Detalle y gestión de venta pendiente |
27: | `resources/js/pages/Vendor/Listado.tsx` | Listado de ventas con filtros |
28: | `resources/js/pages/Vendor/ReporteDiario.tsx` | Reporte diario |
29: | `database/tables/producto_vendedors` | Precios y comisiones por almacén/producto |
30: 
31: ---
32: 
33: ## Estados posibles de una venta
34: 
35: ```
36: pendiente → completada
37: pendiente → cancelada
38: solicitud_especial → pendiente (si admin aprueba)
39: solicitud_especial → rechazada (si admin rechaza)
40: completada → cancelada
41: ```
42: 
43: ---
44: 
45: ## Mapa de métodos del controlador
46: 
47: ### Endpoints de datos (API JSON)
48: 
49: | Método | Ruta aproximada | Qué devuelve |
50: |---|---|---|
51: | `getAlmacenes()` | GET | Almacenes accesibles + mensajero_cuenta del almacén |
52: | `getProductosPorAlmacen($id)` | GET | Productos con stock, precio_base, comision del almacén |
53: | `getClientes()` | GET | id + nombre_cliente |
54: | `getCuentas()` | GET | Cuentas accesibles con moneda y saldo |
55: | `getCuentasFiltradas()` | GET | Cuentas filtradas por moneda_id + método pago (efectivo/tarjeta) |
56: | `getCuentasParaGestor()` | GET | Cuentas con tipo (efectivo/tarjeta) para selector de gestor |
57: | `getMonedas()` | GET | Monedas activas con tasa_cambio |
58: | `storeClienteForVenta()` | POST | Crea cliente o devuelve existente (busca por nombre o teléfono) |
59: | `getClientesFisicosParaPago()` | GET | Clientes físicos con deuda actual |
60: 
61: ### Endpoints de vistas (Inertia)
62: 
63: | Método | Vista |
64: |---|---|
65: | `index()` | `Vendor/Index` — pasa monedas, cuentas y almacenes del usuario |
66: | `show($id)` | `Vendor/Show` — carga venta completa con todas las relaciones |
67: | `listadoVentas()` | `Vendor/Listado` — paginado × 15, filtros por estado/almacén/fecha |
68: | `showReporteDiarioView()` | `Vendor/ReporteDiario` |
69: 
70: ### Endpoints de procesamiento
71: 
72: | Método | Qué hace |
73: |---|---|
74: | `procesarVenta()` | Crea venta, descuenta stock inmediatamente, calcula comisión, crea pagos |
75: | `guardarDestinatario()` | Guarda receptor + configura gestor (solo en estado `pendiente`) |
76: | `guardarDistribucion()` | Configura mensajero (tipo/cuenta/monto_final_cup) y/o comisión vendedor |
77: | `editarVentaPendiente()` | Reemplaza pagos completo + recalcula precios/comisiones si vienen items |
78: | `aprobarVenta()` | Ejecuta todos los movimientos financieros → estado `completada` |
79: | `anularVenta()` | Revierte stock siempre; revierte financiero solo si estaba `completada` |
80: | `aprobarSolicitudEspecial()` | Admin: especial → pendiente + notifica vendedor |
81: | `rechazarSolicitudEspecial()` | Admin: revierte stock + estado rechazada + notifica vendedor |
82: | `marcarDecisionNotificada()` | Vendedor confirma que vio el veredicto |
83: 
84: ---
85: 
86: ## Tabla `producto_vendedors` — precios por almacén
87: 
88: Es la fuente de `precio_base` y `comision` por producto en cada almacén.
89: Se consulta en `procesarVenta`, `editarVentaPendiente`, y `getProductosPorAlmacen`.
90: 
91: ```
92: almacen_id | producto_id | precio_venta (= precio_base) | comision
93: ```
94: 
95: Si un producto no tiene fila en esta tabla → el almacén se bloquea con error `almacen_incompleto`.
96: 
97: ---
98: 
99: ## Reglas de precio y comisión
100: 
101: ```
102: precio_minimo    = precio_base - comision_base
103: precio_venta     >= precio_minimo          → venta normal
104: precio_venta     < precio_minimo           → requiere venta especial (bloqueo)
105: precio_venta     < precio_compra_producto  → requiere venta especial
106: 
107: comision_unitaria:
108:   venta especial                  → 0
109:   precio_venta >= precio_base     → comision_base + (precio_venta - precio_base)
110:   precio_venta <  precio_base     → max(0, comision_base - (precio_base - precio_venta))
111: ```
112: 
113: La ganancia de la agencia es siempre `(precio_venta - precio_compra) * cantidad - comision_unitaria * cantidad`.
114: 
115: ---
116: 
117: ## Mensajero — campos en `ventas`
118: 
119: El mensajero es el cobro por entrega a domicilio. El cliente lo paga en el POS junto a los
120: productos. En Show se configura a quién se le paga y cuánto exactamente.
121: 
122: | Campo | Cuándo se llena | Descripción |
123: |---|---|---|
124: | `mensajero_monto` | POS | Equivalente en USD del cobro al cliente |
125: | `mensajero_moneda_id` | POS | Moneda en que el cliente pagó el envío |
126: | `mensajero_monto_original` | POS | Monto en moneda original (referencia inmutable del POS) |
127: | `mensajero_tasa_entrada` | POS | Tasa usada para calcular el equivalente USD |
128: | `mensajero_tipo` | Show | `propio` o `externo` |
129: | `mensajero_cuenta_id` | Show | Cuenta CUP que recibe o paga al mensajero |
130: | `mensajero_tasa` | Show | Tasa CUP/USD (referencia — ya no dicta el monto final) |
131: | `mensajero_monto_final_cup` | Show | **Monto real en CUP que se mueve en la cuenta** (editable, permite premio/sanción) |
132: 
133: ### Reglas del mensajero
134: 
135: - El cliente **siempre paga en CUP** → se convierte a USD por tasa para acumular al total
136: - La empresa **siempre paga al mensajero en CUP** → la cuenta en Show es siempre CUP
137: - `monto_original` es la referencia del POS — **no se modifica desde Show**
138: - `monto_final_cup` es el monto editable — puede ser mayor (premio) o menor (sanción) que `monto_original`
139: - Si `monto_final_cup` no está configurado, el backend usa `monto_original` como fallback
140: 
141: **Efecto en cuenta al aprobar:**
142: - `propio` → `cuentaMensajero.saldo += monto_final_cup`
143: - `externo` → `cuentaMensajero.saldo -= monto_final_cup`
144: 
145: **El mensajero se excluye del total USD de productos y del cálculo cambiario.**
146: 
147: ### Validaciones en `aprobarVenta` (añadidas 2026-06-28)
148: 
149: ```
150: Si mensajero_monto > 0 y mensajero_cuenta_id es null  → bloquea con error
151: Si mensajero_monto > 0 y mensajero_tipo es null       → bloquea con error
152: ```
153: 
154: Antes de esta corrección el movimiento se saltaba silenciosamente si faltaban estos campos.
155: 
156: ---
157: 
158: ## Gestor — campos en `ventas`
159: 
160: | Campo | Descripción |
161: |---|---|
162: | `es_venta_gestor` | Boolean — activa el modo gestor (XOR con comisión vendedor) |
163: | `gestor_cuenta_id` | Cuenta de donde se descuenta la comisión al gestor |
164: | `gestor_monto` | Monto a descontar (en moneda de la cuenta del gestor) |
165: | `gestor_comentario` | Nota libre |
166: | `tasa_aplicada_gestor` | Tasa para calcular `gestor_monto_usd = gestor_monto / tasa` |
167: | `tasa_aplicada_venta` | Tasa real a la que se realizó la venta (puede diferir de oficial) |
168: 
169: Se puede configurar en `procesarVenta` (POS) o en `guardarDestinatario` (Show).
170: En ventas especiales: gestor siempre se fuerza a null/0.
171: 
172: **Al aprobar:** `cuentaGestor.saldo -= gestor_monto` (requiere saldo suficiente → excepción si no alcanza).
173: 
174: ---
175: 
176: ## Comisión vendedor — campos en `ventas`
177: 
178: | Campo | Descripción |
179: |---|---|
180: | `comision_cuenta_id` | Cuenta CUP de donde sale la comisión |
181: | `comision_tasa` | Tasa CUP/USD |
182: | `total_comision` | Total en USD calculado al crear la venta |
183: 
184: **Al aprobar:** `cuentaComision.saldo -= total_comision × comision_tasa` (en CUP).
185: Solo aplica si `!es_venta_gestor && total_comision > 0 && comision_cuenta_id && comision_tasa > 0`.
186: 
187: ---
188: 
189: ## Pagos (`pago_ventas`)
190: 
191: Cada pago tiene destino XOR:
192: - `cuenta_id` → al aprobar: `cuenta.saldo += pago.monto` (si monedas coinciden)
193: - `cliente_id` → al aprobar: `cliente.deuda_pago_cliente += pago.monto` (solo clientes físicos)
194: 
195: No pueden tener ambos (validado en backend con excepción).
196: Regalos (`total = 0`) pueden tener `pagos = []` vacío.
197: 
198: ---
199: 
200: ## Orden de ejecución en `aprobarVenta`
201: 
202: ```
203: 0. Validaciones previas (ANTES de la transacción):
204:    - estado === 'pendiente'
205:    - tiene destinatario
206:    - si mensajero_monto > 0: debe tener mensajero_cuenta_id y mensajero_tipo
207: 
208: 1. estado → completada
209: 2. Procesar pagos:
210:    - cliente físico → incrementa deuda_pago_cliente
211:    - cuenta → incrementa saldo_cuenta (si moneda coincide)
212: 3. Calcular ganancia_perdida_cambiaria (solo sobre CUP, sin mensajero)
213: 4. Actualizar ganancia_perdida_cambiaria y ganancia_real_total
214: 5. Descuento gestor (si es_venta_gestor && gestor_cuenta_id && gestor_monto > 0)
215: 6. Mensajero (si mensajero_monto > 0 && mensajero_cuenta_id):
216:    montoFinal = mensajero_monto_final_cup ?? mensajero_monto_original
217: 7. Comisión vendedor (si !es_venta_gestor && comision_cuenta_id && comision_tasa > 0)
218: ```
219: 
220: ---
221: 
222: ## Reversión en `anularVenta`
223: 
224: ```
225: SIEMPRE (pendiente o completada):
226:   - almacen_producto.cantidad += detalle.cantidad  (por cada detalle)
227:   - producto_codigo.cantidad += detalle.cantidad    (al código exacto, o default si no hay)
228:   - HistorialStock tipo 'venta_anulada'
229: 
230: SOLO SI estaba completada:
231:   - cliente.deuda_pago_cliente -= pago.monto       (pagos a clientes)
232:   - cuenta.saldo -= pago.monto                     (pagos a cuentas)
233:   - gestorCuenta.saldo += gestor_monto             (revertir gestor)
234:   - mensajeroCuenta.saldo +=/-= montoFinal         (inverso al tipo propio/externo)
235:     donde montoFinal = mensajero_monto_final_cup ?? mensajero_monto_original
236:   - comisionCuenta.saldo += total_comision × tasa  (revertir comisión vendedor)
237: ```
238: 
239: ---
240: 
241: ## Bugs resueltos (2026-06-28)
242: 
243: | ID | Ubicación | Descripción | Estado |
244: |---|---|---|---|
245: | B_mensajero_skip | `aprobarVenta` | Movimiento del mensajero se saltaba silenciosamente si faltaba cuenta o tipo | ✅ Resuelto — bloquea con error claro |
246: | B_mensajero_tasa | `aprobarVenta` / Show.tsx | La tasa en Show no tenía efecto real cuando moneda era CUP | ✅ Resuelto — reemplazado por `monto_final_cup` editable |
247: 
248: ## Bugs pendientes conocidos
249: 
250: | ID | Ubicación | Descripción | Impacto |
251: |---|---|---|---|
252: | B1 | `guardarDistribucion` | Devuelve `saldo_actual` en respuesta pero el campo es `saldo_cuenta` | UI muestra dato incorrecto |
253: | B2 | `aprobarVenta` / `anularVenta` | Falta guardia XOR — la comisión vendedor podría ejecutarse aunque haya gestor | Doble débito potencial |
254: | B3 | `procesarVenta` | `foreach ($validatedData['pagos'] as $pago)` sin `?? []` (línea ~810) | Crash si pagos es null |
255: 
256: ---
257: 
258: ## Features pendientes conocidas
259: 
260: | ID | Pantalla | Descripción |
261: |---|---|---|
262: | F1 | Show.tsx | Selector XOR visual `[Punto de Venta] / [Gestor]` en panel distribución |
263: 
264: ---
265: 
266: ## Cierre de Caja — Archivos y estructura (actualizado 2026-07-01)
267: 
268: | Archivo | Rol |
269: |---|---|
270: | `app/Http/Controllers/CierreCajaController.php` | Controlador del cierre — `create()`, `store()`, `show()`, `obtenerDetallesCierre()` |
271: | `app/Models/CierreCaja.php` | Modelo — snapshot financiero del turno |
272: | `resources/js/pages/Cierres/Create.tsx` | Vista de creación — preview en tiempo real |
273: | `resources/js/pages/Cierres/Show.tsx` | Vista histórica de cierre guardado |
274: | `database/migrations/2026_07_01_000001_add_mensajero_snapshot_to_cierre_cajas.php` | Añade 4 columnas mensajero al cierre |
275: 
276: ### Patrón snapshot
277: 
278: El cierre es un documento histórico — los datos se guardan al momento del `store()` y no se recalculan.
279: Campos snapshot en `cierre_cajas`: `snapshot_cuentas`, `snapshot_clientes`, `mensajero_detalles`,
280: `mensajero_total_usd`, `mensajero_total_cup`, `mensajero_count`.
281: 
282: En `show()` se usa snapshot si existe; si no (cierres legacy), fallback con recálculo desde DB.
283: 
284: ### Secciones del payload `create()` / `show()`
285: 
286: | Campo | Descripción |
287: |---|---|
288: | `ventas_brutas_usd` | Suma `total_esperado_usd` de ventas completadas del turno |
289: | `comisiones_pv_cup` | `SUM(total_comision * comision_tasa)` — comisión vendedor en CUP |
290: | `comisiones_gestor_cup` | Suma de `gestor_monto` de cuentas CUP |
291: | `comisiones_total_cup` | PV + Gestor |
292: | `comisiones_pv_detalles` | Array `{venta_id, comision_usd, comision_cup, fecha}` por venta |
293: | `mensajero_detalles` | Array `{venta_id, monto_usd, monto_cup, tipo}` por venta |
294: | `mensajero_total_usd` / `_cup` / `_count` | Totales del turno |
295: 
296: ### Modal "Detalles de Venta" (Por dónde entraron → eye icon)
297: 
298: Muestra pagos, productos, y si la venta tuvo mensajero: sección azul "MENSAJERÍA"
299: con CUP + equiv. USD, colocada antes del bloque "Total Venta".
300: 
301: El eye icon está en `Create.tsx` y `Show.tsx`. En Show.tsx, `getOperacionesPorVenta`
302: usa `cierre.detalles` directamente (no `calculos` — se inicializa más tarde con useMemo).
303: 
304: ---
305: 
306: ## Widget de tasas de cambio (TasasFlotante)
307: 
308: Componente global añadido el 2026-06-28 para que vendedores y admin consulten las tasas
309: en cualquier pantalla sin salir del flujo de trabajo.
310: 
311: | Archivo | Rol |
312: |---|---|
313: | `resources/js/components/TasasFlotante.tsx` | Componente flotante |
314: | `app/Http/Middleware/HandleInertiaRequests.php` | Comparte `tasas` globalmente via Inertia |
315: | `resources/js/types/index.d.ts` | Interfaz `TasaMoneda` + campo `tasas` en `SharedData` |
316: | `resources/js/layouts/app/app-sidebar-layout.tsx` | Inyectado aquí |
317: | `resources/js/layouts/app/app-header-layout.tsx` | Inyectado aquí |
318: 
319: **Comportamiento:**
320: - Botón redondo fijo abajo a la derecha en todas las páginas del layout principal
321: - Click → panel con todas las monedas activas ordenadas (principal primero)
322: - Muestra: código de moneda + cuántas unidades equivalen a 1 USD
323: - La moneda base aparece marcada en azul con etiqueta `base`
324: - Solo lectura — no permite editar tasas desde aquí
325: - Las tasas vienen en cada respuesta Inertia (sin llamadas adicionales al servidor)
326: - Soporta modo claro y oscuro
327: 
328: **Por qué es relevante para ventas:**
329: - El vendedor necesita la tasa CUP al configurar el mensajero en Show
330: - Al cobrar pagos en múltiples monedas en el POS, la tasa determina el equivalente USD
331: - El cálculo cambiario al aprobar usa la tasa oficial del sistema
332: 
333: ---
334: 
335: ## Notas rápidas para cambios
336: 
337: - **Validar precios:** siempre consultar `producto_vendedors` (tabla `preciosAlmacen`) — no confiar en `precio_venta` del frontend
338: - **Gestor y comisión son XOR:** si se activa uno, el otro debe limpiarse en DB
339: - **Mensajero es pass-through:** excluir siempre de cálculos de ganancia y cambiario
340: - **Stock se descuenta al crear** (no al aprobar) — reversión siempre aplica sin importar el estado
341: - **Pagos a clientes no modifican cuentas** — solo incrementan deuda del cliente
342: - **Los movimientos financieros (cuentas/deudas) solo ocurren al aprobar**, no al crear
343: - **`monto_final_cup` es la fuente de verdad del mensajero** — no `monto_original` ni `tasa`
344: - **La misma cuenta CUP puede recibir y pagar en la misma aprobación** (pago cliente + mensajero + comisión) — todo ocurre en una sola `DB::transaction()` de forma secuencial

(End of file - total 344 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.8s)

_Thinking:_

Now I have a comprehensive understanding of the project. Let me also look at a few more docs files that might be relevant to understanding "lo ultimo que hicimos" (the last things done).

Let me read some of the most recent documents and the flujos-financieros docs.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/flujos-financieros-comision-mensajero.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/flujos-financieros-comision-mensajero.md</path>
<type>file</type>
<content>
1: # Flujos Financieros: Comisión, Mensajero y Agencia
2: 
3: **Fecha:** 2026-06-23
4: 
5: ---
6: 
7: ## Principio fundamental
8: 
9: El total cobrado al cliente **entra completo al sistema**. Las salidas de comisión y mensajero son movimientos independientes en cuentas CUP — no reducen ni interceptan el pago del cliente.
10: 
11: ---
12: 
13: ## Ejemplo concreto
14: 
15: | Concepto | Monto |
16: |---|---|
17: | Productos | 600 USD |
18: | Mensajero (externo) | 20 USD |
19: | **Total cobrado al cliente** | **620 USD** |
20: | Comisión vendedor (p.ej.) | 10 USD → equivalente CUP |
21: 
22: ### Movimientos al aprobar la venta
23: 
24: ```
25: ENTRADA
26:   +620 USD  → cuentas de cobro (efectivo, transferencia, etc.)
27: 
28: SALIDAS PARALELAS (en CUP, cuentas separadas)
29:   -10 × tasa CUP  → cuenta comisión vendedor
30:   -20 × tasa CUP  → cuenta mensajero (si externo)
31:              o
32:   +20 × tasa CUP  → cuenta del almacén (si propio/vehículo)
33: ```
34: 
35: Los tres movimientos son **completamente independientes entre sí**. Ninguno afecta al otro.
36: 
37: ---
38: 
39: ## Vista contable (lo que muestra el sistema)
40: 
41: El sistema presenta la distribución como:
42: 
43: ```
44: 620 USD total
45:   ├─ 590 USD → Ganancia agencia  (total - comisión - mensajero*)
46:   ├─  10 USD → Comisión vendedor
47:   └─  20 USD → Mensajero
48: ```
49: 
50: > *Nota: en el cálculo real `ganancia_agencia = total_ganancia - total_comision`, donde `total_ganancia` es el margen sobre el costo de los productos. El mensajero se contabiliza por separado. La tabla anterior es una simplificación de la distribución de ingresos.
51: 
52: Esta vista es solo para **control y reporte** — no altera el flujo de dinero descrito arriba.
53: 
54: ---
55: 
56: ## Los tres flujos son independientes
57: 
58: | Flujo | Cuándo se ejecuta | En qué moneda | Quién configura la cuenta |
59: |---|---|---|---|
60: | **Comisión vendedor** | Al aprobar la venta | CUP (debita cuenta del vendedor) | El vendedor al crear la venta |
61: | **Comisión gestor** | Al aprobar la venta | Moneda de la cuenta del gestor | El admin al configurar la venta |
62: | **Mensajero externo** | Al aprobar la venta | CUP (debita cuenta del almacén) | El vendedor al crear la venta |
63: | **Mensajero propio** | Al aprobar la venta | CUP (acredita cuenta del almacén) | Configurado en el almacén |
64: 
65: Cambiar uno no rompe los otros. Son bloques aditivos sobre la misma venta.
66: 
67: ---
68: 
69: ## Lo que NO ocurre (aclaraciones)
70: 
71: - La comisión del vendedor **NO se descuenta del pago del cliente**. El cliente paga el precio completo.
72: - El mensajero **NO reduce el saldo de los pagos recibidos**. Es un débito/crédito CUP aparte.
73: - La "ganancia agencia" en los widgets es **contable/informativa** — el dinero ya está en las cuentas de cobro.
74: - Anular una venta **completada** revierte los tres flujos de CUP automáticamente.

(End of file - total 74 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/pendiente-cierre-caja-comision-vendedor-2026-05-26.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/pendiente-cierre-caja-comision-vendedor-2026-05-26.md</path>
<type>file</type>
<content>
1: # Pendiente: Actualizar CierreCajaController con Comisión Vendedor y Ganancia Agencia
2: 
3: ## Objetivo
4: 
5: Agregar al cierre de caja los totales de **comisión del vendedor** (`total_comision`) y **ganancia de la agencia** (`ganancia_agencia`) del turno, aprovechando los campos que ya existen en la tabla `ventas` tras los cambios del 2026-05-25.
6: 
7: ---
8: 
9: ## Contexto
10: 
11: Tras los cambios del día anterior:
12: - `ventas.total_comision` → suma de comisiones del vendedor por todas las unidades vendidas en esa venta
13: - `ventas.ganancia_agencia` → lo que queda para la agencia = `ganancia - (comision_unitaria × cantidad)` por detalle
14: 
15: El cierre de caja actualmente calcula:
16: - Pagos a cuentas / pagos a clientes
17: - Comisiones a gestores (`comisiones_gestor_total`)
18: - Gastos, ingresos, transferencias
19: 
20: **Lo que falta:** mostrar en el cierre cuánto ganó el vendedor y cuánto quedó para la agencia en ese turno.
21: 
22: ---
23: 
24: ## Cambios necesarios
25: 
26: ### 1. En `obtenerDetallesCierre()` — agregar sumas por turno
27: 
28: Dentro del método privado, después de procesar los pagos, agregar:
29: 
30: ```php
31: // Sumar comisión del vendedor y ganancia agencia del turno
32: $totalComisionVendedor = Venta::where('user_id', $user->id)
33:     ->where('created_at', '>=', $inicioTurno)
34:     ->where('estado', 'completada')
35:     ->sum('total_comision');
36: 
37: $totalGananciaAgencia = Venta::where('user_id', $user->id)
38:     ->where('created_at', '>=', $inicioTurno)
39:     ->where('estado', 'completada')
40:     ->sum('ganancia_agencia');
41: ```
42: 
43: Y agregar al array `$result`:
44: 
45: ```php
46: $result = [
47:     // ...campos existentes...
48:     'comision_vendedor_total' => round((float) $totalComisionVendedor, 2),
49:     'ganancia_agencia_total'  => round((float) $totalGananciaAgencia, 2),
50: ];
51: ```
52: 
53: ---
54: 
55: ### 2. En `create()` — exponer los nuevos campos al frontend
56: 
57: Dentro del array `calculos` que se pasa a `Inertia::render('Cierres/Create', [...])`:
58: 
59: ```php
60: 'calculos' => [
61:     // ...campos existentes...
62:     'comision_vendedor_total' => $calculos['comision_vendedor_total'] ?? 0,
63:     'ganancia_agencia_total'  => $calculos['ganancia_agencia_total'] ?? 0,
64: ],
65: ```
66: 
67: ---
68: 
69: ### 3. En `store()` — guardar o solo exponer (solo reporte)
70: 
71: Estos campos son **solo para reporte** — no mueven dinero. No hace falta guardarlos en `cierre_cajas`. Solo asegurarse de que el frontend los reciba correctamente para mostrarlos en la vista de pre-cierre.
72: 
73: Si en el futuro se decide guardarlos, agregar las columnas a la migración y al modelo `CierreCaja`.
74: 
75: ---
76: 
77: ### 4. Fix del bug de variable `$codigo` sobreescrita
78: 
79: En `obtenerDetallesCierre()`, dentro del `foreach ($pagos as $pago)`:
80: 
81: **Línea 526** define:
82: ```php
83: $codigo = $pago->moneda ? $pago->moneda->codigo_moneda : 'USD'; // moneda ej: 'USD'
84: ```
85: 
86: **Línea 651** sobreescribe con el código del producto:
87: ```php
88: $codigo = $producto ? $producto->codigo_producto : ''; // ← BUG: pisa la variable de moneda
89: ```
90: 
91: **Fix:** renombrar la variable del producto:
92: ```php
93: // Línea 651 — cambiar:
94: $codigo = $producto ? $producto->codigo_producto : '';
95: // Por:
96: $codigoProducto = $producto ? $producto->codigo_producto : '';
97: ```
98: 
99: Y actualizar las referencias posteriores dentro de ese bloque que usen `$codigo` refiriéndose al código de producto.
100: 
101: ---
102: 
103: ## Orden de implementación
104: 
105: 1. Fix bug `$codigoProducto` en `obtenerDetallesCierre()` (línea 651)
106: 2. Agregar queries de `total_comision` y `ganancia_agencia` en `obtenerDetallesCierre()`
107: 3. Agregar campos al array `$result`
108: 4. Exponer en `create()` dentro del array `calculos`
109: 5. Actualizar la vista `Cierres/Create` (frontend) para mostrar los nuevos totales
110: 
111: ---
112: 
113: ## Resultado esperado en el cierre
114: 
115: El pre-cierre mostrará:
116: - Ventas totales cobradas
117: - Comisiones a gestores pagadas
118: - **Comisión del vendedor** (nuevo — solo reporte)
119: - **Ganancia de la agencia** (nuevo — solo reporte)

(End of file - total 119 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/pendiente-autocompletado-gestor-show-2026-05-26.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/pendiente-autocompletado-gestor-show-2026-05-26.md</path>
<type>file</type>
<content>
1: # Pendiente: Autocompletado del Formulario de Gestor en Show.tsx
2: 
3: ## Objetivo
4: 
5: Automatizar el campo **Monto de Comisión** del formulario de Gestor en `resources/js/pages/Vendor/Show.tsx`, de la misma manera que el formulario de pago en `resources/js/pages/Vendor/Index.tsx` autocompleta el monto según la tasa de cambio.
6: 
7: ---
8: 
9: ## Contexto
10: 
11: ### Qué tiene el formulario de Gestor actualmente (Show.tsx)
12: 
13: El tab "Gestor" tiene estos campos:
14: - `tasaAplicadaGestor` — tasa de cambio del gestor (el usuario la ingresa manualmente)
15: - `gestorCuentaId` — cuenta del gestor (Select con las cuentas disponibles)
16: - `gestorMonto` — monto de comisión (el usuario lo ingresa manualmente)
17: - `gestorComentario` — comentario libre
18: 
19: El problema: el usuario tiene que calcular y escribir el monto manualmente.
20: 
21: ### Qué tiene la venta para automatizar
22: 
23: La venta ya tiene `total_comision` = la comisión total del vendedor en USD.  
24: Esta es exactamente la base para calcular el monto del gestor:
25: 
26: ```
27: gestorMonto = total_comision × tasaAplicadaGestor
28: ```
29: 
30: Si la cuenta del gestor es en USD (tasa = 1):
31: ```
32: gestorMonto = total_comision × 1 = total_comision
33: ```
34: 
35: ---
36: 
37: ## Lógica a implementar (similar a Index.tsx)
38: 
39: ### Referencia: cómo funciona en Index.tsx
40: 
41: En `Index.tsx` el formulario de pago:
42: 1. Cuando seleccionas moneda → `exchangeRate` se auto-rellena con la tasa oficial de esa moneda
43: 2. Cuando el usuario edita `exchangeRate` manualmente → `amount` se recalcula: `remainingInUsd × nuevaTasa`
44: 3. Preview en tiempo real: `monto / tasa = USD equivalente`
45: 
46: ### Lo que se debe hacer en Show.tsx (Gestor)
47: 
48: **Trigger 1 — Al seleccionar la cuenta del gestor:**
49: - Detectar la moneda de la cuenta seleccionada
50: - Si la cuenta tiene moneda con `tasa_cambio` conocida → pre-rellenar `tasaAplicadaGestor` con esa tasa
51: - Recalcular `gestorMonto = currentVenta.total_comision × tasa`
52: 
53: **Trigger 2 — Al editar `tasaAplicadaGestor` manualmente:**
54: - Recalcular `gestorMonto = currentVenta.total_comision × tasaAplicadaGestor`
55: - Mostrar preview: `X {moneda_cuenta} = total_comision USD`
56: 
57: **Trigger 3 — Preview de conversión:**
58: - Mostrar debajo del campo monto:  
59:   `{gestorMonto} {simbolo_cuenta} = {total_comision} USD (Tasa: {tasaAplicadaGestor})`
60: 
61: ---
62: 
63: ## Cambios necesarios en Show.tsx
64: 
65: ### 1. Nuevo estado para moneda de la cuenta del gestor
66: 
67: ```tsx
68: const [monedaCuentaGestor, setMonedaCuentaGestor] = useState<{
69:     codigo: string;
70:     simbolo: string;
71:     tasa_cambio?: number;
72: } | null>(null);
73: ```
74: 
75: ### 2. Actualizar el `onValueChange` del Select de cuenta del gestor
76: 
77: ```tsx
78: onValueChange={(val) => {
79:     setGestorCuentaId(val);
80:     const cuentaEncontrada = cuentasGestor.find((c) => String(c.id) === val) || null;
81:     setCuentaGestorSeleccionada(cuentaEncontrada);
82:     
83:     // Auto-rellenar tasa y monto
84:     if (cuentaEncontrada?.moneda) {
85:         const tasaMoneda = cuentaEncontrada.moneda.tasa_cambio ?? 1;
86:         setMonedaCuentaGestor(cuentaEncontrada.moneda);
87:         setTasaAplicadaGestor(String(tasaMoneda));
88:         // Calcular monto automáticamente
89:         const montoCalculado = currentVenta.total_comision * tasaMoneda;
90:         setGestorMonto(montoCalculado.toFixed(2));
91:     }
92: }}
93: ```
94: 
95: ### 3. useEffect para recalcular monto cuando cambia la tasa
96: 
97: ```tsx
98: useEffect(() => {
99:     const tasa = parseFloat(tasaAplicadaGestor) || 0;
100:     if (tasa > 0 && currentVenta.total_comision > 0) {
101:         const montoCalculado = currentVenta.total_comision * tasa;
102:         setGestorMonto(montoCalculado.toFixed(2));
103:     }
104: }, [tasaAplicadaGestor]);
105: ```
106: 
107: ### 4. Preview de conversión debajo del campo Monto
108: 
109: Agregar debajo del `Input` de gestorMonto:
110: 
111: ```tsx
112: {gestorMonto && tasaAplicadaGestor && parseFloat(gestorMonto) > 0 && (
113:     <div className="rounded-lg bg-green-50 p-2 text-center mt-1">
114:         <p className="text-sm font-medium text-green-700">
115:             {Number(gestorMonto).toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
116:             {monedaCuentaGestor?.simbolo || cuentaGestorSeleccionada?.moneda?.simbolo || ''} ={' '}
117:             <span className="font-bold">
118:                 {Number(currentVenta.total_comision).toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
119:             </span>
120:         </p>
121:         <p className="mt-1 text-xs text-green-600">
122:             Tasa aplicada: {tasaAplicadaGestor}
123:         </p>
124:     </div>
125: )}
126: ```
127: 
128: ---
129: 
130: ## Datos disponibles en la interfaz
131: 
132: En `Show.tsx`, la interfaz `Cuenta` (cuentasGestor) actualmente tiene:
133: 
134: ```typescript
135: interface Cuenta {
136:     id: number;
137:     nombre_cuenta: string;
138:     saldo_actual: number;
139:     moneda: {
140:         codigo: string;
141:         simbolo: string;
142:     };
143:     tipo: string;
144:     tipo_moneda: string;
145: }
146: ```
147: 
148: **Problema:** falta `tasa_cambio` en la moneda de la cuenta. Hay que verificar si el backend `getCuentasParaGestor()` devuelve la tasa.
149: 
150: ### Verificar en VentaController.php → getCuentasParaGestor()
151: 
152: ```php
153: return [
154:     'id' => $cuenta->id,
155:     'nombre_cuenta' => $cuenta->nombre_cuenta,
156:     'saldo_actual' => $cuenta->saldo_cuenta,
157:     'moneda' => [
158:         'codigo' => $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda,
159:         'simbolo' => $cuenta->moneda?->simbolo_moneda ?? $cuenta->tipo_moneda,
160:         // ← FALTA 'tasa_cambio' aquí
161:     ],
162:     'tipo' => $cuenta->tipo,
163: ];
164: ```
165: 
166: **Fix necesario en backend:** agregar `'tasa_cambio' => (float) $cuenta->moneda?->tasa_cambio ?? 1`
167: 
168: Y actualizar la interfaz `Cuenta` en Show.tsx:
169: ```typescript
170: moneda: {
171:     codigo: string;
172:     simbolo: string;
173:     tasa_cambio?: number; // ← AGREGAR
174: };
175: ```
176: 
177: ---
178: 
179: ## Orden de implementación mañana
180: 
181: 1. Agregar `tasa_cambio` al response de `getCuentasParaGestor()` en `VentaController.php`
182: 2. Actualizar interfaz `Cuenta` en `Show.tsx` para incluir `tasa_cambio`
183: 3. Agregar estado `monedaCuentaGestor`
184: 4. Actualizar `onValueChange` del Select de cuenta del gestor
185: 5. Agregar `useEffect` para recalcular monto al editar tasa
186: 6. Agregar preview de conversión debajo del campo monto
187: 
188: ---
189: 
190: ## Resultado esperado
191: 
192: Cuando el usuario abre el formulario de Gestor:
193: 1. Selecciona la cuenta → tasa se auto-rellena con la tasa de esa moneda → monto se calcula automáticamente
194: 2. Si el usuario cambia la tasa manualmente → monto se recalcula en tiempo real
195: 3. El usuario ve el preview: "18.500 CUP = 3.00 USD (Tasa: 365)"
196: 4. El usuario puede ajustar el monto si lo necesita
197: 
198: Esto evita que el usuario tenga que hacer el cálculo manualmente.

(End of file - total 198 lines)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/TELEGRAM_BOT_PLAN.md"
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/TELEGRAM_BOT_PLAN.md</path>
<type>file</type>
<content>
1: # Plan de Implementación — Bot de Telegram
2: 
3: **Rama:** `feature/bot-telegram`  
4: **Fecha de implementación:** 2026-06-02  
5: **Alcance inicial:** Solo usuarios con rol `admin`
6: 
7: ---
8: 
9: ## Qué va a hacer el bot (alcance día 1)
10: 
11: | Funcionalidad | Dirección | Descripción |
12: |---|---|---|
13: | Notificación de cierre de caja | Push → Admin | Se envía automáticamente cuando un vendedor cierra caja |
14: | Notificación de venta especial (solicitud) | Push → Admin | Mensaje con botones **[✅ Aprobar] [❌ Rechazar]** |
15: | Aprobar / Rechazar venta especial | Botón → Acción | Admin toca el botón → se ejecuta la lógica en el backend |
16: | Reporte del día por almacén | Comando `/reporte` | Admin escribe el comando y recibe ventas del día agrupadas por almacén |
17: 
18: ---
19: 
20: ## Por qué usar el paquete `irazasyed/telegram-bot-sdk`
21: 
22: Sin paquete puedes enviar mensajes simples con `Http::post()`. Pero en cuanto necesitas:
23: 
24: - **Inline keyboards** (botones en el mensaje)
25: - **Callback queries** (procesar qué botón presionó el admin)
26: - **Editar mensajes** (actualizar el mensaje después de aprobar/rechazar)
27: 
28: ...el JSON se vuelve complejo de manejar a mano. El paquete abstrae todo eso limpiamente y **funciona perfectamente en Hostinger** — es PHP puro, sin demonios ni workers especiales.
29: 
30: ---
31: 
32: ## Flujo de venta especial con botones
33: 
34: ```
35: Vendedor solicita venta especial
36:         ↓
37: Bot envía al admin:
38:   "🔔 Venta especial #42 — Motivo: regalo cliente
39:    Vendedor: Juan | Total: $150"
40:    [✅ Aprobar]   [❌ Rechazar]
41:         ↓
42: Admin toca el botón en Telegram
43:         ↓
44: Webhook recibe callback_query con data: "aprobar_venta:42" o "rechazar_venta:42"
45:         ↓
46: Backend ejecuta la lógica de aprobación/rechazo
47:         ↓
48: Bot edita el mensaje original → "✅ Aprobada por Admin"
49:         ↓
50: Vendedor recibe notificación (database) de la decisión
51: ```
52: 
53: ---
54: 
55: ## Arquitectura
56: 
57: ```
58: Laravel App
59:     │
60:     ├── Notifications (push automático)
61:     │       └── usa Telegram SDK ──→ Bot API (mensajes + inline keyboards)
62:     │
63:     └── TelegramWebhookController
64:             POST /telegram/webhook
65:                 ├── message      → procesa comandos (/start, /reporte, /ayuda)
66:                 └── callback_query → procesa botones (aprobar/rechazar venta especial)
67: ```
68: 
69: ---
70: 
71: ## Paso 0 — Crear el bot en Telegram (BotFather)
72: 
73: 1. Abrir Telegram → buscar `@BotFather`
74: 2. Enviar `/newbot`
75: 3. Nombre del bot: ej. `Almacen Tienda Bot`
76: 4. Username: debe terminar en `bot`, ej. `almacen_tienda_bot`
77: 5. BotFather entrega el **TOKEN** — guardarlo para el `.env`
78: 6. Para obtener tu `chat_id` como admin:
79:    - Enviar cualquier mensaje al bot
80:    - Visitar: `https://api.telegram.org/bot<TOKEN>/getUpdates`
81:    - Buscar el campo `"id"` dentro de `"chat"` — ese es tu chat_id personal
82: 
83: ---
84: 
85: ## Paso 1 — Instalar el paquete
86: 
87: ```bash
88: composer require irazasyed/telegram-bot-sdk
89: ```
90: 
91: Publicar configuración:
92: ```bash
93: php artisan vendor:publish --tag=telegram-config
94: ```
95: 
96: Esto crea `config/telegram.php`.
97: 
98: ---
99: 
100: ## Paso 2 — Variables de entorno
101: 
102: Agregar al `.env` (y también a `.env.example`):
103: 
104: ```env
105: TELEGRAM_BOT_TOKEN=your_bot_token_here
106: TELEGRAM_WEBHOOK_SECRET=una_cadena_aleatoria_segura
107: ```
108: 
109: En `config/telegram.php` el token ya se lee de `TELEGRAM_BOT_TOKEN` automáticamente.
110: 
111: Agregar a `config/services.php` solo el secret del webhook:
112: ```php
113: 'telegram' => [
114:     'webhook_secret' => env('TELEGRAM_WEBHOOK_SECRET'),
115: ],
116: ```
117: 
118: ---
119: 
120: ## Paso 3 — Migración: campo `telegram_chat_id` en users
121: 
122: ```bash
123: php artisan make:migration add_telegram_chat_id_to_users_table
124: ```
125: 
126: Contenido:
127: ```php
128: public function up(): void
129: {
130:     Schema::table('users', function (Blueprint $table) {
131:         $table->string('telegram_chat_id')->nullable()->after('avatar');
132:     });
133: }
134: 
135: public function down(): void
136: {
137:     Schema::table('users', function (Blueprint $table) {
138:         $table->dropColumn('telegram_chat_id');
139:     });
140: }
141: ```
142: 
143: ```bash
144: php artisan migrate
145: ```
146: 
147: ---
148: 
149: ## Paso 4 — Actualizar el modelo `User`
150: 
151: ```php
152: // Agregar al fillable
153: protected $fillable = [
154:     'name',
155:     'email',
156:     'password',
157:     'avatar',
158:     'role',
159:     'telegram_chat_id',   // ← nuevo
160: ];
161: 
162: // Método requerido por el SDK para saber a quién enviar
163: public function routeNotificationForTelegram(): ?string
164: {
165:     return $this->telegram_chat_id;
166: }
167: ```
168: 
169: ---
170: 
171: ## Paso 5 — Actualizar `UserController`
172: 
173: **Validación** (agregar en `store()` y `update()`):
174: ```php
175: 'telegram_chat_id' => 'nullable|string|max:50',
176: ```
177: 
178: **En `store()`:**
179: ```php
180: $user = User::create([
181:     'name'             => $validated['name'],
182:     'email'            => $validated['email'],
183:     'password'         => Hash::make($validated['password']),
184:     'role'             => $validated['role'],
185:     'telegram_chat_id' => $validated['telegram_chat_id'] ?? null,
186: ]);
187: ```
188: 
189: **En `update()`:**
190: ```php
191: $user->update([
192:     'name'             => $validated['name'],
193:     'email'            => $validated['email'],
194:     'role'             => $validated['role'],
195:     'password'         => $validated['password'] ? Hash::make($validated['password']) : $user->password,
196:     'telegram_chat_id' => $validated['telegram_chat_id'] ?? null,
197: ]);
198: ```
199: 
200: ---
201: 
202: ## Paso 6 — Frontend: campo en formularios de Empleados
203: 
204: En `resources/js/Pages/Empleados/Create.tsx` y `Edit.tsx`, agregar input para `telegram_chat_id`. Solo visible para `admin` y `moderador`:
205: 
206: ```tsx
207: {['admin', 'moderador'].includes(form.role) && (
208:     <div>
209:         <Label>Telegram Chat ID</Label>
210:         <Input
211:             placeholder="Ej: 123456789"
212:             value={form.telegram_chat_id ?? ''}
213:             onChange={e => setData('telegram_chat_id', e.target.value)}
214:         />
215:         <p className="text-xs text-muted-foreground mt-1">
216:             Envía un mensaje al bot y obtén tu chat_id desde la API de Telegram.
217:         </p>
218:     </div>
219: )}
220: ```
221: 
222: ---
223: 
224: ## Paso 7 — Crear el TelegramChannel (usando el SDK)
225: 
226: Crear `app/Channels/TelegramChannel.php`:
227: 
228: ```php
229: <?php
230: 
231: namespace App\Channels;
232: 
233: use Illuminate\Notifications\Notification;
234: use Illuminate\Support\Facades\Log;
235: use Telegram\Bot\Laravel\Facades\Telegram;
236: 
237: class TelegramChannel
238: {
239:     public function send(object $notifiable, Notification $notification): void
240:     {
241:         $chatId = $notifiable->routeNotificationForTelegram();
242: 
243:         if (empty($chatId)) {
244:             return;
245:         }
246: 
247:         if (! method_exists($notification, 'toTelegram')) {
248:             return;
249:         }
250: 
251:         $payload = $notification->toTelegram($notifiable);
252: 
253:         if (empty($payload)) {
254:             return;
255:         }
256: 
257:         try {
258:             Telegram::sendMessage(array_merge(['chat_id' => $chatId], $payload));
259:         } catch (\Exception $e) {
260:             Log::error('Error enviando notificación Telegram: ' . $e->getMessage());
261:         }
262:     }
263: }
264: ```
265: 
266: ---
267: 
268: ## Paso 8 — Actualizar las Notificaciones
269: 
270: ### `CierreCajaNotification`
271: 
272: ```php
273: public function via(object $notifiable): array
274: {
275:     $channels = ['database'];
276:     if ($notifiable->role === 'admin' && $notifiable->telegram_chat_id) {
277:         $channels[] = \App\Channels\TelegramChannel::class;
278:     }
279:     return $channels;
280: }
281: 
282: public function toTelegram(object $notifiable): array
283: {
284:     $esDescuadre = abs($this->cierre->diferencia) > 0.01;
285:     $icon        = $esDescuadre ? '⚠️' : '✅';
286:     $diferencia  = number_format(abs($this->cierre->diferencia), 2);
287: 
288:     $texto  = "{$icon} <b>Cierre de Caja #{$this->cierre->id}</b>\n";
289:     $texto .= "👤 Vendedor: {$this->cierre->usuario->name}\n";
290:     $texto .= "💰 Saldo esperado: $ {$this->cierre->saldo_esperado}\n";
291:     $texto .= "💵 Saldo contado: $ {$this->cierre->saldo_contado}\n";
292:     $texto .= $esDescuadre
293:         ? "❌ Descuadre: $ {$diferencia}\n"
294:         : "✅ Sin descuadre\n";
295:     $texto .= "🕐 " . now()->format('d/m/Y H:i');
296: 
297:     return [
298:         'text'       => $texto,
299:         'parse_mode' => 'HTML',
300:     ];
301: }
302: ```
303: 
304: ### `VentaEspecialSolicitudNotification` — con botones Aprobar / Rechazar
305: 
306: ```php
307: public function via(object $notifiable): array
308: {
309:     $channels = ['database'];
310:     if ($notifiable->role === 'admin' && $notifiable->telegram_chat_id) {
311:         $channels[] = \App\Channels\TelegramChannel::class;
312:     }
313:     return $channels;
314: }
315: 
316: public function toTelegram(object $notifiable): array
317: {
318:     $texto  = "🔔 <b>Solicitud de Venta Especial</b>\n\n";
319:     $texto .= "📋 Venta #: {$this->venta->id}\n";
320:     $texto .= "👤 Vendedor: {$this->venta->usuario->name}\n";
321:     $texto .= "📝 Motivo: {$this->venta->nota_venta_especial}\n";
322:     $texto .= "💵 Total: $ {$this->venta->total}\n";
323:     $texto .= "🕐 " . now()->format('d/m/Y H:i');
324: 
325:     return [
326:         'text'         => $texto,
327:         'parse_mode'   => 'HTML',
328:         'reply_markup' => json_encode([
329:             'inline_keyboard' => [[
330:                 ['text' => '✅ Aprobar',  'callback_data' => "aprobar_venta:{$this->venta->id}"],
331:                 ['text' => '❌ Rechazar', 'callback_data' => "rechazar_venta:{$this->venta->id}"],
332:             ]],
333:         ]),
334:     ];
335: }
336: ```
337: 
338: ### `VentaEspecialDecisionNotification`
339: 
340: Sin cambios — esta notificación va al vendedor, que por ahora no usa Telegram. Se queda solo en `database`.
341: 
342: ---
343: 
344: ## Paso 9 — TelegramWebhookController
345: 
346: ```bash
347: php artisan make:controller TelegramWebhookController
348: ```
349: 
350: `app/Http/Controllers/TelegramWebhookController.php`:
351: 
352: ```php
353: <?php
354: 
355: namespace App\Http\Controllers;
356: 
357: use App\Models\User;
358: use App\Models\Venta;
359: use App\Models\Almacen;
360: use App\Notifications\VentaEspecialDecisionNotification;
361: use Carbon\Carbon;
362: use Illuminate\Http\Request;
363: use Illuminate\Support\Facades\Log;
364: use Illuminate\Support\Facades\Notification;
365: use Telegram\Bot\Laravel\Facades\Telegram;
366: 
367: class TelegramWebhookController extends Controller
368: {
369:     public function handle(Request $request)
370:     {
371:         // Verificar el secret header de seguridad
372:         $secret = $request->header('X-Telegram-Bot-Api-Secret-Token');
373:         if ($secret !== config('services.telegram.webhook_secret')) {
374:             return response()->json(['ok' => false], 403);
375:         }
376: 
377:         $update = $request->all();
378: 
379:         // Procesar botones (callback_query)
380:         if (isset($update['callback_query'])) {
381:             return $this->handleCallbackQuery($update['callback_query']);
382:         }
383: 
384:         // Procesar mensajes de texto (comandos)
385:         if (isset($update['message'])) {
386:             return $this->handleMessage($update['message']);
387:         }
388: 
389:         return response()->json(['ok' => true]);
390:     }
391: 
392:     // ─── Manejo de comandos de texto ─────────────────────────────────────────
393: 
394:     private function handleMessage(array $message)
395:     {
396:         $chatId = $message['chat']['id'];
397:         $text   = trim($message['text'] ?? '');
398: 
399:         $admin = $this->verificarAdmin($chatId);
400:         if (! $admin) {
401:             $this->sendMessage($chatId, '⛔ No tienes acceso a este bot.');
402:             return response()->json(['ok' => true]);
403:         }
404: 
405:         match (true) {
406:             str_starts_with($text, '/start')   => $this->cmdStart($chatId, $admin),
407:             str_starts_with($text, '/reporte') => $this->cmdReporte($chatId),
408:             str_starts_with($text, '/ayuda')   => $this->cmdAyuda($chatId),
409:             default => $this->sendMessage($chatId, "Comando no reconocido. Escribe /ayuda."),
410:         };
411: 
412:         return response()->json(['ok' => true]);
413:     }
414: 
415:     private function cmdStart(int|string $chatId, User $admin): void
416:     {
417:         $this->sendMessage($chatId,
418:             "👋 Hola <b>{$admin->name}</b>!\n\n" .
419:             "Soy el bot de <b>Almacén Tienda</b>.\n\n" .
420:             "Escribe /ayuda para ver qué puedo hacer."
421:         );
422:     }
423: 
424:     private function cmdAyuda(int|string $chatId): void
425:     {
426:         $this->sendMessage($chatId,
427:             "📋 <b>Comandos disponibles:</b>\n\n" .
428:             "/reporte — Ventas del día por almacén\n" .
429:             "/ayuda — Ver esta ayuda"
430:         );
431:     }
432: 
433:     private function cmdReporte(int|string $chatId): void
434:     {
435:         $hoy      = Carbon::today();
436:         $almacenes = Almacen::all();
437: 
438:         if ($almacenes->isEmpty()) {
439:             $this->sendMessage($chatId, 'No hay almacenes registrados.');
440:             return;
441:         }
442: 
443:         $texto = "📊 <b>Reporte del día " . $hoy->format('d/m/Y') . "</b>\n\n";
444: 
445:         foreach ($almacenes as $almacen) {
446:             $ventas     = Venta::where('almacen_id', $almacen->id)
447:                 ->whereDate('created_at', $hoy)
448:                 ->where('estado', 'completada')
449:                 ->get();
450: 
451:             $count      = $ventas->count();
452:             $totalUSD   = round($ventas->sum('total'), 2);
453: 
454:             $texto .= "🏪 <b>{$almacen->nombre_almacen}</b>\n";
455:             $texto .= "   Ventas: {$count}  |  Total: $ {$totalUSD}\n\n";
456:         }
457: 
458:         $totalGlobal = round(
459:             Venta::whereDate('created_at', $hoy)->where('estado', 'completada')->sum('total'),
460:             2
461:         );
462:         $countGlobal = Venta::whereDate('created_at', $hoy)->where('estado', 'completada')->count();
463: 
464:         $texto .= "━━━━━━━━━━━━━━\n";
465:         $texto .= "📦 Total global: {$countGlobal} ventas\n";
466:         $texto .= "💰 $ {$totalGlobal}";
467: 
468:         $this->sendMessage($chatId, $texto);
469:     }
470: 
471:     // ─── Manejo de botones ───────────────────────────────────────────────────
472: 
473:     private function handleCallbackQuery(array $callbackQuery)
474:     {
475:         $chatId      = $callbackQuery['message']['chat']['id'];
476:         $messageId   = $callbackQuery['message']['message_id'];
477:         $callbackId  = $callbackQuery['id'];
478:         $data        = $callbackQuery['data'] ?? '';
479: 
480:         $admin = $this->verificarAdmin($chatId);
481:         if (! $admin) {
482:             Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => '⛔ Sin acceso']);
483:             return response()->json(['ok' => true]);
484:         }
485: 
486:         // Parsear la acción: "aprobar_venta:42" o "rechazar_venta:42"
487:         [$accion, $ventaId] = explode(':', $data) + [null, null];
488: 
489:         if (! $ventaId || ! in_array($accion, ['aprobar_venta', 'rechazar_venta'])) {
490:             return response()->json(['ok' => true]);
491:         }
492: 
493:         $venta = Venta::find($ventaId);
494: 
495:         if (! $venta) {
496:             Telegram::answerCallbackQuery(['callback_query_id' => $callbackId, 'text' => '❌ Venta no encontrada']);
497:             return response()->json(['ok' => true]);
498:         }
499: 
500:         if ($venta->estado !== 'solicitud_especial') {
501:             Telegram::answerCallbackQuery([
502:                 'callback_query_id' => $callbackId,
503:                 'text'              => 'Esta solicitud ya fue procesada.',
504:             ]);
505:             return response()->json(['ok' => true]);
506:         }
507: 
508:         if ($accion === 'aprobar_venta') {
509:             $venta->update(['estado' => 'pendiente']);
510:             $decision = 'aprobada';
511:             $textoEdicion = "✅ <b>Venta Especial #{$venta->id} Aprobada</b>\nAprobada por: {$admin->name}";
512:         } else {
513:             // Rechazar: revertir stock y marcar como rechazada
514:             $venta->update(['estado' => 'rechazada']);
515:             $decision = 'rechazada';
516:             $textoEdicion = "❌ <b>Venta Especial #{$venta->id} Rechazada</b>\nRechazada por: {$admin->name}";
517: 
518:             // Aquí va la lógica de reversión de stock si aplica
519:             // (la misma lógica que usa VentaController::rechazar)
520:         }
521: 
522:         // Editar el mensaje original quitando los botones
523:         Telegram::editMessageText([
524:             'chat_id'      => $chatId,
525:             'message_id'   => $messageId,
526:             'text'         => $textoEdicion,
527:             'parse_mode'   => 'HTML',
528:         ]);
529: 
530:         // Responder al callback (quita el "reloj" del botón en Telegram)
531:         Telegram::answerCallbackQuery([
532:             'callback_query_id' => $callbackId,
533:             'text'              => $decision === 'aprobada' ? '✅ Aprobada' : '❌ Rechazada',
534:         ]);
535: 
536:         // Notificar al vendedor por database
537:         $vendedor = User::find($venta->user_id);
538:         if ($vendedor) {
539:             $vendedor->notify(new VentaEspecialDecisionNotification($venta, $decision));
540:         }
541: 
542:         return response()->json(['ok' => true]);
543:     }
544: 
545:     // ─── Helpers ─────────────────────────────────────────────────────────────
546: 
547:     private function verificarAdmin(int|string $chatId): ?User
548:     {
549:         return User::where('telegram_chat_id', (string) $chatId)
550:                    ->where('role', 'admin')
551:                    ->first();
552:     }
553: 
554:     private function sendMessage(int|string $chatId, string $text): void
555:     {
556:         try {
557:             Telegram::sendMessage([
558:                 'chat_id'    => $chatId,
559:                 'text'       => $text,
560:                 'parse_mode' => 'HTML',
561:             ]);
562:         } catch (\Exception $e) {
563:             Log::error('Telegram sendMessage error: ' . $e->getMessage());
564:         }
565:     }
566: }
567: ```
568: 
569: ---
570: 
571: ## Paso 10 — Ruta del webhook
572: 
573: En `routes/api.php`:
574: ```php
575: Route::post('/telegram/webhook', [\App\Http\Controllers\TelegramWebhookController::class, 'handle']);
576: ```
577: 
578: La ruta de API en Laravel ya está excluida de CSRF por defecto — no necesitas modificar `VerifyCsrfToken`.
579: 
580: ---
581: 
582: ## Paso 11 — Registrar el webhook con Telegram
583: 
584: Solo se hace **una vez**, en producción (requiere HTTPS):
585: 
586: ```bash
587: php artisan tinker
588: ```
589: 
590: ```php
591: use Illuminate\Support\Facades\Http;
592: 
593: Http::post("https://api.telegram.org/bot" . config('telegram.bots.mybot.token') . "/setWebhook", [
594:     'url'          => 'https://tu-dominio.com/api/telegram/webhook',
595:     'secret_token' => config('services.telegram.webhook_secret'),
596: ]);
597: ```
598: 
599: Para desarrollo local usar **ngrok**:
600: ```bash
601: ngrok http 8000
602: # Luego registrar la URL de ngrok como webhook (temporal)
603: ```
604: 
605: ---
606: 
607: ## Resumen de archivos a crear/modificar
608: 
609: | Archivo | Acción |
610: |---|---|
611: | `.env` + `.env.example` | Agregar `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET` |
612: | `config/services.php` | Agregar `webhook_secret` |
613: | `config/telegram.php` | Publicado por el paquete — revisar configuración del bot |
614: | `database/migrations/..._add_telegram_chat_id_to_users_table.php` | Crear |
615: | `app/Models/User.php` | Agregar `telegram_chat_id` al fillable + `routeNotificationForTelegram()` |
616: | `app/Http/Controllers/UserController.php` | Aceptar `telegram_chat_id` en store/update |
617: | `resources/js/Pages/Empleados/Create.tsx` | Campo telegram_chat_id para admin/moderador |
618: | `resources/js/Pages/Empleados/Edit.tsx` | Campo telegram_chat_id para admin/moderador |
619: | `app/Channels/TelegramChannel.php` | Crear (canal custom usando SDK) |
620: | `app/Notifications/CierreCajaNotification.php` | Agregar canal + método `toTelegram()` |
621: | `app/Notifications/VentaEspecialSolicitudNotification.php` | Agregar canal + `toTelegram()` con inline keyboard |
622: | `app/Http/Controllers/TelegramWebhookController.php` | Crear (comandos + callback_query) |
623: | `routes/api.php` | Agregar ruta del webhook |
624: 
625: ---
626: 
627: ## Orden de implementación recomendado
628: 
629: 1. `composer require irazasyed/telegram-bot-sdk` + `php artisan vendor:publish --tag=telegram-config`
630: 2. Variables de entorno (`.env`) y `config/services.php`
631: 3. Migración + `php artisan migrate`
632: 4. Modelo `User` + `UserController`
633: 5. Frontend (formularios Empleados)
634: 6. `TelegramChannel` (canal custom)
635: 7. Notificaciones (`CierreCajaNotification`, `VentaEspecialSolicitudNotification`)
636: 8. `TelegramWebhookController` + ruta en `api.php`
637: 9. Registrar webhook en Telegram (con ngrok en dev, con HTTPS en Hostinger)
638: 
639: ---
640: 
641: ## Notas importantes
642: 
643: - El `telegram_chat_id` es un número entero que Telegram devuelve — se guarda como `string` en la BD sin problema.
644: - Si un admin no tiene `telegram_chat_id` configurado, todo sigue funcionando (solo `database`).
645: - La lógica de reversión de stock en el rechazo desde Telegram debe ser la **misma** que usa `VentaController::rechazar()` — extráela a un método de servicio para reutilizarla.
646: - Vendedores no usan Telegram en esta fase.
647: - Hostinger: el paquete es PHP puro, no necesita configuración especial del servidor.

(End of file - total 647 lines)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 16.0s)

_Thinking:_

Now I have a very comprehensive understanding of the project. Let me synthesize the analysis. The user asked me to analyze the project based on BaseSolida-Proyecto.md and the docs/ directory, focusing on "lo ultimo que hicimos" (the last things we did).

Let me organize my analysis:

## Project Overview
- **Name**: Almacén Tienda - Sistema de Gestión de Inventario
- **Stack**: Laravel 12 + React 19 + Inertia.js + TypeScript + Tailwind CSS v4
- **Type**: ERP/POS system for multi-warehouse inventory management with multi-currency support

## Current State (based on ESTADO_DESARROLLO.md - last updated 2026-07-24)

### Active Branch: `feature/bot-telegram`

### Modules Completed
1. **Products** - CRUD, barcodes, import/export Excel, cost history
2. **Warehouses** - CRUD, inventory per warehouse, user assignment
3. **Purchases** - Registration, multi-payments, cost distribution, supplier/client relationship
4. **Stock Movements** - Transfers between warehouses, states, discrepancies, audit
5. **Categories/Suppliers/Clients** - Full CRUD
6. **Financial Accounts** - CRUD, balance control with password, instrument types
7. **Currencies and Rates** - CRUD, rate change history, impact on accounts
8. **Financial Transactions** - Expenses, income, bidirectional transfers
9. **Reports** - Inventory, sales, purchases, profits, history, tracking
10. **Public API** - Catalog without auth (`/api/tienda/*`)
11. **Notifications** - Database-based, bell in UI, reading and marking
12. **Ecommerce (basic)** - Public catalog view - in development

### Sales Module (Fully implemented)
- POS with cart, multi-currency payments, commission per item, special sales, gestor sales, messenger, editing, cancellation with reversal

### Cash Closure (Implemented)
- Expected balance calculation, messenger separation, account/client snapshots, financial summary, per-sale commission breakdown, previous closure comparison

### Telegram Bot (Active branch - fully implemented)
- Webhook infrastructure, `/vincular`, `/start`, `/reporte`, `/cierres`, `/ayuda` commands
- Notifications for cash closure, special sales with Approve/Reject buttons, sales, stock movements, price changes, financial movements

### Known Bugs (Pendientes)
- **B1**: `guardarDistribucion` returns `saldo_actual` instead of `saldo_cuenta` - UI shows incorrect balance
- **B2**: Missing XOR guard in `aprobarVenta`/`anularVenta` - potential double debit
- **B3**: `procesarVenta` foreach without `?? []` on pagos - crash if null
- **B4**: Account selector in mensajero loads all currencies, should be CUP-only
- **B5**: Mensajero account configured in Almacenes/Edit, should be in Empleados/Edit

### Pending Features
- **F1**: XOR visual selector `[Punto de Venta] / [Gestor]` in distribution panel
- **F2**: Multi-currency mensajero display in TypeScript/UI
- **F3**: Move mensajero account config from Almacenes/Edit to Empleados/Edit
- **F4**: `ganancia_real_total` shows 0 in some cases

### Last Changes (Most Recent)
1. **2026-07-24**: 
   - Brand, Model, Capacity, Color columns added to Excel export/import for vendor prices
   - `UserController`: filtered accounts for employees to only `permanentes`
   
2. **2026-07-15**: 
   - `color_producto` added to table/tooltip in Products, Movements, Purchases
   - `CompraController::show()` implemented with purchase history

3. **2026-07-01**: 
   - Messenger snapshot in `cierre_cajas`
   - Financial turn summary
   - PV/Gestor commission breakdown

4. **2026-06-28**: 
   - Editable `mensajero_monto_final_cup`
   - Global TasasFlotante widget
   - Messenger validations in approve flow

5. **Earlier**: Bot Telegram (06-02), Barcode system (05-21), Commission per item (05-25)

## Análisis del Proyecto: `almacen.tienda`

### Identidad
ERP/POS multi-almacén con multi-moneda. Stack: **Laravel 12 + React 19 + Inertia.js + TypeScript + Tailwind v4**.

### Últimos cambios registrados (docs/)

| Fecha | Cambio |
|---|---|
| **2026-07-24** | Columnas Marca/Modelo/Capacidad/Color al Excel de precios vendedor; filtrado cuentas `permanentes` en UserController |
| **2026-07-15** | `color_producto` en tooltips; `CompraController::show()` implementado |
| **2026-07-01** | Snapshot mensajero en `cierre_cajas`; resumen financiero turno; desglose comisiones PV/Gestor |
| **2026-06-28** | `mensajero_monto_final_cup` editable; widget TasasFlotante global; validaciones mensajero al aprobar |
| **2026-06-25** | Mensajero multi-moneda en POS |
| **2026-06-23** | Lógica financiera mensajero unificada |
| **2026-06-22** | Migraciones mensajero en ventas y almacenes |
| **2026-06-02** | Bot Telegram: infraestructura, webhook, notificaciones, comandos |

### Rama activa
`feature/bot-telegram` — Bot Telegram completamente implementado con 7 tipos de notificaciones y comandos `/vincular`, `/start`, `/reporte`, `/cierres`, `/ayuda`.

### Bugs críticos pendientes (sin resolver)
- **B1** (`VentaController` ~L1759): `guardarDistribucion` devuelve `saldo_actual` en vez de `saldo_cuenta`
- **B2**: Falta guardia XOR en `aprobarVenta`/`anularVenta` → posible doble débito
- **B3**: `foreach ($validatedData['pagos'] as $pago)` sin `?? []` → crash si `pagos: null`
- **B4**: Selector cuenta mensajero en Almacén carga todas las monedas, no solo CUP
- **B5**: Cuenta mensajero configurada en Almacenes/Edit, debería estar en Empleados/Edit

### Features pendientes
- **F1**: Selector XOR visual `[Punto de Venta] / [Gestor]` en panel distribución
- **F2**: Display multi-moneda completo para mensajero en TypeScript
- **F3**: Mover config mensajero de Almacenes a Empleados
- **F4**: `ganancia_real_total` muestra 0 en algunos casos

### Estado general
~37 modelos, ~27 controladores, 60+ migraciones, módulo ventas con ~1800 líneas en `VentaController.php`. Sistema maduro con los módulos centrales completos y estables, en fase de pulido y features secundarias (bot Telegram, cierre de caja detallado, multi-moneda en mensajero).

---

## User

Bien por ahora solo necesito que en @app/Http/Controllers/VentaController.php te ubiques en una funcionalidad, por ejemplo en el flujo del usuario para proceder en una venta, que sucede cuando selecciona un almacen? Analiza bien eso

---

## Assistant (Plan · DeepSeek V4 Flash Free · 6.6s)

_Thinking:_

The user wants me to analyze what happens in the VentaController when a user selects a warehouse (almacén) during the sales flow. Let me continue reading the rest of the file to understand the complete flow, and also look at the frontend to see how the warehouse selection triggers the product loading.

Let me read the rest of the controller file.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php",
  "offset": 1080
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php</path>
<type>file</type>
<content>
1080:                     'monto'                => $pago['monto'],
1081:                     'tasa_cambio_aplicada' => $pago['tasa_cambio'],
1082:                     'monto_equivalente'    => $pago['monto_equivalente'],
1083:                     'referencia'           => $pago['referencia'] ?? null,
1084:                 ]);
1085:             }
1086: 
1087:             DB::commit();
1088: 
1089:             // Notificar a Admins y Moderadores
1090:             try {
1091:                 $admins = User::whereIn('role', ['admin', 'moderador'])->get();
1092:                 if ($esEspecial) {
1093:                     Notification::send($admins, new VentaEspecialSolicitudNotification($venta));
1094:                 } else {
1095:                     Notification::send($admins, new VentaCreadaNotification($venta));
1096:                 }
1097:             } catch (\Exception $e) {
1098:                 \Log::error('Error enviando notificación de venta: ' . $e->getMessage());
1099:             }
1100: 
1101:             return response()->json([
1102:                 'success' => true,
1103:                 'message' => 'Venta creada correctamente.',
1104:                 'redirect' => route('ventas.show', $venta->id)
1105:             ]);
1106:         } catch (\Exception $e) {
1107:             DB::rollBack();
1108:             \Log::error('Error al procesar venta: ' . $e->getMessage());
1109: 
1110:             return response()->json([
1111:                 'success' => false,
1112:                 'message' => 'Error al procesar la venta: ' . $e->getMessage()
1113:             ], 500);
1114:         }
1115:     }
1116: 
1117: 
1118:     /**
1119:      * Guarda o actualiza el destinatario de una venta pendiente
1120:      */
1121:     /**
1122:      * Guarda o actualiza el destinatario de una venta pendiente
1123:      * Permite duplicados libremente - cada venta tiene su registro independiente
1124:      */
1125:     public function guardarDestinatario(Request $request, Venta $venta)
1126:     {
1127:         if ($venta->estado !== 'pendiente') {
1128:             return response()->json([
1129:                 'success' => false,
1130:                 'message' => 'Solo se puede modificar el receptor en ventas pendientes.'
1131:             ], 403);
1132:         }
1133: 
1134:         $validated = $request->validate([
1135:             'nombre' => 'required|string|max:100',
1136:             'apellidos' => 'required|string|max:100',
1137:             'carnet_identidad' => 'nullable|string|size:11|regex:/^\d+$/',
1138:             'direccion_residencia' => 'nullable|string|max:500',
1139:             'telefono_contacto' => 'nullable|string|max:20',
1140:             'parentesco_cliente' => 'nullable|string|max:100',
1141:             'observaciones' => 'nullable|string|max:500',
1142:             // Campos opcionales del gestor
1143:             'es_venta_gestor' => 'nullable|boolean',
1144:             'gestor_monto' => 'nullable|numeric|min:0',
1145:             'gestor_cuenta_id' => 'nullable|exists:cuentas,id',
1146:             'gestor_comentario' => 'nullable|string|max:500',
1147:             'tasa_aplicada_venta' => 'nullable|numeric|min:0.0001',
1148:             'tasa_aplicada_gestor' => 'nullable|numeric|min:0.0001',
1149:         ]);
1150: 
1151:         if ($request->filled('carnet_identidad')) {
1152:             $validated['carnet_identidad'] = preg_replace('/\D/', '', $validated['carnet_identidad']);
1153:         }
1154: 
1155:         // Validar datos del gestor si está activado
1156:         if ($request->boolean('es_venta_gestor')) {
1157:             if (empty($validated['gestor_cuenta_id'])) {
1158:                 return response()->json([
1159:                     'success' => false,
1160:                     'message' => 'Debe seleccionar una cuenta del gestor'
1161:                 ], 422);
1162:             }
1163:             if (empty($validated['gestor_monto']) || $validated['gestor_monto'] <= 0) {
1164:                 return response()->json([
1165:                     'success' => false,
1166:                     'message' => 'El monto del gestor debe ser mayor a 0'
1167:                 ], 422);
1168:             }
1169:             if (empty($validated['tasa_aplicada_gestor'])) {
1170:                 return response()->json([
1171:                     'success' => false,
1172:                     'message' => 'Debe ingresar la tasa aplicada del gestor'
1173:                 ], 422);
1174:             }
1175:         }
1176: 
1177:         DB::transaction(function () use ($venta, $validated, $request) {
1178:             // Guardar destinatario
1179:             if ($venta->destinatario) {
1180:                 $venta->destinatario->update($validated);
1181:             } else {
1182:                 $venta->destinatario()->create($validated);
1183:             }
1184: 
1185:             // Guardar datos del gestor si es que vienen
1186:             if ($request->boolean('es_venta_gestor')) {
1187:                 $venta->update([
1188:                     'es_venta_gestor' => true,
1189:                     'gestor_monto' => $validated['gestor_monto'] ?? 0,
1190:                     'gestor_cuenta_id' => !empty($validated['gestor_cuenta_id']) ? (int) $validated['gestor_cuenta_id'] : null,
1191:                     'gestor_comentario' => $validated['gestor_comentario'] ?? null,
1192:                     'tasa_aplicada_venta' => !empty($validated['tasa_aplicada_venta']) ? (float) $validated['tasa_aplicada_venta'] : null,
1193:                     'tasa_aplicada_gestor' => !empty($validated['tasa_aplicada_gestor']) ? (float) $validated['tasa_aplicada_gestor'] : null,
1194:                 ]);
1195:             } else {
1196:                 // Si no es venta con gestor, limpiar los datos
1197:                 $venta->update([
1198:                     'es_venta_gestor' => false,
1199:                     'gestor_monto' => 0,
1200:                     'gestor_cuenta_id' => null,
1201:                     'gestor_comentario' => null,
1202:                     'tasa_aplicada_venta' => null,
1203:                     'tasa_aplicada_gestor' => null,
1204:                 ]);
1205:             }
1206:         });
1207: 
1208:         // Refrescar el modelo y relaciones para devolver datos actualizados
1209:         // inmediatamente al frontend (sin necesidad de F5).
1210:         $venta->refresh()->load(['destinatario', 'gestorCuenta.moneda']);
1211: 
1212:         return response()->json([
1213:             'success' => true,
1214:             'message' => 'Información del receptor guardada correctamente',
1215:             'destinatario' => $venta->destinatario ? [
1216:                 'id' => $venta->destinatario->id,
1217:                 'nombre' => $venta->destinatario->nombre,
1218:                 'apellidos' => $venta->destinatario->apellidos,
1219:                 'carnet_identidad' => $venta->destinatario->carnet_identidad,
1220:                 'direccion_residencia' => $venta->destinatario->direccion_residencia,
1221:                 'telefono_contacto' => $venta->destinatario->telefono_contacto,
1222:                 'parentesco_cliente' => $venta->destinatario->parentesco_cliente,
1223:                 'observaciones' => $venta->destinatario->observaciones,
1224:             ] : null,
1225:             'gestor' => $venta->es_venta_gestor && $venta->gestor_cuenta_id ? [
1226:                 'monto' => (float) $venta->gestor_monto,
1227:                 'monto_usd' => $venta->tasa_aplicada_gestor > 0
1228:                     ? round((float) $venta->gestor_monto / (float) $venta->tasa_aplicada_gestor, 2)
1229:                     : (float) $venta->gestor_monto,
1230:                 'cuenta_id' => $venta->gestor_cuenta_id,
1231:                 'comentario' => $venta->gestor_comentario,
1232:                 'cuenta_nombre' => $venta->gestorCuenta?->nombre_cuenta,
1233:                 'tasa_aplicada' => $venta->tasa_aplicada_venta ? (float) $venta->tasa_aplicada_venta : null,
1234:                 'tasa_aplicada_gestor' => $venta->tasa_aplicada_gestor ? (float) $venta->tasa_aplicada_gestor : null,
1235:                 'moneda' => $venta->gestorCuenta?->moneda ? [
1236:                     'codigo' => $venta->gestorCuenta->moneda->codigo_moneda,
1237:                     'simbolo' => $venta->gestorCuenta->moneda->simbolo_moneda,
1238:                     'nombre' => $venta->gestorCuenta->moneda->nombre_moneda,
1239:                     'tasa_cambio' => (float) $venta->gestorCuenta->moneda->tasa_cambio,
1240:                 ] : null,
1241:                 'tipo_cuenta' => $venta->gestorCuenta?->tipo,
1242:             ] : null,
1243:             'total_comision' => (float) $venta->total_comision,
1244:         ]);
1245:     }
1246: 
1247: 
1248:     /**
1249:      * Aprobar la venta
1250:      */
1251:     public function aprobarVenta(Venta $venta)
1252:     {
1253:         if ($venta->estado !== 'pendiente') {
1254:             return response()->json(['success' => false, 'message' => 'Ya no está pendiente'], 400);
1255:         }
1256: 
1257:         if (!$venta->destinatario) {
1258:             return response()->json(['success' => false, 'message' => 'Falta receptor'], 400);
1259:         }
1260: 
1261:         if ($venta->mensajero_monto > 0 && !$venta->mensajero_cuenta_id) {
1262:             return response()->json(['success' => false, 'message' => 'Esta venta tiene mensajero pero no se ha asignado la cuenta destino del mensajero'], 400);
1263:         }
1264: 
1265:         if ($venta->mensajero_monto > 0 && !$venta->mensajero_tipo) {
1266:             return response()->json(['success' => false, 'message' => 'Esta venta tiene mensajero pero no se ha definido el tipo (propio o externo)'], 400);
1267:         }
1268: 
1269:         // Validación propio comentada — habilitar cuando se implemente vehículo propio
1270:         // if ($venta->mensajero_monto > 0 && $venta->mensajero_tipo === 'propio' && !$venta->mensajero_cuenta_origen_id) {
1271:         //     return response()->json(['success' => false, 'message' => 'El mensajero propio requiere especificar la cuenta CUP de donde sale el dinero'], 400);
1272:         // }
1273: 
1274:         DB::transaction(function () use ($venta) {
1275:             // 1. Cambiar estado a completada
1276:             $venta->update(['estado' => 'completada']);
1277: 
1278:             // 2. Tasa oficial del CUP para ganancia/perdida cambiaria
1279:             $tasaOficialCUP = DB::table('monedas')
1280:                 ->where('codigo_moneda', 'CUP')
1281:                 ->value('tasa_cambio') ?? 365;
1282: 
1283:             // El mensajero es pass-through — excluirlo del cálculo de ganancia cambiaria
1284:             $mensajero_cup = 0;
1285:             if ($venta->mensajero_monto > 0) {
1286:                 $mensajero_cup = $venta->mensajero_tasa > 0
1287:                     ? round((float) $venta->mensajero_monto * (float) $venta->mensajero_tasa, 2)
1288:                     : (float) $venta->mensajero_monto;
1289:             }
1290: 
1291:             $totalCupPagado     = 0;
1292:             $totalCupContadoUSD = 0;
1293: 
1294:             $gananciaExtraUSD = 0;
1295: 
1296:             foreach ($venta->pagos as $pago) {
1297:                 // Acumular CUP separado del loop de cuentas para calcular cambiaria limpia
1298:                 if ($pago->moneda && $pago->moneda->codigo_moneda === 'CUP') {
1299:                     $totalCupPagado     += $pago->monto;
1300:                     $totalCupContadoUSD += $pago->monto_equivalente;
1301:                 }
1302: 
1303:                 // ✅ CAMBIO: Manejar destino del dinero (cuenta O cliente)
1304:                 // CASO 1: El destino es un Cliente Físico
1305:                 if ($pago->cliente_id) {
1306:                     $clienteDestino = $pago->cliente;
1307: 
1308:                     // Verificar que el cliente destino existe y es físico
1309:                     if ($clienteDestino && $clienteDestino->tipo_cliente === 'fisico') {
1310:                         // ✅ Incrementar la deuda del cliente destino
1311:                         $clienteDestino->increment('deuda_pago_cliente', $pago->monto);
1312: 
1313:                         // ✅ IMPORTANTE: Saltar al siguiente pago, NO procesar cuenta
1314:                         continue;
1315:                     }
1316:                 }
1317: 
1318:                 // CASO 2: El destino es una Cuenta (flujo normal)
1319:                 $cuenta = $pago->cuenta;
1320:                 if (!$cuenta) {
1321:                     continue;
1322:                 }
1323: 
1324:                 $codigoCuenta = $cuenta->moneda?->codigo_moneda ?? $cuenta->tipo_moneda;
1325:                 $codigoPago = $pago->moneda?->codigo_moneda;
1326: 
1327:                 if ($codigoPago === $codigoCuenta) {
1328:                     $cuenta->increment('saldo_cuenta', $pago->monto);
1329:                 }
1330:                 // Si no coinciden, por seguridad no acumulamos
1331:             }
1332: 
1333:             // Calcular ganancia cambiaria solo sobre los CUP de productos (sin mensajero)
1334:             $cupProductos = max(0.0, $totalCupPagado - $mensajero_cup);
1335:             if ($totalCupPagado > 0 && $cupProductos > 0) {
1336:                 $proporcion             = $cupProductos / $totalCupPagado;
1337:                 $cupContadoUSD_productos = $totalCupContadoUSD * $proporcion;
1338:                 $gananciaExtraUSD       = round(($cupProductos / $tasaOficialCUP) - $cupContadoUSD_productos, 2);
1339:             }
1340: 
1341:             $venta->update([
1342:                 'ganancia_perdida_cambiaria' => $gananciaExtraUSD,
1343:                 'ganancia_real_total'        => $venta->total_ganancia + $gananciaExtraUSD,
1344:             ]);
1345: 
1346:             // DESCUENTO GESTOR
1347:             if ($venta->es_venta_gestor && $venta->gestor_cuenta_id && $venta->gestor_monto > 0) {
1348:                 $cuentaGestor = $venta->gestorCuenta;
1349: 
1350:                 if ($cuentaGestor) {
1351:                     if ($cuentaGestor->saldo_cuenta < $venta->gestor_monto) {
1352:                         throw new \Exception('La cuenta del gestor no tiene saldo suficiente para cubrir la comisión');
1353:                     }
1354: 
1355:                     $cuentaGestor->decrement('saldo_cuenta', $venta->gestor_monto);
1356:                 }
1357:             }
1358: 
1359:             // MENSAJERO
1360:             if ($venta->mensajero_monto > 0 && $venta->mensajero_cuenta_id) {
1361:                 $cuentaMensajero = $venta->mensajeroCuenta;
1362: 
1363:                 if ($cuentaMensajero) {
1364:                     // monto_final_cup es el monto editable desde Show (puede incluir premio/sanción).
1365:                     // Si no fue configurado, cae al monto original que pagó el cliente en el POS.
1366:                     $montoFinal = $venta->mensajero_monto_final_cup
1367:                         ? (float) $venta->mensajero_monto_final_cup
1368:                         : (float) $venta->mensajero_monto_original;
1369: 
1370:                     // Bloque propio comentado — habilitar cuando se implemente vehículo propio
1371:                     // if ($venta->mensajero_tipo === 'propio') {
1372:                     //     if ($venta->mensajero_cuenta_origen_id) {
1373:                     //         $cuentaOrigen = Cuenta::find($venta->mensajero_cuenta_origen_id);
1374:                     //         if ($cuentaOrigen) {
1375:                     //             $cuentaOrigen->decrement('saldo_cuenta', $montoFinal);
1376:                     //         }
1377:                     //     }
1378:                     //     $cuentaMensajero->increment('saldo_cuenta', $montoFinal);
1379:                     // } else
1380: 
1381:                     // EXTERNO: sale de la cuenta del POS para pagar al mensajero (pago físico)
1382:                     if ($venta->mensajero_tipo === 'externo') {
1383:                         $cuentaMensajero->decrement('saldo_cuenta', $montoFinal);
1384:                     }
1385:                 }
1386:             }
1387: 
1388:             // COMISIÓN VENDEDOR — solo si no es venta con gestor (XOR)
1389:             if (!$venta->es_venta_gestor && $venta->total_comision > 0 && $venta->comision_cuenta_id && $venta->comision_tasa > 0) {
1390:                 $cuentaComision = $venta->comisionCuenta;
1391: 
1392:                 if ($cuentaComision) {
1393:                     $montoCUP = round((float) $venta->total_comision * (float) $venta->comision_tasa, 2);
1394: 
1395:                     if ($cuentaComision->saldo_cuenta < $montoCUP) {
1396:                         throw new \Exception(
1397:                             "La cuenta de comisión no tiene saldo suficiente. Necesita {$montoCUP} CUP, disponible: {$cuentaComision->saldo_cuenta} CUP."
1398:                         );
1399:                     }
1400: 
1401:                     $cuentaComision->decrement('saldo_cuenta', $montoCUP);
1402:                 }
1403:             }
1404:         });
1405: 
1406:         return response()->json([
1407:             'success' => true,
1408:             'message' => 'Venta Aprobada Satisfactoriamente'
1409:         ]);
1410:     }
1411: 
1412:     /**
1413:      * Obtener listado de ventas con filtros y paginación.
1414:      */
1415:     public function listadoVentas(Request $request)
1416:     {
1417:         $user = Auth::user();
1418:         if (!$user) {
1419:             return redirect()->route('login');
1420:         }
1421: 
1422:         // Construir query base
1423:         $query = Venta::with(['cliente', 'almacen', 'usuario', 'pagos', 'moneda', 'destinatario', 'monedaCobro', 'gestorCuenta', 'mensajeroCuenta'])
1424:             ->withCount('detalles');
1425: 
1426:         // Filtrar por usuario (excepto admin y moderador)
1427:         if (!in_array($user->role, ['admin', 'moderador'])) {
1428:             $query->where('user_id', $user->id);
1429:         }
1430: 
1431:         // Aplicar filtros
1432:         if ($request->has('estado') && $request->estado) {
1433:             $query->where('estado', $request->estado);
1434:         }
1435: 
1436:         if ($request->has('almacen_id') && $request->almacen_id) {
1437:             $query->where('almacen_id', $request->almacen_id);
1438:         }
1439: 
1440:         if ($request->has('fecha_desde') && $request->fecha_desde) {
1441:             $query->whereDate('created_at', '>=', $request->fecha_desde);
1442:         }
1443: 
1444:         if ($request->has('fecha_hasta') && $request->fecha_hasta) {
1445:             $query->whereDate('created_at', '<=', $request->fecha_hasta);
1446:         }
1447: 
1448:         // Ordenar y paginar
1449:         $ventas = $query->orderBy('created_at', 'desc')
1450:             ->paginate(15)
1451:             ->through(function ($venta) {
1452:                 return [
1453:                     'id' => $venta->id,
1454:                     'cliente' => $venta->cliente ? [
1455:                         'id' => $venta->cliente->id,
1456:                         'nombre' => $venta->cliente->nombre_cliente,
1457:                     ] : null,
1458:                     'almacen' => [
1459:                         'id' => $venta->almacen->id,
1460:                         'nombre' => $venta->almacen->nombre_almacen,
1461:                     ],
1462:                     'usuario' => [
1463:                         'id' => $venta->usuario->id,
1464:                         'nombre' => $venta->usuario->name,
1465:                     ],
1466:                     'total' => $venta->total,
1467:                     'total_ganancia' => $venta->total_ganancia,
1468:                     'total_comision' => (float) $venta->total_comision,
1469:                     'total_esperado_usd' => $venta->total_esperado_usd,
1470:                     'ganancia_perdida_cambiaria' => $venta->ganancia_perdida_cambiaria,
1471:                     'ganancia_real_total' => $venta->ganancia_real_total,
1472:                     'estado' => $venta->estado,
1473:                     'total_pagado' => $venta->pagos->sum('monto_equivalente'),
1474:                     'restante' => $venta->total - $venta->pagos->sum('monto_equivalente'),
1475:                     'cantidad_items' => $venta->detalles_count,
1476:                     'fecha' => $venta->created_at->format('d/m/Y H:i'),
1477:                     'fecha_iso' => $venta->created_at->toISOString(),
1478:                     'moneda_principal' => $venta->moneda ? [
1479:                         'id' => $venta->moneda->id,
1480:                         'codigo' => $venta->moneda->codigo_moneda,
1481:                         'nombre' => $venta->moneda->nombre_moneda,
1482:                     ] : null,
1483:                     'destinatario' => $venta->destinatario ? [
1484:                         'id' => $venta->destinatario->id,
1485:                         'nombre' => $venta->destinatario->nombre,
1486:                         'apellidos' => $venta->destinatario->apellidos,
1487:                         'carnet_identidad' => $venta->destinatario->carnet_identidad,
1488:                         'telefono_contacto' => $venta->destinatario->telefono_contacto,
1489:                     ] : null,
1490:                     // NUEVOS CAMPOS
1491:                     'tasa_aplicada_venta' => $venta->tasa_aplicada_venta,
1492:                     'moneda_cobro' => $venta->monedaCobro ? [
1493:                         'id' => $venta->monedaCobro->id,
1494:                         'codigo' => $venta->monedaCobro->codigo_moneda,
1495:                         'simbolo' => $venta->monedaCobro->simbolo_moneda,
1496:                     ] : null,
1497:                     'monto_diferencia_cambiaria' => $venta->monto_diferencia_cambiaria,
1498:                     'es_venta_especial'   => (bool) $venta->es_venta_especial,
1499:                     'nota_venta_especial' => $venta->nota_venta_especial,
1500:                     // MENSAJERO
1501:                     'mensajero' => $venta->mensajero_monto > 0 ? [
1502:                         'monto' => (float) $venta->mensajero_monto,
1503:                         'tipo'  => $venta->mensajero_tipo,
1504:                     ] : null,
1505:                     // GESTOR
1506:                     'gestor' => $venta->es_venta_gestor && $venta->gestor_cuenta_id ? [
1507:                         'monto' => (float) $venta->gestor_monto,
1508:                         'cuenta_id' => $venta->gestor_cuenta_id,
1509:                         'comentario' => $venta->gestor_comentario,
1510:                         'cuenta_nombre' => $venta->gestorCuenta?->nombre_cuenta,
1511:                         'tasa_aplicada' => $venta->tasa_aplicada_venta ? (float) $venta->tasa_aplicada_venta : null,
1512:                         'tasa_aplicada_gestor' => $venta->tasa_aplicada_gestor ? (float) $venta->tasa_aplicada_gestor : null,
1513:                         'monto_usd' => $venta->gestor_monto && $venta->tasa_aplicada_gestor 
1514:                             ? round($venta->gestor_monto / $venta->tasa_aplicada_gestor, 2) 
1515:                             : null,
1516:                         'moneda' => $venta->gestorCuenta?->moneda ? [
1517:                             'codigo' => $venta->gestorCuenta->moneda->codigo_moneda,
1518:                             'simbolo' => $venta->gestorCuenta->moneda->simbolo_moneda,
1519:                         ] : null,
1520:                     ] : null,
1521:                 ];
1522:             });
1523: 
1524:         // Obtener almacenes para filtros
1525:         $almacenes = in_array($user->role, ['admin', 'moderador'])
1526:             ? Almacen::select('id', 'nombre_almacen')->get()
1527:             : ($user ? $user->almacenes()->select('id', 'nombre_almacen')->get() : collect());
1528: 
1529:         return Inertia::render('Vendor/Listado', [
1530:             'ventas' => $ventas,
1531:             'filters' => $request->only(['estado', 'almacen_id', 'fecha_desde', 'fecha_hasta']),
1532:             'almacenes' => $almacenes,
1533:             'estados_venta' => [
1534:                 ['value' => 'pendiente',           'label' => 'Pendiente'],
1535:                 ['value' => 'completada',          'label' => 'Completada'],
1536:                 ['value' => 'cancelada',           'label' => 'Cancelada'],
1537:                 ['value' => 'solicitud_especial',  'label' => 'Solicitud Especial'],
1538:                 ['value' => 'rechazada',           'label' => 'Rechazada'],
1539:             ]
1540:         ]);
1541:     }
1542: 
1543:     /**
1544:      * Editar pagos y/o precios de una venta en estado pendiente.
1545:      */
1546:     public function editarVentaPendiente(Request $request, Venta $venta)
1547:     {
1548:         if ($venta->estado !== 'pendiente') {
1549:             return response()->json(['success' => false, 'message' => 'Solo se pueden editar ventas en estado pendiente.'], 400);
1550:         }
1551: 
1552:         $validated = $request->validate([
1553:             'pagos'                       => 'required|array|min:1',
1554:             'pagos.*.metodo'              => 'required|in:transferencia,efectivo',
1555:             'pagos.*.moneda_id'           => 'required|exists:monedas,id',
1556:             'pagos.*.monto'               => 'required|numeric|min:0',
1557:             'pagos.*.via'                 => 'nullable|string',
1558:             'pagos.*.tasa_cambio'         => 'required|numeric|min:0.0001',
1559:             'pagos.*.monto_equivalente'   => 'required|numeric|min:0',
1560:             'pagos.*.cuenta_id'           => 'nullable|exists:cuentas,id',
1561:             'pagos.*.cliente_id'          => 'nullable|exists:clientes,id',
1562:             'pagos.*.referencia'          => 'nullable|string',
1563:             'items'                       => 'nullable|array',
1564:             'items.*.venta_detalle_id'    => 'required|exists:venta_detalles,id',
1565:             'items.*.precio_venta'        => 'required|numeric|min:0',
1566:         ]);
1567: 
1568:         // Validar XOR en pagos
1569:         foreach ($validated['pagos'] as $pago) {
1570:             if (empty($pago['cuenta_id']) && empty($pago['cliente_id'])) {
1571:                 return response()->json(['success' => false, 'message' => 'Cada pago debe tener una cuenta o un cliente como destino.'], 422);
1572:             }
1573:             if (!empty($pago['cuenta_id']) && !empty($pago['cliente_id'])) {
1574:                 return response()->json(['success' => false, 'message' => 'Un pago no puede tener cuenta y cliente al mismo tiempo.'], 422);
1575:             }
1576:         }
1577: 
1578:         $user = Auth::user();
1579: 
1580:         try { DB::transaction(function () use ($venta, $validated, $user) {
1581:             // ── Actualizar precios si vienen ──────────────────────────────────
1582:             if (!empty($validated['items'])) {
1583:                 $venta->load('detalles.producto');
1584: 
1585:                 // Precargar precios del almacén para validar mínimos
1586:                 $productIds     = $venta->detalles->pluck('producto_id')->toArray();
1587:                 $preciosAlmacen = DB::table('producto_vendedors')
1588:                     ->where('almacen_id', $venta->almacen_id)
1589:                     ->whereIn('producto_id', $productIds)
1590:                     ->get()
1591:                     ->keyBy('producto_id');
1592: 
1593:                 $nuevoTotal    = 0;
1594:                 $nuevaGanancia = 0;
1595:                 $nuevaComision = 0;
1596: 
1597:                 foreach ($validated['items'] as $itemData) {
1598:                     $detalle = $venta->detalles->firstWhere('id', $itemData['venta_detalle_id']);
1599:                     if (!$detalle) continue;
1600: 
1601:                     $nuevoPrecio = (float) $itemData['precio_venta'];
1602:                     $costo       = (float) $detalle->costo_unitario;
1603: 
1604:                     // Validar mínimo solo si no es venta especial
1605:                     if (!$venta->es_venta_especial) {
1606:                         $precioRow = $preciosAlmacen->get($detalle->producto_id);
1607:                         if ($precioRow) {
1608:                             $precioMinimo = round((float) $precioRow->precio_venta - (float) $precioRow->comision, 2);
1609:                             if ($nuevoPrecio < $precioMinimo) {
1610:                                 throw new \Exception(
1611:                                     "El precio de \"{$detalle->producto->nombre_producto}\" (\${$nuevoPrecio}) " .
1612:                                     "está por debajo del mínimo permitido (\${$precioMinimo})."
1613:                                 );
1614:                             }
1615:                         }
1616:                         if ($nuevoPrecio < $costo) {
1617:                             throw new \Exception(
1618:                                 "El precio de \"{$detalle->producto->nombre_producto}\" no puede ser menor que su costo."
1619:                             );
1620:                         }
1621:                     }
1622: 
1623:                     // Recalcular comisión
1624:                     $precioRow    = $preciosAlmacen->get($detalle->producto_id);
1625:                     $precioBase   = $precioRow ? (float) $precioRow->precio_venta : $nuevoPrecio;
1626:                     $baseComision = (!$venta->es_venta_especial && $precioRow) ? (float) $precioRow->comision : 0;
1627: 
1628:                     if ($venta->es_venta_especial) {
1629:                         $comisionUnitaria = 0;
1630:                     } elseif ($nuevoPrecio >= $precioBase) {
1631:                         $comisionUnitaria = $baseComision + ($nuevoPrecio - $precioBase);
1632:                     } else {
1633:                         $descuento        = $precioBase - $nuevoPrecio;
1634:                         $comisionUnitaria = max(0.0, $baseComision - $descuento);
1635:                     }
1636: 
1637:                     $ganancia = ($nuevoPrecio - $costo) * $detalle->cantidad;
1638:                     $subtotal = $nuevoPrecio * $detalle->cantidad;
1639: 
1640:                     $detalle->update([
1641:                         'precio_venta'    => $nuevoPrecio,
1642:                         'subtotal'        => $subtotal,
1643:                         'ganancia'        => $ganancia,
1644:                         'comision_unitaria' => round($comisionUnitaria, 2),
1645:                     ]);
1646: 
1647:                     $nuevoTotal    += $subtotal;
1648:                     $nuevaGanancia += $ganancia;
1649:                     $nuevaComision += round($comisionUnitaria * $detalle->cantidad, 2);
1650:                 }
1651: 
1652:                 // Sumar mensajero en USD al total (si era USD; si era CUP directo no se suma al total USD)
1653:                 $mensajeroEnUSD = ($venta->mensajero_monto > 0 && $venta->mensajero_tasa > 0)
1654:                     ? (float) $venta->mensajero_monto
1655:                     : 0;
1656: 
1657:                 $venta->update([
1658:                     'total'          => $nuevoTotal + $mensajeroEnUSD,
1659:                     'total_ganancia' => $nuevaGanancia,
1660:                     'total_comision' => round($nuevaComision, 2),
1661:                 ]);
1662:             }
1663: 
1664:             // ── Reemplazar pagos ──────────────────────────────────────────────
1665:             $venta->pagos()->delete();
1666: 
1667:             foreach ($validated['pagos'] as $pago) {
1668:                 PagoVenta::create([
1669:                     'venta_id'             => $venta->id,
1670:                     'tipo_pago'            => $pago['metodo'],
1671:                     'moneda_id'            => $pago['moneda_id'],
1672:                     'cuenta_id'            => $pago['cuenta_id'] ?? null,
1673:                     'cliente_id'           => $pago['cliente_id'] ?? null,
1674:                     'via_pago'             => $pago['via'] ?? null,
1675:                     'monto'                => $pago['monto'],
1676:                     'tasa_cambio_aplicada' => $pago['tasa_cambio'],
1677:                     'monto_equivalente'    => $pago['monto_equivalente'],
1678:                     'referencia'           => $pago['referencia'] ?? null,
1679:                 ]);
1680:             }
1681:         }); } catch (\Exception $e) {
1682:             return response()->json([
1683:                 'success' => false,
1684:                 'message' => $e->getMessage(),
1685:             ], 422);
1686:         }
1687: 
1688:         // Devolver venta actualizada para refrescar el frontend sin recargar
1689:         $venta->refresh()->load(['detalles.producto', 'pagos.cuenta.moneda', 'pagos.moneda', 'pagos.cliente']);
1690: 
1691:         return response()->json([
1692:             'success' => true,
1693:             'message' => 'Venta actualizada correctamente.',
1694:             'total'   => (float) $venta->total,
1695:             'pagos'   => $venta->pagos->map(fn($p) => [
1696:                 'metodo'            => $p->tipo_pago,
1697:                 'monto'             => $p->monto,
1698:                 'monto_equivalente' => $p->monto_equivalente,
1699:                 'via'               => $p->via_pago,
1700:                 'tasa_cambio'       => $p->tasa_cambio_aplicada,
1701:                 'moneda'            => $p->moneda ? [
1702:                     'id'     => $p->moneda->id,
1703:                     'codigo' => $p->moneda->codigo_moneda,
1704:                     'nombre' => $p->moneda->nombre_moneda,
1705:                 ] : null,
1706:                 'cuenta'            => $p->cuenta ? [
1707:                     'id'     => $p->cuenta->id,
1708:                     'nombre' => $p->cuenta->nombre_cuenta,
1709:                 ] : null,
1710:                 'cliente_destino'   => $p->cliente ? [
1711:                     'id'     => $p->cliente->id,
1712:                     'nombre' => $p->cliente->nombre_cliente,
1713:                 ] : null,
1714:                 'destino_tipo'      => $p->cliente_id ? 'cliente' : 'cuenta',
1715:             ]),
1716:             'items' => $venta->detalles->map(fn($d) => [
1717:                 'precio_venta'     => (float) $d->precio_venta,
1718:                 'subtotal'         => (float) $d->subtotal,
1719:                 'ganancia'         => (float) $d->ganancia,
1720:                 'comision_unitaria'=> (float) $d->comision_unitaria,
1721:             ]),
1722:         ]);
1723:     }
1724: 
1725:     /**
1726:      * Guardar distribución de la venta: mensajero y comisión vendedor
1727:      */
1728:     public function guardarDistribucion(Request $request, Venta $venta)
1729:     {
1730:         if ($venta->estado !== 'pendiente') {
1731:             return response()->json(['success' => false, 'message' => 'Solo se puede modificar una venta pendiente.'], 422);
1732:         }
1733: 
1734:         $validated = $request->validate([
1735:             'mensajero_monto'             => 'nullable|numeric|min:0.01',
1736:             'mensajero_tipo'              => 'nullable|in:propio,externo',
1737:             'mensajero_cuenta_id'         => 'nullable|exists:cuentas,id',
1738:             'mensajero_cuenta_origen_id'  => 'nullable|exists:cuentas,id',
1739:             'mensajero_tasa'              => 'nullable|numeric|min:0.0001',
1740:             'mensajero_monto_final_cup'   => 'nullable|numeric|min:0.01',
1741:             'limpiar_mensajero'           => 'nullable|boolean',
1742:             'limpiar_gestor'      => 'nullable|boolean',
1743:             'comision_cuenta_id'  => 'nullable|exists:cuentas,id',
1744:             'comision_tasa'       => 'nullable|numeric|min:0.0001',
1745:             'limpiar_comision'    => 'nullable|boolean',
1746:         ]);
1747: 
1748:         $totalProductos = (float) $venta->detalles->sum('subtotal');
1749: 
1750:         $limpiarMensajero = $validated['limpiar_mensajero'] ?? false;
1751:         $limpiarComision  = $validated['limpiar_comision'] ?? false;
1752:         $limpiarGestor    = $validated['limpiar_gestor'] ?? false;
1753: 
1754:         // El monto USD del mensajero viene del POS y no cambia desde Show.
1755:         // Solo se actualiza si el payload incluye explícitamente mensajero_monto (caso raro).
1756:         $nuevoMensajeroMonto = $limpiarMensajero ? null : ($validated['mensajero_monto'] ?? $venta->mensajero_monto);
1757:         $mensajeroEnUSD = $nuevoMensajeroMonto > 0 ? (float) $nuevoMensajeroMonto : 0;
1758: 
1759:         $updates = ['total' => $totalProductos + $mensajeroEnUSD];
1760: 
1761:         // Actualizar monto solo si viene explícito
1762:         if (array_key_exists('mensajero_monto', $validated) || $limpiarMensajero) {
1763:             $updates['mensajero_monto'] = $limpiarMensajero ? null : ($validated['mensajero_monto'] ?? null);
1764:         }
1765: 
1766:         // Tipo, cuenta y tasa se pueden actualizar sin enviar monto (Show.tsx solo configura distribución)
1767:         $hayConfigMensajero = $limpiarMensajero
1768:             || array_key_exists('mensajero_tipo', $request->all())
1769:             || array_key_exists('mensajero_cuenta_id', $request->all())
1770:             || array_key_exists('mensajero_cuenta_origen_id', $request->all())
1771:             || array_key_exists('mensajero_tasa', $request->all());
1772: 
1773:         if ($hayConfigMensajero) {
1774:             $updates['mensajero_tipo']              = $limpiarMensajero ? null : ($validated['mensajero_tipo'] ?? $venta->mensajero_tipo);
1775:             $updates['mensajero_cuenta_id']         = $limpiarMensajero ? null : ($validated['mensajero_cuenta_id'] ?? null);
1776:             $updates['mensajero_cuenta_origen_id']  = $limpiarMensajero ? null : ($validated['mensajero_cuenta_origen_id'] ?? null);
1777:             $updates['mensajero_tasa']              = $limpiarMensajero ? null : ($validated['mensajero_tasa'] ?? null);
1778:             $updates['mensajero_monto_final_cup']   = $limpiarMensajero ? null : ($validated['mensajero_monto_final_cup'] ?? null);
1779:         }
1780: 
1781:         if (array_key_exists('comision_cuenta_id', $validated) || $limpiarComision) {
1782:             $updates['comision_cuenta_id'] = $limpiarComision ? null : ($validated['comision_cuenta_id'] ?? null);
1783:             $updates['comision_tasa']      = $limpiarComision ? null : ($validated['comision_tasa'] ?? null);
1784:         }
1785: 
1786:         // Limpiar gestor: la comisión pasa al punto de venta
1787:         if ($limpiarGestor) {
1788:             $updates['es_venta_gestor']      = false;
1789:             $updates['gestor_cuenta_id']     = null;
1790:             $updates['gestor_monto']         = null;
1791:             $updates['gestor_comentario']    = null;
1792:             $updates['tasa_aplicada_gestor'] = null;
1793:         }
1794: 
1795:         $venta->update($updates);
1796:         $venta->refresh()->load(['mensajeroCuenta.moneda', 'comisionCuenta.moneda', 'mensajeroMoneda', 'mensajeroOrigenCuenta']);
1797: 
1798:         return response()->json([
1799:             'success'  => true,
1800:             'message'  => 'Distribución guardada correctamente.',
1801:             'total'    => (float) $venta->total,
1802:             'gestor'   => $limpiarGestor ? null : 'unchanged',
1803:             'mensajero' => $venta->mensajero_monto > 0 ? [
1804:                 'monto'           => (float) $venta->mensajero_monto,
1805:                 'tipo'            => $venta->mensajero_tipo,
1806:                 'moneda'          => $venta->mensajeroMoneda?->codigo_moneda ?? ($venta->mensajero_tasa > 0 ? 'USD' : 'CUP'),
1807:                 'moneda_id'       => $venta->mensajero_moneda_id,
1808:                 'monto_original'  => $venta->mensajero_monto_original ? (float) $venta->mensajero_monto_original : null,
1809:                 'tasa_entrada'    => $venta->mensajero_tasa_entrada ? (float) $venta->mensajero_tasa_entrada : null,
1810:                 'tasa'            => $venta->mensajero_tasa ? (float) $venta->mensajero_tasa : null,
1811:                 'monto_cup'       => $venta->mensajero_tasa > 0
1812:                     ? round((float) $venta->mensajero_monto * (float) $venta->mensajero_tasa, 2)
1813:                     : null,
1814:                 'monto_final_cup' => $venta->mensajero_monto_final_cup ? (float) $venta->mensajero_monto_final_cup : null,
1815:                 'cuenta' => $venta->mensajeroCuenta ? [
1816:                     'id'     => $venta->mensajeroCuenta->id,
1817:                     'nombre' => $venta->mensajeroCuenta->nombre_cuenta,
1818:                     'moneda' => $venta->mensajeroCuenta->moneda?->codigo_moneda,
1819:                 ] : null,
1820:                 'cuenta_origen' => $venta->mensajeroOrigenCuenta ? [
1821:                     'id'     => $venta->mensajeroOrigenCuenta->id,
1822:                     'nombre' => $venta->mensajeroOrigenCuenta->nombre_cuenta,
1823:                 ] : null,
1824:             ] : null,
1825:             'comision_pago' => $venta->comision_cuenta_id ? [
1826:                 'tasa'      => $venta->comision_tasa ? (float) $venta->comision_tasa : null,
1827:                 'monto_cup' => $venta->comision_tasa > 0
1828:                     ? round((float) $venta->total_comision * (float) $venta->comision_tasa, 2)
1829:                     : null,
1830:                 'cuenta' => $venta->comisionCuenta ? [
1831:                     'id'               => $venta->comisionCuenta->id,
1832:                     'nombre'           => $venta->comisionCuenta->nombre_cuenta,
1833:                     'moneda'           => $venta->comisionCuenta->moneda?->codigo_moneda,
1834:                     'saldo_disponible' => (float) ($venta->comisionCuenta->saldo_cuenta ?? 0),
1835:                 ] : null,
1836:             ] : null,
1837:         ]);
1838:     }
1839: 
1840:     /**
1841:      * Anular venta (pendiente o completada)
1842:      */
1843:     public function anularVenta(Request $request, Venta $venta)
1844:     {
1845:         if ($venta->estado === 'cancelada') {
1846:             return response()->json(['success' => false, 'message' => 'La venta ya está anulada'], 400);
1847:         }
1848: 
1849:         $validated = $request->validate([
1850:             'motivo_anulacion' => 'required|in:error_precio,solicitud_cliente,producto_defectuoso,duplicado_venta,error_pedido,otros',
1851:             'detalle_anulacion' => 'nullable|string|max:500|required_if:motivo_anulacion,otros',
1852:         ]);
1853: 
1854:         // Cargar relaciones necesarias para poder revertirlas
1855:         $venta->load(['detalles', 'pagos.cliente', 'pagos.cuenta', 'gestorCuenta', 'comisionCuenta', 'mensajeroCuenta', 'mensajeroMoneda']);
1856: 
1857:         DB::transaction(function () use ($venta, $validated) {
1858:             // ✅ SIEMPRE revertir stock (pendiente o completada)
1859:             foreach ($venta->detalles as $detalle) {
1860:                 $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
1861:                     ->where('producto_id', $detalle->producto_id)->first();
1862:                 
1863:                 if ($almacenProducto) {
1864:                     $almacenProducto->increment('cantidad', $detalle->cantidad);
1865:                 }
1866: 
1867:                 // ✅ Devolver stock al mismo código usado en la venta.
1868:                 // Para ventas antiguas sin producto_codigo_id, usar default o primero.
1869:                 if ($detalle->producto_codigo_id) {
1870:                     $codigoUsado = ProductoCodigo::find($detalle->producto_codigo_id);
1871:                     if ($codigoUsado) {
1872:                         $codigoUsado->increment('cantidad', $detalle->cantidad);
1873:                     }
1874:                 } else {
1875:                     $codigoDefault = ProductoCodigo::where('producto_id', $detalle->producto_id)
1876:                         ->orderByDesc('es_default')
1877:                         ->first();
1878: 
1879:                     if ($codigoDefault) {
1880:                         $codigoDefault->increment('cantidad', $detalle->cantidad);
1881:                     }
1882:                 }
1883: 
1884:                 HistorialStock::create([
1885:                     'producto_id' => $detalle->producto_id,
1886:                     'almacen_id' => $venta->almacen_id,
1887:                     'venta_id' => $venta->id,
1888:                     'cantidad_anterior' => $almacenProducto?->cantidad ?? 0,
1889:                     'cantidad_nueva' => ($almacenProducto?->cantidad ?? 0) + $detalle->cantidad,
1890:                     'diferencia' => $detalle->cantidad,
1891:                     'tipo' => 'venta_anulada',
1892:                     'observaciones' => 'Stock revertido por anulación de venta',
1893:                     'user_id' => Auth::id(),
1894:                 ]);
1895:             }
1896: 
1897:             // Revertir pagos y gestor solo si la venta fue completada.
1898:             // En ventas pendientes, cuentas y deudas nunca fueron modificadas.
1899:             if ($venta->estado === 'completada') {
1900:                 foreach ($venta->pagos as $pago) {
1901:                     if ($pago->cliente_id) {
1902:                         $cliente = $pago->cliente;
1903:                         if ($cliente) {
1904:                             $cliente->decrement('deuda_pago_cliente', $pago->monto);
1905:                         }
1906:                     }
1907: 
1908:                     if ($pago->cuenta_id) {
1909:                         $cuenta = $pago->cuenta;
1910:                         if ($cuenta) {
1911:                             $cuenta->decrement('saldo_cuenta', $pago->monto);
1912:                         }
1913:                     }
1914:                 }
1915: 
1916:                 if ($venta->es_venta_gestor && $venta->gestor_cuenta_id && $venta->gestor_monto > 0) {
1917:                     $cuentaGestor = $venta->gestorCuenta;
1918:                     if ($cuentaGestor) {
1919:                         $cuentaGestor->increment('saldo_cuenta', $venta->gestor_monto);
1920:                     }
1921:                 }
1922: 
1923:                 // Revertir mensajero — inverso exacto del aprobarVenta
1924:                 if ($venta->mensajero_monto > 0 && $venta->mensajero_cuenta_id) {
1925:                     $cuentaMensajero = $venta->mensajeroCuenta;
1926:                     if ($cuentaMensajero) {
1927:                         $montoFinal = $venta->mensajero_monto_final_cup
1928:                             ? (float) $venta->mensajero_monto_final_cup
1929:                             : (float) $venta->mensajero_monto_original;
1930: 
1931:                         // Bloque propio comentado — habilitar cuando se implemente vehículo propio
1932:                         // if ($venta->mensajero_tipo === 'propio') {
1933:                         //     if ($venta->mensajero_cuenta_origen_id) {
1934:                         //         $cuentaOrigen = Cuenta::find($venta->mensajero_cuenta_origen_id);
1935:                         //         if ($cuentaOrigen) {
1936:                         //             $cuentaOrigen->increment('saldo_cuenta', $montoFinal);
1937:                         //         }
1938:                         //     }
1939:                         //     $cuentaMensajero->decrement('saldo_cuenta', $montoFinal);
1940:                         // } else
1941: 
1942:                         // EXTERNO: devolver el dinero a la cuenta del POS
1943:                         if ($venta->mensajero_tipo === 'externo') {
1944:                             $cuentaMensajero->increment('saldo_cuenta', $montoFinal);
1945:                         }
1946:                     }
1947:                 }
1948: 
1949:                 // Revertir comisión vendedor — solo si no es venta con gestor (XOR)
1950:                 if (!$venta->es_venta_gestor && $venta->total_comision > 0 && $venta->comision_cuenta_id && $venta->comision_tasa > 0) {
1951:                     $cuentaComision = $venta->comisionCuenta;
1952:                     if ($cuentaComision) {
1953:                         $montoCUP = round((float) $venta->total_comision * (float) $venta->comision_tasa, 2);
1954:                         $cuentaComision->increment('saldo_cuenta', $montoCUP);
1955:                     }
1956:                 }
1957:             }
1958: 
1959:             $venta->update([
1960:                 'estado'            => 'cancelada',
1961:                 'motivo_anulacion'  => $validated['motivo_anulacion'],
1962:                 'detalle_anulacion' => $validated['detalle_anulacion'] ?? null,
1963:             ]);
1964:         });
1965: 
1966:         return response()->json([
1967:             'success' => true,
1968:             'message' => 'Venta anulada correctamente'
1969:         ]);
1970:     }
1971: 
1972:     // ========================================================================
1973:     // VENTAS ESPECIALES
1974:     // ========================================================================
1975: 
1976:     /**
1977:      * Admin aprueba la solicitud especial → pasa a "pendiente" (flujo normal continúa).
1978:      */
1979:     public function aprobarSolicitudEspecial(Venta $venta)
1980:     {
1981:         if ($venta->estado !== 'solicitud_especial') {
1982:             return response()->json(['success' => false, 'message' => 'Esta venta no está pendiente de aprobación especial'], 400);
1983:         }
1984: 
1985:         $venta->update([
1986:             'estado'              => 'pendiente',
1987:             'decision_notificada' => false,
1988:         ]);
1989: 
1990:         try {
1991:             Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'aprobada'));
1992:         } catch (\Exception $e) {
1993:             \Log::error('Error enviando notificación de decisión especial: ' . $e->getMessage());
1994:         }
1995: 
1996:         return response()->json([
1997:             'success' => true,
1998:             'message' => 'Solicitud aprobada. La venta está ahora pendiente de receptor.'
1999:         ]);
2000:     }
2001: 
2002:     /**
2003:      * Admin rechaza la solicitud especial → revierte stock y pasa a "rechazada".
2004:      */
2005:     public function rechazarSolicitudEspecial(Venta $venta)
2006:     {
2007:         if ($venta->estado !== 'solicitud_especial') {
2008:             return response()->json(['success' => false, 'message' => 'Esta venta no está pendiente de aprobación especial'], 400);
2009:         }
2010: 
2011:         $venta->load(['detalles']);
2012: 
2013:         DB::transaction(function () use ($venta) {
2014:             foreach ($venta->detalles as $detalle) {
2015:                 $almacenProducto = AlmacenProducto::where('almacen_id', $venta->almacen_id)
2016:                     ->where('producto_id', $detalle->producto_id)->first();
2017: 
2018:                 if ($almacenProducto) {
2019:                     $almacenProducto->increment('cantidad', $detalle->cantidad);
2020:                 }
2021: 
2022:                 if ($detalle->producto_codigo_id) {
2023:                     $codigo = ProductoCodigo::find($detalle->producto_codigo_id);
2024:                     if ($codigo) {
2025:                         $codigo->increment('cantidad', $detalle->cantidad);
2026:                     }
2027:                 }
2028: 
2029:                 HistorialStock::create([
2030:                     'producto_id'      => $detalle->producto_id,
2031:                     'almacen_id'       => $venta->almacen_id,
2032:                     'venta_id'         => $venta->id,
2033:                     'cantidad_anterior'=> $almacenProducto?->cantidad ?? 0,
2034:                     'cantidad_nueva'   => ($almacenProducto?->cantidad ?? 0) + $detalle->cantidad,
2035:                     'diferencia'       => $detalle->cantidad,
2036:                     'tipo'             => 'venta_anulada',
2037:                     'observaciones'    => 'Stock revertido por rechazo de solicitud especial',
2038:                     'user_id'          => Auth::id(),
2039:                 ]);
2040:             }
2041: 
2042:             $venta->update([
2043:                 'estado'              => 'rechazada',
2044:                 'decision_notificada' => false,
2045:             ]);
2046:         });
2047: 
2048:         try {
2049:             Notification::send(collect([$venta->usuario]), new VentaEspecialDecisionNotification($venta, 'rechazada'));
2050:         } catch (\Exception $e) {
2051:             \Log::error('Error enviando notificación de decisión especial: ' . $e->getMessage());
2052:         }
2053: 
2054:         return response()->json([
2055:             'success' => true,
2056:             'message' => 'Solicitud rechazada. El stock ha sido revertido.'
2057:         ]);
2058:     }
2059: 
2060:     /**
2061:      * Marca que el vendedor ya vio el veredicto del admin.
2062:      */
2063:     public function marcarDecisionNotificada(Venta $venta)
2064:     {
2065:         $venta->update(['decision_notificada' => true]);
2066:         return response()->json(['success' => true]);
2067:     }
2068: }

(End of file - total 2068 lines)
</content>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 66.5s)

_Thinking:_

Now I have the complete VentaController file. Now let me also look at the frontend POS (Index.tsx) to understand the complete flow when a user selects a warehouse.

Let me check the POS index file to see how warehouse selection triggers product loading.

**Tool: task**

**Input:**
```json
{
  "description": "Explore POS frontend flow",
  "subagent_type": "explore",
  "prompt": "I need to understand the frontend flow when a user selects a warehouse (almacén) in the POS (Point of Sale) system. \n\nPlease read and return the full contents of these files:\n1. resources/js/pages/Vendor/Index.tsx - FOCUS on the warehouse selection logic, how it triggers loading products, and the useEffect/event handlers related to warehouse changes. Just return the relevant sections with line numbers, not the entire file if it's too large.\n2. Check if there are any related components in resources/js/pages/Vendor/ or resources/js/components/ that handle warehouse selection or product loading.\n\nReturn a summary of:\n- What happens when a user selects a warehouse (which API calls are made, what data flows)\n- How the frontend handles the response (especially the 'almacen_incompleto' error)\n- How products are displayed after selection\n\nDo NOT modify any files. Just read and report."
}
```

**Output:**
```
<task id="ses_0690be9bfffe6PcwuvgTQNR7kN" state="completed">
<task_result>
Now I have a complete picture. Here is my report.

---

## Summary: POS Warehouse (Almacen) Selection Flow

### Relevant Files Read

| File | Purpose |
|------|---------|
| `/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx` (1791 lines) | Main POS page -- contains all warehouse selection, product loading, carrito, and sale processing logic |
| `/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php` (lines 100-204) | Backend API methods: `getAlmacenes()` and `getProductosPorAlmacen($id)` |
| `/mnt/datos/APP_CREATED/PHP/almacen.tienda/routes/shop/puntoventa.php` | Routes for the POS APIs |
| `/mnt/datos/APP_CREATED/PHP/almacen.tienda/docs/ventas/contexto-actual.md` | Architectural documentation describing the data flow |
| `/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/components/Ecommerce/StoreSelector.tsx` | Separate e-commerce store selector (not part of POS -- different component for the public marketplace) |

---

### 1. What Happens When a User Selects a Warehouse

#### A. Page Load (useEffect on mount, lines 279-283)
```typescript
// Index.tsx lines 279-283
useEffect(() => {
    cargarAlmacenes();
    cargarClientes();
    cargarClientesFisicos();
}, []);
```
Three parallel API calls fire immediately:
- **`GET /ventas/almacenes`** (`getAlmacenes`) -- Returns the user's accessible warehouses. For admin/moderador: all warehouses. For regular users: only their assigned warehouses via `usuario_almacens` pivot. Each warehouse includes `id`, `nombre_almacen`, `mensajero_cuenta_id`, and `mensajero_cuenta` object.
- **`GET /ventas/clientes`** -- Returns all clients `{id, nombre_cliente}`.
- **`GET /ventas/clientes-fisicos-pago`** -- Returns clients with debt info for payment.

#### B. User Selects a Warehouse (the Combobox, lines 932-959)
The warehouse is rendered as a **Combobox** (searchable dropdown). When the user picks a warehouse:

```typescript
// Index.tsx lines 942-943
onValueChange={(almacen) => handleAlmacenChange(almacen ? almacen.id.toString() : '')}
```

#### C. `handleAlmacenChange` (lines 292-300)
```typescript
const handleAlmacenChange = (value: string) => {
    setAlmacenSeleccionado(value);          // (1) Update state
    cargarProductos(value);                 // (2) Fetch products
    setBusqueda('');                        // (3) Clear search
    setCarrito([]);                         // (4) Clear cart entirely
    setCodigoSeleccionadoPorProducto({});   // (5) Clear barcode code selections
    setTieneMensajero(false);               // (6) Reset messenger toggle
    setMensajeroMonto('');                  // (7) Reset messenger amount
};
```
**This is a hard reset.** Changing warehouses flushes the entire cart, search, and messenger state.

#### D. `cargarProductos` -- The API Call (lines 244-277)
```typescript
const cargarProductos = async (almacenId: string) => {
    if (!almacenId) { setProductos([]); return; }
    try {
        const response = await axios.get(route('ventas.getProductosPorAlmacen', almacenId));
        // Process and set products...
        setProductos(productosProcesados);
    } catch (error: unknown) {
        // Error handling (see Section 2)
    }
};
```
- **API call:** `GET /ventas/almacenes/{id}/productos`
- **Backend controller** (VentaController.php lines 125-204):
  - Validates user authentication (403 if not).
  - Validates warehouse access for non-admin users (403 if denied).
  - Loads `producto_vendedors` rows for the warehouse (the price/comission table).
  - Loads all **Productos** that belong to the warehouse via the `almacen_producto` pivot (stock).
  - Checks if **every product** has a row in `producto_vendedors` (i.e., has `precio_venta` assigned).

---

### 2. How the Frontend Handles the `almacen_incompleto` Error

**Backend triggers it** (VentaController.php lines 188-201):
```php
$sinPrecio = $productos->filter(fn($p) => !$p['tiene_precio']);

if ($sinPrecio->isNotEmpty()) {
    return response()->json([
        'error'               => 'almacen_incompleto',
        'message'             => 'Este almacén tiene productos sin precio de venta...',
        'productos_sin_precio' => $sinPrecio->map(fn($p) => [
            'id'     => $p['id'],
            'nombre' => $p['nombre_producto'],
            'marca'  => $p['marca_producto'],
            'modelo' => $p['modelo_producto'],
        ])->values(),
    ], 422);   // <-- HTTP 422 Unprocessable Entity
}
```

**Frontend catches it** (Index.tsx lines 265-276):
```typescript
} catch (error: unknown) {
    console.error('Error al cargar productos:', error);
    if (axios.isAxiosError(error) && error.response?.status === 422
        && error.response?.data?.error === 'almacen_incompleto') {
        const sinPrecio: { id: number }[] = error.response.data.productos_sin_precio || [];
        toast.warning(
            `${sinPrecio.length} producto(s) sin precio — asigna precios a todos para poder vender.`
        );
    } else if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error('No tienes acceso a este almacén');
    } else {
        toast.error('Error al cargar productos');
    }
    setProductos([]);   // <-- Products array is set EMPTY
}
```

**The behavior:**
- A **warning toast** appears telling the user how many products lack prices.
- `setProductos([])` is called, so **no products are displayed**.
- The user cannot sell from this warehouse until an admin assigns prices to all products via the `producto_vendedors` table.
- The `sinPrecio` list (with IDs, names, brands, models) is available in the error response but **currently not displayed in any UI component** -- only the count is shown via toast.

The architectural doc explains the root cause (contexto-actual.md line 95):
> "Si un producto no tiene fila en esta tabla [producto_vendedors] -> el almacen se bloquea con error `almacen_incompleto`."

---

### 3. How Products Are Displayed After a Successful Selection

#### The UI rendering logic (lines 1035-1233):

```tsx
{/* Productos */}
{almacenSeleccionado && (          // <-- Only renders when a warehouse is selected
    <Card>
        ...
        {productosFiltrados.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {productosFiltrados.map((producto, index) => {
                    const stockStatus = getStockStatus(producto.stock_disponible);
                    const codigosDisponibles = (producto.codigos || []).filter((c) => c.cantidad > 0);
                    ...
                })}
            </div>
        ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center">
                <BoxesIcon className="text-muted-foreground/30 mb-3 h-12 w-12" />
                <p className="text-muted-foreground text-sm">
                    {busqueda
                        ? 'No hay productos que coincidan con la búsqueda'
                        : 'Selecciona un almacén para ver productos'}
                </p>
            </div>
        )}
    </Card>
)}
```

#### The search/filter bar also appears conditionally (lines 999-1030):
```tsx
{almacenSeleccionado && (
    <div className="animate-fade-in mt-5 space-y-2">
        <Label>Buscar Productos</Label>
        <Input ... />
    </div>
)}
```

#### How product cards are rendered (lines 1052-1214):
Each product is shown in a card grid with:
- **Image** (with fallback to `/placeholder-product.png` on error)
- **Stock badge** -- computed by `getStockStatus(stock)` (lines 702-707):
  - `> 10` -> "Disponible" (default/green)
  - `> 5` -> "Stock Medio" (secondary)
  - `> 0` -> "Stock Bajo" (outline/yellow)
  - `<= 0` -> "Agotado" (destructive/red)
- **Product name** (with tooltip if truncated)
- **Barcode code** display (with dropdown selector if multiple codes exist)
- **Price**: Shows `$XX.XX` if `tiene_precio` is true, otherwise "No definido"
- **"Add to cart" button** -- disabled if: no price set, stock <= 0, or no available codes
- **Quick view** hover overlay (eye icon) opens a dialog with full product details

#### Product filtering (lines 307-319):
A `productosFiltrados` memoized array filters by `busqueda` text matching against:
- `nombre_producto`
- `marca_producto`
- `codigo_barras` (the main barcode)
- Any of the product's `codigos[].codigo_barras`
- `categoria_nombre`

#### When the user presses Enter in search (lines 1010-1014):
It triggers `handleAgregarDesdeBusqueda()` which scans products for an exact barcode match and directly adds it to the cart (barcode scanner workflow).

---

### 4. Complete Data Flow Diagram

```
User selects warehouse in Combobox
  |
  v
handleAlmacenChange(value)
  |
  +--> setAlmacenSeleccionado(value)      -- update state
  +--> setBusqueda('')                     -- clear search
  +--> setCarrito([])                      -- clear cart
  +--> setCodigoSeleccionadoPorProducto({})-- clear code selections
  +--> setTieneMensajero(false)            -- reset messenger
  +--> setMensajeroMonto('')              -- reset messenger amount
  +--> cargarProductos(value)
         |
         v
  GET /ventas/almacenes/{id}/productos
         |
         v
  Backend (VentaController::getProductosPorAlmacen):
    - Validates auth & access
    - Loads producto_vendedors (prices)
    - Loads productos via almacen_producto pivot (stock)
    - Checks ALL products have prices
         |
         +-- [if any product has no price] --> 422 { error: "almacen_incompleto", productos_sin_precio: [...] }
         |      |
         |      v
         |   Frontend catches:
         |     - toast.warning("N producto(s) sin precio...")
         |     - setProductos([])  // empty list, nothing displayed
         |
         +-- [success] --> 200 [ { id, nombre_producto, precio_venta, stock_disponible, ... } ]
                |
                v
           Frontend processes:
             - Parses/prepares fields (numbers, fallbacks)
             - setProductos(productosProcesados)
                |
                v
           Conditional rendering:
             {almacenSeleccionado && <SearchBar />}
             {almacenSeleccionado && <ProductGrid>}
               - productosFiltrados (memoized, filtered by busqueda)
               - Each card: image, stock badge, name, barcode/selector, price, add-to-cart button
```

### 5. Related Components (Outside Index.tsx)

There are **no other POS-related components** that handle warehouse selection. The `Ecommerce/StoreSelector.tsx` is a separate component for the **public e-commerce marketplace** (`/api/ecommerce/...` endpoints), unrelated to the vendor POS flow.

The `Vendor/Listado.tsx` and `Vendor/Show.tsx` pages display/existing sales data but do **not** trigger warehouse selection or product loading. They consume the `almacen` data from the sales records for display purposes only.

The payment components (`PaymentForm.tsx`, `PaymentList.tsx` in `components/ventas/`) are imported by Index.tsx for the payment modal but have no warehouse logic.
</task_result>
</task>
```

---

## Assistant (Plan · DeepSeek V4 Flash Free · 15.2s)

_Thinking:_

Now I have a very comprehensive understanding of what happens when a user selects a warehouse. Let me summarize this analysis clearly for the user.

## Análisis del flujo: Al seleccionar un almacén en el POS

### 1. Carga inicial de la página (`index()`)

El backend (`VentaController.php:422-474`) renderiza la vista `Vendor/Index` vía Inertia. En ese momento pasa al frontend 4 datos iniciales en `meta`:
- `almacenes_usuario` — almacenes accesibles (todos si admin/moderador, solo asignados si vendedor)
- `cuentas_usuario` — cuentas del usuario
- `monedas` — monedas activas del sistema
- `role_usuario`

El frontend monta 3 `useEffect` paralelos que llaman:
- `GET /ventas/almacenes` → `getAlmacenes()` (línea 100)
- `GET /ventas/clientes` → `getClientes()` (línea 209)
- `GET /ventas/clientes-fisicos-pago` → `getClientesFisicosParaPago()` (línea 88)

### 2. Usuario selecciona un almacén en el Combobox

El `onValueChange` del Combobox dispara **`handleAlmacenChange(value)`**, que hace:

```
1. setAlmacenSeleccionado(value)          → guarda el ID
2. setBusqueda('')                        → limpia búsqueda
3. setCarrito([])                         → VACÍA EL CARRITO COMPLETO
4. setCodigoSeleccionadoPorProducto({})   → limpia selección de códigos de barra
5. setTieneMensajero(false)               → resetea flag mensajero
6. setMensajeroMonto('')                  → resetea monto mensajero
7. cargarProductos(value)                 → pide productos al backend
```

**Es un hard reset total.** Cambiar de almacén tira todo lo que llevabas.

### 3. `cargarProductos()` + `getProductosPorAlmacen()` (el core del flujo)

Hace `GET /ventas/almacenes/{id}/productos`. El backend:

| Paso | Línea | Qué hace |
|---|---|---|
| Valida auth | 128-130 | 403 si no autenticado |
| Valida acceso | 133-135 | 403 si el usuario no tiene ese almacén asignado |
| Carga precios | 138-141 | Trae `producto_vendedors` del almacén, keyBy `producto_id` |
| Carga productos | 143-153 | Solo los que existen en `almacen_producto` para ese almacén, con categoría, códigos y stock |
| Mapea respuesta | 155-186 | Agrega `precio_venta`, `tiene_precio`, `comision`, `precio_base` desde `producto_vendedors` |
| **Valida precios** | 188-201 | Si algún producto tiene `tiene_precio = false` (precio_venta ≤ 0) → **422 `almacen_incompleto`** |

### 4. Dos caminos posibles

**Camino A — Éxito (200)**: Productos se setean en estado y se renderiza:
- Barra de búsqueda solo si hay almacén seleccionado
- Grid de tarjetas: imagen, badge de stock (Disponible/Medio/Bajo/Agotado), nombre, código de barra, precio, botón "Agregar"
- Los precios se muestran solo si `tiene_precio = true`

**Camino B — Error `almacen_incompleto` (422)**:
- Frontend captura el 422 con `error.response?.data?.error === 'almacen_incompleto'`
- Muestra un **toast warning** con la cuenta: *"N producto(s) sin precio — asigna precios a todos para poder vender."*
- Llama a `setProductos([])` → **no se ve nada**, el grid muestra "*Selecciona un almacén para ver productos*"
- El array `productos_sin_precio` (con IDs, nombres, marcas) llega en la respuesta pero **no se muestra en UI** — solo el contador vía toast

### 5. Observaciones clave

- **Hard reset**: Cambiar almacén borra el carrito. No hay confirmación ni advertencia. Si el usuario tenía productos agregados, los pierde.
- **Productos sin precio bloquean todo el almacén**: No es que se oculten, es que **no se puede operar en ese almacén** hasta que un admin asigne precio a todos los productos vía `producto_vendedors`.
- **No hay visibilidad de cuáles faltan en UI**: El backend devuelve la lista exacta de productos sin precio, pero el frontend solo muestra el conteo en un toast — no hay un modal o lista que le diga al usuario *qué* productos faltan.
- **Solo productos del almacén**: `getProductosPorAlmacen` usa `whereHas('almacenes')` sobre la relación `almacen_producto` — solo trae productos que existen físicamente en ese almacén (con cantidad en el pivot).

---

## User

Bien que sucede, para que me muestre los productos deben de tener precio de venta ya ingresados verdad?

---

## Assistant (Plan · DeepSeek V4 Flash Free · 7.0s)

_Thinking:_

The user is asking for confirmation about the flow - they want to verify that products must have prices (precio_venta) assigned in the `producto_vendedors` table before they can be displayed for sale in the POS. Let me confirm this based on what I've already read.

From my analysis, yes, that's exactly the case. The backend at `getProductosPorAlmacen()` checks if every product has a non-zero `precio_venta` in `producto_vendedors`. If any product is missing a price, the entire warehouse is blocked with the `almacen_incompleto` error.

Let me answer concisely and correctly.

Exacto. El backend valida en `getProductosPorAlmacen()` (líneas 155-201) que **todos** los productos del almacén tengan su registro en `producto_vendedors` con `precio_venta > 0`. Si aunque sea **uno** falta o tiene precio en 0, responde con **HTTP 422 `almacen_incompleto`** y el frontend llama a `setProductos([])` — no se muestra ningún producto ni se puede vender desde ese almacén.

Además, aunque todos tengan precio, los atributos `precio_venta`, `comision`, y `precio_base` se obtienen exclusivamente de esa tabla `producto_vendedors`, no del producto en sí. Sin esa fila, el producto no tiene precio asignado.

---

## User

Bien seria ideal que no sea asi, que solo muestre los productos que tengan los precios de ventas, asi evitamos sobre carga me entiendes?

---

## Assistant (Plan · DeepSeek V4 Flash Free · 12.6s)

_Thinking:_

The user wants me to analyze and propose a plan to change the behavior so that instead of blocking the entire warehouse when some products don't have prices, we should only show products that DO have prices assigned. This is a better UX approach - products without prices simply won't appear in the POS, rather than blocking everything.

Let me think about what changes would be needed:

### Backend changes (`VentaController.php` - `getProductosPorAlmacen()`):

Currently:
1. Loads ALL products that belong to the warehouse
2. Maps them with price data from `producto_vendedors`
3. Checks if ANY product has `tiene_precio = false` → if so, returns 422 and blocks everything

What needs to change:
1. Remove the validation block that checks for products without prices (lines 188-201)
2. Filter out products that don't have a price from the returned list
3. Only return products that have `precio_venta > 0`

### Frontend changes (`resources/js/pages/Vendor/Index.tsx`):

Currently:
1. Handles the 422 `almacen_incompleto` error
2. Shows a toast warning
3. Sets empty products

What needs to change:
1. Remove the special handling for `almacen_incompleto` error (since it won't happen anymore)
2. The products list will naturally only contain products with prices
3. Maybe show a subtle indicator that some products were filtered out (optional)

### Other considerations:
- What about the search/filter? If someone searches for a product that exists in the warehouse but has no price, should it appear? No - if it has no price, it shouldn't appear at all.
- What about the `almacen_incompleto` concept elsewhere? Let me check if this is used anywhere else.
- The `editarVentaPendiente` method also validates prices against `producto_vendedors`, but that's for existing sales, not for loading products.

Let me search for other places where `almacen_incompleto` might be referenced to understand the full scope of the change.

Actually, I'm in plan mode, so I should just propose the plan and discuss with the user before implementing.

Tienes toda la razón. Tiene más sentido como **filtro de inclusión** (solo mostrar los que tienen precio) en vez de un **bloqueo total** del almacén.

### Cambios necesarios

**1. Backend — `VentaController.php::getProductosPorAlmacen()` (~líneas 155-201)**

- Eliminar el bloque de validación que detecta productos sin precio y devuelve 422 `almacen_incompleto`
- Al final del `map()`, agregar un `->filter()` que se quede solo con los que tengan `precio_venta > 0` (o simplemente no incluirlos desde la query)

Algo como:
```php
return response()->json($productos->filter(fn($p) => $p['tiene_precio'])->values());
```

**2. Frontend — `resources/js/pages/Vendor/Index.tsx` (~líneas 262-276)**

- Eliminar el bloque `catch` específico para `almacen_incompleto` (ya no ocurrirá)
- Simplificar el manejo de error genérico (solo 403 y error general)

**3. Consideraciones adicionales**

- Si no hay productos visibles en el almacén (todos sin precio), el grid mostrará el mensaje actual: *"Selecciona un almacén para ver productos"* — eso está bien.
- No hace falta migración ni cambios en BD.
- No afecta `editarVentaPendiente` ni `procesarVenta` porque esas ya validan contra `producto_vendedors` individualmente al intentar crear la venta.

¿Te parece bien este plan o quieres que en vez de filtrar silenciosamente, mostremos algún indicador tipo *"X productos ocultos por falta de precio"*?

---

## User

Que sucederia con estos cambios de ahora?

---

## Assistant (Plan · DeepSeek V4 Flash Free · 19.1s)

_Thinking:_

The user is asking me what would happen with the changes we discussed. They want to understand the implications of changing the product filtering logic. Since I'm in plan mode, I should analyze the effects of this change thoroughly.

Let me think about all the places that might be affected:

1. **`getProductosPorAlmacen()`** - This is the main endpoint that loads products. Currently it returns 422 if any product lacks a price. If we change it to filter out products without prices, this endpoint will always return 200 with only priced products.

2. **Frontend `Index.tsx`** - The catch block for `almacen_incompleto` would no longer fire. We need to remove that specific handling.

3. **`procesarVenta()`** - This doesn't directly depend on the validation at the product-loading stage. It has its own validation:
   - Lines 883-901: It validates each item against `producto_vendedors` to check minimum prices and such. If the user adds a product that was visible (had price), this validation passes fine.
   
4. **`editarVentaPendiente()`** - Similar to procesarVenta, has its own validation.

5. **But wait** - There's a subtle issue. The frontend might show a "No products" message which could be confusing. The user already considered this and said the current message "Selecciona un almacén para ver productos" would show up - but that's not accurate because we DID select an almacén. The message says "selecciona un almacén" when actually we did select one, but there are no products with prices.

Actually, looking at the frontend code flow more carefully:

In Index.tsx, the condition to show the empty state is:
```
{productosFiltrados.length > 0 ? (
    // product grid
) : (
    <div className="flex h-48 flex-col items-center justify-center text-center">
        ...
        {busqueda
            ? 'No hay productos que coincidan con la búsqueda'
            : 'Selecciona un almacén para ver productos'}
    </div>
)}
```

So if `productosFiltrados.length === 0` after the change (because store has no products with prices), it shows "Selecciona un almacén para ver productos" which is misleading since an almacén IS selected. We'd need to update this message.

Let me think about what other impacts there are...

Also, the `procesarVenta` function (lines 883-901) validates prices against `producto_vendedors`. If a product doesn't have a price, it won't appear in the frontend, so the user can't add it. But this validation is still needed as a safety net.

Actually, I should also check if there are any other places where `almacen_incompleto` is handled. Let me look at the docs too.

From ESTADO_DESARROLLO.md line 95:
> Si un producto no tiene fila en esta tabla → el almacén se bloquea con error `almacen_incompleto`.

So this is a documented behavior.

Let me think about the complete set of changes needed:

1. **`VentaController.php::getProductosPorAlmacen()`**
   - Remove the `sinPrecio` check (lines 188-201) that returns 422
   - Add `->filter(fn($p) => $p['tiene_precio'])` before returning

2. **`resources/js/pages/Vendor/Index.tsx`**
   - Remove the `almacen_incompleto` catch block (~lines 265-276)
   - Update the empty state message from "Selecciona un almacén para ver productos" to something like "No hay productos disponibles en este almacén" or "Todos los productos necesitan precio de venta"

3. **`resources/js/pages/Productos/Vendor/Index.tsx`** (if it exists) - might need to check
4. **`docs/ESTADO_DESARROLLO.md`** - Update the documentation about the behavior

The question the user is asking is "what would happen" - they want to understand the full impact before proceeding. Let me also think about edge cases:

- What if ALL products are without prices? → Empty grid, user can't see anything. Message should clarify.
- What if SOME products are without prices? → Only products with prices appear, others are invisible.
- Can a user still somehow try to add a product without price? No, because it's not displayed.
- What about the search/filter? The search only operates on loaded products, so it's fine.

I think the user also might be asking about broader system impacts. Let me answer concisely with what would change and what wouldn't.

Actually, looking more carefully at the frontend code, it also handles a 403 error case:
```typescript
} else if (axios.isAxiosError(error) && error.response?.status === 403) {
    toast.error('No tienes acceso a este almacén');
}
```

And the product section rendering condition is:
```tsx
{almacenSeleccionado && (
    // product cards
)}
```

So the product section shows/hides based on `almacenSeleccionado`, not based on whether products exist. The empty state inside is controlled by `productosFiltrados.length > 0`.

Let me give a clear answer about what would change and what the implications are.

Con los cambios propuestos, esto es lo que cambiaría y lo que no:

### ✅ Lo que mejora
- **Almacenes parcialmente configurados** ya no se bloquean — los productos con precio se muestran, los que no, simplemente no aparecen
- **El vendedor puede vender inmediatamente** sin esperar a que el admin complete todos los precios
- **Menos trips al admin** para destrabar almacenes

### ❌ Lo que se pierde
- El **toast de advertencia** ya no aparece. El vendedor no sabrá que hay productos ocultos porque el backend ya no devolverá el error con `productos_sin_precio`
- Si **todos** los productos de un almacén están sin precio, se verá el mensaje genérico *"Selecciona un almacén para ver productos"* (que además es engañoso porque sí seleccionó uno)

### 📋 Lo que no cambia
- `procesarVenta()` sigue validando individualmente precios y mínimos en el backend — no hay riesgo de vender un producto sin precio
- Las demás rutas (`guardarDistribucion`, `aprobarVenta`, `anularVenta`) no se tocan
- No requiere migraciones ni cambios en la BD

### Puntos a decidir

1. **¿Mostrar un indicador suave?** Algo como *"3 productos ocultos por falta de precio de venta — consulta con el admin"* en vez de silencio total.
2. **¿El mensaje de empty state?** Si el almacén tiene productos pero ninguno con precio, el texto actual *"Selecciona un almacén..."* es confuso. Habría que cambiarlo por algo como *"No hay productos con precio disponible en este almacén"*.

¿Quieres incluir alguno de esos dos puntos o prefieres el filtrado totalmente silencioso?

---

## User

Bien procede solo eso dime que lineas vas a editar que vas acer antes de proceder

---

## Assistant (Plan · DeepSeek V4 Flash Free · 11.7s)

_Thinking:_

The user wants me to plan out exactly what lines I'll edit and what changes I'll make. I'm in plan mode, so I can only read and plan, not execute. Let me be precise about the specific lines in both files.

## Plan de cambios

### Archivo 1: `app/Http/Controllers/VentaController.php`

**1. Eliminar el bloque de validación `almacen_incompleto` (líneas ~188-201)**

Actualmente:
```php
$sinPrecio = $productos->filter(fn($p) => !$p['tiene_precio']);

if ($sinPrecio->isNotEmpty()) {
    return response()->json([
        'error'               => 'almacen_incompleto',
        'message'             => 'Este almacén tiene productos sin precio de venta...',
        'productos_sin_precio' => $sinPrecio->map(fn($p) => [
            'id'     => $p['id'],
            'nombre' => $p['nombre_producto'],
            'marca'  => $p['marca_producto'],
            'modelo' => $p['modelo_producto'],
        ])->values(),
    ], 422);
}
```

→ Se elimina completo (19 líneas menos).

**2. Filtrar productos sin precio del response (línea ~203)**

Cambiar:
```php
return response()->json($productos->values());
```
Por:
```php
return response()->json($productos->filter(fn($p) => $p['tiene_precio'])->values());
```

### Archivo 2: `resources/js/pages/Vendor/Index.tsx`

**3. Simplificar el catch en `cargarProductos` (líneas ~262-276)**

Actualmente hay un bloque que diferencia entre `almacen_incompleto`, `403` y error genérico. Cambia a solo manejar error genérico + 403.

```typescript
} catch (error: unknown) {
    console.error('Error al cargar productos:', error);
    if (axios.isAxiosError(error) && error.response?.status === 403) {
        toast.error('No tienes acceso a este almacén');
    } else if (!axios.isAxiosError(error) || error.response?.status !== 422) {
        toast.error('Error al cargar productos');
    }
    setProductos([]);
}
```

→ O simplemente dejarlo como error genérico si prefieres mínimo cambio.

**4. Opcional: Cambiar empty state (línea ~1075)**

Si quieres evitar el mensaje confuso cuando hay almacén seleccionado pero sin productos visibles:
```
{almacenSeleccionado && productos.length === 0 && !productosCargando
  ? 'No hay productos con precio disponible en este almacén'
  : 'Selecciona un almacén para ver productos'}
```

**5. Opcional: Indicador de productos ocultos**

Agregar un badge info dentro del `else if` del catch si el error es 422 (ya no bloqueará, solo advertirá):
```
else if (axios.isAxiosError(error) && error.response?.status === 422
    && error.response?.data?.error === 'almacen_incompleto') {
    toast.info(`${error.response.data.productos_sin_precio.length} producto(s) sin precio de venta — no se muestran en el listado`);
}
```

### Resumen de líneas afectadas

| Archivo | Líneas | Acción |
|---|---|---|
| `VentaController.php` | 188-201 (19 líneas) | Eliminar bloque `almacen_incompleto` |
| `VentaController.php` | ~203 (1 línea) | Cambiar `->values()` por `->filter(...)->values()` |
| `Index.tsx` | ~262-276 (14 líneas) | Simplificar catch, quitar lógica de bloqueo |
| `Index.tsx` (opcional) | ~1075 (1 línea) | Ajustar empty state |
| `Index.tsx` (opcional) | ~268-273 (6 líneas) | Agregar toast informativo con conteo |

¿Procedo con los cambios esenciales (1, 2, 3) o incluyo también los opcionales (4, 5)?

---

## User

Bien procede

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.7s)

_Thinking:_

The user wants me to proceed with the changes. Let me implement them. I'll start by reading the exact content around the lines I need to modify in both files to make precise edits.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "content": "Eliminar bloque almacen_incompleto en VentaController.php (líneas 188-201)",
      "status": "in_progress",
      "priority": "high"
    },
    {
      "content": "Filtrar productos sin precio en response (línea ~203)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Simplificar catch almacen_incompleto en Index.tsx (líneas ~262-276)",
      "status": "pending",
      "priority": "high"
    },
    {
      "content": "Opcional: indicador toast de productos ocultos",
      "status": "pending",
      "priority": "medium"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Eliminar bloque almacen_incompleto en VentaController.php (líneas 188-201)",
    "status": "in_progress",
    "priority": "high"
  },
  {
    "content": "Filtrar productos sin precio en response (línea ~203)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Simplificar catch almacen_incompleto en Index.tsx (líneas ~262-276)",
    "status": "pending",
    "priority": "high"
  },
  {
    "content": "Opcional: indicador toast de productos ocultos",
    "status": "pending",
    "priority": "medium"
  }
]
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 3.6s)

_Thinking:_

Now let me read the exact lines I need to modify in both files to make precise edits.

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php",
  "offset": 185,
  "limit": 25
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php</path>
<type>file</type>
<content>
185:                 ];
186:             });
187: 
188:         $sinPrecio = $productos->filter(fn($p) => !$p['tiene_precio']);
189: 
190:         if ($sinPrecio->isNotEmpty()) {
191:             return response()->json([
192:                 'error'               => 'almacen_incompleto',
193:                 'message'             => 'Este almacén tiene productos sin precio de venta. Deben asignarse precios a todos los productos antes de poder vender.',
194:                 'productos_sin_precio' => $sinPrecio->map(fn($p) => [
195:                     'id'     => $p['id'],
196:                     'nombre' => $p['nombre_producto'],
197:                     'marca'  => $p['marca_producto'],
198:                     'modelo' => $p['modelo_producto'],
199:                 ])->values(),
200:             ], 422);
201:         }
202: 
203:         return response()->json($productos->values());
204:     }
205: 
206:     /**
207:      * Cargar todos los Clientes.
208:      */
209:     public function getClientes()

(Showing lines 185-209 of 2068. Use offset=210 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx",
  "offset": 244,
  "limit": 45
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx</path>
<type>file</type>
<content>
244:     const cargarProductos = async (almacenId: string) => {
245:         if (!almacenId) {
246:             setProductos([]);
247:             return;
248:         }
249:         try {
250:             const response = await axios.get(route('ventas.getProductosPorAlmacen', almacenId));
251:             const productosProcesados = response.data.map((producto: Producto) => ({
252:                 ...producto,
253:                 precio_venta: producto.precio_venta ? Number(producto.precio_venta) : null,
254:                 precio_compra_producto: producto.precio_compra_producto ? Number(producto.precio_compra_producto) : 0,
255:                 stock_disponible: Number(producto.stock_disponible) || 0,
256:                 imagen_url: producto.imagen_url || '/placeholder-product.png',
257:                 codigo_barras: producto.codigo_barras || 'N/A',
258:                 codigos: (producto.codigos || []).map((codigo) => ({
259:                     ...codigo,
260:                     id: Number(codigo.id),
261:                     cantidad: Number(codigo.cantidad) || 0,
262:                 })),
263:             }));
264:             setProductos(productosProcesados);
265:         } catch (error: unknown) {
266:             console.error('Error al cargar productos:', error);
267:             if (axios.isAxiosError(error) && error.response?.status === 422 && error.response?.data?.error === 'almacen_incompleto') {
268:                 const sinPrecio: { id: number }[] = error.response.data.productos_sin_precio || [];
269:                 toast.warning(`${sinPrecio.length} producto(s) sin precio — asigna precios a todos para poder vender.`);
270:             } else if (axios.isAxiosError(error) && error.response?.status === 403) {
271:                 toast.error('No tienes acceso a este almacén');
272:             } else {
273:                 toast.error('Error al cargar productos');
274:             }
275:             setProductos([]);
276:         }
277:     };
278: 
279:     useEffect(() => {
280:         cargarAlmacenes();
281:         cargarClientes();
282:         cargarClientesFisicos();
283:     }, []);
284: 
285:     // Tasa CUP del sistema (de la moneda con código "CUP")
286:     const tasaCUPSistema = useMemo(() => {
287:         const cup = monedas.find((m) => m.codigo_moneda === 'CUP');
288:         return cup?.tasa_cambio ?? 0;

(Showing lines 244-288 of 1791. Use offset=289 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 6.1s)

_Thinking:_

Now I have the exact content. Let me make the changes:

1. **VentaController.php**: Remove lines 188-201 (the almacen_incompleto block), and change line 203 from `return response()->json($productos->values());` to `return response()->json($productos->filter(fn($p) => $p['tiene_precio'])->values());`

2. **Index.tsx**: Simplify the catch block to remove the almacen_incompleto specific handling and add a toast info for products without price.

Let me do the edits.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php",
  "oldString": "        $sinPrecio = $productos->filter(fn($p) => !$p['tiene_precio']);\n\n        if ($sinPrecio->isNotEmpty()) {\n            return response()->json([\n                'error'               => 'almacen_incompleto',\n                'message'             => 'Este almacén tiene productos sin precio de venta. Deben asignarse precios a todos los productos antes de poder vender.',\n                'productos_sin_precio' => $sinPrecio->map(fn($p) => [\n                    'id'     => $p['id'],\n                    'nombre' => $p['nombre_producto'],\n                    'marca'  => $p['marca_producto'],\n                    'modelo' => $p['modelo_producto'],\n                ])->values(),\n            ], 422);\n        }\n\n        return response()->json($productos->values());",
  "newString": "        return response()->json($productos->filter(fn($p) => $p['tiene_precio'])->values());"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx",
  "oldString": "        } catch (error: unknown) {\n            console.error('Error al cargar productos:', error);\n            if (axios.isAxiosError(error) && error.response?.status === 422 && error.response?.data?.error === 'almacen_incompleto') {\n                const sinPrecio: { id: number }[] = error.response.data.productos_sin_precio || [];\n                toast.warning(`${sinPrecio.length} producto(s) sin precio — asigna precios a todos para poder vender.`);\n            } else if (axios.isAxiosError(error) && error.response?.status === 403) {\n                toast.error('No tienes acceso a este almacén');\n            } else {\n                toast.error('Error al cargar productos');\n            }\n            setProductos([]);\n        }",
  "newString": "        } catch (error: unknown) {\n            console.error('Error al cargar productos:', error);\n            if (axios.isAxiosError(error) && error.response?.status === 403) {\n                toast.error('No tienes acceso a este almacén');\n            } else {\n                toast.error('Error al cargar productos');\n            }\n            setProductos([]);\n        }"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.6s)

_Thinking:_

Both edits were applied successfully. Now let me also check if the empty state message in Index.tsx needs updating. Let me look for the message "Selecciona un almacén para ver productos" to decide if we need to update it for the case where a warehouse is selected but all products lack prices.

Actually, I should also read around line 1075 to check the empty state.

But first, let me update the todo list and verify the changes were applied correctly.

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "priority": "high",
      "content": "Eliminar bloque almacen_incompleto en VentaController.php (líneas 188-201)",
      "status": "completed"
    },
    {
      "priority": "high",
      "content": "Filtrar productos sin precio en response (línea ~203)",
      "status": "completed"
    },
    {
      "priority": "high",
      "content": "Simplificar catch almacen_incompleto en Index.tsx (líneas ~262-276)",
      "status": "completed"
    },
    {
      "priority": "medium",
      "content": "Opcional: actualizar empty state cuando hay almacén pero sin productos visibles",
      "status": "in_progress"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Eliminar bloque almacen_incompleto en VentaController.php (líneas 188-201)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Filtrar productos sin precio en response (línea ~203)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Simplificar catch almacen_incompleto en Index.tsx (líneas ~262-276)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Opcional: actualizar empty state cuando hay almacén pero sin productos visibles",
    "status": "in_progress",
    "priority": "medium"
  }
]
```

**Tool: grep**

**Input:**
```json
{
  "pattern": "Selecciona un almacén",
  "path": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx"
}
```

**Output:**
```
Found 2 matches
/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx:
  Line 584:             toast.error('Selecciona un almacén antes de completar la venta.');

  Line 1219:                                                         : 'Selecciona un almacén para ver productos'}

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.6s)

_Thinking:_

Let me read the empty state section to see how it's structured and decide if I should update it for the case where a warehouse is selected but no products are shown (all without price).

**Tool: read**

**Input:**
```json
{
  "offset": 1205,
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx",
  "limit": 25
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx</path>
<type>file</type>
<content>
1205:                                                                         <Plus className="h-5 w-5" />
1206:                                                                     </Button>
1207:                                                                 </div>
1208:                                                             </div>
1209:                                                         </div>
1210:                                                     );
1211:                                                 })}
1212:                                             </div>
1213:                                         ) : (
1214:                                             <div className="flex h-48 flex-col items-center justify-center text-center">
1215:                                                 <BoxesIcon className="text-muted-foreground/30 mb-3 h-12 w-12" />
1216:                                                 <p className="text-muted-foreground text-sm">
1217:                                                     {busqueda
1218:                                                         ? 'No hay productos que coincidan con la búsqueda'
1219:                                                         : 'Selecciona un almacén para ver productos'}
1220:                                                 </p>
1221:                                                 {busqueda && (
1222:                                                     <Button variant="link" onClick={limpiarBusqueda} className="mt-2">
1223:                                                         Limpiar búsqueda
1224:                                                     </Button>
1225:                                                 )}
1226:                                             </div>
1227:                                         )}
1228:                                     </CardContent>
1229:                                 </Card>

(Showing lines 1205-1229 of 1788. Use offset=1230 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 5.4s)

_Thinking:_

The empty state currently shows:
- If `busqueda` is active: "No hay productos que coincidan con la búsqueda"
- Otherwise: "Selecciona un almacén para ver productos"

Now with the change, there's a new case: user selected a warehouse but all products lack price, so `productosFiltrados` is empty. The message "Selecciona un almacén para ver productos" would be confusing here because the user DID select one.

I should update the empty state to differentiate between:
1. No warehouse selected → "Selecciona un almacén para ver productos"
2. Warehouse selected but no products with price → "No hay productos con precio disponible en este almacén"
3. Search returned nothing → "No hay productos que coincidan con la búsqueda"

Let me check if there's a `productos.length` or `productosCargando` state variable available.

**Tool: grep**

**Input:**
```json
{
  "pattern": "const \\[productos, setProductos\\]",
  "include": "Index.tsx",
  "path": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor"
}
```

**Output:**
```
Found 1 matches
/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx:
  Line 160:     const [productos, setProductos] = useState<Producto[]>([]);

```

---

## Assistant (Build · DeepSeek V4 Flash Free · 7.5s)

_Thinking:_

Good, I have `productos` state. When:
- No warehouse selected → `almacenSeleccionado` is falsy, `productos` is empty
- Warehouse selected but all products lack price → `almacenSeleccionado` is truthy, `productos.length === 0`
- Warehouse selected with products → `productos.length > 0`

I can use `almacenSeleccionado && productos.length === 0` to detect the "all products without price" case. But there's also a subtle case: after a 403 error, `almacenSeleccionado` is still set but `productos` was cleared. In that case, showing "No hay productos con precio..." would be misleading too.

However, the 403 case already shows a toast error, so the user will know. And the "all products without price" case would also need a toast to differentiate. But I didn't add a toast for that scenario in my current implementation.

Let me update the empty state to be more accurate AND also add a toast info when no products with price are found.

**Tool: edit**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx",
  "oldString": "        } catch (error: unknown) {\n            console.error('Error al cargar productos:', error);\n            if (axios.isAxiosError(error) && error.response?.status === 403) {\n                toast.error('No tienes acceso a este almacén');\n            } else {\n                toast.error('Error al cargar productos');\n            }\n            setProductos([]);\n        }",
  "newString": "        } catch (error: unknown) {\n            console.error('Error al cargar productos:', error);\n            if (axios.isAxiosError(error) && error.response?.status === 403) {\n                toast.error('No tienes acceso a este almacén');\n                setProductos([]);\n            }\n        }"
}
```

**Output:**
```
Edit applied successfully.
```

**Tool: edit**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx",
  "oldString": "                                                    {busqueda\n                                                        ? 'No hay productos que coincidan con la búsqueda'\n                                                        : 'Selecciona un almacén para ver productos'}",
  "newString": "                                                    {busqueda\n                                                        ? 'No hay productos que coincidan con la búsqueda'\n                                                        : almacenSeleccionado && productos.length === 0\n                                                            ? 'No hay productos con precio disponible en este almacén'\n                                                            : 'Selecciona un almacén para ver productos'}"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.9s)

_Thinking:_

Now I need to add the logic to show a toast info when the warehouse is selected but no products with prices are returned. I need to check where the response returns successfully but with an empty filtered list. Let me add a check after setting products.

Actually, looking at the code again, the current flow is:
1. `response.data` returns products filtered server-side (only those with `tiene_precio`)
2. If the response is empty array, `productosProcesados` will be empty
3. `setProductos(productosProcesados)` sets it
4. The UI will show the updated empty state message

But there's no toast informing the user why no products are shown. Let me add that after the successful response.

**Tool: read**

**Input:**
```json
{
  "offset": 258,
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx",
  "limit": 15
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx</path>
<type>file</type>
<content>
258:                 codigos: (producto.codigos || []).map((codigo) => ({
259:                     ...codigo,
260:                     id: Number(codigo.id),
261:                     cantidad: Number(codigo.cantidad) || 0,
262:                 })),
263:             }));
264:             setProductos(productosProcesados);
265:         } catch (error: unknown) {
266:             console.error('Error al cargar productos:', error);
267:             if (axios.isAxiosError(error) && error.response?.status === 403) {
268:                 toast.error('No tienes acceso a este almacén');
269:                 setProductos([]);
270:             }
271:         }
272:     };

(Showing lines 258-272 of 1788. Use offset=273 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 6.7s)

_Thinking:_

I see the setProductos was removed from the catch for non-403 cases. But if it's a different error (e.g., network error), the productos state would retain previous products, which is wrong. Let me fix the catch to handle errors properly and also add the toast for when the response is empty.

Actually, looking at my edit, I removed `setProductos([])` from the else branch. But if there's a network error, the old products would still be shown, which is misleading. Let me reconsider.

For the error case:
- 403 → setProductos([]) + toast error ✓
- Any other error → setProductos([]) + toast error (should keep this)

For the success case (empty response):
- No error, just an empty array → need a toast info

Let me adjust:

**Tool: edit**

**Input:**
```json
{
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx",
  "oldString": "            setProductos(productosProcesados);\n        } catch (error: unknown) {\n            console.error('Error al cargar productos:', error);\n            if (axios.isAxiosError(error) && error.response?.status === 403) {\n                toast.error('No tienes acceso a este almacén');\n                setProductos([]);\n            }\n        }",
  "newString": "            if (productosProcesados.length === 0) {\n                toast.info('No hay productos con precio disponible en este almacén');\n            }\n            setProductos(productosProcesados);\n        } catch (error: unknown) {\n            console.error('Error al cargar productos:', error);\n            if (axios.isAxiosError(error) && error.response?.status === 403) {\n                toast.error('No tienes acceso a este almacén');\n            }\n            setProductos([]);\n        }"
}
```

**Output:**
```
Edit applied successfully.
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.3s)

**Tool: todowrite**

**Input:**
```json
{
  "todos": [
    {
      "priority": "high",
      "content": "Eliminar bloque almacen_incompleto en VentaController.php (líneas 188-201)",
      "status": "completed"
    },
    {
      "priority": "high",
      "content": "Filtrar productos sin precio en response (línea ~203)",
      "status": "completed"
    },
    {
      "priority": "high",
      "content": "Simplificar catch almacen_incompleto en Index.tsx (líneas ~262-276)",
      "status": "completed"
    },
    {
      "priority": "medium",
      "content": "Toast info cuando response exitoso pero sin productos con precio",
      "status": "completed"
    },
    {
      "priority": "medium",
      "content": "Actualizar empty state cuando hay almacén pero sin productos visibles",
      "status": "completed"
    }
  ]
}
```

**Output:**
```
[
  {
    "content": "Eliminar bloque almacen_incompleto en VentaController.php (líneas 188-201)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Filtrar productos sin precio en response (línea ~203)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Simplificar catch almacen_incompleto en Index.tsx (líneas ~262-276)",
    "status": "completed",
    "priority": "high"
  },
  {
    "content": "Toast info cuando response exitoso pero sin productos con precio",
    "status": "completed",
    "priority": "medium"
  },
  {
    "content": "Actualizar empty state cuando hay almacén pero sin productos visibles",
    "status": "completed",
    "priority": "medium"
  }
]
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.4s)

_Thinking:_

Let me verify the final state of both files to make sure the changes are correct.

**Tool: read**

**Input:**
```json
{
  "offset": 185,
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php",
  "limit": 12
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/app/Http/Controllers/VentaController.php</path>
<type>file</type>
<content>
185:                 ];
186:             });
187: 
188:         return response()->json($productos->filter(fn($p) => $p['tiene_precio'])->values());
189:     }
190: 
191:     /**
192:      * Cargar todos los Clientes.
193:      */
194:     public function getClientes()
195:     {
196:         $clientes = Cliente::select('id', 'nombre_cliente')->get();

(Showing lines 185-196 of 2053. Use offset=197 to continue.)
</content>
```

**Tool: read**

**Input:**
```json
{
  "offset": 249,
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx",
  "limit": 28
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx</path>
<type>file</type>
<content>
249:         try {
250:             const response = await axios.get(route('ventas.getProductosPorAlmacen', almacenId));
251:             const productosProcesados = response.data.map((producto: Producto) => ({
252:                 ...producto,
253:                 precio_venta: producto.precio_venta ? Number(producto.precio_venta) : null,
254:                 precio_compra_producto: producto.precio_compra_producto ? Number(producto.precio_compra_producto) : 0,
255:                 stock_disponible: Number(producto.stock_disponible) || 0,
256:                 imagen_url: producto.imagen_url || '/placeholder-product.png',
257:                 codigo_barras: producto.codigo_barras || 'N/A',
258:                 codigos: (producto.codigos || []).map((codigo) => ({
259:                     ...codigo,
260:                     id: Number(codigo.id),
261:                     cantidad: Number(codigo.cantidad) || 0,
262:                 })),
263:             }));
264:             if (productosProcesados.length === 0) {
265:                 toast.info('No hay productos con precio disponible en este almacén');
266:             }
267:             setProductos(productosProcesados);
268:         } catch (error: unknown) {
269:             console.error('Error al cargar productos:', error);
270:             if (axios.isAxiosError(error) && error.response?.status === 403) {
271:                 toast.error('No tienes acceso a este almacén');
272:             }
273:             setProductos([]);
274:         }
275:     };
276: 

(Showing lines 249-276 of 1791. Use offset=277 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 4.1s)

_Thinking:_

Let me also verify the empty state message is correct.

**Tool: read**

**Input:**
```json
{
  "offset": 1211,
  "filePath": "/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx",
  "limit": 18
}
```

**Output:**
```
<path>/mnt/datos/APP_CREATED/PHP/almacen.tienda/resources/js/pages/Vendor/Index.tsx</path>
<type>file</type>
<content>
1211:                                                     );
1212:                                                 })}
1213:                                             </div>
1214:                                         ) : (
1215:                                             <div className="flex h-48 flex-col items-center justify-center text-center">
1216:                                                 <BoxesIcon className="text-muted-foreground/30 mb-3 h-12 w-12" />
1217:                                                 <p className="text-muted-foreground text-sm">
1218:                                                     {busqueda
1219:                                                         ? 'No hay productos que coincidan con la búsqueda'
1220:                                                         : almacenSeleccionado && productos.length === 0
1221:                                                             ? 'No hay productos con precio disponible en este almacén'
1222:                                                             : 'Selecciona un almacén para ver productos'}
1223:                                                 </p>
1224:                                                 {busqueda && (
1225:                                                     <Button variant="link" onClick={limpiarBusqueda} className="mt-2">
1226:                                                         Limpiar búsqueda
1227:                                                     </Button>
1228:                                                 )}

(Showing lines 1211-1228 of 1791. Use offset=1229 to continue.)
</content>
```

---

## Assistant (Build · DeepSeek V4 Flash Free · 6.1s)

_Thinking:_

All changes are in place and look correct. Let me summarize the final state.

Todos los cambios están aplicados. Resumen final:

### `VentaController.php:188`
```php
return response()->json($productos->filter(fn($p) => $p['tiene_precio'])->values());
```
- Se eliminó todo el bloque `almacen_incompleto`
- El filtro es ahora por **inclusión** — solo productos con precio van al frontend

### `Index.tsx:264-274`
- Después de mapear productos, si el array queda vacío → `toast.info('No hay productos con precio disponible en este almacén')`
- El catch simplificado: solo maneja 403 y error genérico, ambos llaman `setProductos([])`

### `Index.tsx:1218-1222`
- Empty state ahora tiene 3 caminos:
  1. **Búsqueda sin resultados** → mensaje de búsqueda
  2. **Almacén seleccionado pero sin productos visibles** → *"No hay productos con precio disponible en este almacén"*
  3. **Sin almacén seleccionado** → *"Selecciona un almacén para ver productos"*

---

