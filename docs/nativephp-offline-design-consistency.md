# Versión offline (NativePHP) — usar el mismo sistema de diseño, no inventar uno nuevo

> **Mensaje directo, 2026-09-03:** el cliente está desarrollando una versión offline de este proyecto (ver `docs/arreglos-pendientes/white-label-plan-2026-08-20.md` y la memoria `project_nativephp_desktop_android_idea` para el contexto completo de esa iniciativa — Fase 4 de ese plan, empaquetado NativePHP). **La versión offline debe reutilizar exactamente el mismo lenguaje visual que ya existe en la app web** — Cards, headers, degradados, efecto bleed de mascota, todo. No es una reconstrucción visual desde cero ni una oportunidad para "mejorar" o rediseñar la interfaz — es el mismo diseño, empaquetado distinto.

## Por qué esto importa

Este proyecto ya tiene un sistema de diseño consistente, documentado y probado en producción, no un mockup. Reinventar el lenguaje visual para la versión offline:
- Duplica trabajo que ya está resuelto y confirmado por el cliente.
- Rompe la identidad de marca entre la versión web y la offline — el mismo negocio, dos apps que se ven distintas, confunde al usuario final.
- Hace que los dos codebases diverjan visualmente con el tiempo, cada uno con su propia deuda de diseño.

## Los 3 documentos a seguir, sin excepción

Antes de escribir un solo `<Card>` o header en la versión offline, leer estos tres:

1. **`docs/header-structure.md`** — el banner superior de página (`bg-sidebar border-sidebar-accent ... rounded-2xl border border-dashed`) es la estructura identificativa de todo el proyecto. Se repite igual en cada módulo. No es una `Card` y no lleva degradado — regla explícita del cliente, ya se confundió una vez y se corrigió.
2. **`docs/patron-card-header-degradado.md`** — la receta exacta (clases, por qué cada una) para las `Card` de resumen/KPI que sí llevan header en degradado de color. Incluye la lista de dónde ya se aplicó y dónde no, para no inventar variantes nuevas.
3. **`docs/patron-mascota-bleed.md`** — el efecto "bleed" de la mascota (dos variantes: opaca protagonista vs. marca de agua transparente) y sus gotchas reales ya encontrados (`overflow-hidden` corta el bleed, `position: absolute` se pinta según orden del DOM, medir antes de agrandar).

## Cómo aplicar esto en la práctica

- Si un componente de la versión offline necesita un header con color: usar la receta de `patron-card-header-degradado.md` tal cual, mismo `pt-0`/`overflow-hidden`/degradado — no una interpretación libre.
- Si una pantalla necesita el banner de identidad de página: copiar la estructura de `header-structure.md` exactamente, incluido qué NO es (no convertirlo en `Card`, no ponerle degradado).
- Si se usa la mascota o cualquier imagen protagonista: elegir la variante correcta (A o B) según `patron-mascota-bleed.md`, no improvisar una tercera.
- Paleta de color: si la versión offline es parte del plan white-label (ver `docs/arreglos-pendientes/white-label-plan-2026-08-20.md`), la decisión ya tomada ahí es paletas predefinidas curadas, no un selector de color libre — no reabrir esa decisión sin que el cliente lo pida.
- Cualquier patrón visual nuevo que la versión offline necesite y que no exista todavía en la web: documentarlo con el mismo formato que estos 3 archivos (cuándo usarlo, receta con clases, dónde ya se aplicó) para que la próxima vez sea el mismo ciclo — no cada quien inventando por su cuenta.

**Esto no es opcional ni "a criterio del desarrollador"** — es una instrucción directa del cliente, igual de firme que la regla de `header-structure.md` sobre no tocar el banner de página sin pedido explícito.
