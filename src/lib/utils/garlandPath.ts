import type { GarlandPoint } from '$lib/types';

/**
 * Generate a smooth S-curve SVG path that flows vertically through the page.
 * The path weaves left-to-right creating gentle curves.
 */
export function generateGarlandPath(
	width: number,
	height: number,
	curves: number = 6
): string {
	const margin = width * 0.15;
	const usableWidth = width - margin * 2;
	const segmentHeight = height / curves;

	let d = `M ${margin + usableWidth * 0.5} 0`;

	for (let i = 0; i < curves; i++) {
		const y1 = i * segmentHeight;
		const y2 = (i + 1) * segmentHeight;
		const midY = (y1 + y2) / 2;

		// Alternate between left and right
		const goRight = i % 2 === 0;
		const peakX = goRight ? margin + usableWidth * 0.85 : margin + usableWidth * 0.15;
		const endX =
			i === curves - 1
				? margin + usableWidth * 0.5
				: (i + 1) % 2 === 0
					? margin + usableWidth * 0.5
					: margin + usableWidth * 0.5;

		d += ` C ${peakX} ${midY - segmentHeight * 0.1}, ${peakX} ${midY + segmentHeight * 0.1}, ${endX} ${y2}`;
	}

	return d;
}

/**
 * Sample evenly-spaced points along an SVG path.
 */
export function samplePointsAlongPath(
	pathElement: SVGPathElement,
	count: number
): GarlandPoint[] {
	const totalLength = pathElement.getTotalLength();
	const points: GarlandPoint[] = [];

	for (let i = 0; i < count; i++) {
		// Distribute points in the first ~40% of the path (hero area)
		const fraction = (i + 0.5) / count;
		const distance = fraction * totalLength * 0.35;
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
