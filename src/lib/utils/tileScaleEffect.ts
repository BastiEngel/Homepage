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

const MIN_SCALE = 0.94; // smaller size difference than the original (was 0.85), but still visible
const RAMP_OUTSIDE = 0; // px below/above the edge where the transition starts — right at the edge
const RAMP_INSIDE = 250; // px past the edge over which it eases in
const RAMP_TOTAL = RAMP_OUTSIDE + RAMP_INSIDE;

// Smooth, monotonic ease (exponential in/out) — never overshoots past 1 or
// below MIN_SCALE, so the "biggest" state always matches the original
// pre-effect size exactly.
function easeInOutExpo(x: number): number {
	if (x <= 0) return 0;
	if (x >= 1) return 1;
	return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
}

function clamp01(v: number): number {
	return v < 0 ? 0 : v > 1 ? 1 : v;
}

const tiles = new Set<HTMLElement>();

function update() {
	const vh = window.innerHeight;

	// READ phase — every tile's layout first, before any writes.
	const tops: number[] = [];
	for (const el of tiles) tops.push(el.getBoundingClientRect().top);

	// WRITE phase — only style writes from here on.
	let i = 0;
	for (const el of tiles) {
		const top = tops[i++];
		const enterT = clamp01((vh - top + RAMP_OUTSIDE) / RAMP_TOTAL);
		const exitT = clamp01((top + RAMP_OUTSIDE) / RAMP_TOTAL);
		const inside = Math.min(enterT, exitT);
		const eased = easeInOutExpo(inside);
		const scale = MIN_SCALE + eased * (1 - MIN_SCALE);
		el.style.transform = `scale(${scale.toFixed(4)})`;
	}
}

export function registerScaleTile(el: HTMLElement): () => void {
	tiles.add(el);
	addTicker(update);
	return () => {
		tiles.delete(el);
		if (tiles.size === 0) removeTicker(update);
	};
}
