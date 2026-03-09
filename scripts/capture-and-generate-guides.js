/**
 * Guide Screenshot Capture + HTML Generator
 * -----------------------------------------
 * Run from your local machine (needs Chrome installed):
 *
 *   npm install puppeteer   (if not already installed)
 *   node scripts/capture-and-generate-guides.js
 *
 * Outputs:
 *   docs/screenshots/  — all captured PNGs
 *   docs/guide-team.html    — team guide (Spanish), print to PDF
 *   docs/guide-customer.html — customer guide (English), print to PDF
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://b2b.firmarollers.com';
const ADMIN_EMAIL = 'isaac@firmarollers.com';
const ADMIN_PASS  = 'Pepelu26!';
const CLIENT_EMAIL = 'alcoberfacil@gmail.com';
const CLIENT_PASS  = 'Xuleton';

const SCREENSHOT_DIR = path.join(__dirname, '../docs/screenshots');
fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(path.join(__dirname, '../docs'), { recursive: true });

const VIEWPORT = { width: 1440, height: 900 };

async function shot(page, name, selector) {
  await page.waitForTimeout(800);
  if (selector) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
    } catch (_) {}
  }
  const file = path.join(SCREENSHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  console.log(`  ✓ ${name}`);
  return file;
}

async function login(page, email, pass) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]');
  await page.click('input[type="email"]', { clickCount: 3 });
  await page.type('input[type="email"]', email);
  await page.click('input[type="password"]', { clickCount: 3 });
  await page.type('input[type="password"]', pass);
  await page.keyboard.press('Enter');
  await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function goto(page, path, waitFor) {
  await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle2', timeout: 20000 });
  if (waitFor) {
    try { await page.waitForSelector(waitFor, { timeout: 6000 }); } catch (_) {}
  }
  await page.waitForTimeout(600);
}

// ── img tag helper for HTML ──────────────────────────────────────────────────
function img(name, caption) {
  return `
    <figure>
      <img src="screenshots/${name}.png" alt="${caption}">
      <figcaption>${caption}</figcaption>
    </figure>`;
}

// ── HTML shell ────────────────────────────────────────────────────────────────
function htmlShell(title, lang, accentColor, body) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
  .cover { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: ${accentColor}; color: #fff; text-align: center; page-break-after: always; }
  .cover h1 { font-size: 42px; font-weight: 900; letter-spacing: -1px; margin-bottom: 12px; }
  .cover p { font-size: 18px; opacity: .8; }
  .cover .date { margin-top: 40px; font-size: 13px; opacity: .6; }
  .toc { padding: 60px 80px; page-break-after: always; }
  .toc h2 { font-size: 22px; font-weight: 700; margin-bottom: 24px; color: ${accentColor}; }
  .toc ol { padding-left: 20px; line-height: 2.2; font-size: 14px; }
  .toc ol li { color: #444; }
  section { padding: 48px 80px; page-break-inside: avoid; }
  section + section { border-top: 1px solid #eee; }
  h2.section-title { font-size: 11px; font-weight: 700; letter-spacing: .15em; text-transform: uppercase; color: ${accentColor}; margin-bottom: 8px; }
  h3 { font-size: 20px; font-weight: 800; margin-bottom: 16px; }
  p { line-height: 1.7; color: #333; margin-bottom: 12px; }
  ul, ol { padding-left: 20px; margin-bottom: 12px; }
  li { line-height: 1.8; color: #333; }
  figure { margin: 20px 0; border: 1px solid #e5e5e5; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,.07); page-break-inside: avoid; }
  figure img { width: 100%; display: block; }
  figcaption { font-size: 11px; color: #888; padding: 8px 14px; background: #fafafa; border-top: 1px solid #e5e5e5; }
  .tip { background: #fffbeb; border-left: 3px solid #f59e0b; padding: 10px 16px; border-radius: 4px; margin: 16px 0; font-size: 12px; color: #78350f; }
  .step { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
  .step-num { background: ${accentColor}; color: #fff; border-radius: 50%; width: 22px; height: 22px; min-width: 22px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; margin-top: 2px; }
  .step p { margin: 0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    section { page-break-inside: auto; }
    figure { page-break-inside: avoid; }
  }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════════
(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: VIEWPORT,
  });

  const page = await browser.newPage();
  const shots = {};

  // ── ADMIN SCREENSHOTS ──────────────────────────────────────────────────────
  console.log('\n── Admin screenshots ──');
  await login(page, ADMIN_EMAIL, ADMIN_PASS);

  await goto(page, '/login');
  await page.waitForSelector('input[type="email"]');
  shots.login = await shot(page, '01-login', 'input[type="email"]');

  // Re-login properly
  await login(page, ADMIN_EMAIL, ADMIN_PASS);

  await goto(page, '/dashboard', 'h1');
  shots.dashboard = await shot(page, '02-dashboard');

  await goto(page, '/pedidos', 'table, [class*="rounded"]');
  shots.orders = await shot(page, '03-orders-list');

  await goto(page, '/pedidos/nuevo', 'h1');
  shots.newOrder = await shot(page, '04-new-order');

  // Grab first order ID to capture detail
  const firstOrderLink = await page.$('a[href*="/pedidos/"]:not([href="/pedidos/nuevo"])');
  if (firstOrderLink) {
    const href = await page.evaluate(el => el.getAttribute('href'), firstOrderLink);
    await goto(page, href, 'h1');
    shots.orderDetail = await shot(page, '05-order-detail');
  }

  await goto(page, '/clientes', '[class*="rounded"]');
  shots.clients = await shot(page, '06-clients-list');

  await goto(page, '/clientes/nuevo', 'h1');
  shots.newClient = await shot(page, '07-new-client');

  const firstClientLink = await page.$('a[href*="/clientes/"]:not([href="/clientes/nuevo"])');
  if (firstClientLink) {
    const href = await page.evaluate(el => el.getAttribute('href'), firstClientLink);
    await goto(page, href, 'h1');
    shots.clientDetail = await shot(page, '08-client-detail');
  }

  await goto(page, '/catalogo', '[class*="rounded"]');
  shots.catalog = await shot(page, '09-catalog');

  await goto(page, '/tarifas', '[class*="rounded"]');
  shots.tarifas = await shot(page, '10-tarifas');

  await goto(page, '/tarifas/nuevo', 'h1');
  shots.newTarifa = await shot(page, '11-new-tarifa');

  await goto(page, '/usuarios', '[class*="rounded"]');
  shots.usuarios = await shot(page, '12-usuarios');

  await goto(page, '/emails', '[class*="rounded"]');
  shots.emails = await shot(page, '13-emails');

  // ── CLIENT SCREENSHOTS ─────────────────────────────────────────────────────
  console.log('\n── Client screenshots ──');

  // Log out by clearing cookies
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  const cookies = await page.cookies();
  await page.deleteCookie(...cookies);
  const lsKeys = await page.evaluate(() => Object.keys(localStorage));
  await page.evaluate(() => localStorage.clear());

  await login(page, CLIENT_EMAIL, CLIENT_PASS);

  await goto(page, '/portal', '[class*="rounded"]');
  shots.portalHome = await shot(page, '14-portal-home');

  await goto(page, '/portal/pedidos', '[class*="rounded"]');
  shots.portalOrders = await shot(page, '15-portal-orders');

  await goto(page, '/portal/pedidos/nuevo', 'h1');
  shots.portalNewOrder = await shot(page, '16-portal-new-order');

  // Grab a portal order for detail
  const firstPortalOrder = await page.$('a[href*="/portal/pedidos/"]:not([href="/portal/pedidos/nuevo"])');
  if (firstPortalOrder) {
    const href = await page.evaluate(el => el.getAttribute('href'), firstPortalOrder);
    await goto(page, href, 'h1');
    shots.portalOrderDetail = await shot(page, '17-portal-order-detail');
  }

  await goto(page, '/portal/perfil', 'h1');
  shots.portalProfile = await shot(page, '18-portal-profile');

  await browser.close();
  console.log('\n✓ All screenshots saved to docs/screenshots/\n');

  // ═══════════════════════════════════════════════════════════════════════════
  //  GENERATE TEAM GUIDE (SPANISH)
  // ═══════════════════════════════════════════════════════════════════════════
  const today = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

  const teamBody = `
<div class="cover">
  <h1>FIRMA ROLLERS B2B</h1>
  <p>Manual de equipo — Panel de administración</p>
  <div class="date">Versión ${today}</div>
</div>

<div class="toc">
  <h2>Contenido</h2>
  <ol>
    <li>Acceso al panel</li>
    <li>Dashboard</li>
    <li>Gestión de pedidos</li>
    <li>Crear un pedido nuevo</li>
    <li>Envío con Packlink</li>
    <li>Gestión de clientes</li>
    <li>Catálogo de productos</li>
    <li>Tarifas</li>
    <li>Usuarios del equipo</li>
    <li>Envío de emails</li>
  </ol>
</div>

<!-- 1. ACCESO -->
<section>
  <h2 class="section-title">1</h2>
  <h3>Acceso al panel</h3>
  <p>El panel de administración está disponible en <strong>b2b.firmarollers.com</strong>. Usa tu cuenta de equipo para entrar.</p>
  ${img('01-login', 'Pantalla de login')}
  <div class="tip">Si olvidaste la contraseña, usa el enlace "Forgot password" en la pantalla de login. Te llegará un email de recuperación.</div>
</section>

<!-- 2. DASHBOARD -->
<section>
  <h2 class="section-title">2</h2>
  <h3>Dashboard</h3>
  <p>La página de inicio muestra un resumen rápido de la actividad reciente: pedidos pendientes, clientes activos y métricas clave.</p>
  ${img('02-dashboard', 'Dashboard principal')}
</section>

<!-- 3. PEDIDOS -->
<section>
  <h2 class="section-title">3</h2>
  <h3>Gestión de pedidos</h3>
  <p>En <strong>Orders</strong> ves todos los pedidos con su estado, peso, importe y fecha. Puedes filtrar por estado, cliente y rango de fechas.</p>
  ${img('03-orders-list', 'Lista de pedidos con filtros')}
  <p>Los estados posibles son:</p>
  <ul>
    <li><strong>Confirmed</strong> — pedido confirmado, pendiente de preparar</li>
    <li><strong>Enviado</strong> — paquete enviado con Packlink</li>
    <li><strong>Cancelled</strong> — pedido cancelado</li>
  </ul>
  ${img('05-order-detail', 'Detalle de un pedido')}
  <p>Desde el detalle puedes ver los ítems, el resumen económico, y gestionar el envío.</p>
</section>

<!-- 4. NUEVO PEDIDO -->
<section>
  <h2 class="section-title">4</h2>
  <h3>Crear un pedido nuevo</h3>
  <div class="step"><div class="step-num">1</div><p>Ve a <em>Orders → + New Order</em>.</p></div>
  <div class="step"><div class="step-num">2</div><p>Selecciona el cliente del desplegable.</p></div>
  <div class="step"><div class="step-num">3</div><p>Busca productos y ajusta cantidades con los botones <strong>+</strong> / <strong>−</strong>.</p></div>
  <div class="step"><div class="step-num">4</div><p>Pide un quote de envío (opcional) antes de confirmar.</p></div>
  <div class="step"><div class="step-num">5</div><p>Pulsa <strong>Confirm order</strong> para crear el pedido.</p></div>
  ${img('04-new-order', 'Pantalla de nuevo pedido')}
</section>

<!-- 5. ENVÍO -->
<section>
  <h2 class="section-title">5</h2>
  <h3>Gestionar el envío con Packlink</h3>
  <p>Desde el detalle de un pedido, en el bloque <strong>SHIPPING · PACKLINK</strong>:</p>
  <div class="step"><div class="step-num">1</div><p>Introduce las medidas del paquete (ancho, alto, largo en cm).</p></div>
  <div class="step"><div class="step-num">2</div><p>Ajusta el peso si el paquete incluye muestras u otros materiales extra.</p></div>
  <div class="step"><div class="step-num">3</div><p>Pulsa <strong>Get quotes</strong> para obtener precios de Packlink en tiempo real.</p></div>
  <div class="step"><div class="step-num">4</div><p>Selecciona la opción que prefieras y pulsa <strong>Generate Shipment</strong>.</p></div>
  <div class="tip">El peso del pedido se calcula automáticamente según los productos. Si añades folletos o muestras, modifica el campo <em>Weight (kg)</em> antes de pedir el quote.</div>
</section>

<!-- 6. CLIENTES -->
<section>
  <h2 class="section-title">6</h2>
  <h3>Gestión de clientes</h3>
  <p>En <strong>Clients</strong> están todos los clientes B2B con su empresa, contacto y tarifa asignada.</p>
  ${img('06-clients-list', 'Lista de clientes')}
  <p>Para crear un cliente nuevo, pulsa <strong>+ New Client</strong> y rellena los datos de empresa, contacto, dirección de envío y tarifa.</p>
  ${img('07-new-client', 'Formulario de nuevo cliente')}
  <div class="tip">Cada cliente tiene asignada una tarifa que determina sus precios mayoristas. Asegúrate de seleccionar la correcta al crear o editar un cliente.</div>
  ${img('08-client-detail', 'Detalle de cliente con historial de pedidos')}
</section>

<!-- 7. CATÁLOGO -->
<section>
  <h2 class="section-title">7</h2>
  <h3>Catálogo de productos</h3>
  <p>El catálogo muestra todos los productos disponibles con SKU, variante, peso y precio base. Es de solo lectura desde el panel B2B; los productos se gestionan desde el sistema central.</p>
  ${img('09-catalog', 'Catálogo de productos')}
</section>

<!-- 8. TARIFAS -->
<section>
  <h2 class="section-title">8</h2>
  <h3>Tarifas</h3>
  <p>Las tarifas definen los precios mayoristas por producto para cada segmento de cliente. Cada cliente tiene asignada una tarifa.</p>
  ${img('10-tarifas', 'Lista de tarifas')}
  <p>Para crear una nueva tarifa, pulsa <strong>+ New Rate</strong>, dale un nombre y establece los precios por SKU.</p>
  ${img('11-new-tarifa', 'Creación de nueva tarifa')}
</section>

<!-- 9. USUARIOS -->
<section>
  <h2 class="section-title">9</h2>
  <h3>Usuarios del equipo</h3>
  <p>En <strong>Users</strong> puedes gestionar los miembros del equipo con acceso al panel de administración.</p>
  ${img('12-usuarios', 'Gestión de usuarios')}
  <div class="tip">Solo los administradores pueden crear o desactivar usuarios del equipo.</div>
</section>

<!-- 10. EMAILS -->
<section>
  <h2 class="section-title">10</h2>
  <h3>Envío de emails</h3>
  <p>Desde la sección <strong>Emails</strong> puedes enviar comunicaciones a clientes: confirmaciones de pedido, avisos de envío, etc.</p>
  ${img('13-emails', 'Panel de emails')}
</section>
`;

  fs.writeFileSync(
    path.join(__dirname, '../docs/guide-team.html'),
    htmlShell('Manual de equipo – Firma Rollers B2B', 'es', '#1a1a2e', teamBody)
  );
  console.log('✓ docs/guide-team.html generated');

  // ═══════════════════════════════════════════════════════════════════════════
  //  GENERATE CUSTOMER GUIDE (ENGLISH)
  // ═══════════════════════════════════════════════════════════════════════════
  const customerBody = `
<div class="cover">
  <h1>FIRMA ROLLERS B2B</h1>
  <p>Customer Portal — Getting Started Guide</p>
  <div class="date">Version ${today}</div>
</div>

<div class="toc">
  <h2>Contents</h2>
  <ol>
    <li>Accessing your portal</li>
    <li>Your dashboard</li>
    <li>Placing a new order</li>
    <li>Tracking your orders</li>
    <li>Your profile &amp; shipping address</li>
  </ol>
</div>

<!-- 1. ACCESS -->
<section>
  <h2 class="section-title">1</h2>
  <h3>Accessing your portal</h3>
  <p>Your B2B portal is available at <strong>b2b.firmarollers.com</strong>. Use the email and password provided by the Firma Rollers team to log in.</p>
  ${img('01-login', 'Login screen')}
  <div class="tip">Forgot your password? Click <em>Forgot password</em> on the login screen and we'll send you a reset link.</div>
</section>

<!-- 2. DASHBOARD -->
<section>
  <h2 class="section-title">2</h2>
  <h3>Your dashboard</h3>
  <p>Once logged in, your home screen gives you a quick overview of your recent orders and account activity.</p>
  ${img('14-portal-home', 'Portal home screen')}
</section>

<!-- 3. NEW ORDER -->
<section>
  <h2 class="section-title">3</h2>
  <h3>Placing a new order</h3>
  <p>Ordering is quick and simple. From the portal, click <strong>+ New Order</strong> to get started.</p>
  ${img('16-portal-new-order', 'New order screen')}
  <div class="step"><div class="step-num">1</div><p>Browse or search for products. Your wholesale prices are already applied automatically.</p></div>
  <div class="step"><div class="step-num">2</div><p>Add products to your order using the <strong>+</strong> button. Use <strong>−</strong> to remove units.</p></div>
  <div class="step"><div class="step-num">3</div><p>Review the order summary on the right: items, total weight, subtotal and estimated shipping.</p></div>
  <div class="step"><div class="step-num">4</div><p>Click <strong>Get shipping quote</strong> to see real-time delivery options and costs.</p></div>
  <div class="step"><div class="step-num">5</div><p>Select your preferred shipping option, then click <strong>Confirm order</strong>.</p></div>
  <div class="tip">Shipping is calculated based on the total weight of your order and your delivery address. Make sure your address is up to date in your profile before ordering.</div>
</section>

<!-- 4. ORDERS -->
<section>
  <h2 class="section-title">4</h2>
  <h3>Tracking your orders</h3>
  <p>Go to <strong>My Orders</strong> to see all your past and current orders.</p>
  ${img('15-portal-orders', 'My orders list')}
  <p>Click on any order to see its full details: products ordered, pricing, shipping status and tracking information.</p>
  ${img('17-portal-order-detail', 'Order detail view')}
  <p>Order statuses explained:</p>
  <ul>
    <li><strong>Confirmed</strong> — your order has been received and is being prepared</li>
    <li><strong>Shipped</strong> — your order is on its way</li>
    <li><strong>Cancelled</strong> — the order was cancelled (contact us if you have questions)</li>
  </ul>
  <div class="tip">You'll receive an email confirmation when your order is placed and again when it ships.</div>
</section>

<!-- 5. PROFILE -->
<section>
  <h2 class="section-title">5</h2>
  <h3>Your profile &amp; shipping address</h3>
  <p>Click your name or go to <strong>Profile</strong> to view and update your contact details and shipping address.</p>
  ${img('18-portal-profile', 'Profile page')}
  <p>Please keep your shipping address current — it's used to calculate shipping quotes when you place an order.</p>
  <div class="tip">Need to change something you can't edit yourself? Contact us at <strong>hello@firmarollers.com</strong> and we'll update it for you.</div>
</section>

<section style="background:#fafafa; text-align:center; padding: 40px 80px;">
  <p style="font-size:15px; font-weight:700; margin-bottom:8px;">Need help?</p>
  <p>We're always happy to assist. Reach out to your account manager or email us at <strong>hello@firmarollers.com</strong></p>
</section>
`;

  fs.writeFileSync(
    path.join(__dirname, '../docs/guide-customer.html'),
    htmlShell('Customer Guide – Firma Rollers B2B', 'en', '#D93A35', customerBody)
  );
  console.log('✓ docs/guide-customer.html generated');
  console.log('\n🎉 Done! Open the HTML files in Chrome and print → Save as PDF\n');
})();
