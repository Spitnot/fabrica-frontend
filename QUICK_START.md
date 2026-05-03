# 🚀 QUICK START - PRIMEROS PASOS

**Tiempo estimado:** 15 minutos

---

## PASO 1: Descarga los archivos (2 min)

Todos los archivos están en `/mnt/user-data/outputs/`. Descárgalos localmente o accede desde tu editor.

---

## PASO 2: Lee los documentos en orden (10 min)

1. **Este archivo** (estás aquí)
2. `EXECUTIVE_SUMMARY.md` — Qué es, por qué, cuánto tarda
3. `REVOLUT_INTEGRATION_GUIDE.md` — Guía técnica detallada
4. `IMPLEMENTATION_CHECKLIST.md` — Paso a paso verificable

---

## PASO 3: Obtén API Keys de Revolut (3 min)

**En Revolut Business Dashboard:**

1. Ir a: **Settings → APIs → Merchant API**
2. Click "Generate Secret Key" → Copiar a notepad
3. Copiar **Merchant ID** (ej: `5a7c9e1b-3d2f`)
4. En **Webhooks**, generar webhook secret → Copiar

**Resultado: 3 credenciales**
```
REVOLUT_SECRET_KEY = sk_sandbox_xxxxx
REVOLUT_MERCHANT_ID = xxxxx
REVOLUT_WEBHOOK_SECRET = whsec_xxxxx
```

(Usa `sk_sandbox_` en desarrollo, `sk_live_` en producción)

---

## PASO 4: Configura .env.local (1 min)

En la raíz del proyecto `/Users/isaac/Documents/ISAAC/VIBECODE/FIRMA_FRESH`:

```bash
# Agregar a .env.local:
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox
REVOLUT_SECRET_KEY=sk_sandbox_xxxxx  # Obtenido en Paso 3
REVOLUT_MERCHANT_ID=xxxxx             # Obtenido en Paso 3
REVOLUT_WEBHOOK_SECRET=whsec_xxxxx   # Obtenido en Paso 3
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## ✅ Listo para profundizar

Ahora ya estás preparado. Sigue estos pasos:

### Próxima sesión: IMPLEMENTACIÓN (siguiendo IMPLEMENTATION_CHECKLIST.md)

**Etapa 1: Base de datos** (15 min)
- Ir a Supabase → SQL Editor
- Copiar `migration_revolut_payments.sql`
- Click "Run"

**Etapa 2: Archivos TypeScript** (30 min)
- Copiar `lib_types_revolut.ts` → `lib/types/revolut.ts`
- Copiar `lib_revolut_revolutService.ts` → `lib/revolut/revolutService.ts`
- Verificar que compila: `npm run build`

**Etapa 3: Rutas API** (30 min)
- Crear `app/api/orders/[id]/payment/route.ts`
- Crear `app/api/webhooks/revolut/route.ts`
- Copiar contenido de los archivos

**Etapa 4: UI** (15 min)
- Copiar `PaymentPanel.tsx` → `app/(portal)/orders/[id]/`
- Agregar al page.tsx de orden

**Etapa 5: Testing** (1 hora)
- `npm run dev`
- Crear orden de prueba
- Hacer pago con tarjeta teste
- Verificar webhook

---

## 📚 Archivos a tener a mano

| Archivo | Dónde leerlo | Dónde copiar |
|---------|--------------|--------------|
| REVOLUT_INTEGRATION_GUIDE.md | Primero (entender) | - |
| IMPLEMENTATION_CHECKLIST.md | Segundo (guía) | - |
| lib_types_revolut.ts | Tercero (código) | lib/types/revolut.ts |
| lib_revolut_revolutService.ts | Tercero | lib/revolut/revolutService.ts |
| app_api_orders_id_payment_route.ts | Tercero | app/api/orders/[id]/payment/route.ts |
| app_api_webhooks_revolut_route.ts | Tercero | app/api/webhooks/revolut/route.ts |
| PaymentPanel.tsx | Tercero | app/(portal)/orders/[id]/PaymentPanel.tsx |
| migration_revolut_payments.sql | Tercero | Supabase SQL Editor |

---

## 🆘 Si algo no compila

Errores típicos:

```
Error: REVOLUT_SECRET_KEY is not defined
→ Revisa .env.local está en raíz y contiene REVOLUT_SECRET_KEY

Error: Cannot find module '@/lib/types/revolut'
→ Verificaste copiar lib_types_revolut.ts a lib/types/revolut.ts?

Error: Table 'revolut_payments' does not exist
→ ¿Ejecutaste migration_revolut_payments.sql en Supabase?
```

**Checklist de compilación:**
- [ ] .env.local tiene 4 variables (NEXT_PUBLIC_REVOLUT_ENVIRONMENT, REVOLUT_SECRET_KEY, etc.)
- [ ] lib/types/revolut.ts existe
- [ ] lib/revolut/revolutService.ts existe
- [ ] app/api/orders/[id]/payment/route.ts existe
- [ ] app/api/webhooks/revolut/route.ts existe
- [ ] app/(portal)/orders/[id]/PaymentPanel.tsx existe
- [ ] Supabase tiene tabla revolut_payments
- [ ] npm run build ejecuta sin errores

---

## 💬 Preguntas frecuentes

**¿Necesito tarjetas reales para testear?**
No. Revolut proporciona tarjetas de prueba:
- Éxito: `4111 1111 1111 1111`
- Rechazada: `4000 0000 0000 0002`

**¿Cuándo paso a producción?**
Después de:
1. Testing exitoso en Sandbox
2. Verificar webhook funciona
3. Actualizar variables a `sk_live_` (producción key)
4. Deploy a Vercel

**¿Qué pasa si un webhook no llega?**
- Cliente igual ve página de éxito
- BD se actualiza cuando llega el webhook (puede tardar 5-30s)
- Si tarda >24h, hay un problema — contacen a Revolut

**¿Puedo refundar un pago?**
Sí, via Revolut Dashboard o API (implementable después)

---

## 📞 Contacto de soporte

- **Revolut API Support:** api-requests@revolut.com
- **Documentación:** https://developer.revolut.com/docs/merchant/merchant-api
- **Status Page:** https://status.revolut.com

---

## 🎯 Meta

Después de completar esto, tendrás:
- ✅ Clientes pueden pagar ordenes online
- ✅ Transiciones de estado automáticas
- ✅ Histórico de pagos en BD
- ✅ Seguridad PCI-DSS Level 1

**Sin agregar riesgo o complejidad.** Revolut maneja todo.

---

**¡Adelante! Cualquier duda, revisa REVOLUT_INTEGRATION_GUIDE.md — está todo documentado.**

