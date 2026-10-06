import puppeteer from 'puppeteer';

const URL = process.argv[2] || 'http://localhost:5174/projects/peebee';
const OUT = process.argv[3] || 'screenshot.png';

const browser = await puppeteer.launch({ headless: true });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

// Wait for all images to finish loading
await page.evaluate(() =>
	Promise.all(
		Array.from(document.images).map(img =>
			img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; })
		)
	)
);

await page.screenshot({ path: OUT, fullPage: true });
await browser.close();
console.log(`Screenshot gespeichert: ${OUT}`);
