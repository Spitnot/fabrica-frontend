#!/usr/bin/env node

/**
 * scripts/validate-revolut-env.js
 * 
 * Validación de seguridad crítica para Revolut API keys
 * Previene:
 * - Mezclar Sandbox y Producción keys
 * - Accidental production deploys con keys equivocadas
 * - Commits de secrets a git
 * 
 * Uso: npm run validate-env
 * Falla si algo está mal → npm run build rechaza
 */

const path = require('path');
const fs = require('fs');

// Colores para output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  error: (msg) => console.error(`${colors.red}❌ ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warning: (msg) => console.warn(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.cyan}${msg}${colors.reset}`),
};

// ============================================================================
// MAIN VALIDATION
// ============================================================================

log.header('🔒 REVOLUT API SECURITY VALIDATION');

let hasErrors = false;

// 1. Verificar que existen variables
const env = process.env.NEXT_PUBLIC_REVOLUT_ENVIRONMENT;
const key = process.env.REVOLUT_SECRET_KEY;
const merchantId = process.env.REVOLUT_MERCHANT_ID;
const webhookSecret = process.env.REVOLUT_WEBHOOK_SECRET;

log.info(`Environment: ${env || 'NOT SET'}`);
log.info(`Secret Key: ${key ? key.substring(0, 15) + '...' : 'NOT SET'}`);
log.info(`Merchant ID: ${merchantId || 'NOT SET'}`);
log.info(`Webhook Secret: ${webhookSecret ? webhookSecret.substring(0, 15) + '...' : 'NOT SET'}`);

console.log('');

if (!env) {
  log.error('NEXT_PUBLIC_REVOLUT_ENVIRONMENT is not set');
  hasErrors = true;
}

if (!key) {
  log.error('REVOLUT_SECRET_KEY is not set');
  hasErrors = true;
}

if (!merchantId) {
  log.warning('REVOLUT_MERCHANT_ID is not set (optional but recommended)');
}

if (!webhookSecret) {
  log.warning('REVOLUT_WEBHOOK_SECRET is not set (needed for webhook validation)');
}

if (hasErrors) {
  log.error('Missing critical environment variables');
  process.exit(1);
}

// 2. Validar formato de variables
log.header('Validating variable formats...');

const isSandbox = env === 'sandbox';
const isProduction = env === 'production';
const keyIsSandbox = key.startsWith('sk_sandbox_');
const keyIsProduction = key.startsWith('sk_live_');

if (!isSandbox && !isProduction) {
  log.error(`Invalid REVOLUT_ENVIRONMENT: "${env}". Must be "sandbox" or "production"`);
  hasErrors = true;
} else {
  log.success(`NEXT_PUBLIC_REVOLUT_ENVIRONMENT is valid: ${env}`);
}

if (!keyIsSandbox && !keyIsProduction) {
  log.error(`Invalid REVOLUT_SECRET_KEY format. Must start with "sk_sandbox_" or "sk_live_"`);
  hasErrors = true;
}

// 3. Validación CRÍTICA: Sandbox vs Production match
log.header('🔐 CRITICAL SECURITY CHECK - Environment/Key Match');

if (isSandbox && keyIsProduction) {
  log.error('CRITICAL: Sandbox environment but Production key!');
  log.error('This could cause accidental production charges.');
  log.error('Fix: Use sk_sandbox_xxxxx key in development');
  hasErrors = true;
} else if (isSandbox && keyIsSandbox) {
  log.success('Sandbox environment matched with Sandbox key ✓');
}

if (isProduction && keyIsSandbox) {
  log.error('CRITICAL: Production environment but Sandbox key!');
  log.error('Payments will be rejected or silently fail.');
  log.error('Fix: Use sk_live_xxxxx key in production');
  hasErrors = true;
} else if (isProduction && keyIsProduction) {
  log.success('Production environment matched with Production key ✓');
  log.warning('YOU ARE IN PRODUCTION MODE - REAL MONEY AT STAKE');
}

// 4. Validar que .env.local no está en git (si es desarrollo)
if (isSandbox) {
  log.header('Checking .gitignore configuration...');

  const gitignorePath = path.join(process.cwd(), '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    
    if (gitignoreContent.includes('.env.local') || gitignoreContent.includes('.env')) {
      log.success('.env files are properly ignored by git');
    } else {
      log.warning('.env.local might be committed to git');
      log.warning('Add this to .gitignore:');
      log.warning('  .env.local');
      log.warning('  .env.development.local');
    }
  }
}

// 5. Verificar seguridad de logs (en código)
log.header('Checking source code for exposed secrets...');

const filesToCheck = [
  'lib/revolut/revolutService.ts',
  'app/api/orders/[id]/payment/route.ts',
  'app/api/webhooks/revolut/route.ts',
];

let hasSecretLeaks = false;
const dangerousPatterns = [
  /console\.log.*REVOLUT_SECRET_KEY/i,
  /console\.error.*REVOLUT_SECRET_KEY/i,
  /console\.log.*WEBHOOK_SECRET/i,
  /console\.error.*WEBHOOK_SECRET/i,
];

filesToCheck.forEach((file) => {
  const filePath = path.join(process.cwd(), file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    
    dangerousPatterns.forEach((pattern) => {
      if (pattern.test(content)) {
        log.error(`Secret leak detected in ${file}`);
        hasSecretLeaks = true;
      }
    });
  }
});

if (!hasSecretLeaks) {
  log.success('No obvious secret leaks found in source code');
}

// 6. Información de seguridad general
log.header('Security information');

if (isSandbox) {
  log.info('Running in SANDBOX mode');
  log.info('- Payments are not real');
  log.info('- No money changes hands');
  log.info('- Use test cards from Revolut docs');
} else if (isProduction) {
  log.info('Running in PRODUCTION mode');
  log.info('- REAL MONEY TRANSACTIONS');
  log.info('- Customers will be CHARGED');
  log.info('- Monitor transactions carefully');
  log.info('- Have support contact ready');
}

// ============================================================================
// SUMMARY
// ============================================================================

log.header('VALIDATION SUMMARY');

if (hasErrors) {
  log.error('VALIDATION FAILED - Fix errors above before deploying');
  process.exit(1);
} else {
  log.success('All security validations passed ✓');
  log.success('Safe to proceed with build');
  console.log('');
  process.exit(0);
}
