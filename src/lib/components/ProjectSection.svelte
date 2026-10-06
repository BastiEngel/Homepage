<script lang="ts">
	import type { Project } from '$lib/types';
	import { scrollReveal } from '$lib/utils/scrollAnimation';
	import { base } from '$app/paths';

	interface Props {
		project: Project;
		index?: number;
	}

	let { project, index = 0 }: Props = $props();

	const reversed = index % 2 === 0;
	const coverSrc = `${base}${project.tileImage ?? project.cover}`;
	const isGif = project.cover.endsWith('.gif');

	let imgEl: HTMLImageElement | undefined = $state();
	let tileEl: HTMLElement | undefined = $state();
	let visible = $state(false);

	// Only needed to lazily swap in GIF sources once they're actually on screen
	$effect(() => {
		if (!imgEl || !isGif) return;
		const observer = new IntersectionObserver((entries) => {
			for (const entry of entries) {
				if (entry.target === imgEl) visible = entry.isIntersecting;
			}
		}, { threshold: 0.05 });
		observer.observe(imgEl);
		return () => observer.disconnect();
	});

	// Continuous scroll-linked scale: full size (1, the original, unscaled
	// size/position) for the whole middle stretch of the viewport, easing
	// down to MIN_SCALE over a window straddling each edge — weighted mostly
	// OUTSIDE the viewport (RAMP_OUTSIDE) so growth is clearly already under
	// way well before the tile becomes visible, finishing quickly over just
	// RAMP_INSIDE once it's crossed in. The plateau covers most of the
	// viewport, not just a narrow band around its center. Only runs the rAF
	// loop while the tile is near the viewport.
	const MIN_SCALE = 0.94; // smaller size difference than the original (was 0.85), but still visible
	const RAMP_OUTSIDE = 0; // px below/above the edge where the transition starts — right at the edge
	const RAMP_INSIDE = 60; // px past the edge where it's already finished
	const RAMP_TOTAL = RAMP_OUTSIDE + RAMP_INSIDE;

	// Smooth, monotonic ease (exponential in/out — an even more extreme
	// slow/fast/slow curve than quintic: nearly flat at both ends, steep
	// through the middle, so the non-linearity reads clearly even over a
	// small scale range) — never overshoots past 1 or below MIN_SCALE, so
	// the "biggest" state always matches the original pre-effect size exactly.
	function easeInOutExpo(x: number): number {
		if (x <= 0) return 0;
		if (x >= 1) return 1;
		return x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
	}

	$effect(() => {
		if (!tileEl) return;
		let rafId = 0;

		function update() {
			if (!tileEl) return;
			const rect = tileEl.getBoundingClientRect();
			const vh = window.innerHeight;

			// 0 at RAMP_OUTSIDE below the bottom edge (still off-screen), 1 by
			// RAMP_INSIDE past it (entering from below)
			const enterT = Math.min(Math.max((vh - rect.top + RAMP_OUTSIDE) / RAMP_TOTAL, 0), 1);
			// 0 at RAMP_OUTSIDE above the top edge (already off-screen), 1 at
			// RAMP_INSIDE short of it (exiting past the top)
			const exitT = Math.min(Math.max((rect.top + RAMP_OUTSIDE) / RAMP_TOTAL, 0), 1);

			const inside = Math.min(enterT, exitT);
			const eased = easeInOutExpo(inside);
			const scale = MIN_SCALE + eased * (1 - MIN_SCALE);
			tileEl.style.transform = `scale(${scale.toFixed(4)})`;
			rafId = requestAnimationFrame(update);
		}

		const io = new IntersectionObserver(
			([entry]) => {
				cancelAnimationFrame(rafId);
				if (entry.isIntersecting) rafId = requestAnimationFrame(update);
			},
			{ rootMargin: '100% 0px 100% 0px' }
		);
		if (tileEl) io.observe(tileEl);

		return () => {
			io.disconnect();
			cancelAnimationFrame(rafId);
		};
	});
</script>

<section id={project.id} class="relative z-[6] px-6 py-10 md:px-12 lg:py-16">
	<div
		class="mx-auto grid max-w-3xl grid-cols-1 items-start gap-10 lg:max-w-5xl lg:gap-16"
		style="--cols: {reversed ? '1fr 1.28fr' : '1.28fr 1fr'};"
	>
		<!-- Image -->
		<div
			bind:this={tileEl}
			class="project-tile overflow-hidden rounded-2xl"
			class:lg:order-2={reversed}
		>
			{#if project.id !== 'about'}
				<a href="{base}/projects/{project.id}" data-sveltekit-reload>
					<img
						bind:this={imgEl}
						src={isGif ? (visible ? coverSrc : undefined) : coverSrc}
						alt="{project.name} cover"
						loading="lazy"
						decoding="async"
						class="aspect-[3/2] w-full object-cover"
					/>
				</a>
			{:else}
				<img
					bind:this={imgEl}
					src={isGif ? (visible ? coverSrc : undefined) : coverSrc}
					alt="{project.name} cover"
					loading="lazy"
					decoding="async"
					class="aspect-[3/2] w-full object-cover"
				/>
			{/if}
			<div class="bevel-edge"></div>
		</div>

		<!-- Text column -->
		<div class="flex flex-col justify-start" class:lg:order-1={reversed} use:scrollReveal>
			{#if project.id !== 'about'}
				<a href="{base}/projects/{project.id}" data-sveltekit-reload class="project-text-link text-text no-underline">
					<h2 class="project-title">{project.name}</h2>
					<p class="text-text text-base lg:text-lg">
						{project.description}
					</p>
				</a>
			{:else}
				<h2 class="text-text project-title">{project.name}</h2>
				<p class="text-text text-base lg:text-lg">
					{project.description}
				</p>
			{/if}
		</div>
	</div>
</section>

<style>
	section > div:first-child {
		@media (min-width: 1024px) {
			grid-template-columns: var(--cols);
		}
	}

	.project-tile {
		position: relative;
		box-shadow: 0 15px 50px rgba(0, 0, 0, 0.35), 0 5px 15px rgba(0, 0, 0, 0.2);
		transform-origin: top center;
		will-change: transform;
		/* Align to the x-height of the adjacent title. Verified visually in
		   the browser by overlaying marker lines against the rendered glyphs
		   (an inline-span bounding rect reflects the line box, not the glyph
		   ink, so that approach gave a false reading) — 17px below the
		   heading's own box top lines up with the top of its lowercase
		   letters. */
		margin-top: 17px;
	}

	.project-title {
		font-family: 'area-inktrap', sans-serif;
		font-weight: 900;
		font-size: 32.36px;
		line-height: 48.54px; /* 1.5 × 32.36px */
	}

	.bevel-edge {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		border: none;
	}

	.project-text-link {
		display: block;
		transition: opacity 0.2s;
	}

	.project-text-link:hover {
		opacity: 0.7;
	}
</style>
