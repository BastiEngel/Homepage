import type { GarlandPoint } from '$lib/types';

/**
 * Convert a Catmull-Rom spline through points into SVG cubic bezier commands.
 */
function catmullRomToBezier(points: GarlandPoint[], tension: number = 0.5): string {
	if (points.length < 2) return '';

	let d = `M ${points[0].x} ${points[0].y}`;

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[Math.min(points.length - 1, i + 2)];

		const cp1x = p1.x + (p2.x - p0.x) * tension / 3;
		const cp1y = p1.y + (p2.y - p0.y) * tension / 3;
		const cp2x = p2.x - (p3.x - p1.x) * tension / 3;
		const cp2y = p2.y - (p3.y - p1.y) * tension / 3;

		d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
	}

	return d;
}

/**
 * Generate a winding-road garland path using Catmull-Rom splines.
 *
 * In the hero, the line zigzags horizontally — left to right, then right
 * to left, like switchbacks on a mountain road. After the hero it
 * continues with gentle S-curves down the page.
 */
export function generateGarlandPath(
	width: number,
	height: number,
	heroHeight: number
): string {
	const margin = width * 0.08;
	const left = margin;
	const right = width - margin;

	// --- Hero: winding road passes ---
	const passes = width >= 1024 ? 5 : width >= 640 ? 4 : 3;
	const topY = heroHeight * 0.12;
	const bottomY = heroHeight * 0.85;
	const passHeight = (bottomY - topY) / (passes - 1);

	const heroPoints: GarlandPoint[] = [];

	for (let i = 0; i < passes; i++) {
		const y = topY + i * passHeight;
		const goRight = i % 2 === 0;

		if (i === 0) {
			// First pass: start from the left
			heroPoints.push({ x: left, y });
			heroPoints.push({ x: (left + right) / 2, y });
			heroPoints.push({ x: right, y });
		} else {
			// Subsequent passes: just the endpoint on the opposite side
			heroPoints.push({ x: goRight ? right : left, y });
		}
	}

	const heroPath = catmullRomToBezier(heroPoints, 0.8);

	// --- Below hero: gentle S-curves ---
	const belowHeight = height - heroHeight;
	if (belowHeight <= 200) return heroPath;

	const curves = Math.max(2, Math.round(belowHeight / 800));
	const segH = belowHeight / curves;
	const lastHero = heroPoints[heroPoints.length - 1];

	const belowPoints: GarlandPoint[] = [{ x: lastHero.x, y: lastHero.y }];

	for (let i = 0; i < curves; i++) {
		const y = heroHeight + (i + 1) * segH;
		const goLeft = i % 2 === 0;
		const x = goLeft ? left + (right - left) * 0.2 : left + (right - left) * 0.8;
		belowPoints.push({ x, y });
	}

	const belowPath = catmullRomToBezier(belowPoints, 0.6);
	const belowCommands = belowPath.replace(/^M\s*[\d.]+\s*[\d.]+\s*/, '');

	return heroPath + ' ' + belowCommands;
}

/**
 * Sample evenly-spaced points along the hero portion of the path.
 * Tags sit directly on the line.
 */
export function samplePointsAlongPath(
	pathElement: SVGPathElement,
	count: number,
	heroHeight: number
): GarlandPoint[] {
	const totalLength = pathElement.getTotalLength();

	// Find where the path exits the hero
	let heroLength = totalLength;
	for (let i = 0; i <= 200; i++) {
		const dist = (i / 200) * totalLength;
		const pt = pathElement.getPointAtLength(dist);
		if (pt.y > heroHeight) {
			heroLength = dist;
			break;
		}
	}

	const points: GarlandPoint[] = [];
	for (let i = 0; i < count; i++) {
		// Distribute evenly along the hero portion with padding
		const t = (i + 0.5) / count;
		const dist = t * heroLength;
		const pt = pathElement.getPointAtLength(dist);
		points.push({ x: pt.x, y: pt.y });
	}

	return points;
}

/**
 * Get total length of an SVG path.
 */
export function getPathLength(pathElement: SVGPathElement): number {
	return pathElement.getTotalLength();
}
