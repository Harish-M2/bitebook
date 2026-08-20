import { chromium } from 'playwright';

const routes = [
  { name: 'home', path: '/home' },
  { name: 'discover', path: '/discover' },
  { name: 'log', path: '/log' },
  { name: 'diary', path: '/diary' },
  { name: 'profile', path: '/profile' },
];

const outDir = 'C:\\Users\\133353\\Documents\\Projects\\FoodApp\\screenshots';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

for (const route of routes) {
  await page.goto(`http://localhost:8081${route.path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${outDir}\\${route.name}.png` });
  console.log(`Captured ${route.name}`);
}

await browser.close();
