<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import { scrollReveal } from '$lib/utils/scrollAnimation';
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
	let scrollX = $state(0);

	$effect(() => {
		if (!trackEl || gallery.length === 0) return;

		const gap = 24; // 1.5rem
		const arcHeight = 70; // px vertical arc offset
		const arcRotation = 5; // deg max rotation at edges
		let running = true;
		let rafId: number;
		let offset = 0;
		let speed = 8; // px per frame at ~40fps
		let paused = false;
		let pauseTimer: ReturnType<typeof setTimeout> | undefined;
		let lastFrame = 0;
		let lastSnap = -1; // track last snap to avoid re-snapping

		// Drag state
		let dragging = false;
		let dragStartX = 0;
		let dragOffset = 0;

		// Measure one set of tiles (first half)
		function getHalfWidth(): number {
			if (!trackEl) return 1;
			const tiles = trackEl.querySelectorAll('.gallery-tile');
			const half = gallery.length;
			let w = 0;
			for (let i = 0; i < half && i < tiles.length; i++) {
				w += (tiles[i] as HTMLElement).offsetWidth + gap;
			}
			return w;
		}

		// Find nearest snap point (tile center aligned to viewport center)
		function getNearestSnap(pos: number): number {
			if (!trackEl) return pos;
			const tiles = trackEl.querySelectorAll('.gallery-tile');
			const viewCenter = window.innerWidth / 2;
			let tileX = 0;
			for (let i = 0; i < tiles.length; i++) {
				const tw = (tiles[i] as HTMLElement).offsetWidth;
				const tileCenter = tileX + tw / 2;
				const screenPos = tileCenter - pos;
				if (Math.abs(screenPos - viewCenter) < tw * 0.15) {
					return tileCenter - viewCenter;
				}
				tileX += tw + gap;
			}
			return -1; // no snap
		}

		// Apply arc transform to each tile based on distance from center
		function applyArc(currentOffset: number) {
			if (!trackEl) return;
			const tiles = trackEl.querySelectorAll('.gallery-tile') as NodeListOf<HTMLElement>;
			const viewCenter = window.innerWidth / 2;
			const maxDist = window.innerWidth;
			let tileX = 0;
			for (let i = 0; i < tiles.length; i++) {
				const tw = tiles[i].offsetWidth;
				const tileCenter = tileX + tw / 2 - currentOffset;
				const dist = (tileCenter - viewCenter) / maxDist; // -1 to 1
				const t = 1 - dist * dist; // parabolic — 1 at center, 0 at edges
				const y = -t * arcHeight; // lift up in center, baseline at edges
				const rot = dist * arcRotation;
				tiles[i].style.transform = `translateY(${y}px) rotate(${rot}deg)`;
				tiles[i].style.transformOrigin = 'center bottom';
				tileX += tw + gap;
			}
		}

		function animate(now: number) {
			if (!running) return;

			const dt = now - lastFrame;
			if (dt < 25) { // ~40fps
				rafId = requestAnimationFrame(animate);
				return;
			}
			lastFrame = now;

			if (!dragging && !paused) {
				offset += speed * (dt / 25);

				// Check if a tile center aligns with viewport center
				const snap = getNearestSnap(offset);
				if (snap >= 0 && Math.abs(snap - lastSnap) > 50 && Math.abs(snap - offset) < speed * 2) {
					offset = snap;
					lastSnap = snap;
					paused = true;
					pauseTimer = setTimeout(() => { paused = false; }, 1000);
				}

				// Seamless loop
				const half = getHalfWidth();
				if (offset >= half) {
					offset -= half;
				}
			}

			const current = dragging ? dragOffset : offset;
			scrollX = current;
			applyArc(current);
			rafId = requestAnimationFrame(animate);
		}

		// Mouse drag handlers
		function onPointerDown(e: PointerEvent) {
			dragging = true;
			paused = false;
			clearTimeout(pauseTimer);
			dragStartX = e.clientX;
			dragOffset = offset;
			trackEl?.setPointerCapture(e.pointerId);
		}

		function onPointerMove(e: PointerEvent) {
			if (!dragging) return;
			const dx = dragStartX - e.clientX;
			dragOffset = offset + dx;
			// Wrap
			const half = getHalfWidth();
			if (dragOffset < 0) dragOffset += half;
			if (dragOffset >= half) dragOffset -= half;
		}

		function onPointerUp() {
			if (!dragging) return;
			dragging = false;
			offset = dragOffset;
		}

		trackEl.addEventListener('pointerdown', onPointerDown);
		window.addEventListener('pointermove', onPointerMove);
		window.addEventListener('pointerup', onPointerUp);

		rafId = requestAnimationFrame(animate);

		return () => {
			running = false;
			cancelAnimationFrame(rafId);
			clearTimeout(pauseTimer);
			trackEl?.removeEventListener('pointerdown', onPointerDown);
			window.removeEventListener('pointermove', onPointerMove);
			window.removeEventListener('pointerup', onPointerUp);
		};
	});
</script>

<Nav />

<main class="relative pt-16">
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
	<section class="relative px-6 py-12 md:px-12 lg:py-20">
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

			<p class="text-text mt-6 max-w-3xl text-base lg:text-lg">
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
			<div class="mx-auto max-w-4xl" use:scrollReveal>
				<div class="content-tile">
					<img
						src="{base}{block.image}"
						alt={block.alt || `${project.name} detail ${i + 1}`}
						loading="lazy"
						class="content-img"
					/>
					<div class="bevel-edge"></div>
				</div>
				{#if block.text}
					<p class="text-text mx-auto mt-8 mb-8 max-w-4xl whitespace-pre-line text-base lg:text-lg">
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
			<div class="gallery-scroll">
				<div
					class="gallery-track"
					bind:this={trackEl}
					style="transform: translateX(-{scrollX}px);"
				>
					{#each gallery as src}
						<div class="gallery-tile">
							<img
								src="{base}{src}"
								alt="{project.name} gallery"
								loading="lazy"
								class="gallery-img"
								draggable="false"
							/>
							<div class="bevel-edge"></div>
						</div>
					{/each}
					<!-- Duplicate for seamless loop -->
					{#each gallery as src}
						<div class="gallery-tile" aria-hidden="true">
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
		height: 90vh;
		overflow: hidden;
	}

	.hero-cover {
		width: 100%;
		height: 100%;
		object-fit: cover;
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

	.content-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.gallery-scroll {
		width: 100%;
		overflow: clip;
	}

	.gallery-track {
		display: flex;
		gap: 1.5rem;
		width: max-content;
		padding: 7rem 0 5rem;
		cursor: grab;
		user-select: none;
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
		height: 340px;
	}

	.gallery-img {
		width: 100%;
		height: 100%;
		display: block;
		object-fit: cover;
	}

	@media (min-width: 768px) {
		.gallery-tile {
			height: 420px;
		}
	}

	@media (min-width: 1024px) {
		.gallery-tile {
			height: 520px;
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
