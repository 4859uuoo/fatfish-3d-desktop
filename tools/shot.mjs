import fs from 'node:fs';
import puppeteer from 'puppeteer-core';

/**
 * 用真实等待替代 --virtual-time-budget 截图。
 * 用法: node tools/shot.mjs <url> <outPath> [readyExpr] [timeoutMs] [width] [height]
 */
const [, , url, out, readyExpr = 'window.__READY__ === true', timeoutArg = '45000', wArg = '1600', hArg = '900'] = process.argv;

const timeout = Number(timeoutArg);
const width = Number(wArg);
const height = Number(hArg);

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: [
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    '--hide-scrollbars',
    '--no-sandbox',
    `--window-size=${width},${height}`,
  ],
  defaultViewport: { width, height, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

let ready = false;
try {
  await page.waitForFunction(readyExpr, { timeout, polling: 250 });
  ready = true;
} catch {
  ready = false;
}

// 让渲染多跑几帧
await new Promise((r) => setTimeout(r, 1200));
await page.screenshot({ path: out });
await browser.close();

console.log('READY:', ready);
if (logs.length) {
  console.log('--- console ---');
  console.log(logs.slice(-40).join('\n'));
}
