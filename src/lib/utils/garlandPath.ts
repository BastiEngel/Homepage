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
 * Generate a winding-road garland path using a single continuous
 * Catmull-Rom spline. In the hero the line zigzags left→right→left
 * like switchbacks; below the hero it widens into gentle S-curves.
 * Because every waypoint goes through one spline, the transition
 * from hero to page body is perfectly smooth.
 */
export function generateGarlandPath(
	width: number,
	height: number,
	heroHeight: number
): string {
	const margin = width * 0.08;
	const left = margin;
	const right = width - margin;

	const allPoints: GarlandPoint[] = [];

	// --- Hero: winding road passes ---
	const passes = width >= 1024 ? 5 : width >= 640 ? 4 : 3;
	const topY = heroHeight * 0.12;
	const bottomY = heroHeight * 0.85;
	const passHeight = (bottomY - topY) / (passes - 1);

	for (let i = 0; i < passes; i++) {
		const y = topY + i * passHeight;
		const goRight = i % 2 === 0;

		if (i === 0) {
			allPoints.push({ x: left, y });
			allPoints.push({ x: (left + right) / 2, y });
			allPoints.push({ x: right, y });
		} else {
			allPoints.push({ x: goRight ? right : left, y });
		}
	}

	// --- Below hero: wider S-curves flowing from the last hero point ---
	const belowHeight = height - heroHeight;
	if (belowHeight > 200) {
		const curves = Math.max(2, Math.round(belowHeight / 800));
		const segH = belowHeight / curves;
		const lastHero = allPoints[allPoints.length - 1];
		const lastWasRight = lastHero.x > width / 2;

		for (let i = 0; i < curves; i++) {
			const y = heroHeight + (i + 1) * segH;
			const goLeft = (i % 2 === 0) === lastWasRight;
			const x = goLeft ? left + (right - left) * 0.2 : left + (right - left) * 0.8;
			allPoints.push({ x, y });
		}
	}

	return catmullRomToBezier(allPoints, 0.75);
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
