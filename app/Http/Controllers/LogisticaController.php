<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Support\Facades\DB;

class LogisticaController extends Controller
{
    // Consultas
    private function countCategorias()
    {
        return DB::table('categorias')->count();
    }

    private function countCategoriasActivas()
    {
        return DB::table('categorias')->where('activar_categoria', true)->count();
    }

    private function countProveedores()
    {
        return DB::table('proveedors')->count();
    }

    private function countClientes()
    {
        return DB::table('clientes')->count();
    }

    private function countProductos()
    {
        return DB::table('productos')->count();
    }

    private function sumUnidadesProductos()
    {
        return DB::table('productos')->sum('cantidad_producto');
    }

    private function calculateInversionTotal()
    {
        return DB::table('almacen_producto')
            ->join('productos', 'almacen_producto.producto_id', '=', 'productos.id')
            ->select(DB::raw('SUM(productos.precio_compra_producto * almacen_producto.cantidad) as total_inversion'))
            ->value('total_inversion');
    }

    // Cuentas por Moneda (Dinámico)
    private function getBalancesPorMoneda()
    {
        $monedas = DB::table('monedas')->where('estado', true)->get();
        $balances = [];

        foreach ($monedas as $moneda) {
            $saldo = DB::table('cuentas')
                ->where('moneda_id', $moneda->id)
                ->whereIn('tipo_cuenta', ['permanentes', 'temporales'])
                ->sum('saldo_cuenta');

            $balances[] = [
                'codigo' => $moneda->codigo_moneda,
                'nombre' => $moneda->nombre_moneda,
                'simbolo' => $moneda->simbolo_moneda,
                'saldo' => $saldo,
                'tasa' => $moneda->tasa_cambio,
                'principal' => $moneda->principal,
            ];
        }

        return $balances;
    }

    private function calculateTotalInvertidoGlobal($balances, $inversionTotal)
    {
        // Calcular todo convertido a moneda principal (asumiendo USD/Principal como base 1)
        // Si la moneda principal tiene tasa 1, y las demas tienen su tasa relativa.
        // Total = Suma(Saldo / Tasa) + Inversion

        $totalCuentasBase = 0;
        foreach ($balances as $balance) {
            // Evitar division por cero
            $tasa = $balance['tasa'] > 0 ? $balance['tasa'] : 1;
            // Si la tasa es "Cuantos X hacen 1 Principal" -> Saldo / Tasa
            // Si la tasa es "Cuantos Principal hacen 1 X" -> Saldo * Tasa
            // Asumiré estandar: Tasa de cambio respecto a la principal. 
            // Asumiré estandar: Tasa de cambio respecto a la principal.
            // E.g. Principal (USD) = 1. CUP = 320.
            // Entonces 320 CUP = 1 USD. -> Saldo / Tasa.

            $totalCuentasBase += ($balance['saldo'] / $tasa);
        }
        return $totalCuentasBase + ($inversionTotal ?? 0);
    }

    private function tasaCambioGeneral()
    {
        return DB::table('tasa_cambios')->sum('tasa');
    }

    private function getTasaMlcTemp()
    {
        return DB::table('tasamlc_temp')->sum('tasa_mlc');
    }


    // Métodos Restaurados
    private function countCuentas()
    {
        return DB::table('cuentas')->count();
    }

    private function sumSaldoCuentas()
    {
        return DB::table('cuentas')->sum('saldo_cuenta');
    }

    private function sumDeudaPendientesSaldo()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'USD')
            ->whereIn('tipo_cuenta', ['deudas'])
            ->sum('saldo_cuenta');
    }

    private function countDeudaPendientes()
    {
        return DB::table('compras')->where('tipo_compra', 'deuda_proveedor')->count();
    }

    private function sumDeudaClienteFisico()
    {
        return DB::table('clientes')
            ->where('tipo_cliente', 'fisico')
            ->sum('deuda_pago_cliente');
    }

    private function countClientesFisicos()
    {
        return DB::table('clientes')
            ->where('tipo_cliente', 'fisico')
            ->count();
    }

    private function getGastosMensuales()
    {
        return DB::table('compras')
            ->select(
                DB::raw("DATE_FORMAT(compras.fecha_compra, '%Y-%m') as mes_anio"),
                DB::raw('SUM(compras.total_compra) as total'),
                DB::raw('COUNT(compras.id) as cantidad_compras')
            )
            ->groupBy('mes_anio')
            ->orderByDesc('mes_anio')
            ->get();
    }

    private function getProductosTop()
    {
        return DB::table('compra_producto')
            ->join('productos', 'compra_producto.producto_id', '=', 'productos.id')
            ->select(
                'productos.nombre_producto',
                DB::raw('SUM(compra_producto.cantidad) as total_cantidad'),
                DB::raw('COUNT(compra_producto.compra_id) as veces_comprado')
            )
            ->groupBy('productos.id', 'productos.nombre_producto')
            ->orderByDesc('total_cantidad')
            ->take(10)
            ->get();
    }

    private function getComprasPorProveedor()
    {
        return DB::table('compras')
            ->join('proveedors', 'compras.proveedor_id', '=', 'proveedors.id')
            ->select(
                'proveedors.nombre_proveedor',
                DB::raw('COUNT(compras.id) as cantidad_compras'),
                DB::raw('SUM(compras.total_compra) as total_gastado')
            )
            ->groupBy('proveedors.id', 'proveedors.nombre_proveedor')
            ->orderByDesc('total_gastado')
            ->get();
    }

    private function getProductosPorAlmacen()
    {
        return DB::table('almacen_producto')
            ->join('almacens', 'almacen_producto.almacen_id', '=', 'almacens.id')
            ->select(
                'almacens.nombre_almacen',
                DB::raw('SUM(almacen_producto.cantidad) as total_productos'),
                DB::raw('COUNT(DISTINCT almacen_producto.producto_id) as productos_unicos')
            )
            ->groupBy('almacens.id', 'almacens.nombre_almacen')
            ->orderByDesc('total_productos')
            ->get();
    }

    // Métodos privados para vendedores
    private function countProductosVendedor($userId)
    {
        return DB::table('producto_vendedors')
            ->where('user_id', $userId)
            ->distinct('producto_id')
            ->count('producto_id');
    }

    private function sumUnidadesProductosVendedor($userId)
    {
        return DB::table('almacen_producto')
            ->join('producto_vendedors', function ($join) use ($userId) {
                $join->on('almacen_producto.producto_id', '=', 'producto_vendedors.producto_id')
                    ->on('almacen_producto.almacen_id', '=', 'producto_vendedors.almacen_id')
                    ->where('producto_vendedors.user_id', '=', $userId);
            })
            ->sum('almacen_producto.cantidad');
    }

    private function countCategoriasVendedor($userId)
    {
        return DB::table('producto_vendedors')
            ->join('productos', 'producto_vendedors.producto_id', '=', 'productos.id')
            ->where('producto_vendedors.user_id', $userId)
            ->distinct('productos.categoria_id')
            ->count('productos.categoria_id');
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $user = \Illuminate\Support\Facades\Auth::user();
        $isVendor = $user->role !== 'admin' && $user->role !== 'moderador';
        $canViewFinance = !$isVendor;

        // Datos básicos (filtrados si es vendedor)
        $totalProductos = $isVendor ? $this->countProductosVendedor($user->id) : $this->countProductos();
        $totalUnidades = $isVendor ? $this->sumUnidadesProductosVendedor($user->id) : $this->sumUnidadesProductos();
        $totalCategorias = $isVendor ? $this->countCategoriasVendedor($user->id) : $this->countCategorias();

        // Datos comunes (o restringidos)
        $categoriasActivas = $isVendor ? 0 : $this->countCategoriasActivas();
        $totalProveedores = $isVendor ? 0 : $this->countProveedores();
        $totalClientes = $isVendor ? 0 : $this->countClientes();

        // Datos financieros (Solo si no es vendedor)
        $inversionTotal = $canViewFinance ? $this->calculateInversionTotal() : 0;
        $totalCuentas = $canViewFinance ? $this->countCuentas() : 0;
        $saldoCuentas = $canViewFinance ? $this->sumSaldoCuentas() : 0;

        // Balances Dinámicos
        $balances = $canViewFinance ? $this->getBalancesPorMoneda() : [];

        // Calcular suma disponible (aprox en moneda principal)
        $sumaDsiponible = $canViewFinance ? $this->calculateTotalInvertidoGlobal($balances, 0) : 0; // Solo cuentas
        $montoGeneralInvertido = $canViewFinance ? ($sumaDsiponible + $inversionTotal) : 0;

        // Deudas
        $deudaClienteFisico = $canViewFinance ? $this->sumDeudaClienteFisico() : 0;
        $clientesFisicos = $canViewFinance ? $this->countClientesFisicos() : 0;
        $deudaPendientes = $canViewFinance ? $this->countDeudaPendientes() : 0;
        $deudaPendientesSaldo = $canViewFinance ? $this->sumDeudaPendientesSaldo() : 0;

        return Inertia::render('Logistica/Index', [
            'canViewFinance' => $canViewFinance,

            // Datos Estructurales
            'totalCategorias' => $totalCategorias ?? 0,
            'categoriasActivas' => $categoriasActivas ?? 0,
            'totalProveedores' => $totalProveedores ?? 0,
            'totalClientes' => $totalClientes ?? 0,
            'totalProductos' => $totalProductos ?? 0,
            'totalUnidades' => $totalUnidades ?? 0,

            // Datos Financieros Agregados
            'inversionTotal' => $inversionTotal ?? 0,
            'totalCuentas' => $totalCuentas ?? 0,
            'saldoCuentas' => $saldoCuentas ?? 0,
            'sumaDsiponible' => $sumaDsiponible,
            'montoGeneralInvertido' => $montoGeneralInvertido,

            // Deudas
            'deudaClienteFisico' => $deudaClienteFisico ?? 0,
            'clientesFisicos' => $clientesFisicos ?? 0,
            'deudaPendientes' => $deudaPendientes ?? 0,
            'deudaPendietesSaldo' => $deudaPendientesSaldo ?? 0,

            // Balances por Moneda (Nuevo)
            'balances' => $balances,

            // Charts
            'gastosMensuales' => $canViewFinance ? ($this->getGastosMensuales() ?? []) : [],
            'productosTop' => $canViewFinance ? ($this->getProductosTop() ?? []) : [],
            'comprasPorProveedor' => $canViewFinance ? ($this->getComprasPorProveedor() ?? []) : [],
            'productosPorAlmacen' => $canViewFinance ? ($this->getProductosPorAlmacen() ?? []) : [],
        ]);
    }
}
