# 🔒 INSTALACIÓN DEL SCRIPT DE VALIDACIÓN

**Objetivo:** Prevenir deploy accidental con credenciales equivocadas

**Tiempo:** 5 minutos

---

## PASO 1: Crear directorio `scripts`

En la raíz del proyecto:

```bash
mkdir -p scripts
```

---

## PASO 2: Copiar script de validación

1. Descarga `validate-revolut-env.js` de los archivos
2. Colócalo en: `scripts/validate-revolut-env.js`
3. Dale permisos de ejecución:

```bash
chmod +x scripts/validate-revolut-env.js
```

---

## PASO 3: Actualizar `package.json`

Abre tu `package.json` y localiza la sección `"scripts"`:

**ANTES:**
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**DESPUÉS:**
```json
{
  "scripts": {
    "dev": "next dev",
    "validate-env": "node scripts/validate-revolut-env.js",
    "build": "npm run validate-env && next build",
    "start": "next start",
    "lint": "next lint"
  }
}
```

**Cambios:**
- Agregar `"validate-env": "node scripts/validate-revolut-env.js"`
- Modificar `"build"` para ejecutar validación primero: `"npm run validate-env && next build"`

---

## PASO 4: Verificar que funciona (Sandbox)

```bash
# En desarrollo (Sandbox)
npm run validate-env
```

**Resultado esperado:**
```
🔒 REVOLUT API SECURITY VALIDATION

ℹ️  Environment: sandbox
ℹ️  Secret Key: sk_sandbox_abc...
ℹ️  Merchant ID: xxxxx
ℹ️  Webhook Secret: whsec_xxx...

Validating variable formats...
✅ NEXT_PUBLIC_REVOLUT_ENVIRONMENT is valid: sandbox

🔐 CRITICAL SECURITY CHECK - Environment/Key Match
✅ Sandbox environment matched with Sandbox key ✓

Checking .gitignore configuration...
✅ .env files are properly ignored by git

Checking source code for exposed secrets...
✅ No obvious secret leaks found in source code

VALIDATION SUMMARY
✅ All security validations passed ✓
Safe to proceed with build
```

---

## PASO 5: Verificar que rechaza si algo está mal

**Test 1: Clave equivocada**

```bash
# Simular error
export REVOLUT_SECRET_KEY=sk_live_xxxxx  # Live key en Sandbox
export NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox

npm run validate-env
```

**Resultado esperado:**
```
❌ CRITICAL: Sandbox environment but Production key!
This could cause accidental production charges.
Fix: Use sk_sandbox_xxxxx key in development

❌ VALIDATION FAILED - Fix errors above before deploying
```

**Test 2: Variable faltante**

```bash
# Simular error
unset REVOLUT_SECRET_KEY

npm run validate-env
```

**Resultado esperado:**
```
❌ REVOLUT_SECRET_KEY is not set
❌ Missing critical environment variables
❌ VALIDATION FAILED - Fix errors above before deploying
```

---

## PASO 6: Usar en build normal

Ahora, cuando hagas build:

```bash
npm run build
```

El script se ejecuta AUTOMÁTICAMENTE:
1. Valida credenciales
2. Si está todo OK → compila Next.js
3. Si hay error → rechaza el build

---

## 🆚 COMPARACIÓN ANTES vs DESPUÉS

### ANTES (sin validación) ❌

```
$ npm run build
next build
...
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
(Pero si usaste clave equivocada, no lo sabe)
```

**Problema:** Podrías hacer deploy a producción con clave sandbox (o peor, sandbox con clave live).

### DESPUÉS (con validación) ✅

```
$ npm run build
npm run validate-env && next build

🔒 REVOLUT API SECURITY VALIDATION

ℹ️  Environment: sandbox
ℹ️  Secret Key: sk_live_xxxxx ← PROBLEMA
...

❌ CRITICAL: Sandbox environment but Production key!
This could cause accidental production charges.

❌ VALIDATION FAILED - Fix errors above before deploying
npm ERR! code ELIFECYCLE
npm ERR! errno 1
```

**Resultado:** Build RECHAZADO. Debes fijar la clave antes de continuar.

---

## 🚨 CASOS DE USO

### Caso 1: Desarrollo Local (Sandbox)

```bash
# .env.local
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox
REVOLUT_SECRET_KEY=sk_sandbox_xxxxx

# $ npm run build
✅ Validación OK → Build procede
```

### Caso 2: Accidenta push con clave equivocada

```bash
# Por accidente alguien hace:
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox
REVOLUT_SECRET_KEY=sk_live_xxxxx  ← PELIGRO

# $ npm run build
❌ CRITICAL: Sandbox environment but Production key!
❌ Build rechazado

# → Previene que esto llegue a github/vercel
```

### Caso 3: Producción correcta

```bash
# Vercel Environment Variables (Production):
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=production
REVOLUT_SECRET_KEY=sk_live_xxxxx

# $ git push origin main → Vercel auto-build
# $ npm run validate-env
✅ Production environment matched with Production key ✓
✅ Build procede
```

---

## 📊 MATRIZ DE VALIDACIÓN

El script verifica automáticamente:

| Check | Sandbox + sk_sandbox_ | Sandbox + sk_live_ | Production + sk_sandbox_ | Production + sk_live_ |
|-------|:---:|:---:|:---:|:---:|
| Variable format OK | ✅ | ✅ | ✅ | ✅ |
| Environment/Key match | ✅ | ❌ FALLA | ❌ FALLA | ✅ |
| Final result | ✅ PASS | ❌ REJECT | ❌ REJECT | ✅ PASS |

---

## 💡 TIPS

### Tip 1: Ver que variables tiene Vercel

```bash
# En Vercel, los logs de build muestran:
# (sin exponer el valor completo)
Environment: sandbox
Secret Key: sk_sandbox_abc...
```

### Tip 2: Correr validación sin build

```bash
npm run validate-env  # Solo validación
npm run build         # Validación + build
```

### Tip 3: Debugging si hay error

Si el script falla pero no ves por qué:

```bash
# Ver todas las variables
env | grep REVOLUT

# Resultado:
NEXT_PUBLIC_REVOLUT_ENVIRONMENT=sandbox
REVOLUT_SECRET_KEY=sk_sandbox_xxxxx
REVOLUT_MERCHANT_ID=xxxxx
REVOLUT_WEBHOOK_SECRET=whsec_xxxxx
```

---

## ✅ VERIFICACIÓN FINAL

Para confirmar que todo está correcto:

```bash
# 1. Verifica que package.json tiene el script
cat package.json | grep -A 5 "scripts"

# Resultado debe incluir:
# "validate-env": "node scripts/validate-revolut-env.js",
# "build": "npm run validate-env && next build",

# 2. Verifica que archivo existe
ls -l scripts/validate-revolut-env.js

# Resultado:
# -rwxr-xr-x ... scripts/validate-revolut-env.js

# 3. Prueba el script
npm run validate-env

# Resultado:
# ✅ All security validations passed ✓
```

---

## 🎯 RESULTADO FINAL

Después de esto:

✅ **Nunca más** podrás hacer `npm run build` con credenciales equivocadas  
✅ **Automáticamente** valida que sandbox/production coincidan con las claves  
✅ **Rechaza el build** si algo está mal (antes de llegar a git/vercel)  
✅ **Zero overhead** - validación toma <1s  

**Es como tener un guardaespaldas que verifica tus credenciales antes de cada deploy.** 🛡️

