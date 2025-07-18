¡Perfecto! Entiendo tu idea.

Tienes una tabla `cuentas` con un campo `tipo_moneda` que puede ser `'USD'`, `'EUR'`, `'MLC'` o `'CUP'`.

Y en tu `LogisticaController` estás obteniendo el **saldo total de todas las cuentas** con:

```php
$saldoCuentas = DB::table('cuentas')->sum('saldo_cuenta');
```

Pero ahora quieres **separar ese saldo por tipo de moneda**, para tener algo como:

```php
'saldo_cuentas_usd' => 10000,
'saldo_cuentas_eur' => 5000,
'saldo_cuentas_mlc' => 2000,
'saldo_cuentas_cup' => 15000,
```

---

## ✅ Objetivo

Obtener el **saldo total por tipo de moneda** desde la tabla `cuentas`.

---

## ✅ Código actualizado para tu controlador

Aquí tienes cómo hacerlo:

```php
// ...

// Saldo total por tipo de moneda
$saldosPorMoneda = DB::table('cuentas')
    ->select('tipo_moneda', DB::raw('SUM(saldo_cuenta) as total'))
    ->groupBy('tipo_moneda')
    ->get()
    ->pluck('total', 'tipo_moneda');

// Valores por moneda (con 0 como default si no existen)
$saldo_cuentas_usd = $saldosPorMoneda->get('USD', 0);
$saldo_cuentas_eur = $saldosPorMoneda->get('EUR', 0);
$saldo_cuentas_mlc = $saldosPorMoneda->get('MLC', 0);
$saldo_cuentas_cup = $saldosPorMoneda->get('CUP', 0);

// Saldo total (igual que antes)
$saldoCuentas = $saldo_cuentas_usd + $saldo_cuentas_eur + $saldo_cuentas_mlc + $saldo_cuentas_cup;

// Total de Monto del Negocio tanto invertido como en las cuentas
$montoGeneralInvertido = ($saldoCuentas ?? 0) + ($inversionTotal ?? 0);

// ...

// Finalmente, en el return Inertia::render
return Inertia::render('Logistica/Index', [
    // ...
    'saldoCuentas' => $saldoCuentas ?? 0,

    // Separados por moneda
    'saldo_cuentas_usd' => $saldo_cuentas_usd,
    'saldo_cuentas_eur' => $saldo_cuentas_eur,
    'saldo_cuentas_mlc' => $saldo_cuentas_mlc,
    'saldo_cuentas_cup' => $saldo_cuentas_cup,

    // ...
]);
```

---

## ✅ Resultado final

Ahora podrás usar en tu frontend (React/Inertia):

```tsx
<p>Saldo USD: {saldo_cuentas_usd}</p>
<p>Saldo EUR: {saldo_cuentas_eur}</p>
<p>Saldo MLC: {saldo_cuentas_mlc}</p>
<p>Saldo CUP: {saldo_cuentas_cup}</p>
```

---

## 🧠 Opcional: Si quieres mostrar también la tasa de cambio aplicada

Si ya tienes la tasa global (como hicimos antes), puedes traerla también al controlador y calcular el **saldo total en CUP**:

```php
$tasa = TasaCambio::getTasa();

$saldo_total_cup = 
    $saldo_cuentas_usd * $tasa +
    $saldo_cuentas_eur * $tasa +
    $saldo_cuentas_mlc * $tasa +
    $saldo_cuentas_cup;
```

Y pasarlo al frontend:

```php
'saldo_total_cup' => $saldo_total_cup,
'tasa_cambio' => $tasa,
```

---

¿Quieres que te ayude a mostrar esta información en tu componente React o en una tabla en el dashboard?
