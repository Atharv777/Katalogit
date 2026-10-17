import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'artifacts/review';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const findings = [];

for (const [name, width, height, reduced] of [
  ['desktop', 1440, 900, false],
  ['mobile', 390, 844, false],
  ['reduced', 1440, 900, true],
]) {
  const context = await browser.newContext({ viewport: { width, height }, reducedMotion: reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}/landing-${name}.png` });
  const title = await page.title();
  const heading = await page.locator('h1').first().innerText();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  const canvasCount = await page.locator('canvas').count();

  if (!reduced) {
    await page.locator('#explode').scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${out}/exploded-${name}.png` });
    await page.locator('#sheet').scrollIntoViewIfNeeded();
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${out}/catalog-${name}.png` });
    const demoButton = page.getByRole('button', { name: /explore.*demo|launch.*demo|open.*demo|try.*demo/i }).first();
    if (await demoButton.count()) {
      await demoButton.click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/workspace-${name}.png` });
    }
  }
  findings.push({ name, title, heading, overflow, canvasCount, errors });
  await context.close();
}

await writeFile(`${out}/findings.json`, JSON.stringify(findings, null, 2));
await browser.close();
console.log(JSON.stringify(findings, null, 2));
