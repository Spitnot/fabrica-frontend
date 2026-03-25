# Firma Rollers B2B — Contexto del proyecto

## Identificación
- **Repo:** `Spitnot/fabrica-frontend`
- **Local:** `~/Desktop/FIRMA_FRESH`
- **Deploy:** Vercel desde `main` → https://b2b.firmarollers.com
- **Stack:** Next.js 16 (Turbopack), TypeScript, Supabase, Tailwind CSS
- **Servicios externos:** Resend (emails), Packlink (envíos), Shopify Admin API (catálogo)

---

## Estructura de la app
```
app/
├── (auth)/          — Login, forgot-password, reset-password
├── (dashboard)/     — Panel admin: clientes, pedidos, tarifas, producción, emails, usuarios
├── (onboarding)/    — Onboarding cliente nuevo (fuera del portal layout)
├── (portal)/        — Portal cliente: pedidos, perfil
├── auth/callback/   — Callback de auth PKCE + implicit flow (ÚNICO callback activo)
└── api/             — Rutas API
```

**IMPORTANTE:** El callback activo es `/auth/callback` (`app/auth/callback/page.tsx`).
La URL configurada en Supabase es `https://b2b.firmarollers.com/auth/callback`.
No crear ni restaurar `app/(auth)/callback/` — fue eliminado intencionalmente (duplicado).

---

## Auth

- Librería: `@supabase/ssr` — NUNCA usar `@supabase/auth-helpers-nextjs`
- Siempre usar `getUser()` en servidor, NUNCA `getSession()` (inseguro)
- Server client: `createSupabaseServerClient()` de `lib/supabase/server.ts`
- Admin client: `supabaseAdmin` (service role) para operaciones privilegiadas
- Middleware: `proxy.ts` en raíz (Next.js 16) — NO existe ni debe existir `middleware.ts`
- Roles en `user_metadata.role`: `admin`, `manager`, `viewer`, `customer`
- Rutas protegidas en `proxy.ts`: `/dashboard`, `/pedidos`, `/clientes`, `/tarifas`, `/catalogo`, `/emails`, `/usuarios`, `/produccion`

### Flujo de invitación (POLÉMICO — no cambiar sin entender)
Para crear clientes nuevos o usuarios de equipo:
1. `createUser({ email_confirm: true })` — crea usuario ya confirmado
2. `generateLink({ type: 'recovery', redirectTo: '.../auth/callback?next=/reset-password' })` — genera link PKCE
3. Se envía el link via Resend con HTML personalizado

**NO usar `type: 'invite'`** — falla con 422 porque el usuario ya existe en Auth.
**NO usar `resetPasswordForEmail`** — envía email via SMTP de Supabase sin HTML personalizado.
`type: 'recovery'` es correcto para usuarios ya confirmados.

### Onboarding
- El proxy gate lee `user.user_metadata.onboarding_completed`
- `portal/onboarding/route.ts` actualiza TANTO la tabla `customers` COMO `supabase.auth.updateUser({ data: { onboarding_completed: true } })`
- Si falta el `updateUser` de auth, el cliente queda en loop infinito de onboarding

---

## Base de datos (Supabase)

### Tablas principales
- `customers` — clientes mayoristas
  - `id` = `auth_user_id` (mismo UUID que Supabase Auth)
  - `direccion_envio` JSONB: `{ street, city, postal_code, country }`
  - `direccion_fiscal` JSONB: `{ street, city, state, postal_code, country }`
  - `onboarding_completed` boolean
  - `estado`: `active` | `inactive`
- `orders` — pedidos. Estados: `draft → confirmado → produccion → listo_envio → enviado → cancelado`
- `order_items` — líneas de pedido (sku, nombre_producto, cantidad, precio_unitario, peso_unitario)
- `tarifas` — niveles de precio (multiplicador, pack_size, minimum_order_value, hidden_products)
- `tarifas_precios` — precios explícitos por SKU por tarifa
- `fungibles` — materiales fungibles para producción (RLS habilitado)
- `sku_fungibles` — recetas de materiales por SKU (RLS habilitado)
- `product_meta` — metadatos de productos (RLS habilitado)
- `email_logs` — log de todos los emails (type, recipient, status, error, customer_id, order_id)

### RLS
`product_meta`, `fungibles`, `sku_fungibles` tienen RLS habilitado con política `service_role only`.
Las rutas API usan `supabaseAdmin` que bypasea RLS automáticamente.

---

## Emails — `lib/emailService.ts`

Enviados desde `noreply@firmarollers.com` via Resend. Todos loguean en `email_logs`.

- `sendCustomerInviteEmail(to, name, link, customerId?)` — bienvenida cliente nuevo
- `sendTeamInviteEmail(to, name, link)` — invitación equipo admin
- `sendShippingEmail(to, name, orderRef, tracking?, carrier?, customerId?, orderId?)` — envío
- `sendResetPasswordEmail(to, customerId?)` — reset password

**IMPORTANTE:** Todas las funciones hacen `throw e` en el catch interno.
Al llamarlas desde rutas API, usar `.catch()` para no bloquear la respuesta:
```ts
sendShippingEmail(...).catch(e => console.error('[ruta] email failed:', e.message))
```
NUNCA usar `await` directo sin try/catch propio cuando el email no debe bloquear la respuesta.

---

## Envíos — Packlink

- Quotes: `POST /api/quotes` — llama a `GET /services` de Packlink con dimensiones y destino
  - Devuelve máximo 6 opciones, ordenadas por precio, filtradas a ≤14 días de tránsito
- Shipment: `POST /api/orders/[id]/shipment` — crea draft en Packlink + actualiza Supabase + email
  - Variables de entorno: `PACKLINK_API_URL`, `PACKLINK_API_KEY`, `PACKLINK_FROM_*`
  - El `ShipmentPanel` manda: `service_id`, `coste_envio_final`, `ancho`, `alto`, `largo`
  - El email de envío lo gestiona EXCLUSIVAMENTE esta ruta — `status/route.ts` NO envía email

### Formato dirección Packlink
```ts
to: {
  name, company, street1,  // ← street1, no street
  city, zip_code,          // ← zip_code, no postal_code
  country,                 // ← código ISO 2 letras
  phone, email
}
```

---

## Flujo de pedidos

### Transiciones de estado válidas
```
draft       → confirmado | cancelado
confirmado  → produccion | cancelado
produccion  → listo_envio | cancelado
listo_envio → enviado | cancelado
enviado     → (ninguna)
cancelado   → (ninguna)
```

- Cambio manual de estado: `POST /api/orders/[id]/status` (recibe formData, redirige 303)
- Paso a `enviado` vía shipment: `POST /api/orders/[id]/shipment` (recibe JSON, devuelve JSON)
- Los pedidos nuevos se crean en estado `confirmado` (se salta `draft` intencionalmente)

---

## Decisiones de arquitectura importantes

| Decisión | Motivo |
|----------|--------|
| `proxy.ts` en raíz, no `middleware.ts` | Next.js 16 renombró el archivo — coexistir rompe el build |
| `type: 'recovery'` para invitar usuarios | `type: 'invite'` falla si el usuario ya existe en Auth |
| Email en shipment con `.catch()` | Fallo de Resend no debe devolver 500 si Packlink y Supabase fueron bien |
| `onboarding_completed` en auth metadata | Middleware no puede hacer queries a DB — lee del JWT |
| Un solo callback en `/auth/callback` | Dos callbacks activos causaban comportamiento indeterminado |
| `getUser()` siempre, nunca `getSession()` | `getSession()` no verifica con Supabase Auth en servidor |

---

## Comandos útiles
```bash
# Dev local
cd ~/Desktop/FIRMA_FRESH && npm run dev

# Deploy (push a main = autodeploy en Vercel)
git add -A && git commit -m "mensaje" && git push origin main

# Ver rutas API
find app/api -name "route.ts" | sort

# Buscar imports legacy (no deben existir)
grep -r "auth-helpers-nextjs" --include="*.ts" --include="*.tsx" .

# Verificar que no hay middleware.ts
ls middleware.ts 2>/dev/null && echo "⚠️ ELIMINAR" || echo "✅ OK"
```

---

## Variables de entorno requeridas
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
PACKLINK_API_URL
PACKLINK_API_KEY
PACKLINK_FROM_NAME
PACKLINK_FROM_STREET
PACKLINK_FROM_CITY
PACKLINK_FROM_POSTAL_CODE
PACKLINK_FROM_COUNTRY
PACKLINK_FROM_PHONE
PACKLINK_FROM_EMAIL
```
