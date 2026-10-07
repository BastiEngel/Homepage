// Continuous scroll-linked scale for homepage project tiles: full size (1,
// the original, unscaled size/position) for the whole middle stretch of the
// viewport, easing down to MIN_SCALE over a fixed window past each edge.
//
// All registered tiles are updated through ONE shared loop, in two strict
// phases — every tile's getBoundingClientRect() first, then every tile's
// style.transform write — instead of each tile's own effect interleaving its
// own read+write per frame. Interleaving reads and writes across sibling
// elements forces the browser to flush layout between them (layout
// thrashing): element A's write invalidates the layout element B's read
// then has to recompute, every frame, for every tile. Batching avoids that
// entirely, which is what was causing the visible stutter/snap.
import { addTicker, removeTicker } from './sharedTicker';

const MIN_SCALE = 0.97; // very subtle size difference
const RAMP_OUTSIDE = 0; // px below/above the edge where the transition starts — right at the edge
const RAMP_INSIDE = 350; // px past the edge over which it eases in — bigger than before so the static "parked at full size" middle stretch is shorter (it was eating most of the viewport, which read as snap-static-static-snap rather than one continuous motion)
const RAMP_TOTAL = RAMP_OUTSIDE + RAMP_INSIDE;

// Smooth, monotonic ease (sine in/out) — gentler than the exponential curve
// used before: that one's long near-flat stretches at both ends, with
// almost the whole size change crammed into a short middle burst, read as a
// sudden jump rather than a continuous animation. Sine keeps accelerating
// and decelerating the whole way through, no flat dead zones, no sudden
// burst — never overshoots past 1 or below MIN_SCALE, so the "biggest"
// state always matches the original pre-effect size exactly.
function easeInOutSine(x: number): number {
	return -(Math.cos(Math.PI * x) - 1) / 2;
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

// A group is one scroll position (the driver, e.g. the image) driving the
// scale for itself plus any linked elements (e.g. the text column) — they
// all receive the exact same computed scale each frame, so they move in
// perfect sync instead of each computing a slightly different value from
// their own (slightly different) position.
interface ScaleGroup {
	driver: HTMLElement;
	targets: HTMLElement[];
}
const groups = new Set<ScaleGroup>();

function update() {
	const vh = window.innerHeight;
	const list = [...groups];

	// READ phase — every driver's layout first, before any writes.
	const tops: number[] = list.map((g) => g.driver.getBoundingClientRect().top);

	// WRITE phase — only style writes from here on.
	list.forEach((g, i) => {
		const top = tops[i];
		const enterT = clamp01((vh - top + RAMP_OUTSIDE) / RAMP_TOTAL);
		const exitT = clamp01((top + RAMP_OUTSIDE) / RAMP_TOTAL);
		const inside = Math.min(enterT, exitT);
		const eased = easeInOutSine(inside);
		const scale = MIN_SCALE + eased * (1 - MIN_SCALE);
		const transform = `scale(${scale.toFixed(4)})`;
		for (const el of g.targets) el.style.transform = transform;
	});
}

export function registerScaleTile(driver: HTMLElement, extraTargets: HTMLElement[] = []): () => void {
	const group: ScaleGroup = { driver, targets: [driver, ...extraTargets] };
	groups.add(group);
	addTicker(update);
	return () => {
		groups.delete(group);
		if (groups.size === 0) removeTicker(update);
	};
}
