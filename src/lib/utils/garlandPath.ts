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

// Start point of the SVG path in original coordinates
const SVG_START_X = 1.76;
const SVG_START_Y = 18.03;

// Entry tangent direction (first control point of first bezier)
const SVG_ENTRY_TANGENT_X = 66.2;
const SVG_ENTRY_TANGENT_Y = 89.05;

// Bezier commands only (without the M command), extracted from Path_02.svg
// minus the final decorative curl segment that reverses direction.
const SVG_BEZIERS =
	'c66.2,89.05,143.83,169,232.72,235.56,78.28,58.61,164.93,106.03,257,139.13,' +
	'81.98,29.47,169.37,48.05,256.63,50.24,90.93,2.29,177.21-25.8,259.53-61.85,' +
	'69.96-30.63,139.37-69.8,215.51-82.74,33.13-5.63,68.13-4.28,100.79,6.02,' +
	'36.84,11.62,70,33.82,98.17,59.93,53.3,49.38,85.77,114.94,99.46,185.86,' +
	'15.1,78.28,7.95,160.45-9.82,237.88-20.8,90.66-56.46,177.54-100.98,259.04,' +
	'-47.88,87.65-106.25,169.6-173.25,243.65-16.32,18.04-33.17,35.6-50.5,52.67';

const SVG_VIEWBOX_W = 1553.64;

// Endpoint of the outgoing contour in original SVG coordinates
const SVG_END_X = 1187.02;
const SVG_END_Y = 1343.42;

// Exit tangent of the SVG path (last cp2 → last endpoint, relative coords)
// Last bezier: cp2_rel=(-33.17, 35.6), end_rel=(-50.5, 52.67)
const SVG_END_TANGENT_X = -50.5 - -33.17; // -17.33 (heading left)
const SVG_END_TANGENT_Y = 52.67 - 35.6; // 17.07 (heading down)

/**
 * Scale every coordinate in an SVG path string by a uniform factor.
 * Works for M, m, c, C, l, L, h, H, v, V commands since all numbers
 * are simply multiplied by the same scale.
 */
function scalePath(d: string, s: number): string {
	return d.replace(/-?\d*\.?\d+/g, (match) => {
		return (parseFloat(match) * s).toFixed(2);
	});
}

/**
 * Generate the garland path by scaling the designer-provided SVG shape
 * to fit the viewport width, then extending it with S-curves to reach
 * the bottom of the page.
 */
export function generateGarlandPath(
	width: number,
	height: number,
	heroHeight: number
): string {
	const scale = width / SVG_VIEWBOX_W;

	// Extend backward along entry tangent so the start is off-screen
	const startX = SVG_START_X * scale;
	const startY = SVG_START_Y * scale;
	const entryLen = Math.sqrt(SVG_ENTRY_TANGENT_X ** 2 + SVG_ENTRY_TANGENT_Y ** 2);
	const leadIn = 200;
	const offX = startX - (SVG_ENTRY_TANGENT_X / entryLen) * leadIn;
	const offY = startY - (SVG_ENTRY_TANGENT_Y / entryLen) * leadIn;

	let path =
		`M ${offX.toFixed(2)} ${offY.toFixed(2)} L ${startX.toFixed(2)} ${startY.toFixed(2)} ` +
		scalePath(SVG_BEZIERS, scale);

	// Extend below the SVG path endpoint with S-curves
	const endX = SVG_END_X * scale;
	const endY = SVG_END_Y * scale;
	const remaining = height - endY;

	if (remaining > 200) {
		const margin = width * 0.08;
		const left = margin + (width - 2 * margin) * 0.2;
		const right = margin + (width - 2 * margin) * 0.8;
		const curves = Math.max(2, Math.round(remaining / 800));
		const segH = remaining / curves;

		let currentX = endX;
		// Endpoint is on the right side, so first curve goes left
		let goLeft = true;

		// Normalized exit tangent of the SVG path
		const tangentMag = Math.sqrt(SVG_END_TANGENT_X ** 2 + SVG_END_TANGENT_Y ** 2);
		const tnx = SVG_END_TANGENT_X / tangentMag;
		const tny = SVG_END_TANGENT_Y / tangentMag;

		for (let i = 0; i < curves; i++) {
			const targetX = goLeft ? left : right;
			const dx = targetX - currentX;
			const dy = segH;
			if (i === 0) {
				// Smooth join: cp1 follows SVG exit tangent direction, scaled to segment size
				const cp1x = tnx * (dy / 3);
				const cp1y = tny * (dy / 3);
				path += ` c ${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${dx.toFixed(2)},${((dy * 2) / 3).toFixed(2)} ${dx.toFixed(2)},${dy.toFixed(2)}`;
			} else {
				// S-curve: ease out vertically, ease into target x
				path += ` c 0,${(dy / 3).toFixed(2)} ${dx.toFixed(2)},${((dy * 2) / 3).toFixed(2)} ${dx.toFixed(2)},${dy.toFixed(2)}`;
			}
			currentX = targetX;
			goLeft = !goLeft;
		}
	}

	return path;
}

/**
 * Sample points at the first valley (local y-maximum) of the path,
 * fanned out like keys on a keychain ring.
 */
export function sampleFanPoints(
	pathElement: SVGPathElement,
	count: number,
	heroHeight: number
): GarlandPoint[] {
	const totalLength = pathElement.getTotalLength();

	// Sample densely to find the first local maximum of y (the valley dip)
	let valleyDist = 0;
	let prevY = 0;
	let rising = true;

	for (let i = 1; i <= 500; i++) {
		const dist = (i / 500) * totalLength;
		const pt = pathElement.getPointAtLength(dist);

		if (pt.y > heroHeight) break;

		if (rising && pt.y < prevY && i > 20) {
			// y just started decreasing → previous sample was the valley
			valleyDist = ((i - 1) / 500) * totalLength;
			break;
		}

		rising = pt.y >= prevY;
		prevY = pt.y;
	}

	// Spread anchor points along the path around the valley
	const anchorSpread = totalLength * 0.006; // distance along path between each tag
	const totalAnchorSpan = anchorSpread * (count - 1);
	const startDist = valleyDist - totalAnchorSpan / 2;

	// Fan angles: spread evenly around center, keep ~80° total regardless of count
	const fanStep = count > 1 ? 80 / (count - 1) : 0;
	const totalFanSpread = fanStep * (count - 1);
	const startAngle = totalFanSpread / 2;

	const delta = totalLength * 0.002;
	const points: GarlandPoint[] = [];
	for (let i = 0; i < count; i++) {
		const dist = Math.max(0, Math.min(totalLength, startDist + i * anchorSpread));
		const pt = pathElement.getPointAtLength(dist);

		const ptA = pathElement.getPointAtLength(Math.max(0, dist - delta));
		const ptB = pathElement.getPointAtLength(Math.min(totalLength, dist + delta));
		const angle = Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x) * (180 / Math.PI);

		const fanAngle = startAngle - i * fanStep;
		points.push({ x: pt.x, y: pt.y, angle, fanAngle });
	}

	return points;
}

/**
 * Get total length of an SVG path.
 */
export function getPathLength(pathElement: SVGPathElement): number {
	return pathElement.getTotalLength();
}
