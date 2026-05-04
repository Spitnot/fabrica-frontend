# 📖 ÍNDICE COMPLETO - Integración Revolut Merchant API

**Proyecto:** Firma Rollers B2B - Pago Online  
**Fecha:** 26 de Abril, 2026  
**Total de archivos:** 10  
**Total de líneas:** ~2,900  

---

## 🎯 PUNTO DE INICIO

### 1️⃣ LEE ESTO PRIMERO (5 min)
**📄 QUICK_START.md** (5 KB)
- Qué necesitas hacer en los próximos 15 minutos
- Obtener API keys de Revolut
- Configurar .env.local
- Primer paso de implementación

### 2️⃣ ENTIENDE EL BIG PICTURE (10 min)
**📄 EXECUTIVE_SUMMARY.md** (13 KB)
- Qué hace exactamente
- Costos y comisiones
- Seguridad
- Arquitectura de 3 capas
- Casos de borde
- Timeline de implementación

### 3️⃣ GUÍA TÉCNICA DETALLADA (30-60 min)
**📄 REVOLUT_INTEGRATION_GUIDE.md** (29 KB) ⭐ **DOCUMENTO MÁS IMPORTANTE**
- Paso 0 a Paso 9 completos
- Setup de credenciales
- Estructura de tipos TypeScript
- Servicio de Revolut
- Base de datos (schema)
- Rutas API (payment + webhook)
- UI (componente PaymentPanel)
- Testing en Sandbox
- Deploy a Producción
- Referencias finales

### 4️⃣ CHECKLIST VERIFICABLE (QA)
**📄 IMPLEMENTATION_CHECKLIST.md** (13 KB)
- 9 etapas completas
- 80+ checkpoints individuales
- Testing manual
- Troubleshooting rápido

---

## 💻 ARCHIVOS DE CÓDIGO (COPIAR-PEGAR)

Todos listos para usar. Simplemente:
1. Abre el archivo
2. Copia todo el contenido
3. Pégalo en la ubicación indicada
4. Verifica que compila

### TypeScript - Tipos
**📄 lib_types_revolut.ts** (2.4 KB)
```
Copiar a: lib/types/revolut.ts
Contiene: 5 interfaces principales
- RevolutOrderResponse
- RevolutPaymentDetails
- RevolutOrderPayload
- RevolutWebhookEvent
- RevolutPaymentRecord
```

### TypeScript - Servicio
**📄 lib_revolut_revolutService.ts** (3.9 KB)
```
Copiar a: lib/revolut/revolutService.ts
Funciones:
- createRevolutOrder() → Crear orden en Revolut
- getRevolutOrder() → Recuperar detalles
- cancelRevolutOrder() → Cancelar
- verifyRevolutWebhookSignature() → Validar firmas
```

### API Route - Crear Pago
**📄 app_api_orders_id_payment_route.ts** (4.7 KB)
```
Copiar a: app/api/orders/[id]/payment/route.ts
Endpoint: POST /api/orders/[id]/payment
Qué hace:
1. Obtiene orden de BD
2. Verifica permisos (admin o dueño)
3. Crea orden en Revolut
4. Guarda en revolut_payments
5. Devuelve checkout_url
```

### API Route - Webhook Handler
**📄 app_api_webhooks_revolut_route.ts** (8.7 KB) ⭐ **MÁS COMPLEJO**
```
Copiar a: app/api/webhooks/revolut/route.ts
Endpoint: POST /api/webhooks/revolut
Procesa eventos:
- ORDER_COMPLETED → Pago exitoso
- ORDER_CANCELLED → Pago cancelado
- ORDER_FAILED → Pago expiró
- ORDER_PAYMENT_FAILED/DECLINED → Intento falló
Actualiza BD automáticamente
```

### React Component - Panel de Pago
**📄 PaymentPanel.tsx** (6.7 KB)
```
Copiar a: app/(portal)/orders/[id]/PaymentPanel.tsx
Props:
- orderId: string
- orderState: string
- totalAmount: number
- currency: string
- orderReference: string

Muestra:
✓ Monto a pagar
✓ Botón "Proceder al Pago"
✓ Métodos aceptados
✓ Indicador de seguridad
```

### SQL - Base de Datos
**📄 migration_revolut_payments.sql** (5.7 KB)
```
Ejecutar en: Supabase → SQL Editor
Crea:
- Tabla revolut_payments con 15 columnas
- 5 índices para performance
- RLS policies (admin/customer)
- Vista customer_payment_summary
- Función get_pending_payments_for_customer()
- Trigger auto-updated_at
```

---

## 📊 DEPENDENCIAS Y ARQUITECTURA

```
User Browser
    ↓
Next.js (Frontend)
    ├─ PaymentPanel.tsx (UI)
    └─ page.tsx (ordena)
         ↓
   POST /api/orders/[id]/payment
         ↓
   lib/revolut/revolutService.ts
         ├─ createRevolutOrder()
         └─ getRevolutOrder()
         ↓
   Revolut Merchant API
   (https://merchant.revolut.com)
         ↓
   Webhook: ORDER_COMPLETED
         ↓
   POST /api/webhooks/revolut
         ├─ verifyRevolutWebhookSignature()
         ├─ handleOrderCompleted()
         ├─ handleOrderCancelled()
         └─ handlePaymentFailed()
         ↓
   Supabase (PostgreSQL)
   ├─ revolut_payments (write)
   ├─ orders (update estado)
   └─ email_logs (optional)
```

---

## 🔐 VARIABLES DE ENTORNO REQUERIDAS

```bash
# .env.local (Desarrollo)
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox
REVOLUT_SECRET_KEY=sk_sandbox_xxxxx
REVOLUT_MERCHANT_ID=your_merchant_id
REVOLUT_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Vercel Environment Variables (Producción)
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=production
REVOLUT_SECRET_KEY=sk_live_xxxxx
REVOLUT_MERCHANT_ID=your_merchant_id
REVOLUT_WEBHOOK_SECRET=whsec_xxxxx
NEXT_PUBLIC_APP_URL=https://b2b.firmarollers.com
```

---

## 📋 CHECKLIST DE PRIMEROS PASOS

- [ ] Leer QUICK_START.md (5 min)
- [ ] Obtener API keys de Revolut (3 min)
- [ ] Configurar .env.local (1 min)
- [ ] Leer EXECUTIVE_SUMMARY.md (10 min)
- [ ] Leer REVOLUT_INTEGRATION_GUIDE.md (30-60 min)
- [ ] Crear tabla en Supabase (5 min)
- [ ] Copiar 6 archivos TypeScript (15 min)
- [ ] Compilar proyecto (npm run build) (5 min)
- [ ] Registrar webhook en Revolut (2 min)
- [ ] Hacer test en Sandbox (1 hora)
- [ ] Seguir IMPLEMENTATION_CHECKLIST.md (2 horas)
- [ ] Deploy a Producción (15 min)

**Total: 4-5 horas**

---

## 🧪 TESTING RÁPIDO

Después de implementar, verifica en orden:

1. **Compila sin errores**
   ```bash
   npm run build
   ```

2. **Dev server inicia**
   ```bash
   npm run dev
   ```

3. **Crea orden de prueba**
   - Portal admin → Crear cliente → Crear pedido
   - Pedido en estado "confirmado"

4. **Ve PaymentPanel**
   - Portal cliente → Orden
   - ¿Aparece botón "Proceder al Pago"?

5. **Inicia pago**
   - Click botón
   - ¿Redirige a Revolut Checkout (sandbox)?

6. **Paga con tarjeta test**
   - Card: 4111 1111 1111 1111
   - Exp: 12/25
   - CVC: 123
   - Click Pay

7. **Verifica webhook**
   - Logs del servidor muestran: `[Webhook] Event verified and parsed: ORDER_COMPLETED`

8. **Verifica BD**
   - Supabase: SELECT * FROM revolut_payments
   - Status = 'completed'

9. **Verifica orden actualizada**
   - Supabase: SELECT estado FROM orders WHERE id = '[order_id]'
   - Estado = 'produccion'

✅ Si todo pasó, estás listo para producción

---

## 🚨 TROUBLESHOOTING RÁPIDO

| Problema | Solución |
|----------|----------|
| `Cannot find module @/lib/types/revolut` | ¿Copiaste lib_types_revolut.ts a lib/types/revolut.ts? |
| `REVOLUT_SECRET_KEY is not defined` | Revisa .env.local tiene REVOLUT_SECRET_KEY |
| `Table 'revolut_payments' does not exist` | ¿Ejecutaste migration en Supabase? |
| 401 Unauthorized en API | Revisa secret key es correcta (sk_sandbox_ o sk_live_) |
| Webhook no llega | Revisa URL y webhook secret en Revolut Dashboard |
| Firma de webhook inválida | Verifica REVOLUT_WEBHOOK_SECRET = WEBHOOK_SECRET en Revolut |

---

## 📞 RECURSOS EXTERNOS

| Recurso | Link |
|---------|------|
| Revolut Merchant API | https://developer.revolut.com/docs/merchant/merchant-api |
| Hosted Checkout Page | https://developer.revolut.com/docs/guides/accept-payments/online-payments/hosted-checkout-page/api |
| Webhooks | https://developer.revolut.com/docs/merchant/webhooks |
| Test Cards | https://developer.revolut.com/docs/guides/accept-payments/get-started/test-implementation/test-cards |
| API Status | https://status.revolut.com |
| Soporte | api-requests@revolut.com |

---

## 📁 ESTRUCTURA DE ARCHIVOS FINALES

```
FIRMA_FRESH/
├── .env.local (actualizado con Revolut vars)
├── lib/
│   ├── types/
│   │   └── revolut.ts ← (copia de lib_types_revolut.ts)
│   └── revolut/
│       └── revolutService.ts ← (copia de lib_revolut_revolutService.ts)
├── app/
│   ├── api/
│   │   ├── orders/
│   │   │   └── [id]/
│   │   │       └── payment/
│   │   │           └── route.ts ← (copia de app_api_orders_id_payment_route.ts)
│   │   └── webhooks/
│   │       └── revolut/
│   │           └── route.ts ← (copia de app_api_webhooks_revolut_route.ts)
│   └── (portal)/
│       └── orders/
│           └── [id]/
│               ├── page.tsx (actualizado para usar PaymentPanel)
│               └── PaymentPanel.tsx ← (copia de PaymentPanel.tsx)
└── supabase/
    └── migrations/
        └── 001_revolut_payments.sql ← (copia de migration_revolut_payments.sql)
```

---

## ✨ PRÓXIMAS SESIONES

### Sesión 2: IMPLEMENTACIÓN (6-8 horas)
1. Ejecutar migración SQL
2. Copiar 6 archivos TypeScript
3. Compilar y verificar
4. Testing en Sandbox

### Sesión 3: PRODUCCIÓN (1-2 horas)
1. Obtener credenciales live
2. Configurar Vercel env vars
3. Deploy
4. Test pago real (1€)

### Sesión 4: POLISH (4+ horas)
1. Emails de confirmación
2. Admin dashboard improvements
3. Historial de pagos cliente
4. Monitoreo y alertas

---

## 📊 SUMMARY

**Entregables:**
- ✅ 4 documentos (5-29 KB cada uno)
- ✅ 6 archivos de código TypeScript/React (2-8 KB)
- ✅ 1 script SQL (5.7 KB)
- ✅ 2,900 líneas totales
- ✅ 100% ready-to-use

**Coverage:**
- ✅ Setup de credenciales
- ✅ Backend API (2 rutas)
- ✅ Frontend UI (1 componente)
- ✅ Base de datos (1 tabla + RLS)
- ✅ Testing & QA
- ✅ Troubleshooting
- ✅ Documentación completa

**Tiempo de implementación:**
- Setup: 30 min
- Código: 2-3 horas
- Testing: 1-2 horas
- Producción: 15-30 min
- **Total: 4-6 horas**

---

## 🎯 SIGUIENTE ACCIÓN

**Abre QUICK_START.md ahora.**

Ese documento te guía por los siguientes 15 minutos. Después, tienes todo lo que necesitas para una implementación exitosa.

¡Adelante! 🚀

