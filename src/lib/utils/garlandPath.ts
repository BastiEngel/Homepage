import type { GarlandPoint } from '$lib/types';

// Start point of the SVG path in original coordinates
const SVG_START_X = 272.04;
const SVG_START_Y = 18;

// Entry tangent direction (first control point of first bezier)
const SVG_ENTRY_TANGENT_X = 119.74;
const SVG_ENTRY_TANGENT_Y = 151.96;

// Bezier commands only (without the M command), extracted from Path_03.svg
// outgoing contour of the first cls-5 path (82 segments).
const SVG_BEZIERS =
	'c119.74,151.96,273.6,275.52,452.59,350.48,152.09,63.7,328.63,99.24,490.89,56.41,' +
	'75.82,-20.01,146.43,-54.09,218.45,-84.34,63.35,-26.61,133.51,-53.29,203.43,-41.95,' +
	'73.52,11.92,140.25,65.09,184.76,122.84,52.41,67.99,70.88,152.09,63.69,236.71,' +
	'-14.51,170.7,-114.21,346.72,-265.81,430.76,-146.85,81.4,-320.54,53.43,-480.31,41.48,' +
	'-86.43,-6.46,-174.1,-2.68,-260,8.41,-83.71,10.81,-161.24,41.73,-243.62,57.27,' +
	'-88.36,16.66,-193.31,5.98,-272.11,-39.3,-38.98,-22.4,-73.56,-58.17,-70.42,-106.15,' +
	'2.95,-45.03,33.26,-88.29,78.85,-96.98,69.21,-13.19,172.28,34.12,172.02,113.71,' +
	'-0.21,64.08,-46.22,125.83,-78.27,178.14,-31.64,51.66,-70.78,109.09,-75,171.45,' +
	'-4.17,61.69,37.48,103.94,93.27,122,65.43,21.18,178.26,26.01,158.82,125.21,' +
	'-11.68,59.59,-58.35,120.62,-10.58,177.01,58.42,68.97,186.91,58.94,266.95,56.83,' +
	'128.93,-3.4,258.07,-19.01,387.13,-12.32,49.29,2.56,103.8,7.24,148.26,30.7,' +
	'16.33,8.62,31.34,19.95,40.81,36.11,20.43,34.84,4.77,75.36,-3.95,111.26,' +
	'-19.29,79.46,-2.48,155.65,70.19,201.76,61.21,38.84,150.63,35.37,200.71,91.08,' +
	'49.35,54.9,48.46,171.75,-12.93,218.32,-33.08,25.1,-80.1,21.53,-118.96,18.05,' +
	'-70.15,-6.28,-139.62,-20.38,-209.34,-30.11,-100.35,-14.01,-201.19,-23.38,-302.5,-26.35,' +
	'-195.55,-5.74,-385.74,18.38,-568.86,89.23,-70.55,27.3,-146.75,63.54,-188.15,130.15,' +
	'-40.8,65.64,-33.82,157.78,11.95,219.24,54.49,73.18,129.78,53.91,207.31,41.78,' +
	'47.93,-7.5,98.8,1.05,125.56,45.48,21.69,36.01,30.82,78.36,52.53,114.7,' +
	'77.22,129.21,229.1,187.61,372.1,205.22,71.03,8.75,142.3,4.77,212.52,-8.69,' +
	'72.6,-13.92,145.82,-41.48,220.75,-34.42,64.43,6.07,143.53,41.08,170.19,104.25,' +
	'18.01,42.68,19.49,99.83,-9.32,137.98,-27.58,36.51,-74.12,56.35,-103.9,92.22,' +
	'-25.83,31.11,-42.54,66.13,-51.96,105.33,-8.42,35.05,-12.53,71.32,-45.6,92.52,' +
	'-28.77,18.45,-64.39,13.18,-96.11,7.18,-37.76,-7.14,-75.12,-16.13,-113.53,-19.28,' +
	'-77.35,-6.35,-164.75,11.51,-221.68,67.44,-22.94,22.54,-42.09,47.95,-67.53,68.02,' +
	'-39.99,31.56,-88.27,55.79,-137.19,69.86,-77.28,22.22,-157.63,20.17,-233.74,49.02,' +
	'-72.34,27.42,-149.35,63.56,-206.94,116.18,-58.51,53.45,-82.31,128.39,-56.91,204.81,' +
	'22.3,67.08,79.23,135.45,154.94,138.55,60.89,2.49,113.09,-41.67,167.53,-62.29,' +
	'81.05,-30.69,170.93,-29.65,253.09,-3.33,47.88,15.34,91.55,40.03,124.93,78.05,' +
	'23.64,26.93,41.04,58.62,62.61,87.13,50.33,66.55,124.29,107.85,207.33,117.26,' +
	'81.67,9.26,178.51,-26.42,255.23,11.02,58.18,28.39,99.09,96.32,101.35,160.07,' +
	'1.39,39.23,-7.62,79.92,-28.54,113.36,-29.01,46.36,-72.66,56.07,-118,78.88,' +
	'-40.33,20.28,-73.69,55.15,-92.18,96.28,-18.16,40.4,-24.91,81.96,-58.53,113.96,' +
	'-62.67,59.66,-165.26,63.47,-243.53,90.99,-75.44,26.52,-141.95,70.3,-192.75,132.41,' +
	'-82.63,101.02,-120.56,252.52,-246.66,311.06,-106.84,49.6,-273.65,46.15,-357.13,-43.3,' +
	'-56.24,-60.27,-74.62,-157.89,-51.4,-235.98,27.3,-91.82,116.27,-121.13,203.98,-104.17,' +
	'83.34,16.12,162.15,64.92,200.98,142.02,35.07,69.63,36.56,151.2,34.96,227.45,' +
	'-2.3,109.4,-32.86,283.82,86.06,346.77,55.3,29.27,120.2,18,177.16,0.16,' +
	'69.89,-21.89,136,-54.5,206.66,-74.17,70.66,-19.67,153.85,-24.43,213.58,28.8,' +
	'25.74,22.94,39.87,53.89,56.34,83.5,19.84,35.67,43.96,68.17,74.43,95.53,' +
	'36.26,32.57,77.93,59.13,122.77,78.2,37.1,15.77,76.23,24.22,113.92,38.06,' +
	'86.49,31.75,108.11,114.33,104.58,198.71,-8,190.91,-59.89,382.69,-146.69,552.33';

const SVG_VIEWBOX_W = 2176.29;

// Endpoint of the outgoing contour in original SVG coordinates
const SVG_END_X = 1757.57;
const SVG_END_Y = 7232.02;

// Exit tangent of the SVG path (last cp2 → last endpoint, relative coords)
// Last bezier: cp2_rel=(-59.89, 382.69), end_rel=(-146.69, 552.33)
const SVG_END_TANGENT_X = -146.69 - -59.89; // -86.8 (heading left)
const SVG_END_TANGENT_Y = 552.33 - 382.69; // 169.64 (heading down)

/**
 * Scale coordinates in an SVG relative cubic bezier string (c commands).
 * Numbers alternate: x,y,x,y,x,y per segment, so even indices get sx, odd get sy.
 */
function scalePath(d: string, sx: number, sy: number = sx): string {
	let idx = 0;
	return d.replace(/-?\d*\.?\d+/g, (match) => {
		const s = idx % 2 === 0 ? sx : sy;
		idx++;
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
	const vwScale = Math.min(1, width / 1440);

	// Extend backward along entry tangent so the start is off-screen
	const startX = SVG_START_X * scale;
	const startY = SVG_START_Y * scale;
	const entryLen = Math.sqrt(SVG_ENTRY_TANGENT_X ** 2 + SVG_ENTRY_TANGENT_Y ** 2);
	const leadIn = 200;
	const offX = startX - (SVG_ENTRY_TANGENT_X / entryLen) * leadIn;
	const offY = startY - (SVG_ENTRY_TANGENT_Y / entryLen) * leadIn;

	// More Y stretch on narrow viewports to keep path reaching bottom
	const yStretch = 1.08 + (1 - vwScale) * 0.12;
	let path =
		`M ${offX.toFixed(2)} ${offY.toFixed(2)} L ${startX.toFixed(2)} ${startY.toFixed(2)} ` +
		scalePath(SVG_BEZIERS, scale, scale * yStretch);

	// Extend below the SVG path endpoint with S-curves
	const endX = SVG_END_X * scale;
	const endY = SVG_END_Y * scale * yStretch;
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
	heroHeight: number,
	viewportWidth: number = 1440
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

	// Spread anchor points along the path around the valley, scaled with viewport
	const vwScale = Math.min(1, viewportWidth / 1440);
	const anchorSpread = totalLength * 0.004 * Math.max(0.5, vwScale);
	const totalAnchorSpan = anchorSpread * (count - 1);
	const startDist = valleyDist - totalAnchorSpan / 2;

	// Fan angles: spread evenly around center, fixed regardless of viewport
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
