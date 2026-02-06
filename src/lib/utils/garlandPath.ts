import type { GarlandPoint } from '$lib/types';

/**
 * Generate a smooth S-curve SVG path that flows vertically through the page.
 * The first curve stays within the hero viewport, then the path weaves
 * left-to-right creating gentle curves down the page.
 */
export function generateGarlandPath(
	width: number,
	height: number,
	curves: number = 6
): string {
	const margin = width * 0.1;
	const usableWidth = width - margin * 2;
	const segmentHeight = height / curves;

	// Start near top-left area of the hero
	const startX = margin + usableWidth * 0.2;
	let d = `M ${startX} 80`;

	for (let i = 0; i < curves; i++) {
		const y1 = 80 + i * segmentHeight;
		const y2 = 80 + (i + 1) * segmentHeight;
		const midY = (y1 + y2) / 2;

		// Alternate between right and left
		const goRight = i % 2 === 0;
		const peakX = goRight ? margin + usableWidth * 0.85 : margin + usableWidth * 0.15;
		const endX = goRight ? margin + usableWidth * 0.3 : margin + usableWidth * 0.7;

		d += ` C ${peakX} ${midY - segmentHeight * 0.15}, ${peakX} ${midY + segmentHeight * 0.15}, ${endX} ${y2}`;
	}

	return d;
}

/**
 * Sample evenly-spaced points along an SVG path, within the hero viewport.
 * Points are placed in the first portion of the path so tags hang in the hero area.
 */
export function samplePointsAlongPath(
	pathElement: SVGPathElement,
	count: number
): GarlandPoint[] {
	const totalLength = pathElement.getTotalLength();
	const points: GarlandPoint[] = [];

	// We want points distributed within roughly the hero area.
	// Sample within the first ~20% of the total path length.
	const heroFraction = 0.2;

	for (let i = 0; i < count; i++) {
		// Spread points evenly, with padding at start/end
		const t = (i + 1) / (count + 1);
		const distance = t * totalLength * heroFraction;
		const point = pathElement.getPointAtLength(distance);
		points.push({ x: point.x, y: point.y });
	}

	return points;
}

/**
 * Get total length of an SVG path.
 */
export function getPathLength(pathElement: SVGPathElement): number {
	return pathElement.getTotalLength();
}
