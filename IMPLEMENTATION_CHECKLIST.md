# ✅ CHECKLIST DE IMPLEMENTACIÓN - Revolut Merchant API

## 🎯 ETAPAS

---

## ETAPA 1: SETUP Y CONFIGURACIÓN {#etapa-1}

### 1.1 Cuentas y API Keys
- [ ] Crear/Acceder cuenta Revolut Business
- [ ] Ir a: Dashboard → Settings → APIs → Merchant API
- [ ] Generar **Secret Key** (para servidor)
- [ ] Copiar **Merchant ID**
- [ ] Crear **Webhook Secret** (para verificar firmas)
- [ ] Probar en **Sandbox** primero (URL: https://sandbox-merchant.revolut.com)

**Credenciales a guardar:**
```
REVOLUT_SECRET_KEY = sk_sandbox_xxxxx
REVOLUT_MERCHANT_ID = xxxxx
REVOLUT_WEBHOOK_SECRET = whsec_xxxxx
```

### 1.2 Variables de entorno (.env.local)
- [ ] Crear/actualizar `.env.local` en raíz del proyecto:
```bash
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox
REVOLUT_SECRET_KEY=sk_sandbox_xxxxx
REVOLUT_MERCHANT_ID=your_merchant_id
REVOLUT_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 1.3 Registrar webhook en Revolut Dashboard
- [ ] En Revolut Sandbox → Settings → APIs → Webhooks
- [ ] URL: `http://localhost:3000/api/webhooks/revolut` (local) o `https://your-domain.com/api/webhooks/revolut` (producción)
- [ ] Suscribirse a eventos:
  - [ ] `ORDER_COMPLETED`
  - [ ] `ORDER_AUTHORISED` (si usas manual capture)
  - [ ] `ORDER_CANCELLED`
  - [ ] `ORDER_FAILED`
  - [ ] `ORDER_PAYMENT_FAILED`
  - [ ] `ORDER_PAYMENT_DECLINED`
- [ ] Guardar webhook secret

---

## ETAPA 2: ESTRUCTURA DE CÓDIGO {#etapa-2}

### 2.1 Crear directorio `lib/revolut/`
```bash
mkdir -p lib/revolut lib/types
```

### 2.2 Crear tipos TypeScript
- [ ] Copiar `lib_types_revolut.ts` → `lib/types/revolut.ts`
- [ ] Verificar que los tipos están disponibles

**Prueba:**
```bash
import { RevolutOrderResponse } from '@/lib/types/revolut';
```

### 2.3 Crear servicio de Revolut
- [ ] Copiar `lib_revolut_revolutService.ts` → `lib/revolut/revolutService.ts`
- [ ] Verificar imports de tipos
- [ ] Verificar que función `verifyRevolutWebhookSignature` está correcta

**Prueba:**
```bash
import { createRevolutOrder } from '@/lib/revolut/revolutService';
```

---

## ETAPA 3: BASE DE DATOS {#etapa-3}

### 3.1 Ejecutar migración SQL
- [ ] Ir a Supabase Dashboard → SQL Editor
- [ ] Copiar contenido de `migration_revolut_payments.sql`
- [ ] Click "Run"
- [ ] Verificar que tabla se creó:
```sql
SELECT * FROM revolut_payments LIMIT 1;
```

### 3.2 Verificar tabla y RLS
- [ ] Tabla `revolut_payments` existe en Supabase
- [ ] Columnas: id, order_id, customer_id, revolut_order_id, status, etc.
- [ ] RLS habilitado
- [ ] Policies creadas (admin_select_all, customer_select_own, etc.)

**Verificar RLS:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'revolut_payments';
```

---

## ETAPA 4: RUTAS API {#etapa-4}

### 4.1 Ruta POST /api/orders/[id]/payment
- [ ] Crear directorio: `app/api/orders/[id]/payment/`
- [ ] Crear archivo: `route.ts`
- [ ] Copiar contenido de `app_api_orders_id_payment_route.ts`
- [ ] Verificar imports de `createSupabaseServerClient` y `createRevolutOrder`

**Test manual:**
```bash
curl -X POST http://localhost:3000/api/orders/[ORDER_ID]/payment \
  -H "Authorization: Bearer [JWT_TOKEN]" \
  -H "Content-Type: application/json"
```

### 4.2 Ruta POST /api/webhooks/revolut
- [ ] Crear directorio: `app/api/webhooks/revolut/`
- [ ] Crear archivo: `route.ts`
- [ ] Copiar contenido de `app_api_webhooks_revolut_route.ts`
- [ ] Verificar imports y funciones de manejo (handleOrderCompleted, etc.)

**Test con curl (simulando webhook):**
```bash
# Necesitarás generar firma válida o usar ngrok + Revolut test dashboard
```

---

## ETAPA 5: UI - COMPONENTE DE PAGO {#etapa-5}

### 5.1 Crear componente PaymentPanel
- [ ] Crear archivo: `app/(portal)/orders/[id]/PaymentPanel.tsx`
- [ ] Copiar contenido de `PaymentPanel.tsx`
- [ ] Verificar que usa `'use client'` (component client)

### 5.2 Integrar en página de orden
- [ ] En `app/(portal)/orders/[id]/page.tsx`:
```tsx
import { PaymentPanel } from './PaymentPanel';

export default function OrderDetailPage() {
  // ... obtener order ...
  return (
    <div>
      {/* ... detalles de orden ... */}
      <PaymentPanel
        orderId={order.id}
        orderState={order.estado}
        totalAmount={order.total_amount}
        currency={order.currency}
        orderReference={order.reference}
      />
    </div>
  );
}
```

### 5.3 Test en navegador
- [ ] Iniciar dev server: `npm run dev`
- [ ] Ir a `/portal/orders/[id]`
- [ ] Verificar que PaymentPanel aparece cuando `estado = 'confirmado'`
- [ ] Botón "Proceder al Pago" visible y clickeable

---

## ETAPA 6: TESTING EN SANDBOX {#etapa-6}

### 6.1 Setup local con ngrok (para webhooks)
```bash
# Instalar ngrok si no lo tienes
# https://ngrok.com

# En terminal nueva:
ngrok http 3000

# Copiar URL públca (ej: https://abc123.ngrok.io)
# Actualizar webhook URL en Revolut Dashboard
```

- [ ] ngrok configurado y URL expuesta
- [ ] Actualizar `REVOLUT_WEBHOOK_URL` en Vercel para producción

### 6.2 Crear orden de prueba
- [ ] En panel admin de Firma Rollers:
  - [ ] Crear cliente de prueba
  - [ ] Crear pedido con monto pequeño (1€)
  - [ ] Marcar como confirmado
- [ ] Ver orden en portal cliente
- [ ] Verificar que PaymentPanel aparece

### 6.3 Test de pago exitoso
- [ ] Click en botón "Proceder al Pago"
- [ ] Ser redirigido a Revolut Checkout (debe decir "SANDBOX")
- [ ] Seleccionar método: Tarjeta
- [ ] Usar tarjeta de prueba exitosa:
  - **Card:** 4111 1111 1111 1111
  - **Exp:** 12/25
  - **CVC:** 123
- [ ] Click "Pay"
- [ ] Ser redirigido a `/portal/orders/[id]/payment-confirmed`

### 6.4 Verificar webhook fue recibido
- [ ] En logs de servidor (Vercel o local):
```
[Webhook] Event verified and parsed: ORDER_COMPLETED
[Webhook] Payment marked as completed
[Webhook] Order transitioned to produccion
```

### 6.5 Verificar BD fue actualizada
- [ ] En Supabase:
```sql
SELECT * FROM revolut_payments WHERE order_id = '[ORDER_ID]';
```
  - [ ] status = 'completed'
  - [ ] completed_at tiene timestamp
  - [ ] revolut_payment_id no es nulo

```sql
SELECT estado FROM orders WHERE id = '[ORDER_ID]';
```
  - [ ] estado = 'produccion' (pasó de 'confirmado')

### 6.6 Test de pago rechazado
- [ ] Crear otra orden
- [ ] Click "Proceder al Pago"
- [ ] Tarjeta rechazada:
  - **Card:** 4000 0000 0000 0002
- [ ] Debería mostrar error en Revolut Checkout
- [ ] Cliente ve "Try again" button
- [ ] Reintentar con tarjeta exitosa → debe funcionar
- [ ] Webhook `ORDER_PAYMENT_FAILED` debería llegar
- [ ] Verificar en BD que error_message fue guardado

### 6.7 Test de pago expirado/cancelado
- [ ] Crear orden
- [ ] Click "Proceder al Pago"
- [ ] NO completar pago
- [ ] Esperar 24 horas (o simular con DB si hay forma)
- [ ] Webhook `ORDER_FAILED` debería llegar
- [ ] Orden debería cambiar a estado 'cancelado'

---

## ETAPA 7: INTEGRACIÓN CON SISTEMA {#etapa-7}

### 7.1 Actualizar flujo de estados en CLAUDE.md
- [ ] Actualizar diagrama de transiciones de estado
- [ ] Documentar que "confirmado" ahora es "pagado"
- [ ] Documentar webhook triggers

### 7.2 Email de confirmación de pago (OPCIONAL)
- [ ] En `handleOrderCompleted` en webhook, descomentar:
```ts
// await sendPaymentConfirmationEmail(payment.order_id);
```
- [ ] Crear función `sendPaymentConfirmationEmail` en `lib/emailService.ts`

### 7.3 Panel admin: Ver pagos
- [ ] En dashboard admin, crear sección "Pagos"
- [ ] Mostrar tabla de `revolut_payments` con estados
- [ ] Filtros: por cliente, por estado, por fecha
- [ ] Ver detalles completos (amount, currency, error_message si hay)

### 7.4 Panel cliente: Historial de pagos (OPCIONAL)
- [ ] En portal cliente, crear sección "Historial de Pagos"
- [ ] Mostrar pagos completados
- [ ] Botón de reintentar si pago pendiente

---

## ETAPA 8: DEPLOY A PRODUCCIÓN {#etapa-8}

### 8.1 Preparar credenciales de producción
- [ ] Ir a Revolut Business Producción
- [ ] Generar **Secret Key** de PRODUCCIÓN (comienza con `sk_live_`)
- [ ] Copiar **Merchant ID** de producción
- [ ] Crear **Webhook Secret** de producción
- [ ] No mezclar sandbox con producción

### 8.2 Configurar variables en Vercel
- [ ] En Vercel Dashboard → Project Settings → Environment Variables
- [ ] Crear/actualizar:
```
NEXT_PUBLIC_REVOLUT_ENVIRONMENT = production
REVOLUT_SECRET_KEY = sk_live_xxxxx (NO sk_sandbox_)
REVOLUT_MERCHANT_ID = merchant_id_produccion
REVOLUT_WEBHOOK_SECRET = whsec_produccion
REVOLUT_WEBHOOK_URL = https://b2b.firmarollers.com/api/webhooks/revolut
NEXT_PUBLIC_APP_URL = https://b2b.firmarollers.com
```

### 8.3 Registrar webhook en Revolut Producción
- [ ] En Revolut Business Producción → Settings → APIs → Webhooks
- [ ] URL: `https://b2b.firmarollers.com/api/webhooks/revolut`
- [ ] Suscribirse a eventos
- [ ] Copiar Webhook Secret → Actualizar en Vercel

### 8.4 Deploy
```bash
git add -A
git commit -m "feat: revolut payment integration - production ready"
git push origin main
```
- [ ] Vercel auto-deploya
- [ ] Esperar que build termine
- [ ] Verificar logs sin errores

### 8.5 Test en producción
- [ ] Acceder a https://b2b.firmarollers.com/portal/orders/[id]
- [ ] Crear orden real con monto pequeño (1€)
- [ ] Click "Proceder al Pago"
- [ ] Hacer pago real con tarjeta
- [ ] Webhook debería llegar
- [ ] Verificar BD en Supabase Producción
- [ ] Orden debería estar en "produccion"

### 8.6 Monitoreo post-deploy
- [ ] Verificar logs de Vercel cada hora durante 24h
- [ ] Buscar errores en:
  - `/api/orders/*/payment` calls
  - `/api/webhooks/revolut` calls
- [ ] Verificar Revolut Dashboard:
  - Transacciones aparecen
  - No hay rechazos inesperados

---

## ETAPA 9: DOCUMENTACIÓN Y MANTENIMIENTO {#etapa-9}

### 9.1 Documentar en CLAUDE.md
- [ ] Sección "Revolut Integration"
- [ ] Cómo crear un pago
- [ ] Estados de pago
- [ ] Webhook events
- [ ] Variables de entorno
- [ ] Troubleshooting

### 9.2 Crear runbook operacional
- [ ] Cómo refundar un pago fallido
- [ ] Cómo cancelar una orden (y reversar pago)
- [ ] Cómo investigar webhook no recibido
- [ ] Contacto de soporte Revolut

### 9.3 Configurar alertas (OPCIONAL)
- [ ] En Vercel: alertas de errores en rutas de pago
- [ ] En Supabase: alertas de table changes en revolut_payments
- [ ] Email o Slack cuando webhook falla 3x seguidas

---

## 🧪 TESTS FINALES ANTES DE IR LIVE

### Test 1: Pago completo
```
✅ Crear orden → ✅ Ir a pago → ✅ Tarjeta exitosa → ✅ Webhook recibido → ✅ Orden en produccion
```

### Test 2: Reintentar pago
```
✅ Orden en confirmado → ✅ Pago fallido → ✅ Reintentar → ✅ Éxito
```

### Test 3: Webhook fallido y retry
```
✅ Simular webhook no llegar → ✅ Sistema retenta → ✅ Eventualmente llega
```

### Test 4: Admin force-complete pago (OPCIONAL)
```
✅ Admin ve pagos pendientes → ✅ Botón "Mark as paid" → ✅ Orden cambia a produccion
```

---

## 📞 TROUBLESHOOTING RÁPIDO

| Problema | Causa | Solución |
|----------|-------|----------|
| 401 Unauthorized en API | Secret Key inválido | Verificar `REVOLUT_SECRET_KEY` en .env |
| Webhook no llega | URL incorrecta | Verificar URL en Revolut Dashboard |
| Webhook recibido pero sin procesar | Firma inválida | Verificar `REVOLUT_WEBHOOK_SECRET` |
| Orden no cambia a produccion | Webhook handler error | Ver logs de servidor |
| Pago aparece en Revolut pero no en BD | Webhook tardío | Esperar o polling manual |
| Cliente ve error al iniciar pago | Falta variable env | Verificar NEXT_PUBLIC_APP_URL |

---

## 📊 RESUMEN DE ARCHIVOS A CREAR/ACTUALIZAR

| Archivo | Acción | Link |
|---------|--------|------|
| `.env.local` | Crear/actualizar vars | - |
| `lib/types/revolut.ts` | Crear (copiar template) | ✅ `lib_types_revolut.ts` |
| `lib/revolut/revolutService.ts` | Crear (copiar template) | ✅ `lib_revolut_revolutService.ts` |
| `app/api/orders/[id]/payment/route.ts` | Crear (copiar template) | ✅ `app_api_orders_id_payment_route.ts` |
| `app/api/webhooks/revolut/route.ts` | Crear (copiar template) | ✅ `app_api_webhooks_revolut_route.ts` |
| `app/(portal)/orders/[id]/PaymentPanel.tsx` | Crear (copiar template) | ✅ `PaymentPanel.tsx` |
| `migration_revolut_payments.sql` | Ejecutar en Supabase | ✅ `migration_revolut_payments.sql` |
| `CLAUDE.md` | Actualizar sección Revolut | - |

---

## ✨ ¡LISTO!

Cuando todos los checks estén verdes, tu integración de Revolut está lista para producción. 

**Pregunta frecuente:** ¿Cuánto tarda en "ir live"?
- Sandbox: Inmediato
- Producción: ~1-2 horas después de deploy (incluye propagación DNS, builds, etc.)

**Soporte Revolut:** api-requests@revolut.com

