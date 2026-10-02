---
paths:
  - 'resources/js/**'
---

# Js

## Leer el patrón de diseño correspondiente antes de escribir UI nueva
El proyecto mantiene patrones documentados en docs/patron-*.md y docs/header-structure.md (índice completo en docs/INDEX.md, sección "Interfaz y patrones visuales"). Antes de construir cualquier header, Card, diálogo grande, o selector con imagen/ícono, leer el patrón correspondiente y reusarlo — no inventar un estilo nuevo para un problema que el proyecto ya resolvió. Caso real que motivó esta regla (2026-10-01): se construyó un selector de moneda con logo (Vendor/Show.tsx) sin revisar que ya existían 3 estilos distintos de "selector con imagen" en el proyecto (SelectorBancoTarjeta, OpcionesEnTarjeta), generando una cuarta variante inconsistente — documentado después en docs/patron-selector-visual-con-imagen.md. Si un selector/Card/header nuevo no encaja en ningún patrón existente, preguntar antes de inventar uno — y si se aprueba, agregarlo al documento correspondiente para que no se repita.

## No UI plana/por defecto — usar glass, gradiente, glow y bleed con proporción real
El cliente rechazó explícitamente (2026-10-02, rediseño de Monedas/Index.tsx en cards) el estilo "plano por defecto": colores sólidos lisos, Badge gris simple, imagen chica encajonada. Pidió diseño con más carácter: "futurista/profesional", efectos bleed, íconos, badges de colores.

Receta que sí aprobó (ver `components/MonedaCard.tsx` como referencia a copiar):
- Badges: en vez de `bg-X-100 text-X-800` plano, usar vidrio (`bg-X-500/10 border border-X-400/30 backdrop-blur-sm`), gradiente con glow (`bg-gradient-to-r from-X-500 to-Y-600 shadow-md shadow-X-500/30`), o metálico para destacar un ítem especial (`bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-300` + `hover:scale-105`).
- Imagen protagonista (insignia/logo) a efecto bleed (ver `docs/patron-mascota-bleed.md`): que sangre sobre el borde del header hacia el cuerpo, con un resplandor de color (`blur-2xl`) detrás.
- Bug real a evitar: si el asset es apaisado (no cuadrado), fijar la imagen con un box cuadrado (`h-32 w-32`) y `object-contain` la encoge a una tira delgada — medir el aspect ratio real del asset (`identify`/PIL) y fijar SOLO el ancho (`w-48 h-auto`) para que se vea grande de verdad.

Esto no reemplaza `docs/patron-selector-visual-con-imagen.md` (ese sigue siendo sobre QUÉ estructura de selector usar) — esto es sobre el estilo del relleno (colores/efectos) una vez elegida la estructura.
