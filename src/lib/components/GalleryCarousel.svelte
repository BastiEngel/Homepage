<script lang="ts">
	import { base } from '$app/paths';

	interface Props {
		images: string[];
		projectName?: string;
	}

	let { images, projectName = '' }: Props = $props();

	let trackEl: HTMLElement | undefined = $state();
	let portraitSrcs: Set<string> = $state(new Set());
	let needsRebuild = false;
	let navigateFn: ((dir: 1 | -1) => void) | undefined = $state();

	function markPortrait(src: string, img: HTMLImageElement) {
		if (img.naturalHeight > img.naturalWidth) {
			portraitSrcs = new Set([...portraitSrcs, src]);
			needsRebuild = true;
		}
	}

	$effect(() => {
		if (!trackEl || images.length === 0) return;

		const GAP = 40;
		const ARC_HEIGHT = 55;
		const AUTO_SPEED = 0.65;
		const PAUSE_MS = 3500;
		const SNAP_RADIUS = 160;
		const LERP = 0.12;

		let running = true;
		let rafId: number;
		let smooth = 0;
		let lastTime = -1;
		let paused = false;
		let pauseTimer: ReturnType<typeof setTimeout>;
		let lastSnapPos = -99999;

		let dragging = false;
		let activePointerId = -1;
		let dragStartX = 0;
		let dragStartTarget = 0;

		let tileData: { center: number }[] = [];
		let cachedTiles: HTMLElement[] = [];
		let halfWidth = 0;
		let snapTarget = -99999;
		let vw = window.innerWidth;
		let prevSmooth = -1;

		function buildTileData() {
			if (!trackEl) return;
			const tiles = trackEl.querySelectorAll('.gallery-tile') as NodeListOf<HTMLElement>;
			cachedTiles = Array.from(tiles);
			tileData = [];
			for (let i = 0; i < cachedTiles.length; i++) {
				tileData.push({ center: cachedTiles[i].offsetLeft + cachedTiles[i].offsetWidth / 2 });
			}
			let hw = 0;
			for (let i = 0; i < images.length && i < cachedTiles.length; i++) {
				hw += cachedTiles[i].offsetWidth + GAP;
			}
			halfWidth = hw;
		}

		function findNearestSnap(pos: number): number {
			const vc = vw / 2;
			let best = -99999;
			let bestDist = Infinity;
			for (const { center } of tileData) {
				const snapPos = center - vc;
				if (snapPos < 0 || snapPos >= halfWidth) continue;
				const dist = Math.abs(pos - snapPos);
				if (dist < bestDist) { bestDist = dist; best = snapPos; }
			}
			return bestDist <= SNAP_RADIUS ? best : -99999;
		}

		function applyArc() {
			if (cachedTiles.length === 0 || tileData.length === 0) return;
			const vc = vw / 2;
			const maxDist = vw * 0.7;
			for (let i = 0; i < cachedTiles.length; i++) {
				if (!tileData[i]) continue;
				const screenCenter = tileData[i].center - smooth;
				const dist = Math.max(-1, Math.min(1, (screenCenter - vc) / maxDist));
				const lift = (1 - dist * dist) * ARC_HEIGHT;
				const scale = 1 + (1 - dist * dist) * 0.08;
				cachedTiles[i].style.transform = `translate3d(0, -${lift}px, 0) scale(${scale})`;
			}
		}

		function frame(now: number) {
			if (!running) return;
			const dt = lastTime < 0 ? 0 : Math.min(now - lastTime, 50);
			lastTime = now;

			if (needsRebuild || tileData.length === 0) {
				const oldHW = halfWidth;
				buildTileData();
				needsRebuild = false;
				prevSmooth = -1;
				if (halfWidth > 0) {
					// Scale smooth proportionally so position doesn't jump when portrait images load
					smooth = oldHW > 0 ? (smooth / oldHW) * halfWidth : 0;
					smooth = ((smooth % halfWidth) + halfWidth) % halfWidth;
				}
			}
			if (halfWidth <= 0) { rafId = requestAnimationFrame(frame); return; }

			if (snapTarget !== -99999) {
				const lerpT = 1 - Math.pow(1 - LERP, dt / 16.667);
				smooth += (snapTarget - smooth) * lerpT;
				if (Math.abs(snapTarget - smooth) < 0.3) smooth = snapTarget;
			} else if (!dragging && !paused) {
				smooth += AUTO_SPEED * dt;
				if (smooth >= halfWidth) { smooth -= halfWidth; lastSnapPos -= halfWidth; }

				const snap = findNearestSnap(smooth);
				if (snap !== -99999 && Math.abs(snap - lastSnapPos) > 50) {
					snapTarget = snap;
					lastSnapPos = snap;
					paused = true;
					clearTimeout(pauseTimer);
					pauseTimer = setTimeout(() => { paused = false; snapTarget = -99999; }, PAUSE_MS);
				}
			}

			smooth = ((smooth % halfWidth) + halfWidth) % halfWidth;

			if (trackEl) trackEl.style.transform = `translate3d(-${smooth}px, 0, 0)`;
			if (Math.abs(smooth - prevSmooth) > 0.05) {
				applyArc();
				prevSmooth = smooth;
			}
			rafId = requestAnimationFrame(frame);
		}

		function onPointerDown(e: PointerEvent) {
			dragging = true;
			activePointerId = e.pointerId;
			paused = false;
			snapTarget = -99999;
			clearTimeout(pauseTimer);
			dragStartX = e.clientX;
			dragStartTarget = smooth;
			trackEl?.setPointerCapture(e.pointerId);
		}

		function onPointerMove(e: PointerEvent) {
			if (!dragging || e.pointerId !== activePointerId || halfWidth <= 0) return;
			const dx = dragStartX - e.clientX;
			smooth = ((dragStartTarget + dx) % halfWidth + halfWidth) % halfWidth;
		}

		function onPointerCancel() {
			dragging = false;
			activePointerId = -1;
		}

		function onPointerUp(e: PointerEvent) {
			if (!dragging || e.pointerId !== activePointerId) return;
			dragging = false;
			activePointerId = -1;
			const vc = vw / 2;
			let best = -99999, bestDist = Infinity;
			for (const { center } of tileData) {
				const snapPos = center - vc;
				if (snapPos < 0) continue;
				const dist = Math.abs(smooth - snapPos);
				if (dist < bestDist) { bestDist = dist; best = snapPos; }
			}
			if (best !== -99999) {
				snapTarget = best;
				lastSnapPos = best;
				paused = true;
				clearTimeout(pauseTimer);
				pauseTimer = setTimeout(() => { paused = false; snapTarget = -99999; }, PAUSE_MS);
			}
		}

		function onResize() {
			vw = window.innerWidth;
			buildTileData();
			if (halfWidth > 0) {
				smooth = ((smooth % halfWidth) + halfWidth) % halfWidth;
				snapTarget = -99999;
				lastSnapPos = -99999;
			}
		}

		function onVisibilityChange() {
			if (!document.hidden) lastTime = -1;
		}

		trackEl.addEventListener('pointerdown', onPointerDown);
		trackEl.addEventListener('pointercancel', onPointerCancel);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('resize', onResize, { passive: true });
		document.addEventListener('visibilitychange', onVisibilityChange);

		rafId = requestAnimationFrame(frame);

		navigateFn = (dir: 1 | -1) => {
			if (halfWidth <= 0 || tileData.length === 0) return;
			const vc = window.innerWidth / 2;
			const snaps: number[] = [];
			for (const { center } of tileData) {
				const sp = center - vc;
				if (sp >= 0 && sp < halfWidth) snaps.push(sp);
			}
			snaps.sort((a, b) => a - b);
			if (snaps.length === 0) return;
			let bestIdx = 0, bestDist = Infinity;
			for (let i = 0; i < snaps.length; i++) {
				const dist = Math.abs(smooth - snaps[i]);
				if (dist < bestDist) { bestDist = dist; bestIdx = i; }
			}
			const nextIdx = (bestIdx + dir + snaps.length) % snaps.length;
			snapTarget = snaps[nextIdx];
			lastSnapPos = snaps[nextIdx];
			paused = true;
			clearTimeout(pauseTimer);
			pauseTimer = setTimeout(() => { paused = false; snapTarget = -99999; }, PAUSE_MS);
		};

		return () => {
			running = false;
			navigateFn = undefined;
			cancelAnimationFrame(rafId);
			clearTimeout(pauseTimer);
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
		<div class="gallery-track" bind:this={trackEl}>
			{#each images as src}
				<div class="gallery-tile" class:portrait={portraitSrcs.has(src)}>
					<img
						src="{base}{src}"
						alt="{projectName} gallery"
						loading="lazy"
						class="gallery-img"
						draggable="false"
						onload={(e) => markPortrait(src, e.currentTarget as HTMLImageElement)}
					/>
					<div class="bevel-edge"></div>
				</div>
			{/each}
			{#each images as src}
				<div class="gallery-tile" class:portrait={portraitSrcs.has(src)} aria-hidden="true">
					<img src="{base}{src}" alt="" loading="lazy" class="gallery-img" draggable="false" />
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
	}

	.gallery-section:hover .gallery-nav {
		opacity: 1;
	}

	.gallery-nav {
		position: absolute;
		top: 50%;
		transform: translateY(-50%);
		z-index: 10;
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
		overflow: hidden;
		contain: layout;
	}

	.gallery-track {
		display: flex;
		gap: 2.5rem;
		width: max-content;
		padding: 6rem 0 4rem;
		cursor: grab;
		user-select: none;
		will-change: transform;
		touch-action: none;
	}

	.gallery-track:active {
		cursor: grabbing;
	}

	.gallery-tile {
		position: relative;
		flex-shrink: 0;
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15);
		aspect-ratio: 3 / 2;
		height: 220px;
		will-change: transform;
	}

	.gallery-tile.portrait {
		aspect-ratio: 2 / 3;
	}

	.gallery-img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
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
