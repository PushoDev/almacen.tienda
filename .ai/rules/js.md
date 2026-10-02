---
paths:
  - 'resources/js/**'
---

# Js

## Leer el patrón de diseño correspondiente antes de escribir UI nueva
El proyecto mantiene patrones documentados en docs/patron-*.md y docs/header-structure.md (índice completo en docs/INDEX.md, sección "Interfaz y patrones visuales"). Antes de construir cualquier header, Card, diálogo grande, o selector con imagen/ícono, leer el patrón correspondiente y reusarlo — no inventar un estilo nuevo para un problema que el proyecto ya resolvió. Caso real que motivó esta regla (2026-10-01): se construyó un selector de moneda con logo (Vendor/Show.tsx) sin revisar que ya existían 3 estilos distintos de "selector con imagen" en el proyecto (SelectorBancoTarjeta, OpcionesEnTarjeta), generando una cuarta variante inconsistente — documentado después en docs/patron-selector-visual-con-imagen.md. Si un selector/Card/header nuevo no encaja en ningún patrón existente, preguntar antes de inventar uno — y si se aprueba, agregarlo al documento correspondiente para que no se repita.
