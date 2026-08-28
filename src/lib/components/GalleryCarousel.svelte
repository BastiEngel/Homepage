<script lang="ts">
	import { base } from '$app/paths';

	interface Props {
		images: string[];
		projectName?: string;
		size?: 'default' | 'large';
	}

	let { images, projectName = '', size = 'default' }: Props = $props();

	let trackEl: HTMLElement | undefined = $state();
	let portraitSrcs: Set<string> = $state(new Set());
	let needsRemeasure = false;
	let navigateFn: ((dir: 1 | -1) => void) | undefined = $state();

	function markPortrait(src: string, img: HTMLImageElement) {
		if (img.naturalHeight > img.naturalWidth) {
			portraitSrcs = new Set([...portraitSrcs, src]);
			needsRemeasure = true;
		}
	}

	$effect(() => {
		if (!trackEl || images.length === 0) return;

		const N = images.length;
		const GAP = 32;
		const ARC_HEIGHT = 55;
		const AUTO_SPEED = 0.65; // px/ms (scaled to radians via R)
		const PAUSE_MS = 3500;
		const LERP = 0.12;
		const SNAP_RADIUS_PX = 160;

		// Full-circle cylinder: N tiles evenly distributed over 360°
		const ALPHA = (2 * Math.PI) / N;  // angular step per tile
		const TOTAL = 2 * Math.PI;        // full rotation

		let running = true;
		let rafId: number;
		let angle = 0;         // current rotation (0 .. TOTAL)
		let snapTarget = NaN;
		let lastTime = -1;
		let paused = false;
		let pauseTimer: ReturnType<typeof setTimeout>;
		let lastSnappedI = -1;

		let dragging = false;
		let activePointerId = -1;
		let dragStartX = 0;
		let dragStartAngle = 0;

		// Auto-rotation has no reason to keep computing per-tile transforms while the
		// carousel is scrolled out of view — pages with two carousels otherwise run
		// two permanent RAF loops even when neither is visible.
		let visible = true;
		const io = new IntersectionObserver(
			([entry]) => { visible = entry.isIntersecting; },
			{ rootMargin: '200px' }
		);
		io.observe(trackEl);

		let cachedTiles: HTMLElement[] = [];
		let tileWidths: number[] = [];
		let W = 0;
		let R = 0;
		let vw = trackEl.offsetWidth;

		function measure() {
			if (!trackEl) return;
			const tiles = trackEl.querySelectorAll('.gallery-tile') as NodeListOf<HTMLElement>;
			cachedTiles = Array.from(tiles);
			if (cachedTiles.length === 0) return;
			tileWidths = cachedTiles.map(t => t.offsetWidth);
			// Use widest tile for R so landscape tiles never overlap
			W = Math.max(...tileWidths);
			const tileH = cachedTiles[0].offsetHeight; // all tiles same height
			const pitch = W + GAP;
			R = pitch / (2 * Math.sin(ALPHA / 2));
			if (tileH > 0) trackEl.style.height = (ARC_HEIGHT + tileH) + 'px';
		}

		// Normalize angle to (−TOTAL/2, +TOTAL/2]
		function norm(a: number): number {
			const h = TOTAL / 2;
			return ((a + h) % TOTAL + TOTAL) % TOTAL - h;
		}

		function applyTransforms() {
			if (W <= 0 || cachedTiles.length === 0) return;
			const vc = vw / 2;
			for (let i = 0; i < N; i++) {
				if (!cachedTiles[i]) continue;
				const tileW = tileWidths[i] ?? W;
				const theta = norm(i * ALPHA - angle);
				const x3d = R * Math.sin(theta);
				const z3d = R * (Math.cos(theta) - 1);
				const proximity = Math.max(0, Math.cos(theta));
				const ty = -Math.cos(theta) * ARC_HEIGHT;
				const thetaDeg = theta * 180 / Math.PI;
				const tx = vc - tileW / 2 + x3d; // center each tile by its own width
				const opacity = 0.35 + 0.65 * proximity;
				cachedTiles[i].style.transform =
					`translateX(${tx.toFixed(1)}px) translateY(${ty.toFixed(1)}px) translateZ(${z3d.toFixed(1)}px) rotateY(${thetaDeg.toFixed(2)}deg)`;
				cachedTiles[i].style.opacity = opacity.toFixed(3);
				cachedTiles[i].style.zIndex = String(Math.round(proximity * 100));
			}
		}

		function getSnapAngle(a: number): number {
			const normA = ((a % TOTAL) + TOTAL) % TOTAL;
			const i = Math.round(normA / ALPHA) % N;
			return i * ALPHA;
		}

		function frame(now: number) {
			if (!running) return;
			const dt = lastTime < 0 ? 0 : Math.min(now - lastTime, 50);
			lastTime = now;

			// Skip auto-rotation entirely while scrolled out of view
			if (!visible) { rafId = requestAnimationFrame(frame); return; }

			if (needsRemeasure || W <= 0) { measure(); needsRemeasure = false; }
			if (W <= 0) { rafId = requestAnimationFrame(frame); return; }

			const pitch = W + GAP;
			const AUTO_RAD = AUTO_SPEED / pitch * ALPHA; // rad per ms
			const SNAP_RAD = SNAP_RADIUS_PX / pitch * ALPHA;

			if (!isNaN(snapTarget)) {
				const lerpT = 1 - Math.pow(1 - LERP, dt / 16.667);
				const diff = norm(snapTarget - angle);
				angle = ((angle + diff * lerpT) % TOTAL + TOTAL) % TOTAL;
				if (Math.abs(norm(snapTarget - angle)) < 0.001) angle = snapTarget;
			} else if (!dragging && !paused) {
				angle = ((angle + AUTO_RAD * dt) % TOTAL + TOTAL) % TOTAL;
				const snap = getSnapAngle(angle);
				const dist = Math.abs(norm(angle - snap));
				const si = Math.round(((angle % TOTAL) + TOTAL) % TOTAL / ALPHA) % N;
				if (dist <= SNAP_RAD && si !== lastSnappedI) {
					snapTarget = snap;
					lastSnappedI = si;
					paused = true;
					clearTimeout(pauseTimer);
					pauseTimer = setTimeout(() => { paused = false; snapTarget = NaN; }, PAUSE_MS);
				}
			}

			applyTransforms();
			rafId = requestAnimationFrame(frame);
		}

		function onPointerDown(e: PointerEvent) {
			dragging = true;
			activePointerId = e.pointerId;
			paused = false;
			snapTarget = NaN;
			clearTimeout(pauseTimer);
			dragStartX = e.clientX;
			dragStartAngle = angle;
			trackEl?.setPointerCapture(e.pointerId);
		}

		function onPointerMove(e: PointerEvent) {
			if (!dragging || e.pointerId !== activePointerId || W <= 0) return;
			const dx = e.clientX - dragStartX;
			angle = ((dragStartAngle - dx / R) % TOTAL + TOTAL) % TOTAL;
		}

		function onPointerUp(e: PointerEvent) {
			if (!dragging || e.pointerId !== activePointerId) return;
			dragging = false;
			activePointerId = -1;
			const snap = getSnapAngle(angle);
			const si = Math.round(((angle % TOTAL) + TOTAL) % TOTAL / ALPHA) % N;
			snapTarget = snap;
			lastSnappedI = si;
			paused = true;
			clearTimeout(pauseTimer);
			pauseTimer = setTimeout(() => { paused = false; snapTarget = NaN; }, PAUSE_MS);
		}

		function onPointerCancel() { dragging = false; activePointerId = -1; }

		function onResize() {
			vw = trackEl?.offsetWidth ?? window.innerWidth;
			measure();
			applyTransforms();
		}

		function onVisibilityChange() { if (!document.hidden) lastTime = -1; }

		trackEl.addEventListener('pointerdown', onPointerDown);
		trackEl.addEventListener('pointercancel', onPointerCancel);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('resize', onResize, { passive: true });
		document.addEventListener('visibilitychange', onVisibilityChange);

		rafId = requestAnimationFrame(frame);

		navigateFn = (dir: 1 | -1) => {
			const normA = ((angle % TOTAL) + TOTAL) % TOTAL;
			const ci = Math.round(normA / ALPHA) % N;
			const ni = (ci + dir + N) % N;
			snapTarget = ni * ALPHA;
			lastSnappedI = ni;
			paused = true;
			clearTimeout(pauseTimer);
			pauseTimer = setTimeout(() => { paused = false; snapTarget = NaN; }, PAUSE_MS);
		};

		return () => {
			running = false;
			navigateFn = undefined;
			cancelAnimationFrame(rafId);
			clearTimeout(pauseTimer);
			io.disconnect();
			trackEl!.removeEventListener('pointerdown', onPointerDown);
			trackEl!.removeEventListener('pointercancel', onPointerCancel);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('resize', onResize);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});
</script>

<div class="gallery-section">
	<div class="gallery-scroll">
		<div class="gallery-track" class:large={size === 'large'} bind:this={trackEl}>
			{#each images as src}
				<div class="gallery-tile" class:portrait={portraitSrcs.has(src)} class:large={size === 'large'}>
					<img
						src="{base}{src}"
						alt="{projectName} gallery"
						loading="lazy"
						decoding="async"
						class="gallery-img"
						draggable="false"
						onload={(e) => markPortrait(src, e.currentTarget as HTMLImageElement)}
					/>
					<div class="bevel-edge"></div>
				</div>
			{/each}
		</div>
	</div>
	<button class="gallery-nav gallery-nav-left" onclick={() => navigateFn?.(-1)} aria-label="Previous">
		<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
		</svg>
	</button>
	<button class="gallery-nav gallery-nav-right" onclick={() => navigateFn?.(1)} aria-label="Next">
		<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
		</svg>
	</button>
</div>

<style>
	.gallery-section {
		position: relative;
		overflow-x: clip;
		overflow-y: visible;
		padding-top: 3rem;
	}

	.gallery-section:hover .gallery-nav {
		opacity: 1;
	}

	.gallery-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 110;
		width: 3rem;
		height: 3rem;
		border-radius: 9999px;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		background: rgba(255, 255, 255, 0.08);
		border: 2px solid rgba(255, 255, 255, 0.35);
		color: var(--color-text);
		cursor: pointer;
		opacity: 0;
		transition: opacity 0.25s, background 0.2s;
	}

	.gallery-nav:hover {
		background: rgba(255, 255, 255, 0.18);
	}

	.gallery-nav-left {
		left: 1.5rem;
	}

	.gallery-nav-right {
		right: 1.5rem;
	}

	.gallery-scroll {
		width: 100%;
		perspective: 1400px;
		perspective-origin: center center;
	}

	.gallery-track {
		position: relative;
		width: 100%;
		cursor: grab;
		user-select: none;
		touch-action: none;
		transform-style: preserve-3d;
	}

	.gallery-track:active {
		cursor: grabbing;
	}

	.gallery-tile {
		position: absolute;
		left: 0;
		top: 0;
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15);
		height: 220px;
		aspect-ratio: 3 / 2;
	}

	.gallery-tile.portrait {
		aspect-ratio: 2 / 3; /* same height, narrower width */
	}

	.gallery-img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}

	.gallery-tile.large {
		height: auto;
		width: calc(100vw - 3rem);
		max-width: 56rem;
		aspect-ratio: 3 / 2;
	}

	@media (min-width: 768px) {
		.gallery-tile.large {
			width: calc(100vw - 6rem);
		}
	}

	@media (min-width: 768px) {
		.gallery-tile {
			height: 300px;
		}
	}

	@media (min-width: 1024px) {
		.gallery-tile {
			height: 380px;
		}
	}

	.bevel-edge {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		border: 2px solid rgba(255, 255, 255, 0.35);
	}
</style>
