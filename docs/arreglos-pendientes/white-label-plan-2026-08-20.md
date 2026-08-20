# Plan — Versión Comercial White-Label (propuesta, prioridad media, terreno para más adelante)

**Estado: solo plan, nada implementado.** Ver también memoria `project_nativephp_desktop_android_idea` para el contexto completo (esto es la rama "comercial sin sincronizar" de esa idea). **La sincronización offline queda explícitamente pospuesta para más adelante, confirmado por el cliente 2026-08-20** ("lo de sincronizar lo vamos hacer luego ya que es el que más riesgo tiene") — es la pieza arquitectónicamente más invasiva de toda la idea original, y este plan no depende de ella para nada.

## Objetivo

Poder vender el mismo sistema (`almacen.tienda`) a distintos negocios, cada uno con su propio nombre, logo y paleta de color, para que se sienta un producto propio y no un sistema genérico compartido — sin tocar la app actual del cliente original ni su rama de trabajo activa.

## Decisión de fondo, a confirmar antes de empezar cualquier fase

**Un despliegue por cliente (instancia + base de datos propia), no multi-tenant sobre una sola base de datos compartida.** La razón: la lógica de negocio actual (cuentas, saldos, comisiones, prorrateo de costos, cierres de caja) fue escrita asumiendo que todo el sistema pertenece a un solo negocio — no hay `tenant_id` en ninguna tabla. Retrofitear multi-tenancy real sobre un schema financiero maduro es mucho más riesgoso (fugas de datos entre negocios si se olvida un scope en algún query) que simplemente clonar el despliegue. El costo de "un despliegue por cliente" es operativo (más servidores/DBs que mantener), no de diseño — coherente con vender esto como producto instalable/licenciado, no como SaaS multi-cliente en un solo servidor.

## Fases propuestas

### Fase 1 — Infraestructura de marca (fundación, más barata, mayor impacto visible)
- Tabla nueva (`configuracion_marca` o similar): `nombre_negocio`, `logo_path`, `paleta_id`.
- Sacar el texto "Glorieta POS" (hoy hardcodeado en el sidebar) a esa configuración, compartida a todas las páginas Inertia igual que ya se comparte el usuario autenticado.
- Pantalla de configuración (admin-only) para subir logo, escribir el nombre, elegir paleta.
- `<title>` del navegador y favicon generados desde esa configuración.
- **Riesgo: bajo.** No toca lógica de negocio, solo un valor de config leído en vez de un string fijo.

### Fase 2 — Sistema de paletas predefinidas (la fase cara)
- Auditar las clases de Tailwind hardcodeadas por página (`from-indigo-600 to-indigo-700`, `border-emerald-400`, etc. — patrón usado en decenas de Cards con degradado en toda la app) y extraerlas a variables CSS (`--brand-primary-from`, `--brand-primary-to`, etc.) que el patrón ya documentado en `docs/patron-card-header-degradado.md` lea en vez de un color fijo.
- Definir 3-5 paletas ya probadas en claro/oscuro (Índigo, Esmeralda, Ámbar, Violeta — evitar selector de color libre, ver conversación previa sobre por qué).
- Empezar por las superficies más visibles (sidebar, banner de identidad de página, headers degradados de Cards) antes de intentar cubrir el 100% de la app de una sola vez — se puede partir en sub-fases por módulo.
- **Riesgo: medio-alto.** Es el verdadero costo del ejercicio — tocar decenas de archivos ya escritos con colores fijos.

### Fase 3 — Candado de licencia (corregido: 100% offline, sin servidor ni internet)
Modelo real confirmado por el cliente: relación mensual manual — el negocio llama, paga, y el dueño del sistema le envía una **llave por WhatsApp** que el negocio pega en la app para seguir trabajando. No hay chequeo contra ningún servidor — la validación es local, siempre, incluso sin internet. Esto encaja perfecto con una app NativePHP sin sincronización.

**Mecanismo propuesto (firma asimétrica + llave atada al dispositivo, sin secreto compartido embebido en la app):**

Confirmado por el cliente: la llave no puede ser genérica/reutilizable — debe atarse al equipo donde se instala, para que no se pueda reenviar la misma llave a otro negocio.

**Activación inicial (una sola vez por dispositivo):**
1. Al instalar, la app genera una huella del dispositivo (device fingerprint) — combinación de identificadores estables del equipo/instalación (en desktop: algo como ID de disco/hostname/UUID de instalación generado y guardado en el primer arranque; en Android: un UUID propio persistido en almacenamiento privado de la app, no depender solo del Android ID porque cambia con un reset de fábrica) y la muestra en pantalla como un código corto.
2. El negocio manda ese código al dueño del sistema por WhatsApp, una sola vez (no en cada renovación).
3. El dueño corre `php artisan licencia:generar {cliente} --dias=30 --device={codigo_dispositivo}` — el device fingerprint queda **dentro de lo firmado**, junto con cliente + fecha de expiración.
4. El negocio pega la llave en la app. La app valida: firma correcta + no vencida + el fingerprint firmado coincide con el fingerprint real de ESE equipo. Si alguien copia la llave a otro dispositivo, el fingerprint no calza y la licencia se rechaza.

**Renovación (ya no hace falta reenviar el código del dispositivo, el dueño ya lo tiene guardado de la activación inicial):** el negocio llama, paga, el dueño genera una llave nueva con el mismo `--device` + fecha de expiración extendida, la manda por WhatsApp, el negocio la pega y sigue. Solo se repite el paso 1-2 si cambia de equipo.

**Duraciones planeadas** (no requieren nada extra de ingeniería — el `--dias` del comando ya acepta cualquier número, esto es solo la decisión comercial de qué valores ofrecer):
- **7 días** — modo de prueba (trial), primera llave que recibe un negocio nuevo antes de pagar.
- **1 mes** — plan mensual estándar.
- **6 meses** — plan semestral (probablemente con descuento frente a 6 llaves mensuales sueltas, a definir).
- **Abierto:** si el trial de 7 días debe tener alguna diferencia funcional además de la duración (ej. alguna limitación de uso) o si es acceso completo igual que los planes pagos, solo que corto — no definido todavía, no bloquea nada de lo demás.

- La app distribuida solo trae la **clave pública** de verificación (verificar una firma no permite falsificar una nueva, aunque alguien abra la app y la encuentre).
- Al vencer: bloquear o modo solo-lectura (a decidir), nunca perder datos.
- **Limitación honesta a tener presente:** un usuario podría atrasar el reloj del dispositivo para burlar la expiración. Mitigable (guardar la última fecha vista y rechazar si el reloj retrocede) pero es una capa extra de complejidad — para una relación mensual con clientes conocidos, probablemente no vale la pena resolverlo desde el día uno.
- No depende de SQLite ni de NativePHP en el mecanismo en sí — funcionaría igual en la app web, pero tiene más sentido en la app nativa, que es la que de verdad necesita seguir funcionando sin conexión.
- **Riesgo: bajo**, independiente de las Fases 1-2.

### Fase 4 — Empaquetado (NativePHP, opcional, más adelante)
- Solo evaluar una vez que Fases 1-3 estén probadas — empaquetar como app de escritorio/Android es una decisión de distribución separada, no bloquea nada de lo anterior.

## Qué NO hacer sin decisión explícita del cliente
- No convertir el schema actual a multi-tenant compartido.
- No empezar la Fase 2 completa de una sola vez — dividir por módulo y confirmar cada uno.
- No tocar el branding/colores de la instalación actual del cliente — todo lo de arriba debe ser aditivo con un default que preserve "Glorieta POS" + paleta actual tal cual, para que la app en producción hoy no cambie.

**Por qué:** este plan existe para tener terreno preparado — el cliente pidió guardarlo como prioridad media, no para arrancar ahora. La decisión de fondo (despliegue por cliente, no multi-tenant) es la más importante de preservar, porque cambia todo el resto del diseño si se decide distinto más adelante.
