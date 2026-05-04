# 🔒 MÁXIMA SEGURIDAD - Sandbox vs Producción

**PRIORIDAD:** CRÍTICA  
**Riesgo:** Alto si haces mal esto  
**Tiempo de lectura:** 10 minutos  

---

## 🎯 RESPUESTA DIRECTA A TUS PREGUNTAS

### ¿Puedo usar Sandbox mientras activo datos reales?

**SÍ, 100% seguro.** Pero con **REGLAS ESTRICTAS** que debes seguir.

El problema es:
- **Secret Key Sandbox** (`sk_sandbox_xxxxx`) NO puede procesar pagos reales
- **Secret Key Producción** (`sk_live_xxxxx`) SÍ puede procesar pagos reales
- Si mezclas las dos, o cometes un error, puedes:
  - Procesar pagos reales accidentalmente
  - Perder dinero
  - Cobrar a clientes por error

**La solución:** Mantener ambiente separados COMPLETAMENTE.

---

## ⚠️ MÁXIMA SEGURIDAD - PROTOCOLO OBLIGATORIO

### REGLA 1: NUNCA MEZCLES CLAVES

**INCORRECTO ❌ (Peligroso)**
```javascript
// NUNCA HAGAS ESTO
const key = process.env.REVOLUT_SECRET_KEY;
if (isProduction) {
  // ... esperar a cambiar .env
}
// Mientras tanto, usas la vieja clave
```

**CORRECTO ✅ (Seguro)**
```javascript
// Verificar al inicio del servidor
const REVOLUT_SECRET_KEY = process.env.REVOLUT_SECRET_KEY;
const REVOLUT_ENV = process.env.NEXT_PUBLIC_REVOLUT_ENVIRONMENT;

if (!REVOLUT_SECRET_KEY) throw new Error('REVOLUT_SECRET_KEY missing');
if (!REVOLUT_ENV) throw new Error('NEXT_PUBLIC_REVOLUT_ENVIRONMENT missing');

if (REVOLUT_ENV === 'production' && !REVOLUT_SECRET_KEY.startsWith('sk_live_')) {
  throw new Error('❌ SECURITY ERROR: Producción detectada pero clave es Sandbox');
}

if (REVOLUT_ENV === 'sandbox' && !REVOLUT_SECRET_KEY.startsWith('sk_sandbox_')) {
  throw new Error('❌ SECURITY ERROR: Sandbox detectado pero clave es Producción');
}

console.log(`✅ Revolut initialized: ${REVOLUT_ENV}`);
```

---

### REGLA 2: SANDBOX Y PRODUCCIÓN EN AMBIENTES DIFERENTES

**Estructura recomendada:**

```
DESARROLLO LOCAL (.env.local)
├─ NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox
├─ REVOLUT_SECRET_KEY=sk_sandbox_xxxxx ← Solo sandbox
└─ URL=http://localhost:3000

VERCEL PREVIEW (rama develop)
├─ NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox
├─ REVOLUT_SECRET_KEY=sk_sandbox_xxxxx ← Solo sandbox
└─ URL=https://develop-firma.vercel.app

VERCEL PRODUCCIÓN (rama main)
├─ NEXT_PUBLIC_REVOLUT_ENVIRONMENT=production
├─ REVOLUT_SECRET_KEY=sk_live_xxxxx ← SOLO PRODUCCIÓN
└─ URL=https://b2b.firmarollers.com
```

**Cómo hacer esto en Vercel:**

1. **Vercel Dashboard → Project Settings → Environment Variables**
2. **Para cada variable, especificar en qué rama:**
   ```
   NEXT_PUBLIC_REVOLUT_ENVIRONMENT
   ├─ Valor: sandbox
   └─ Solo en: Preview + Development
   
   NEXT_PUBLIC_REVOLUT_ENVIRONMENT
   ├─ Valor: production
   └─ Solo en: Production
   
   REVOLUT_SECRET_KEY
   ├─ Valor: sk_sandbox_xxxxx
   └─ Solo en: Preview + Development
   
   REVOLUT_SECRET_KEY
   ├─ Valor: sk_live_xxxxx
   └─ Solo en: Production
   ```

3. **Resultado:** `git push origin main` → Automáticamente usa credenciales producción

---

### REGLA 3: VALIDAR EN TIEMPO DE DEPLOY

**Agregar a tu script de build:**

```json
// package.json
{
  "scripts": {
    "build": "npm run validate-env && next build",
    "validate-env": "node scripts/validate-revolut-env.js"
  }
}
```

**scripts/validate-revolut-env.js:**
```javascript
#!/usr/bin/env node

const env = process.env.NEXT_PUBLIC_REVOLUT_ENVIRONMENT;
const key = process.env.REVOLUT_SECRET_KEY;

if (!env || !key) {
  console.error('❌ SECURITY: Missing Revolut environment variables');
  process.exit(1);
}

// Validación crítica
const isSandbox = env === 'sandbox';
const isProd = env === 'production';
const keyIsSandbox = key.startsWith('sk_sandbox_');
const keyIsProd = key.startsWith('sk_live_');

console.log(`\n🔒 REVOLUT SECURITY CHECK`);
console.log(`   Environment: ${env}`);
console.log(`   Key type: ${keyIsSandbox ? 'SANDBOX' : keyIsProd ? 'PRODUCTION' : 'UNKNOWN'}`);

// Verificación de seguridad
if (isSandbox && !keyIsSandbox) {
  console.error('\n❌ SECURITY ERROR: Sandbox env but Production key!');
  process.exit(1);
}

if (isProd && !keyIsProd) {
  console.error('\n❌ SECURITY ERROR: Production env but Sandbox key!');
  process.exit(1);
}

console.log('✅ Revolut configuration is SECURE\n');
```

**Resultado:** Si intentas hacer push con la clave equivocada, el build FALLA y rechaza el deploy.

---

### REGLA 4: LOGGING SEGURO (nunca printear secrets)

**INCORRECTO ❌**
```typescript
console.log('Secret key:', REVOLUT_SECRET_KEY); // ❌ NEVER
console.log('Webhook secret:', REVOLUT_WEBHOOK_SECRET); // ❌ NEVER
```

**CORRECTO ✅**
```typescript
const keyPrefix = REVOLUT_SECRET_KEY.substring(0, 15) + '...';
const webhookPrefix = REVOLUT_WEBHOOK_SECRET.substring(0, 15) + '...';

console.log(`[Revolut] Initialized with key: ${keyPrefix}`);
// Output: [Revolut] Initialized with key: sk_sandbox_abc...
```

---

## 🔄 TIMELINE RECOMENDADO

### Semana 1-2: SANDBOX SOLAMENTE

```
┌─────────────────────────────────────────────┐
│ AMBIENTE: localhost + Vercel Preview        │
│ REVOLUT: sk_sandbox_xxxxx                   │
│ WEBHOOK: http://localhost:3000/api/webhooks/revolut │
│          o https://develop-firma.vercel.app │
└─────────────────────────────────────────────┘

Actividades:
✅ Testing de código
✅ Flujo de pago completo
✅ Webhook handling
✅ BD updates
✅ QA checklist
❌ NO hay dinero real en riesgo
❌ NO uses con clientes reales
```

### Semana 3: PREPARACIÓN PRODUCCIÓN

```
┌─────────────────────────────────────────────┐
│ AMBIENTE: Vercel Production (main branch)   │
│ REVOLUT: sk_live_xxxxx (SOLO credenciales) │
│ WEBHOOK: https://b2b.firmarollers.com/api  │
│          /webhooks/revolut                  │
└─────────────────────────────────────────────┘

Pre-requisitos ANTES de cambiar claves:
✅ Código pasó QA en Sandbox (semana 1-2)
✅ Webhook está registrado en Revolut
✅ Variables de entorno set en Vercel (no deployadas aún)
✅ Validación de seguridad en scripts funcionando
```

### Semana 4: GO LIVE (cuando todo esté verde)

```
┌─────────────────────────────────────────────┐
│ ACCIÓN: git push origin main                │
│         (automáticamente usa sk_live_xxxxx) │
│                                             │
│ RESULTADO: 5 minutos después                │
│ • Sistema en Producción                    │
│ • Acepta pagos reales                      │
│ • Cliente primero paga 1€ (test)           │
│ • Después pagos normales                   │
└─────────────────────────────────────────────┘
```

---

## 🛡️ CHECKLIST DE SEGURIDAD PRE-PRODUCCIÓN

### Antes de obtener `sk_live_` keys

- [ ] Revolut Business account verificada (banco real)
- [ ] Identidad verificada en Revolut
- [ ] Banco asociado a cuenta Revolut
- [ ] Dirección de retorno configurada
- [ ] Política de privacidad en web
- [ ] Términos de servicio actualizados

### Antes de usar `sk_live_` en código

- [ ] ✅ Código funciona perfecto en Sandbox (2+ semanas)
- [ ] ✅ Todos los tests en IMPLEMENTATION_CHECKLIST.md pasados
- [ ] ✅ Webhook funciona (recibe y procesa eventos)
- [ ] ✅ Base de datos actualiza correctamente
- [ ] ✅ Validación de env vars en build script
- [ ] ✅ Logs NO exponen secrets
- [ ] ✅ Variables en Vercel configuradas (no en git)

### Antes de comunicar a clientes

- [ ] ✅ Test pago real de 1€ exitoso
- [ ] ✅ Webhook recibido y BD actualizada
- [ ] ✅ Email de confirmación enviado (si está setup)
- [ ] ✅ Admin ve pago en dashboard
- [ ] ✅ Monitoreo/alertas configurados

---

## 🚨 ERRORES FATALES A EVITAR

### ERROR 1: Commitear secrets a Git

**INCORRECTO ❌**
```bash
git add .env  # ❌ NUNCA
git commit -m "add revolut keys"
git push
```

**RESULTADO:** Keys expuestas públicamente en GitHub, puedes perder dinero.

**CORRECTO ✅**
```bash
echo ".env" >> .gitignore  # Asegurarse
echo ".env.local" >> .gitignore

# Keys SOLO en Vercel, NUNCA en git
git add .gitignore
git commit -m "ignore env files"
git push
```

### ERROR 2: Usar `sk_live_` en desarrollo

**INCORRECTO ❌**
```javascript
// .env.local
REVOLUT_SECRET_KEY=sk_live_xxxxx  // ❌ PELIGRO
```

**RIESGO:** Si hay bug, procesas pagos reales accidentalmente en localhost.

**CORRECTO ✅**
```javascript
// .env.local
REVOLUT_SECRET_KEY=sk_sandbox_xxxxx  // ✅ Seguro
```

### ERROR 3: No validar en tiempo de deploy

**INCORRECTO ❌**
```bash
# Sin validación, puedes hacer push con clave equivocada
git push origin main  # ¿Está usando sk_live_?
```

**CORRECTO ✅**
```bash
# Script de validación rechaza si hay error
npm run build  # Falla si config es insegura
# ... fix .env en Vercel
npm run build  # Ahora OK
git push origin main
```

### ERROR 4: Mezclar branches y ambientes

**INCORRECTO ❌**
```
develop branch → sk_live_xxxxx (PRODUCCIÓN)
main branch    → sk_sandbox_xxxxx (SANDBOX)
```

**RIESGO:** Código experimental procesa pagos reales.

**CORRECTO ✅**
```
develop/preview → sk_sandbox_xxxxx (SANDBOX)
main/production → sk_live_xxxxx (PRODUCCIÓN)
```

---

## 📊 MATRIZ DE DECISIONES

### ¿Cuándo usar qué?

| Escenario | Clave | Ambiente | Riesgo |
|-----------|-------|----------|--------|
| Desarrollo local | `sk_sandbox_` | localhost | BAJO |
| Testing en preview | `sk_sandbox_` | Vercel preview | BAJO |
| QA antes de producción | `sk_sandbox_` | Vercel develop | BAJO |
| Cliente real paga | `sk_live_` | Vercel main | ALTO ⚠️ |
| Demo a gerencia | `sk_sandbox_` | Vercel preview | BAJO |
| Refundar pago real | `sk_live_` + manual | Dashboard Revolut | ALTO ⚠️ |

---

## 🔐 CREDENCIALES: DÓNDE VAN

### ❌ NUNCA en estos lugares:
- ❌ `.env` (commiteado a git)
- ❌ `.env.local` en git
- ❌ `secrets.json` en repo
- ❌ README o documentación
- ❌ Logs de CI/CD
- ❌ Slack, email, o chat grupal
- ❌ Comentarios de código

### ✅ SOLO en estos lugares:
- ✅ Vercel Environment Variables (UI privada)
- ✅ `.env.local` (ignorado por git, solo local)
- ✅ 1Password / LastPass (si usas vault)
- ✅ Documento privado compartido solo con CTO
- ✅ Variables de entorno en servidor (si usas VPS)

**Nunca compartas credenciales a través de Slack.**
**Si alguien necesita, crea nuevas credenciales en Revolut y comparte el acceso de lectura en Dashboard.**

---

## 🚀 PROCEDIMIENTO DE GO-LIVE (SEGURO)

### Paso 1: Obtener credenciales `sk_live_`

1. En Revolut Business → Settings → APIs → Merchant API
2. Click "Generate" para nueva key de PRODUCCIÓN
3. Copiar `sk_live_xxxxx`
4. Guardar en 1Password o vault privado
5. **NUNCA compartir por mensaje**

### Paso 2: Configurar en Vercel (sin tocar código)

1. Vercel Dashboard → Project → Settings → Environment Variables
2. Crear nueva variable (no overwrite):
   ```
   Name: REVOLUT_SECRET_KEY
   Value: sk_live_xxxxx
   Environments: Production only
   ```
3. Crear otra para environment flag:
   ```
   Name: NEXT_PUBLIC_REVOLUT_ENVIRONMENT
   Value: production
   Environments: Production only
   ```
4. Click Save
5. **No hacer deploy aún**

### Paso 3: Verificar build script

```bash
# Localmente, simular variables producción
export NEXT_PUBLIC_REVOLUT_ENVIRONMENT=production
export REVOLUT_SECRET_KEY=sk_live_xxxxx

# Ejecutar validación
npm run validate-env

# Resultado esperado:
# ✅ Revolut configuration is SECURE
```

### Paso 4: Deploy a Producción

```bash
# En rama main (nunca en develop)
git push origin main

# Vercel automáticamente:
# 1. Lee variables de "Production" en Vercel
# 2. Usa sk_live_xxxxx
# 3. Build script valida
# 4. Deploy completado
```

### Paso 5: Primer pago de prueba

1. En portal cliente
2. Crear orden con monto 1€
3. Iniciar pago
4. **Usar tarjeta REAL** (de prueba, sin dinero real)
   - O usar 1€ real (pequeño test)
5. Verificar:
   - Pago aparece en Revolut Dashboard
   - Webhook llega
   - BD actualiza
   - Orden en estado "produccion"

### Paso 6: Monitoreo 24/7 primeras horas

```
Primer 1 hora:
✅ Logs sin errores
✅ Webhooks recibidos
✅ Pagos procesados

Primeras 24 horas:
✅ Varias transacciones exitosas
✅ Sin errores de seguridad
✅ Clientes reportan OK
```

Si algo falla: **Revertir inmediatamente** a Sandbox.

---

## 📞 SOPORTE SEGURO

**Si hay breach o sospecha de security issue:**

1. **Inmediatamente:**
   - Revoke actual keys en Revolut Dashboard
   - Generate nuevas keys
   - Update Vercel (mismo paso que antes)

2. **Dentro de 1 hora:**
   - Contactar Revolut: api-requests@revolut.com
   - Describir el problema
   - Pedir revisión de transacciones

3. **Dentro de 24 horas:**
   - Auditoría de logs
   - Verificar qué transacciones fueron afectadas
   - Reembolsar si es necesario

---

## ✅ CONCLUSIÓN

**Sí, puedes usar Sandbox mientras preparas Producción. PERO:**

1. ✅ Mantén ambientes 100% separados
2. ✅ Nunca mezcles claves (sandbox vs live)
3. ✅ Valida en tiempo de build
4. ✅ Nunca commitees secrets
5. ✅ Verifica antes de go-live
6. ✅ Monitorea primeras 24 horas

**Si sigues este protocolo, es 100% seguro.**

**Si no lo sigues, puedes perder dinero accidentalmente.**

---

## 🎯 TU CHECKLIST INMEDIATO

- [ ] Leer este documento completo
- [ ] Crear script `scripts/validate-revolut-env.js`
- [ ] Agregar a `package.json` → `"build": "npm run validate-env && next build"`
- [ ] Configurar `.gitignore` para no commitear `.env.local`
- [ ] Testear en Sandbox (2+ semanas)
- [ ] Obtener `sk_live_` keys de Revolut
- [ ] Configurar en Vercel (sin hacer push todavía)
- [ ] Validar en local con variables producción
- [ ] Go-live con confianza

**Máxima seguridad = máxima paz mental.**

