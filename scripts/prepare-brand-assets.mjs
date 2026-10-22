import assert from 'node:assert/strict';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../', import.meta.url));
const pack = path.join(root, 'assets/bitebook_brand_assets');
const output = path.join(pack, 'generated');
const review = path.join(root, 'docs/branding/screenshots');
await mkdir(output, { recursive: true });
await mkdir(review, { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  const font = await readFile(path.join(root,
    'node_modules/@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'));
  await page.setContent(`<style>
    @font-face {font-family:Inter;src:url(data:font/ttf;base64,${font.toString('base64')});font-weight:650}
    body {margin:0;background:transparent;font:14px Inter,sans-serif}
    svg {display:block}
  </style><main></main>`);
  await page.evaluate(() => document.fonts.load('650 31px Inter'));

  async function exportPng(source, filename, size, background, symbolSize) {
    const xml = await readFile(path.join(pack, 'logos', source), 'utf8');
    const dimensions = await page.evaluate(({ xml, size, background, symbolSize }) => {
      const main = document.querySelector('main');
      main.innerHTML = xml;
      const svg = main.querySelector('svg');
      let width = size;
      let height = size;
      if (symbolSize) {
        const box = svg.getBBox();
        const extent = Math.max(box.width, box.height) / symbolSize;
        svg.setAttribute('viewBox', `${box.x + box.width / 2 - extent / 2} ${box.y + box.height / 2 - extent / 2} ${extent} ${extent}`);
      } else if (sourceIsWordmark(xml)) {
        const box = svg.getBBox();
        const padding = 4;
        svg.setAttribute('viewBox', `${box.x - padding} ${box.y - padding} ${box.width + padding * 2} ${box.height + padding * 2}`);
        height = Math.round(size * (box.height + padding * 2) / (box.width + padding * 2));
      }
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));
      main.style.cssText = `width:${width}px;height:${height}px;background:${background ?? 'transparent'}`;
      function sourceIsWordmark(value) { return value.includes('<text'); }
      return { width, height };
    }, { xml, size, background, symbolSize });
    const destination = path.join(output, filename);
    await page.locator('main').screenshot({ path: destination, omitBackground: !background });
    const bytes = await readFile(destination);
    assert.equal(bytes.readUInt32BE(16), dimensions.width);
    assert.equal(bytes.readUInt32BE(20), dimensions.height);
    await page.evaluate(async ({ base64, filename }) => {
      const image = new Image();
      image.src = `data:image/png;base64,${base64}`;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
      if (filename.startsWith('app-icon')) {
        for (let offset = 3; offset < data.length; offset += 4) {
          if (data[offset] !== 255) throw new Error(`${filename}: transparent launcher pixel`);
        }
      }
      if (filename.startsWith('adaptive-')) {
        if (data[3] !== 0) throw new Error(`${filename}: background is not transparent`);
        const radius = canvas.width * 66 / 108 / 2;
        for (let offset = 3; offset < data.length; offset += 4) {
          if (!data[offset]) continue;
          const pixel = (offset - 3) / 4;
          const x = pixel % canvas.width + 0.5 - canvas.width / 2;
          const y = Math.floor(pixel / canvas.width) + 0.5 - canvas.height / 2;
          if (Math.hypot(x, y) > radius) throw new Error(`${filename}: artwork outside adaptive safe circle`);
        }
      }
    }, { base64: bytes.toString('base64'), filename });
    console.log(`${filename}: ${dimensions.width}x${dimensions.height}`);
  }

  await exportPng('app-icon-dark.svg', 'app-icon.png', 1024, '#0E2F26');
  await exportPng('app-icon-light.svg', 'app-icon-light.png', 1024, '#F8F5ED');
  await exportPng('symbol-ivory-gold.svg', 'adaptive-foreground.png', 1024, null, 0.48);
  await exportPng('symbol-white.svg', 'adaptive-monochrome.png', 1024, null, 0.48);
  await exportPng('symbol-ivory-gold.svg', 'splash-symbol.png', 512, null, 0.72);
  await exportPng('app-icon-dark.svg', 'favicon.png', 64, '#0E2F26');
  for (const name of ['light-horizontal', 'dark-horizontal', 'light-stacked', 'dark-stacked']) {
    await exportPng(`wordmark-${name}.svg`, `wordmark-${name}.png`, 720);
  }

  const entries = [];
  for (const directory of ['logos', 'icons']) {
    for (const name of (await readdir(path.join(pack, directory))).sort()) {
      if (!name.endsWith('.svg')) continue;
      const xml = await readFile(path.join(pack, directory, name), 'utf8');
      entries.push({ name: `${directory}/${name}`, xml });
    }
  }
  assert.equal(entries.length, 59);
  await page.setContent(`<style>
    body{margin:0;padding:24px;background:#242424;color:#F8F5ED;font:12px sans-serif}
    main{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    article{background:#1A1A1A;border:1px solid #555;padding:12px}
    .samples{display:flex;margin-bottom:8px}
    .sample{width:50%;height:100px;display:flex;align-items:center;justify-content:center}
    .sample svg{max-width:96%;max-height:86px}
    .sample:first-child{background:#0E2F26}.sample:last-child{background:#F8F5ED}
  </style><h1>Bitebook supplied assets: dark and light background inspection</h1><main>${entries.map(({ name, xml }) =>
    `<article><div class="samples"><div class="sample">${xml}</div><div class="sample">${xml}</div></div>${name}</article>`).join('')}</main>`);
  assert.equal(await page.locator('article svg').count(), 118);
  await page.screenshot({ path: path.join(review, 'asset-pack.png'), fullPage: true });
  console.log(`All 59 source assets rendered on dark/light backgrounds. Review: ${review}`);
} finally {
  await browser.close();
}