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

	// Sample path densely
	const sampleCount = 500;
	const pathPts: { x: number; y: number; dist: number }[] = [];
	for (let i = 0; i <= sampleCount; i++) {
		const dist = (i / sampleCount) * heroLength;
		const pt = pathElement.getPointAtLength(dist);
		pathPts.push({ x: pt.x, y: pt.y, dist });
	}

	// Detect zigzag rows by finding where X direction reverses
	type Row = typeof pathPts;
	const rows: Row[] = [[]];
	for (let i = 0; i < pathPts.length; i++) {
		rows[rows.length - 1].push(pathPts[i]);
		if (i >= 2) {
			const prevDx = pathPts[i - 1].x - pathPts[i - 2].x;
			const currDx = pathPts[i].x - pathPts[i - 1].x;
			if (prevDx * currDx < 0 && Math.abs(prevDx) > 0.5) {
				rows.push([pathPts[i]]);
			}
		}
	}

	// X range
	const allXs = pathPts.map((p) => p.x);
	const minX = Math.min(...allXs);
	const maxX = Math.max(...allXs);

	// Pick `count` evenly-spaced columns
	const cols: number[] = [];
	for (let i = 0; i < count; i++) {
		cols.push(minX + ((i + 1) / (count + 1)) * (maxX - minX));
	}

	// Scatter column assignments: stride of 2 avoids diagonal
	// e.g. for 5: row 0→col 0, row 1→col 2, row 2→col 4, row 3→col 1, row 4→col 3
	const colOrder: number[] = [];
	let ci = 0;
	while (colOrder.length < count) {
		if (!colOrder.includes(ci % count)) colOrder.push(ci % count);
		ci += 2;
	}

	// One tag per row, at the scattered column X
	const points: GarlandPoint[] = [];
	for (let i = 0; i < count; i++) {
		const row = rows[i % rows.length];
		const targetX = cols[colOrder[i]];

		let best = row[Math.floor(row.length / 2)];
		let bestDiff = Infinity;
		for (const s of row) {
			const diff = Math.abs(s.x - targetX);
			if (diff < bestDiff) {
				bestDiff = diff;
				best = s;
			}
		}
		// Compute tangent angle at this point
		const delta = heroLength * 0.002;
		const ptA = pathElement.getPointAtLength(Math.max(0, best.dist - delta));
		const ptB = pathElement.getPointAtLength(Math.min(heroLength, best.dist + delta));
		const angle = Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x) * (180 / Math.PI);

		points.push({ x: best.x, y: best.y, angle });
	}

	return points;
}

/**
 * Detect nob/loop points along a custom SVG path.
 * Nobs are local Y minima (upward bumps) where keychains attach.
 */
export function sampleNobPoints(
	pathElement: SVGPathElement,
	maxLength: number
): GarlandPoint[] {
	const totalLength = pathElement.getTotalLength();
	const sampleLen = Math.min(maxLength, totalLength);

	// Dense sampling
	const steps = 2000;
	const samples: { x: number; y: number; dist: number }[] = [];
	for (let i = 0; i <= steps; i++) {
		const dist = (i / steps) * sampleLen;
		const pt = pathElement.getPointAtLength(dist);
		samples.push({ x: pt.x, y: pt.y, dist });
	}

	// Find local Y minima (nob apexes — path goes UP then DOWN)
	const minima: typeof samples = [];
	const window = 20;
	for (let i = window; i < samples.length - window; i++) {
		let isMin = true;
		for (let j = i - window; j <= i + window; j++) {
			if (j !== i && samples[j].y < samples[i].y) {
				isMin = false;
				break;
			}
		}
		if (!isMin) continue;

		// Check significance: the nob should dip well below surrounding baseline
		let maxY = samples[i].y;
		const wide = 60;
		for (let j = Math.max(0, i - wide); j <= Math.min(samples.length - 1, i + wide); j++) {
			if (samples[j].y > maxY) maxY = samples[j].y;
		}
		if (maxY - samples[i].y > 15) {
			minima.push(samples[i]);
		}
	}

	// Merge nearby minima (keep the one with lowest Y)
	const merged: typeof samples = [];
	const minDist = sampleLen * 0.015;
	for (const m of minima) {
		if (merged.length === 0 || m.dist - merged[merged.length - 1].dist > minDist) {
			merged.push(m);
		} else if (m.y < merged[merged.length - 1].y) {
			merged[merged.length - 1] = m;
		}
	}

	// Convert to GarlandPoints with tangent angles
	return merged.map((m) => {
		const delta = sampleLen * 0.002;
		const ptA = pathElement.getPointAtLength(Math.max(0, m.dist - delta));
		const ptB = pathElement.getPointAtLength(Math.min(sampleLen, m.dist + delta));
		const angle = Math.atan2(ptB.y - ptA.y, ptB.x - ptA.x) * (180 / Math.PI);
		return { x: m.x, y: m.y, angle };
	});
}

/**
 * Get total length of an SVG path.
 */
export function getPathLength(pathElement: SVGPathElement): number {
	return pathElement.getTotalLength();
}
