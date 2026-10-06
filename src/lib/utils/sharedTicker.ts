// One shared RAF loop at ~30 fps driving all GarlandTag instances.
// Avoids N separate requestAnimationFrame chains running in parallel.

type TickFn = (now: number, dt: number) => void;

const fns = new Set<TickFn>();
let rafId = 0;
let last = 0;
let lastTick = 0;

function tick(now: number) {
	rafId = requestAnimationFrame(tick);
	if (now - lastTick < 33) return; // ~30 fps gate
	const dt = last === 0 ? 16.667 : Math.min(now - last, 50);
	last = now;
	lastTick = now;
	for (const fn of fns) fn(now, dt);
}

export function addTicker(fn: TickFn) {
	fns.add(fn);
	if (fns.size === 1) {
		last = 0;
		lastTick = 0;
		rafId = requestAnimationFrame(tick);
	}
}

export function removeTicker(fn: TickFn) {
	fns.delete(fn);
	if (fns.size === 0) {
		cancelAnimationFrame(rafId);
		rafId = 0;
	}
}
