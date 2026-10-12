// Procedurally generated, irregularly wavy horizontal path for the Archive
// timeline. Unlike garlandPath.ts (one hand-authored designer SVG), this path
// is generated at runtime to span an arbitrary number of screen-widths.

export interface ArchiveAnchor {
	x: number;
	y: number;
}

export interface ArchivePathResult {
	d: string;
	totalWidth: number;
	valleys: ArchiveAnchor[];
}

// Deterministic pseudo-random generator (mulberry32) so the wave shape is
// stable across reloads instead of reshuffling every time.
function mulberry32(seed: number) {
	let a = seed;
	return function () {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Generates a horizontal wavy path `screenCount` viewport-widths long.
 * The wave is irregular: each segment's amplitude and direction is perturbed
 * by a seeded random factor so the undulation doesn't look mechanically
 * periodic.
 */
export function generateArchivePath(
	viewportWidth: number,
	viewportHeight: number,
	screenCount: number = 15
): ArchivePathResult {
	const totalWidth = viewportWidth * screenCount;
	const rand = mulberry32(1337);

	// More control points per screen-width = tighter, more frequent waves —
	// also raised so the finer oscillation term below has enough samples
	// per cycle to resolve cleanly (an under-sampled sine aliases instead
	// of producing a real, detectable extremum every cycle).
	const segmentsPerScreen = 38;
	const segmentCount = Math.max(4, Math.round(screenCount * segmentsPerScreen));
	const segmentWidth = totalWidth / segmentCount;

	// Keep the path within the upper quarter of the screen.
	const midY = viewportHeight * 0.2;
	const maxAmplitude = viewportHeight * 0.08;

	const points: { x: number; y: number }[] = [{ x: 0, y: midY }];

	// Fixed phase offsets (picked once, not re-randomized per point) so each
	// term stays a clean, reliable oscillation — every one of its half
	// cycles produces a real local extremum. Re-randomizing phase at every
	// sample point was making the curve noise-like and occasionally
	// cancelling out a dip instead of creating one.
	const fastPhase = rand() * Math.PI * 2;
	const finerPhase = rand() * Math.PI * 2;

	for (let i = 1; i <= segmentCount; i++) {
		const x = i * segmentWidth;
		// Mix three oscillations — slow (macro shape), fast and finer (two
		// more tiers of smaller valleys in between) — plus a little
		// per-point jitter for an uneven, hand-drawn feel.
		const slow = Math.sin(i * 0.159) * 0.6;
		const fast = Math.sin(i * 0.492 + fastPhase) * 0.4;
		const finer = Math.sin(i * 0.992 + finerPhase) * 0.4;
		const jitter = (rand() - 0.5) * 0.08;
		const amplitude = (slow + fast + finer + jitter) * maxAmplitude;
		const y = Math.max(viewportHeight * 0.08, Math.min(viewportHeight * 0.32, midY + amplitude));
		points.push({ x, y });
	}

	// Analytic valley detection: the curve (ignoring the tiny per-point
	// jitter) is a sum of three sines, so its derivatives are known in
	// closed form. A valley is where the first derivative is zero and the
	// second derivative is negative (the curve is concave-down, i.e. a
	// local maximum of y — larger y is further down the screen).
	const deriv1 = (i: number) =>
		0.6 * 0.159 * Math.cos(0.159 * i) +
		0.4 * 0.492 * Math.cos(0.492 * i + fastPhase) +
		0.4 * 0.992 * Math.cos(0.992 * i + finerPhase);
	const deriv2 = (i: number) =>
		-0.6 * 0.159 ** 2 * Math.sin(0.159 * i) -
		0.4 * 0.492 ** 2 * Math.sin(0.492 * i + fastPhase) -
		0.4 * 0.992 ** 2 * Math.sin(0.992 * i + finerPhase);

	const valleys: ArchiveAnchor[] = [];
	let prevDeriv = deriv1(1);
	for (let i = 2; i <= segmentCount; i++) {
		const d1 = deriv1(i);
		if (prevDeriv > 0 && d1 <= 0) {
			// Zero-crossing between i-1 and i — interpolate for the precise
			// fractional index, then confirm it's a valley (not a peak) via
			// the second derivative.
			const frac = prevDeriv / (prevDeriv - d1);
			const iCross = i - 1 + frac;
			if (deriv2(iCross) < 0) {
				const x = iCross * segmentWidth;
				const p0 = points[i - 1];
				const p1 = points[i];
				const y = p0.y + (p1.y - p0.y) * frac;
				valleys.push({ x, y });
			}
		}
		prevDeriv = d1;
	}

	// Catmull-Rom → cubic bezier conversion for a smooth curve through all points.
	let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[Math.max(0, i - 1)];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[Math.min(points.length - 1, i + 2)];

		const cp1x = p1.x + (p2.x - p0.x) / 6;
		const cp1y = p1.y + (p2.y - p0.y) / 6;
		const cp2x = p2.x - (p3.x - p1.x) / 6;
		const cp2y = p2.y - (p3.y - p1.y) / 6;

		d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
	}

	return { d, totalWidth, valleys };
}
