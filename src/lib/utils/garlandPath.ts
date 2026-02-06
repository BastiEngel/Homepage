import type { GarlandPoint } from '$lib/types';

/**
 * Convert a Catmull-Rom spline through a set of points to SVG cubic bezier commands.
 * Tension controls how tight the curves are (0 = straight, 1 = full Catmull-Rom).
 */
function catmullRomToBezier(points: GarlandPoint[], tension: number = 0.5): string {
	if (points.length < 2) return '';

	let d = `M ${points[0].x} ${points[0].y}`;

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[Math.min(points.length - 1, i + 2)];

		// Convert Catmull-Rom to cubic bezier control points
		const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
		const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
		const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
		const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

		d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
	}

	return d;
}

/**
 * Generate a garland path using Catmull-Rom splines.
 *
 * The hero portion creates draped catenary-like swoops by defining
 * alternating pin (high) and dip (low) points, then fitting a smooth
 * spline through them. After the hero, the path continues with
 * gentle S-curves down the page.
 */
export function generateGarlandPath(
	width: number,
	height: number,
	heroHeight: number
): string {
	const margin = width * 0.06;
	const usable = width - margin * 2;

	// --- Hero: define pin and dip points for the garland ---
	const swoops = width >= 1024 ? 5 : width >= 640 ? 3 : 2;
	const pinY = heroHeight * 0.2;
	const dipY = heroHeight * 0.55;
	const swoopW = usable / swoops;

	const heroPoints: GarlandPoint[] = [];

	for (let i = 0; i <= swoops; i++) {
		const x = margin + i * swoopW;
		// Pin point (top)
		heroPoints.push({ x, y: pinY });

		// Dip point (bottom) between this pin and the next
		if (i < swoops) {
			const dipX = x + swoopW * 0.5;
			heroPoints.push({ x: dipX, y: dipY });
		}
	}

	// Build the hero spline
	const heroPath = catmullRomToBezier(heroPoints, 0.7);

	// --- Below hero: S-curve waypoints ---
	const belowHeroHeight = height - heroHeight;
	if (belowHeroHeight <= 200) return heroPath;

	const curves = Math.max(2, Math.round(belowHeroHeight / 800));
	const segH = belowHeroHeight / curves;
	const lastHero = heroPoints[heroPoints.length - 1];

	const belowPoints: GarlandPoint[] = [{ x: lastHero.x, y: lastHero.y }];

	for (let i = 0; i < curves; i++) {
		const y = heroHeight + (i + 1) * segH;
		const goLeft = i % 2 === 0;
		const x = goLeft ? margin + usable * 0.2 : margin + usable * 0.8;
		belowPoints.push({ x, y });
	}

	const belowPath = catmullRomToBezier(belowPoints, 0.6);
	// Strip the initial M command from the below path and append
	const belowCommands = belowPath.replace(/^M\s*[\d.]+\s*[\d.]+\s*/, '');

	return heroPath + ' ' + belowCommands;
}

/**
 * Sample points at the bottom of each catenary swoop — these are where tags hang.
 */
export function samplePointsAlongPath(
	pathElement: SVGPathElement,
	count: number,
	heroHeight: number
): GarlandPoint[] {
	const totalLength = pathElement.getTotalLength();
	const points: GarlandPoint[] = [];

	// Walk the path densely and find the dip points (local y-maxima) within the hero
	const samples = 300;
	const ys: { x: number; y: number; i: number }[] = [];

	for (let i = 0; i <= samples; i++) {
		const dist = (i / samples) * totalLength;
		const pt = pathElement.getPointAtLength(dist);
		if (pt.y <= heroHeight * 0.9) {
			ys.push({ x: pt.x, y: pt.y, i });
		}
	}

	// Find local maxima (dips) — points where y is greater than both neighbors
	const dips: GarlandPoint[] = [];
	for (let i = 3; i < ys.length - 3; i++) {
		if (
			ys[i].y > ys[i - 1].y &&
			ys[i].y > ys[i + 1].y &&
			ys[i].y > ys[i - 2].y &&
			ys[i].y > ys[i + 2].y
		) {
			// Only keep if far enough from the last dip (avoid duplicates)
			const last = dips[dips.length - 1];
			if (!last || Math.abs(ys[i].x - last.x) > 50) {
				dips.push({ x: ys[i].x, y: ys[i].y });
			}
		}
	}

	if (dips.length === 0) return points;
	if (dips.length <= count) return dips;

	// Pick evenly spaced dips
	const step = dips.length / count;
	for (let i = 0; i < count; i++) {
		points.push(dips[Math.round(i * step)]);
	}

	return points;
}

/**
 * Get total length of an SVG path.
 */
export function getPathLength(pathElement: SVGPathElement): number {
	return pathElement.getTotalLength();
}
