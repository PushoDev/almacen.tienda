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
        return DB::table('productos')
            ->select(DB::raw('SUM(precio_compra_producto * cantidad_producto) as total_inversion'))
            ->value('total_inversion');
    }

    // Cuentas por Moneda
    private function getMontoUSD()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'USD')
            ->where('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }

    private function getMontoEUR()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'EUR')
            ->where('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }

    private function getMontoMLC()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'MLC')
            ->where('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }

    private function getMontoCUP()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'CUP')
            ->where('tipo_cuenta', ['permanentes', 'temporales'])
            ->sum('saldo_cuenta');
    }


    private function countCuentas()
    {
        return DB::table('cuentas')->count();
    }

    private function sumSaldoCuentas()
    {
        return DB::table('cuentas')->sum('saldo_cuenta');
    }

    private function calculateMontoGeneralInvertido()
    {
        $saldoCuentas = $this->sumSaldoCuentas();
        $inversionTotal = $this->calculateInversionTotal();
        return ($saldoCuentas ?? 0) + ($inversionTotal ?? 0);
    }

    private function sumDeudaPendientesSaldo()
    {
        return DB::table('cuentas')
            ->where('tipo_moneda', 'USD')
            ->where('tipo_cuenta', ['deudas'])
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
        return DB::table('compra_producto')
            ->join('compras', 'compra_producto.compra_id', '=', 'compras.id')
            ->join('almacens', 'compras.almacen_id', '=', 'almacens.id')
            ->join('productos', 'compra_producto.producto_id', '=', 'productos.id')
            ->select(
                'almacens.nombre_almacen',
                DB::raw('SUM(compra_producto.cantidad) as total_productos'),
                DB::raw('COUNT(DISTINCT productos.id) as productos_unicos')
            )
            ->groupBy('almacens.id', 'almacens.nombre_almacen')
            ->orderByDesc('total_productos')
            ->get();
    }

    private function tasaCambioGeneral()
    {
        return DB::table('tasa_cambios')->sum('tasa');
    }

    private function getTasaMlcTemp()
    {
        return DB::table('tasamlc_temp')->sum('tasa_mlc');
    }




    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Obtener todos los datos necesarios
        return Inertia::render('Logistica/Index', [
            'totalCategorias' => $this->countCategorias() ?? 0,
            'categoriasActivas' => $this->countCategoriasActivas() ?? 0,
            'totalProveedores' => $this->countProveedores() ?? 0,
            'totalClientes' => $this->countClientes() ?? 0,
            'totalProductos' => $this->countProductos() ?? 0,
            'totalUnidades' => $this->sumUnidadesProductos() ?? 0,
            'inversionTotal' => $this->calculateInversionTotal() ?? 0,
            'totalCuentas' => $this->countCuentas() ?? 0,
            'montoUSD' => $this->getMontoUSD() ?? 0, // Monto en USD
            'montoEUR' => $this->getMontoEUR() ?? 0, // Monto en EUR
            'montoMLC' => $this->getMontoMLC() ?? 0, // Monto en MLC
            'montoCUP' => $this->getMontoCUP() ?? 0, // Monto en CUP
            'tasaCambioGeneral' => $this->tasaCambioGeneral() ?? 0, // Tasa Cambio
            'calculoCup' => $this->getMontoCUP() / $this->tasaCambioGeneral() ?? 0, // Valor Tasa de Cambio del Cup
            // Suma General Disponible Caja
            'sumaDsiponible' => ($this->getMontoCUP() / $this->tasaCambioGeneral()) + ($this->getMontoMLC() / $this->getTasaMlcTemp()) + $this->getMontoUSD() + $this->getMontoEUR(),
            // Deudas con Clientes fisicos
            'deudaClienteFisico' => $this->sumDeudaClienteFisico() ?? 0,
            'clientesFisicos' => $this->countClientesFisicos() ?? 0, // Contar Clientes Fisicos
            'saldoCuentas' => $this->sumSaldoCuentas() ?? 0,
            'deudaPendientes' => $this->countDeudaPendientes() ?? 0,
            'deudaPendietesSaldo' => $this->sumDeudaPendientesSaldo() ?? 0,
            'montoGeneralInvertido' => $this->calculateMontoGeneralInvertido() ?? 0,
            'gastosMensuales' => $this->getGastosMensuales() ?? 0,
            'productosTop' => $this->getProductosTop() ?? 0,
            'comprasPorProveedor' => $this->getComprasPorProveedor() ?? 0,
            'productosPorAlmacen' => $this->getProductosPorAlmacen() ?? 0,
            'tasaMLC' => $this->getTasaMlcTemp() ?? 0,
            'calcTasaMLC' => $this->getMontoMLC() / $this->getTasaMlcTemp(),
        ]);
    }
}
