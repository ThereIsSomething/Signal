const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function capture() {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  const routes = [
    { url: 'http://localhost:3000/', name: 'dashboard_redesigned' },
    { url: 'http://localhost:3000/documents', name: 'documents_redesigned' },
    { url: 'http://localhost:3000/benchmarks', name: 'benchmarks_redesigned' },
    { url: 'http://localhost:3000/tests', name: 'tests_redesigned' },
  ];

  const artifactsDir = 'C:\\Users\\nitis\\.gemini\\antigravity-ide\\brain\\e00b9d20-18cb-4d7d-a775-b28f46e8aa2e';

  for (const r of routes) {
    try {
      console.log(`Navigating to ${r.url}...`);
      await page.goto(r.url, { waitUntil: 'networkidle2' });
      const outputPath = path.join(artifactsDir, `${r.name}_${Date.now()}.png`);
      await page.screenshot({ path: outputPath, fullPage: true });
      console.log(`Screenshot saved to ${outputPath}`);
    } catch (e) {
      console.error(`Failed to capture ${r.url}:`, e);
    }
  }

  await browser.close();
}

capture();
