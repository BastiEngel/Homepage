<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ProjectHeroPath from '$lib/components/ProjectHeroPath.svelte';
	import { scrollReveal, revealCard } from '$lib/utils/scrollAnimation';
	import { base } from '$app/paths';

	let { data } = $props();
	const project = data.project;

	const coverSrc = `${base}${project.cover}`;
	const isVideo = project.coverType === 'video';
	const isGif = !isVideo && project.cover.endsWith('.gif');

	const contentBlocks = project.contentBlocks ?? [];
	const gallery = project.gallery ?? [];

	// --- Gallery carousel state ---
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
		if (!trackEl || gallery.length === 0) return;

		const GAP = 40; // 2.5rem
		const ARC_HEIGHT = 55; // px lift at center
		const AUTO_SPEED = 0.65; // px per ms
		const PAUSE_MS = 3500;
		const SNAP_RADIUS = 160; // px — snap when within this distance
		const LERP = 0.12;

		let running = true;
		let rafId: number;
		let smooth = 0;
		let target = 0;
		let lastTime = 0;
		let paused = false;
		let pauseTimer: ReturnType<typeof setTimeout>;
		let lastSnapPos = -99999;

		let dragging = false;
		let dragStartX = 0;
		let dragStartTarget = 0;

		let tileData: { center: number }[] = [];
		let cachedTiles: HTMLElement[] = []; // cached once — no DOM query per frame
		let halfWidth = 0;
		let snapTarget = -99999; // active snap target, -99999 = not snapping
		let vw = window.innerWidth; // cached — updated only on resize
		let prevSmooth = -1; // skip applyArc when position unchanged

		function buildTileData() {
			if (!trackEl) return;
			const tiles = trackEl.querySelectorAll('.gallery-tile') as NodeListOf<HTMLElement>;
			cachedTiles = Array.from(tiles);
			tileData = [];
			for (let i = 0; i < cachedTiles.length; i++) {
				tileData.push({ center: cachedTiles[i].offsetLeft + cachedTiles[i].offsetWidth / 2 });
			}
			let hw = 0;
			for (let i = 0; i < gallery.length && i < cachedTiles.length; i++) {
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
				if (snapPos < 0) continue;
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
				cachedTiles[i].style.transform = `translateY(-${lift}px) scale(${scale})`;
			}
		}

		function frame(now: number) {
			if (!running) return;
			const dt = Math.min(now - lastTime, 50);
			lastTime = now;

			if (needsRebuild || tileData.length === 0) {
				buildTileData();
				needsRebuild = false;
				prevSmooth = -1;
			}
			if (halfWidth <= 0) { rafId = requestAnimationFrame(frame); return; }

			if (snapTarget !== -99999) {
				// Lerp smoothly into snap position
				smooth += (snapTarget - smooth) * LERP;
				if (Math.abs(snapTarget - smooth) < 0.3) smooth = snapTarget;
			} else if (!dragging && !paused) {
				// Direct auto-scroll — no lerp lag
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

			if (smooth < 0) smooth += halfWidth;
			if (smooth >= halfWidth) smooth -= halfWidth;

			if (trackEl) trackEl.style.transform = `translateX(-${smooth}px)`;
			// Only recompute arc transforms when position actually changed
			if (Math.abs(smooth - prevSmooth) > 0.05) {
				applyArc();
				prevSmooth = smooth;
			}
			rafId = requestAnimationFrame(frame);
		}

		function onPointerDown(e: PointerEvent) {
			dragging = true;
			paused = false;
			snapTarget = -99999;
			clearTimeout(pauseTimer);
			dragStartX = e.clientX;
			dragStartTarget = smooth;
			trackEl?.setPointerCapture(e.pointerId);
		}

		function onPointerMove(e: PointerEvent) {
			if (!dragging || halfWidth <= 0) return;
			const dx = dragStartX - e.clientX;
			smooth = ((dragStartTarget + dx) % halfWidth + halfWidth) % halfWidth;
		}

		function onPointerUp() {
			if (!dragging) return;
			dragging = false;
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

		trackEl.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);
		window.addEventListener('resize', onResize, { passive: true });

		rafId = requestAnimationFrame(frame);

		navigateFn = (dir: 1 | -1) => {
			if (halfWidth <= 0 || tileData.length === 0) return;
			const vc = window.innerWidth / 2;
			// Collect unique snap positions in [0, halfWidth), sorted
			const snaps: number[] = [];
			for (const { center } of tileData) {
				const sp = center - vc;
				if (sp >= 0 && sp < halfWidth) snaps.push(sp);
			}
			snaps.sort((a, b) => a - b);
			if (snaps.length === 0) return;
			// Find currently centered snap index
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
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
			window.removeEventListener('resize', onResize);
		};
	});
</script>

<Nav />

<main class="relative pt-16">
	{#if project.heroPathSrc}
		<ProjectHeroPath src={project.heroPathSrc} />
	{/if}
	<!-- Hero media — full width -->
	<section class="hero-media relative">
		{#if isVideo}
			<video
				src={coverSrc}
				autoplay
				loop
				muted
				playsinline
				class="hero-cover"
			></video>
		{:else}
			<img
				src={coverSrc}
				alt="{project.name} cover"
				class="hero-cover"
			/>
		{/if}
	</section>

	<!-- Project info -->
	<section class="relative px-6 pt-12 pb-8 md:px-12 lg:pt-20 lg:pb-8">
		<div class="mx-auto max-w-4xl" use:scrollReveal>
			<h1 class="text-text project-heading">
				{project.name}
			</h1>

			{#if project.subtitle}
				<p class="text-text-muted mt-4 whitespace-pre-line text-sm project-light">{project.subtitle}</p>
			{:else}
				<div class="text-text-muted mt-4 flex flex-wrap items-center gap-4 text-sm">
					{#if project.role}<span>{project.role}</span>{/if}
					{#if project.year}<span class="opacity-40">|</span><span>{project.year}</span>{/if}
					{#if project.client}<span class="opacity-40">|</span><span>{project.client}</span>{/if}
				</div>
			{/if}

			<p class="text-text mt-16 max-w-3xl text-base lg:text-lg lg:mt-24">
				{project.description}
			</p>

			{#if project.externalUrl}
				<a
					href={project.externalUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-line hover:opacity-70 mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-opacity"
				>
					view live project
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
				</a>
			{/if}
		</div>
	</section>

	<!-- Content blocks — image + text -->
	{#each contentBlocks as block, i}
		<section class="relative px-6 md:px-12">
			<div class="mx-auto max-w-4xl">
				<div class="content-tile" use:revealCard>
					<img
						src="{base}{block.image}"
						alt={block.alt || `${project.name} detail ${i + 1}`}
						loading="lazy"
						class="content-img"
					/>
					<div class="bevel-edge"></div>
				</div>
				{#if block.text}
					<p class="text-text mx-auto mt-8 mb-8 max-w-4xl whitespace-pre-line text-base lg:text-lg" use:scrollReveal={{ delay: 180 }}>
						{block.text}
					</p>
				{:else}
					<div class="mb-8"></div>
				{/if}
			</div>
		</section>
	{/each}

	<!-- Learnings -->
	{#if project.learnings}
		<section class="relative px-6 md:px-12">
			<div class="mx-auto max-w-6xl" use:scrollReveal>
				{#if project.learningsImage}
					<div class="content-tile">
						<img
							src="{base}{project.learningsImage}"
							alt="{project.name} learnings"
							loading="lazy"
							class="content-img"
						/>
						<div class="bevel-edge"></div>
					</div>
				{/if}
				<p class="text-text mx-auto mt-8 mb-8 max-w-4xl text-base lg:text-lg">{project.learnings}</p>
			</div>
		</section>
	{/if}

	<!-- Scrolling gallery -->
	{#if gallery.length > 0}
		<section class="relative pt-12 pb-0 lg:pt-20">
			<div class="gallery-section">
				<div class="gallery-scroll">
					<div class="gallery-track" bind:this={trackEl}>
						{#each gallery as src}
							<div class="gallery-tile" class:portrait={portraitSrcs.has(src)}>
								<img
									src="{base}{src}"
									alt="{project.name} gallery"
									loading="lazy"
									class="gallery-img"
									draggable="false"
									onload={(e) => markPortrait(src, e.currentTarget as HTMLImageElement)}
								/>
								<div class="bevel-edge"></div>
							</div>
						{/each}
						<!-- Duplicate for seamless loop -->
						{#each gallery as src}
							<div class="gallery-tile" class:portrait={portraitSrcs.has(src)} aria-hidden="true">
								<img
									src="{base}{src}"
									alt=""
									loading="lazy"
									class="gallery-img"
									draggable="false"
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
		</section>
	{/if}

	<!-- Credits -->
	{#if project.credits}
		<section class="relative px-6 mt-4 md:px-12">
			<div class="mx-auto max-w-4xl" use:scrollReveal>
				<p class="text-text whitespace-pre-line text-center text-base lg:text-lg project-light">{project.credits}</p>
			</div>
		</section>
	{/if}

	<div class="flex justify-center py-12">
		<a
			href="{base}/"
			class="back-pill"
		>
			<span>back to projects</span>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</a>
	</div>
</main>

<Footer />

<style>
	.hero-media {
		width: 100%;
	}

	.hero-cover {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Content block images — uniform aspect ratio with crop */
	.content-tile {
		position: relative;
		width: 100%;
		aspect-ratio: 3 / 2;
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	/* Frosted glass overlay — always present, dissolves when .is-revealed is added */
	.content-tile::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 10;
		border-radius: inherit;
		background: rgba(200, 215, 230, 0.3);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		transition:
			opacity 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.12s,
			backdrop-filter 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.12s,
			-webkit-backdrop-filter 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.12s;
		pointer-events: none;
	}

	/* :global() prevents Svelte from stripping this as "unused" (class added via JS) */
	.content-tile:global(.is-revealed)::before {
		opacity: 0;
		backdrop-filter: blur(0px);
		-webkit-backdrop-filter: blur(0px);
	}

	.content-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Parallax on content images — CSS scroll-driven, GPU-composited, zero JS */
	@supports (animation-timeline: view()) {
		.content-img {
			height: 120%;
			margin-top: -10%;
			will-change: transform;
			animation: parallax-img linear both;
			animation-timeline: view(block);
			animation-range: entry 0% exit 100%;
		}
	}

	@keyframes parallax-img {
		from { transform: translateY(10%); }
		to   { transform: translateY(-10%); }
	}

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

	.back-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 9999px;
		border: 1.5px solid var(--color-text-muted);
		color: var(--color-text);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.back-pill:hover {
		opacity: 0.6;
	}

	.bevel-edge {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		border: 2px solid rgba(255, 255, 255, 0.35);
	}

	.project-heading {
		font-family: 'area-inktrap', sans-serif;
		font-weight: 900;
		font-size: 52.358px;
		line-height: calc(2 * 32.36px); /* 2 baseline units */
	}

	.project-light {
		font-family: 'area-inktrap-light', sans-serif;
		font-style: italic;
	}
</style>
