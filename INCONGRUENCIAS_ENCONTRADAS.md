# AUDIT: Incongruencias Design System — FIRMA FRESH V2

**Rama:** FIRMA-FRESH-V2  
**Auditor:** Claude Code  
**Fecha:** 2026-05-04  
**Commit base:** bf5121d (Brutalista design system)

---

## RESUMEN EJECUTIVO

Se encontraron **10 incongruencias** agrupadas en 4 categorías:

| Prioridad | Categoría | Issues |
|-----------|-----------|--------|
| 🔴 CRÍTICO | Bordes estructurales | 3 |
| 🔴 CRÍTICO | Status colors (4 sistemas diferentes) | 1 |
| 🟡 MAYOR | Tokens hardcoded / variables faltantes | 4 |
| 🟡 MAYOR | Spacing fuera del sistema | 2 |

---

## 🔴 CRÍTICO

### C1 — `.card` global tiene `box-shadow` — VIOLA la regla "shadows only on buttons"

**Archivo:** `app/globals.css:147-152`

```css
/* ACTUAL — incorrecto */
.card {
  background: var(--fr-white);
  border: var(--border);
  box-shadow: var(--shadow-sm);  ← DEBE ELIMINARSE
  padding: 16px;
}
```

**Regla violada:** "Shadows: ONLY on buttons (2px offset)"  
**Fix:** Eliminar `box-shadow` de `.card`.

---

### C2 — Cuatro sistemas de colores de status — incompatibles entre sí

El mismo estado "produccion" muestra colores distintos según dónde aparece:

| Componente | Archivo | produccion | enviado | cancelado |
|-----------|---------|------------|---------|-----------|
| CSS vars (referencia) | `globals.css` | orange `#E6883E` | black `#111` | gray `#999` |
| Dashboard StatusChip | `components/fr/StatusChip.tsx` | yellow `#F6E451` | purple `#876693` | red `#D93A35` |
| Portal StatusChip | `(portal)/_components/StatusChip.tsx` | orange dot `#E07B3A` | green dot `#5BB85A` | red dot `#D93A35` |
| Portal order detail | `(portal)/portal/pedidos/[id]/page.tsx:31-38` | yellow `#F6E451` | green `#0DA265` | red `#D93A35` |

Además, el portal `_components/StatusChip.tsx` usa `var(--fr-mono)` (línea 39) que no está definida globalmente.

**Requiere decisión de diseño.** Ver nota al final del documento.

---

### C3 — `borderRadius: '50%'` en portal order detail — VIOLA la regla "radius = ALWAYS 0"

**Archivo:** `app/(portal)/portal/pedidos/[id]/page.tsx:77`

```tsx
// ACTUAL — incorrecto
<span style={{
  width: 6, height: 6, borderRadius: '50%',
  background: STATUS_FG[status], opacity: 0.9,
}} />
```

**Fix:** Cambiar a `borderRadius: 0`.

---

## 🟡 MAYOR

### M1 — Variables CSS faltantes en `globals.css` — el portal las usa sin definirlas globalmente

Las páginas del portal usan `--fr-display`, `--fr-mono`, `--fr-line-soft` en bloques `<style jsx>`, pero estas variables solo están definidas dentro del componente `StorefrontShell.tsx` (que no envuelve todas las páginas del portal).

**Variables huérfanas:**
```css
var(--fr-display)    /* usado en portal/page.tsx, portal/pedidos/nuevo/page.tsx */
var(--fr-mono)       /* usado en (portal)/_components/StatusChip.tsx */
var(--fr-line-soft)  /* usado en portal/page.tsx, portal/pedidos/nuevo/page.tsx */
```

**Fix:** Añadir a `globals.css (:root)`:
```css
--fr-display:   'Alexandria', sans-serif;
--fr-mono:      'JetBrains Mono', ui-monospace, monospace;
--fr-line-soft: #e5e5e5;
```

---

### M2 — No existe `--border-dash` — 2px de dashboard hardcodeado en ~15 lugares

El design system establece que dashboard usa `2px` y portal usa `1px`, pero no hay CSS variable para el borde de dashboard. Todos los `2px solid #111` están hardcodeados.

**Archivos afectados:**
- `components/fr/Atoms.tsx` — Block, KPI, FilterTabs (líneas 50, 63, 97)
- `app/(dashboard)/pedidos/page.tsx` — inputSt, tab strip, table (líneas 83, 106, 161)
- `app/(dashboard)/clientes/page.tsx` — inputSt, invite form, tier strip (líneas 105, 125, 161)
- `app/(dashboard)/dashboard/page.tsx` — cards de órdenes y producción (líneas 112, 152, 159)

**Fix:** Añadir a `globals.css (:root)`:
```css
--border-dash: 2px solid var(--fr-black);
```

---

### M3 — Separadores de filas usan color `#ddd6c8` — fuera del sistema de tokens

El color warm-amber `#ddd6c8` no existe en los tokens. El sistema define `--border-light: 1px solid #e5e5e5`.

**Archivos afectados:**
- `app/(dashboard)/dashboard/page.tsx` — líneas 131, 165, 177
- `app/(dashboard)/pedidos/page.tsx` — línea 191
- `app/(dashboard)/clientes/page.tsx` — línea 259

**Fix:** Reemplazar `'1px solid #ddd6c8'` por `'var(--border-light)'` en todos los puntos.

---

### M4 — Sidebar del dashboard usa `1px` en bordes estructurales — inconsistente con estándar `2px` del dashboard

La sidebar usa `1px solid #111` en su borde derecho (`borderRight`) y separadores internos, mientras que todos los bloques/cards del dashboard usan `2px solid #111`.

**Archivo:** `app/(dashboard)/layout.tsx`
- Línea 164: `borderRight: '1px solid #111'` (sidebar edge)
- Línea 62: `borderBottom: '1px solid #111'` (logo separator)
- Línea 110: `borderTop: '1px solid #111'` (user separator)

**Fix:** Cambiar a `var(--border-dash)` o `2px solid #111` para consistencia.

---

### M5 — `KPI` component usa `padding: 18` — fuera del sistema (12/16/24/32)

**Archivo:** `components/fr/Atoms.tsx:63`

```tsx
// ACTUAL
<div style={{ background: bg, border: '2px solid #111', padding: 18 }}>

// CORRECTO
<div style={{ background: bg, border: 'var(--border-dash)', padding: 16 }}>
```

---

### M6 — Portal layout background `#fff` en vez de `var(--fr-cream)`

**Archivo:** `app/(portal)/layout.tsx:220`

```tsx
// ACTUAL
<div style={{ display: 'flex', minHeight: '100vh', background: '#fff' }}>

// CORRECTO (si el portal debe seguir el mismo background que el dashboard)
<div style={{ display: 'flex', minHeight: '100vh', background: 'var(--fr-cream)' }}>
```

**Nota:** Podría ser intencional (portal = "storefront" feel con fondo blanco vs dashboard cream).  
Requiere confirmación.

---

## NOTA SOBRE STATUS COLORS (C2)

Los colores de status en `globals.css` (:root) son la referencia canónica:
```
draft       → purple  #876693
confirmado  → blue    #0087B8
produccion  → orange  #E6883E
listo_envio → green   #0DA265
enviado     → black   #111111
cancelado   → gray    #999999
```

El `StatusChip` del dashboard (`components/fr/StatusChip.tsx`) usa una interpretación diferente (produccion=yellow, enviado=purple, cancelado=red). Antes de hacer un fix, confirmar cuál es la intención: ¿los colores en globals.css son los correctos, o es el StatusChip?

---

## FIXES IMPLEMENTADOS

- [x] **C1** — Eliminado `box-shadow` de `.card` en `globals.css`
- [x] **C3** — `borderRadius: '50%'` → `0` en `(portal)/portal/pedidos/[id]/page.tsx:77`
- [x] **M1** — Añadido `--fr-display`, `--fr-mono`, `--fr-line-soft` a `globals.css :root`
- [x] **M2** — Añadido `--border-dash: 2px solid var(--fr-black)` a `globals.css`; todos los `'2px solid #111'` en dashboard reemplazados por `'var(--border-dash)'` (Atoms.tsx, dashboard/page, pedidos/page, pedidos/[id]/page, clientes/page, produccion/page, layout.tsx)
- [x] **M3** — Todos los `#ddd6c8` reemplazados por `var(--border-light)` en dashboard (dashboard/page, pedidos/page, pedidos/[id]/page, clientes/page, produccion/page)
- [x] **M4** — Sidebar dashboard usa `var(--border-dash)` en borderRight, borderBottom, y topbar móvil
- [x] **M5** — `KPI` padding `18` → `16` en `Atoms.tsx`

## PENDIENTE DE DECISIÓN

- [x] **C2** — Resuelto. Mapping canónico: draft=orange, confirmado=blue, produccion=purple, listo_envio=yellow, enviado=green, cancelado=red. Aplicado en globals.css, fr/StatusChip, portal/StatusChip, portal order detail.
- [x] **M6** — Confirmado: portal mantiene `background: '#fff'` (intencional, storefront feel).

## VERIFICACIÓN

```bash
npx tsc --noEmit  # → 0 errores
npm run build     # → Compiled successfully en 2.7s (falla en data collection por .env ausente — esperado)
```
