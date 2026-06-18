const puppeteer = require('puppeteer');
const path = require('path');

async function generatePDF() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  const filePath = path.resolve(__dirname, 'sample_data/acme_10k.html');
  await page.goto(`file://${filePath}`, { waitUntil: 'networkidle0' });
  await page.pdf({ path: 'sample_data/ACME_10K_2023.pdf', format: 'A4' });
  await browser.close();
  console.log('PDF generated at sample_data/ACME_10K_2023.pdf');
}

generatePDF();
