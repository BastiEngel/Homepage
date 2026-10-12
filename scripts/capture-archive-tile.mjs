// Captures a screenshot of the Archive timeline's initial view (before any
// scrolling) and saves it as the homepage tile image for the "Archive"
// project, so that tile always reflects the current state of the archive
// instead of a manually maintained static image.
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const URL = process.argv[2] || 'http://localhost:5173/archive';
const OUT = process.argv[3] || 'static/images/projects/Archive/archive-live-tile.webp';

mkdirSync(dirname(OUT), { recursive: true });

const browser = await puppeteer.launch({
	headless: true,
	args: ['--no-sandbox', '--disable-setuid-sandbox']
});
const page = await browser.newPage();
await page.setViewport({ width: 2048, height: 1365, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 });

// Wait for all images (keytag ring, polaroid photos) to finish loading
// before capturing, so the tile doesn't show blank/half-loaded cards.
await page.evaluate(() =>
	Promise.all(
		Array.from(document.images).map((img) =>
			img.complete ? Promise.resolve() : new Promise((r) => { img.onload = img.onerror = r; })
		)
	)
);

// Hide the fixed nav bar so the tile shows just the archive timeline itself.
await page.evaluate(() => {
	document.querySelector('.nav-bar')?.style.setProperty('display', 'none');
});

await page.screenshot({ path: OUT, type: 'webp' });
await browser.close();
console.log(`Archive tile screenshot saved: ${OUT}`);
