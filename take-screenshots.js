const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000'; // Cambia si tu puerto es diferente
const OUT_DIR = path.join(__dirname, 'docs', 'screenshots');

const ADMIN_EMAIL = 'isaac@firmarollers.com';
const ADMIN_PASS = 'tu_password_aqui'; // <-- cambia esto

const CLIENT_EMAIL = 'alcoberfacil@gmail.com';
const CLIENT_PASS = 'tu_password_aqui'; // <-- cambia esto

const ADMIN_SCREENS = [
  { file: '02-dashboard.png',    url: '/dashboard' },
  { file: '03-orders-list.png',  url: '/pedidos' },
  { file: '04-new-order.png',    url: '/pedidos/nuevo' },
  { file: '06-clients-list.png', url: '/clientes' },
  { file: '07-new-client.png',   url: '/clientes/nuevo' },
  { file: '09-catalog.png',      url: '/catalogo' },
  { file: '10-tarifas.png',      url: '/tarifas' },
  { file: '11-new-tarifa.png',   url: '/tarifas/nuevo' },
  { file: '12-usuarios.png',     url: '/usuarios' },
  { file: '13-emails.png',       url: '/emails' },
];

const CLIENT_SCREENS = [
  { file: '14-portal-home.png',        url: '/portal' },
  { file: '15-portal-orders.png',      url: '/portal/pedidos' },
  { file: '16-portal-new-order.png',   url: '/portal/pedidos/nuevo' },
  { file: '18-portal-profile.png',     url: '/portal/perfil' },
];

async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.screenshot({ path: path.join(OUT_DIR, '01-login.png'), fullPage: true });
  await page.type('input[type="email"]', email);
  await page.type('input[type="password"]', password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
page.click('button'),  ]);
}

async function takeScreenshots(page, screens) {
  for (const { file, url } of screens) {
    await page.goto(`${BASE_URL}${url}`, { waitUntil: 'networkidle2' });
    await page.screenshot({ path: path.join(OUT_DIR, file), fullPage: true });
    console.log(`✓ ${file}`);
  }
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  console.log('--- Admin ---');
  await login(page, ADMIN_EMAIL, ADMIN_PASS);
  await takeScreenshots(page, ADMIN_SCREENS);

  // Detalle de pedido
  await page.goto(`${BASE_URL}/pedidos`, { waitUntil: 'networkidle2' });
  const firstOrder = await page.$('table tbody tr a, [data-row] a');
  if (firstOrder) {
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), firstOrder.click()]);
    await page.screenshot({ path: path.join(OUT_DIR, '05-order-detail.png'), fullPage: true });
    console.log('✓ 05-order-detail.png');
  }

  // Detalle de cliente
  await page.goto(`${BASE_URL}/clientes`, { waitUntil: 'networkidle2' });
  const firstClient = await page.$('table tbody tr a, [data-row] a');
  if (firstClient) {
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), firstClient.click()]);
    await page.screenshot({ path: path.join(OUT_DIR, '08-client-detail.png'), fullPage: true });
    console.log('✓ 08-client-detail.png');
  }

  console.log('\n--- Cliente ---');
  await login(page, CLIENT_EMAIL, CLIENT_PASS);
  await takeScreenshots(page, CLIENT_SCREENS);

  // Detalle de pedido portal
  await page.goto(`${BASE_URL}/portal/pedidos`, { waitUntil: 'networkidle2' });
  const firstPortalOrder = await page.$('table tbody tr a, [data-row] a');
  if (firstPortalOrder) {
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle2' }), firstPortalOrder.click()]);
    await page.screenshot({ path: path.join(OUT_DIR, '17-portal-order-detail.png'), fullPage: true });
    console.log('✓ 17-portal-order-detail.png');
  }

  await browser.close();
  console.log('\nDone! Screenshots en', OUT_DIR);
})();
