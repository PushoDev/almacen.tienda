"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = PuntoVentaOficial;
var heading_small_1 = require("@/components/heading-small");
var badge_1 = require("@/components/ui/badge");
var button_1 = require("@/components/ui/button");
var card_1 = require("@/components/ui/card");
var input_1 = require("@/components/ui/input");
var select_1 = require("@/components/ui/select");
var separator_1 = require("@/components/ui/separator");
var sonner_1 = require("@/components/ui/sonner");
var table_1 = require("@/components/ui/table");
var tooltip_1 = require("@/components/ui/tooltip");
var app_layout_1 = require("@/layouts/app-layout");
var react_1 = require("@inertiajs/react");
var axios_1 = require("axios");
var lucide_react_1 = require("lucide-react");
var react_2 = require("react");
var sonner_2 = require("sonner");
// Rutas breadcrumb
var breadcrumbs = [
    {
        title: 'Productos',
        href: '/productos',
    },
    {
        title: 'Punto de Ventas',
        href: '#',
    },
];
function PuntoVentaOficial(_a) {
    var _this = this;
    var meta = _a.meta;
    // Estados
    var _b = (0, react_2.useState)([]), almacenes = _b[0], setAlmacenes = _b[1];
    var _c = (0, react_2.useState)([]), clientes = _c[0], setClientes = _c[1];
    var _d = (0, react_2.useState)([]), productos = _d[0], setProductos = _d[1];
    var _e = (0, react_2.useState)(''), almacenSeleccionado = _e[0], setAlmacenSeleccionado = _e[1];
    var _f = (0, react_2.useState)(''), clienteSeleccionado = _f[0], setClienteSeleccionado = _f[1];
    var _g = (0, react_2.useState)(false), loadingAlmacenes = _g[0], setLoadingAlmacenes = _g[1];
    var _h = (0, react_2.useState)(false), loadingClientes = _h[0], setLoadingClientes = _h[1];
    var _j = (0, react_2.useState)(false), loadingProductos = _j[0], setLoadingProductos = _j[1];
    var _k = (0, react_2.useState)(''), busqueda = _k[0], setBusqueda = _k[1];
    var _l = (0, react_2.useState)([]), carrito = _l[0], setCarrito = _l[1];
    var _m = (0, react_2.useState)(false), procesandoVenta = _m[0], setProcesandoVenta = _m[1];
    // Cargar almacenes
    var cargarAlmacenes = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLoadingAlmacenes(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, axios_1.default.get(route('ventas.getAlmacenes'))];
                case 2:
                    response = _a.sent();
                    setAlmacenes(response.data);
                    return [3 /*break*/, 5];
                case 3:
                    error_1 = _a.sent();
                    console.error('Error al cargar almacenes:', error_1);
                    return [3 /*break*/, 5];
                case 4:
                    setLoadingAlmacenes(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    // Cargar clientes
    var cargarClientes = function () { return __awaiter(_this, void 0, void 0, function () {
        var response, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    setLoadingClientes(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, axios_1.default.get(route('ventas.getClientes'))];
                case 2:
                    response = _a.sent();
                    setClientes(response.data);
                    return [3 /*break*/, 5];
                case 3:
                    error_2 = _a.sent();
                    console.error('Error al cargar clientes:', error_2);
                    return [3 /*break*/, 5];
                case 4:
                    setLoadingClientes(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    // Cargar productos cuando cambia el almacén
    var cargarProductos = function (almacenId) { return __awaiter(_this, void 0, void 0, function () {
        var response, productosProcesados, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!almacenId) {
                        setProductos([]);
                        return [2 /*return*/];
                    }
                    setLoadingProductos(true);
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, 4, 5]);
                    return [4 /*yield*/, axios_1.default.get(route('ventas.getProductosPorAlmacen', almacenId))];
                case 2:
                    response = _a.sent();
                    productosProcesados = response.data.map(function (producto) { return (__assign(__assign({}, producto), { precio_venta: producto.precio_venta ? Number(producto.precio_venta) : null, precio_compra_producto: producto.precio_compra_producto ? Number(producto.precio_compra_producto) : 0, stock_total: Number(producto.stock_total) || 0 })); });
                    setProductos(productosProcesados);
                    return [3 /*break*/, 5];
                case 3:
                    error_3 = _a.sent();
                    console.error('Error al cargar productos:', error_3);
                    setProductos([]);
                    return [3 /*break*/, 5];
                case 4:
                    setLoadingProductos(false);
                    return [7 /*endfinally*/];
                case 5: return [2 /*return*/];
            }
        });
    }); };
    // Efecto para cargar datos iniciales
    (0, react_2.useEffect)(function () {
        cargarAlmacenes();
        cargarClientes();
    }, []);
    // Manejar cambio de almacén
    var handleAlmacenChange = function (value) {
        setAlmacenSeleccionado(value);
        cargarProductos(value);
        setBusqueda(''); // Limpiar búsqueda al cambiar de almacén
    };
    // Manejar cambio de cliente
    var handleClienteChange = function (value) {
        setClienteSeleccionado(value);
    };
    // Filtrar productos según búsqueda
    var productosFiltrados = (0, react_2.useMemo)(function () {
        if (!busqueda.trim())
            return productos;
        var termino = busqueda.toLowerCase().trim();
        return productos.filter(function (producto) {
            var _a, _b, _c, _d;
            return (_d = (((_a = producto.nombre_producto) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(termino)) ||
                ((_b = producto.marca_producto) === null || _b === void 0 ? void 0 : _b.toLowerCase().includes(termino)) ||
                ((_c = producto.categoria_nombre) === null || _c === void 0 ? void 0 : _c.toLowerCase().includes(termino)))) !== null && _d !== void 0 ? _d : false;
        });
    }, [productos, busqueda]);
    // Limpiar búsqueda
    var limpiarBusqueda = function () {
        setBusqueda('');
    };
    // Agregar producto al carrito
    var agregarAlCarrito = function (producto) {
        var idItem = "".concat(producto.id);
        // Verificar si el producto ya está en el carrito
        var itemExistente = carrito.find(function (item) { return item.id === idItem; });
        if (itemExistente) {
            // Si ya existe, aumentar la cantidad (verificar stock)
            var nuevaCantidad_1 = Math.min(itemExistente.cantidad + 1, producto.stock_total);
            setCarrito(carrito.map(function (item) {
                return item.id === idItem
                    ? __assign(__assign({}, item), { cantidad: nuevaCantidad_1, subtotal: nuevaCantidad_1 * item.precio_venta }) : item;
            }));
        }
        else {
            // Si no existe, agregar nuevo item
            var precioVenta = producto.precio_venta && producto.precio_venta > 0 ? producto.precio_venta : 0;
            var nuevoItem = {
                id: idItem,
                producto: producto,
                cantidad: 1,
                precio_venta: precioVenta,
                subtotal: precioVenta,
            };
            setCarrito(__spreadArray(__spreadArray([], carrito, true), [nuevoItem], false));
        }
    };
    // Actualizar cantidad de un item
    var actualizarCantidad = function (id, nuevaCantidad) {
        if (nuevaCantidad < 1)
            return;
        var item = carrito.find(function (item) { return item.id === id; });
        if (!item)
            return;
        if (nuevaCantidad > item.producto.stock_total) {
            nuevaCantidad = item.producto.stock_total;
        }
        setCarrito(carrito.map(function (itemCarrito) {
            return itemCarrito.id === id
                ? __assign(__assign({}, itemCarrito), { cantidad: nuevaCantidad, subtotal: nuevaCantidad * itemCarrito.precio_venta }) : itemCarrito;
        }));
    };
    // Actualizar precio de venta
    var actualizarPrecio = function (id, nuevoPrecio) {
        if (nuevoPrecio < 0)
            return;
        setCarrito(carrito.map(function (item) {
            return item.id === id
                ? __assign(__assign({}, item), { precio_venta: nuevoPrecio, subtotal: item.cantidad * nuevoPrecio }) : item;
        }));
    };
    // Quitar producto del carrito
    var quitarDelCarrito = function (id) {
        setCarrito(carrito.filter(function (item) { return item.id !== id; }));
    };
    // Calcular totales
    var calcularTotal = (0, react_2.useMemo)(function () {
        return carrito.reduce(function (total, item) {
            var subtotal = item.cantidad * item.precio_venta;
            return total + (isNaN(subtotal) ? 0 : subtotal);
        }, 0);
    }, [carrito]);
    // Incrementar cantidad
    var incrementarCantidad = function (id) {
        var item = carrito.find(function (item) { return item.id === id; });
        if (item && item.cantidad < item.producto.stock_total) {
            actualizarCantidad(id, item.cantidad + 1);
        }
    };
    // Decrementar cantidad
    var decrementarCantidad = function (id) {
        var item = carrito.find(function (item) { return item.id === id; });
        if (item && item.cantidad > 1) {
            actualizarCantidad(id, item.cantidad - 1);
        }
    };
    // Procesar venta
    var procesarVenta = function () {
        // Validaciones
        if (carrito.length === 0) {
            sonner_2.toast.warning('El carrito está vacío');
            return;
        }
        if (!almacenSeleccionado) {
            sonner_2.toast.warning('Por favor seleccione un almacén');
            return;
        }
        if (!clienteSeleccionado) {
            sonner_2.toast.warning('Por favor seleccione un cliente');
            return;
        }
        setProcesandoVenta(true);
        // Preparar datos de la venta
        var datosVenta = {
            almacen_id: almacenSeleccionado,
            cliente_id: clienteSeleccionado,
            items: carrito.map(function (item) { return ({
                producto_id: item.producto.id,
                cantidad: item.cantidad,
                precio_venta: item.precio_venta,
                subtotal: item.subtotal,
            }); }),
            total: calcularTotal,
        };
        // Enviar datos al backend
        react_1.router.post(route('ventas.procesar'), datosVenta, {
            onSuccess: function () {
                console.log('Venta procesada exitosamente');
                // Limpiar carrito después de procesar
                setCarrito([]);
            },
            onError: function (errors) {
                console.error('Error al procesar venta:', errors);
                alert('Error al procesar la venta. Por favor intente nuevamente.');
            },
            onFinish: function () {
                setProcesandoVenta(false);
            },
        });
    };
    return (<app_layout_1.default breadcrumbs={breadcrumbs}>
            <react_1.Head title="Punto de Venta"/>

            {/* Contenedor principal */}
            <div className="animate__animated animate__fadeIn flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="bg-sidebar border-sidebar-accent animate__animated animate__fadeIn relative col-span-4 space-y-1 overflow-hidden rounded-2xl border border-dashed p-4">
                    <heading_small_1.default title="Punto de Venta" description="Gestión del Negocio. Utilice las opciones requeridas para su funcionamiento."/>

                    <lucide_react_1.ShoppingBag size={70} color="#d6d3d1" className="pointer-events-none absolute right-2 bottom-0 translate-x-0 translate-y-[-20] transform animate-pulse opacity-40"/>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                    <p>
                        Rol Actual del Vendedor:{' '}
                        <span className="text-primary font-medium">{meta.role_usuario === 'admin' ? 'Administrador' : 'Vendedor'}</span>
                    </p>
                </div>
                <separator_1.Separator className="bg-sidebar-accent"/>

                {/* Punto de venta */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Columna 1: Select almacenes, clientes, mostrar productos */}
                    <div className="space-y-4">
                        <card_1.Card className="border-sidebar-accent @container/card">
                            <card_1.CardHeader className="relative">
                                <card_1.CardTitle className="text-sidebar-accent">
                                    <div className="text-sidebar-accent flex items-center gap-2">
                                        <lucide_react_1.ShoppingBag className="shrink-0"/>
                                        Iniciar Venta
                                    </div>
                                </card_1.CardTitle>
                                <card_1.CardDescription>
                                    Origenes y Recepción del Producto.
                                    <span className="text-sidebar-accent animate-pulse"> Seleccione Primero *</span>
                                </card_1.CardDescription>
                            </card_1.CardHeader>
                            <card_1.CardContent>
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Seleccionar Almacén */}
                                    <div>
                                        <select_1.Select value={almacenSeleccionado} onValueChange={handleAlmacenChange} disabled={loadingAlmacenes}>
                                            <select_1.SelectTrigger className="border-sidebar-accent w-full dark:border-white">
                                                <select_1.SelectValue placeholder="Seleccionar Almacén"/>
                                            </select_1.SelectTrigger>
                                            <select_1.SelectContent className="border-sidebar-accent">
                                                {almacenes.map(function (almacen) { return (<select_1.SelectItem key={almacen.id} value={almacen.id.toString()}>
                                                        {almacen.nombre_almacen}
                                                    </select_1.SelectItem>); })}
                                            </select_1.SelectContent>
                                        </select_1.Select>
                                        {loadingAlmacenes && <p className="mt-1 text-xs text-gray-500">Cargando almacenes...</p>}
                                    </div>
                                    {/* Seleccionar Cliente */}
                                    <div>
                                        <select_1.Select value={clienteSeleccionado} onValueChange={handleClienteChange} disabled={loadingClientes}>
                                            <select_1.SelectTrigger className="border-sidebar-accent w-full dark:border-white">
                                                <select_1.SelectValue placeholder="Seleccionar cliente"/>
                                            </select_1.SelectTrigger>
                                            <select_1.SelectContent className="border-sidebar-accent">
                                                {clientes.map(function (cliente) { return (<select_1.SelectItem key={cliente.id} value={cliente.id.toString()}>
                                                        {cliente.nombre_cliente}
                                                    </select_1.SelectItem>); })}
                                            </select_1.SelectContent>
                                        </select_1.Select>
                                        {loadingClientes && <p className="mt-1 text-xs text-gray-500">Cargando clientes...</p>}
                                    </div>
                                </div>
                            </card_1.CardContent>
                        </card_1.Card>

                        <separator_1.Separator />

                        {/* Tabla para Mostrar los Productos */}
                        <card_1.Card className="border-sidebar-accent @container/card">
                            <card_1.CardHeader className="relative">
                                <card_1.CardTitle>
                                    <div className="text-sidebar-accent flex items-center gap-2">
                                        <lucide_react_1.BoxesIcon className="shrink-0"/>
                                        Productos Disponibles
                                    </div>
                                </card_1.CardTitle>
                            </card_1.CardHeader>
                            <card_1.CardContent>
                                {/* Barra de búsqueda */}
                                {almacenSeleccionado && (<div className="border-b p-4">
                                        <div className="relative max-w-md">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                <lucide_react_1.Search className="h-4 w-4 text-gray-400"/>
                                            </div>
                                            <input type="text" className="border-sidebar-accent block w-full rounded-md border py-2 pr-10 pl-10 text-sm shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500" placeholder="Buscar productos..." value={busqueda} onChange={function (e) { return setBusqueda(e.target.value); }}/>
                                            {busqueda && (<button type="button" onClick={limpiarBusqueda} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600">
                                                    <lucide_react_1.X className="h-4 w-4"/>
                                                </button>)}
                                        </div>
                                        {busqueda && productos.length > 0 && (<p className="mt-1 text-xs text-gray-500">
                                                {productosFiltrados.length} de {productos.length} productos encontrados
                                            </p>)}
                                    </div>)}

                                {loadingProductos ? (<div className="p-8 text-center">
                                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-blue-500"></div>
                                        <p className="mt-2 text-gray-500">Cargando productos...</p>
                                    </div>) : almacenSeleccionado ? (productosFiltrados && productosFiltrados.length > 0 ? (<div className="overflow-x-auto">
                                            <table_1.Table className="rounded-t-lg">
                                                <table_1.TableCaption>Productos disponibles en el almacén seleccionado</table_1.TableCaption>
                                                <table_1.TableHeader className="rounded-t-lg border-1 border-t-white">
                                                    <table_1.TableRow className="bg-sidebar-accent hover:bg-sidebar-accent transition-colors">
                                                        <table_1.TableHead className="text-white uppercase">Producto</table_1.TableHead>
                                                        <table_1.TableHead className="text-center text-white uppercase">Stock</table_1.TableHead>
                                                        <table_1.TableHead className="text-center text-white uppercase">Precio</table_1.TableHead>
                                                        <table_1.TableHead className="text-center text-white uppercase">Acción</table_1.TableHead>
                                                    </table_1.TableRow>
                                                </table_1.TableHeader>
                                                <table_1.TableBody className="rounded-b-md border-1 border-solid border-b-white">
                                                    {productosFiltrados.map(function (producto) { return (<tr key={producto.id} className="hover:bg-sidebar cursor-pointer">
                                                            <td className="px-4 py-3">
                                                                <div>
                                                                    <div className="text-sidebar-accent text-sm font-medium">
                                                                        {producto.nombre_producto}
                                                                    </div>
                                                                    <div className="text-sm text-gray-500">
                                                                        {producto.marca_producto || 'Sin marca'} -{' '}
                                                                        {producto.categoria_nombre || 'Sin categoría'}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm whitespace-nowrap text-gray-500">
                                                                <span className={"inline-flex rounded-full px-2 text-xs leading-5 font-semibold ".concat(producto.stock_total > 5
                    ? 'bg-green-100 text-green-800'
                    : producto.stock_total > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800')}>
                                                                    {producto.stock_total}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-sm whitespace-nowrap text-emerald-600">
                                                                {producto.precio_venta && producto.precio_venta > 0 ? ("$ ".concat(producto.precio_venta.toFixed(2))) : (<span className="text-red-500">Sin precio</span>)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-sm whitespace-nowrap">
                                                                <tooltip_1.Tooltip>
                                                                    <tooltip_1.TooltipTrigger asChild>
                                                                        <button type="button" onClick={function () { return agregarAlCarrito(producto); }} className="flex cursor-pointer items-center gap-1 rounded bg-blue-500 px-3 py-1 text-xs text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50" disabled={!producto.tiene_precio ||
                    producto.stock_total <= 0 ||
                    !producto.precio_venta ||
                    producto.precio_venta <= 0}>
                                                                            <lucide_react_1.PackagePlus size={22} className="h-3 w-3"/>
                                                                            Vender
                                                                        </button>
                                                                    </tooltip_1.TooltipTrigger>
                                                                    <tooltip_1.TooltipContent className="text-white">
                                                                        <p>Agregar al Pedido</p>
                                                                    </tooltip_1.TooltipContent>
                                                                </tooltip_1.Tooltip>
                                                            </td>
                                                        </tr>); })}
                                                </table_1.TableBody>
                                            </table_1.Table>
                                        </div>) : (<div className="p-8 text-center">
                                            <p className="text-gray-500">
                                                {busqueda && productos.length > 0
                ? 'No se encontraron productos que coincidan con la búsqueda'
                : productos.length === 0 && !loadingProductos
                    ? 'No hay productos disponibles en este almacén'
                    : 'No hay productos para mostrar'}
                                            </p>
                                            {busqueda && productos.length > 0 && (<button type="button" onClick={limpiarBusqueda} className="mt-2 text-sm font-medium text-blue-600 hover:text-blue-800">
                                                    Limpiar búsqueda
                                                </button>)}
                                        </div>)) : (<div className="p-8 text-center">
                                        <p className="text-gray-500">Seleccione un almacén para ver los productos</p>
                                    </div>)}
                            </card_1.CardContent>
                        </card_1.Card>
                    </div>

                    {/* Columna 2: Carrito de Compras */}
                    <div>
                        <div className="flex h-full flex-col rounded-lg border">
                            <div className="bg-sidebar-accent flex items-center justify-between rounded-t-lg border-1 border-solid px-4 py-3 dark:border-zinc-300">
                                <div>
                                    <div className="flex items-center gap-2 text-white">
                                        <lucide_react_1.ShoppingCart className="shrink-0"/>
                                        <h3 className="font-medium text-white uppercase">Carrito de Compras</h3>
                                    </div>
                                </div>
                                {carrito.length > 0 && (<span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                        {carrito.length} producto seleccionado
                                    </span>)}
                            </div>

                            <div className="max-h-96 flex-1 overflow-y-auto">
                                {carrito.length === 0 ? (<div className="p-8 text-center">
                                        <p className="text-red-500">Carrito vacío</p>
                                        <p className="mt-2 text-sm text-gray-400">Agregue productos del almacén seleccionado</p>
                                    </div>) : (<div className="divide-y divide-gray-200">
                                        {carrito.map(function (item) { return (<div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all hover:shadow dark:border-gray-700 dark:bg-gray-800">
                                                <div className="mb-2 flex items-start justify-between">
                                                    <div className="flex-1">
                                                        <h4 className="text-sidebar-accent text-sm font-medium">{item.producto.nombre_producto}</h4>
                                                        <p className="text-xs text-gray-500">{item.producto.marca_producto || 'Sin marca'}</p>
                                                    </div>
                                                    <tooltip_1.Tooltip>
                                                        <tooltip_1.TooltipTrigger asChild>
                                                            <button_1.Button variant="ghost" onClick={function () { return quitarDelCarrito(item.id); }} className="ml-2 cursor-pointer text-red-400 hover:bg-red-900 hover:text-white">
                                                                <lucide_react_1.Trash2 size={16} className="h-4 w-4"/>
                                                            </button_1.Button>
                                                        </tooltip_1.TooltipTrigger>
                                                        <tooltip_1.TooltipContent className="text-white">
                                                            <p>Quitar de la lista</p>
                                                        </tooltip_1.TooltipContent>
                                                    </tooltip_1.Tooltip>
                                                </div>

                                                <div className="mt-2 flex items-center justify-between">
                                                    <div className="flex items-center space-x-2">
                                                        <button type="button" onClick={function () { return decrementarCantidad(item.id); }} className="border-sidebar-accent bg-sidebar hover:bg-sidebar-accent cursor-pointer rounded-md border p-1 text-white" disabled={item.cantidad <= 1}>
                                                            <lucide_react_1.Minus className="h-3 w-3"/>
                                                        </button>

                                                        <tooltip_1.Tooltip>
                                                            <tooltip_1.TooltipTrigger asChild>
                                                                <badge_1.Badge variant="secondary" className="text-xs">
                                                                    <span className="w-8 cursor-help text-center text-sm font-bold font-medium text-amber-500">
                                                                        {item.cantidad}
                                                                    </span>
                                                                </badge_1.Badge>
                                                            </tooltip_1.TooltipTrigger>
                                                            <tooltip_1.TooltipContent className="text-white">
                                                                <p>Cantidad de Productos</p>
                                                            </tooltip_1.TooltipContent>
                                                        </tooltip_1.Tooltip>

                                                        <button type="button" onClick={function () { return incrementarCantidad(item.id); }} className="border-sidebar-accent bg-sidebar hover:bg-sidebar-accent cursor-pointer rounded-md border p-1 text-white" disabled={item.cantidad >= item.producto.stock_total}>
                                                            <lucide_react_1.Plus className="h-3 w-3"/>
                                                        </button>

                                                        <span className="ml-1 text-xs text-gray-500">(max {item.producto.stock_total})</span>
                                                    </div>

                                                    <div className="text-right">
                                                        <tooltip_1.Tooltip>
                                                            <tooltip_1.TooltipTrigger asChild>
                                                                <input_1.Input type="number" value={item.precio_venta || ''} onChange={function (e) {
                    var value = parseFloat(e.target.value);
                    if (!isNaN(value)) {
                        actualizarPrecio(item.id, value);
                    }
                }} className="border-sidebar-accent w-20 rounded border px-2 py-1 text-left text-sm text-emerald-600 hover:border-emerald-300" placeholder="$ 0.00"/>
                                                            </tooltip_1.TooltipTrigger>
                                                            <tooltip_1.TooltipContent className="text-white">
                                                                <p>Editar Precio de Venta</p>
                                                            </tooltip_1.TooltipContent>
                                                        </tooltip_1.Tooltip>

                                                        <p className="mt-1 text-sm font-medium text-emerald-700">
                                                            $ {(isNaN(item.subtotal) ? 0 : item.subtotal).toFixed(2)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>); })}
                                    </div>)}
                            </div>

                            {/* Resumen del carrito */}
                            {carrito.length > 0 && (<div className="rounded-b-lg border-1 border-t border-solid border-gray-200 bg-gray-50 p-4">
                                    <div className="mb-2 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Total:</span>
                                        <span className="text-lg font-bold text-emerald-700">$ {calcularTotal.toFixed(2)}</span>
                                    </div>
                                    <button type="button" onClick={procesarVenta} disabled={procesandoVenta} className="flex w-full cursor-pointer items-center justify-center rounded-md bg-green-600 px-4 py-2 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">
                                        {procesandoVenta ? (<>
                                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                                                Procesando...
                                            </>) : ('Procesar Venta')}
                                    </button>
                                    <p className="mt-2 text-center text-xs text-gray-500">Se enviarán {carrito.length} productos para procesar</p>
                                </div>)}
                        </div>
                    </div>
                </div>
                <sonner_1.Toaster position="top-center"/>
            </div>
        </app_layout_1.default>);
}
