<script lang="ts">
	import type { Project } from '$lib/types';
	import { registerScaleTile } from '$lib/utils/tileScaleEffect';
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
	let rowEl: HTMLElement | undefined = $state();
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

	// Continuous scroll-linked scale (see tileScaleEffect.ts) — all project
	// tiles share ONE batched read/write loop instead of each running its
	// own, which was causing layout-thrashing stutter (every tile's rAF
	// callback read its own rect then wrote its own transform, interleaved
	// with every other tile's read/write in the same frame). Image and text
	// are scaled as a single rigid unit (the whole row, not each child
	// separately) so the gap between them stays visually constant instead
	// of growing as each shrinks toward its own center.
	$effect(() => {
		if (!rowEl) return;
		return registerScaleTile(rowEl);
	});
</script>

{#if project.id === 'about'}
	<section id={project.id} class="relative z-[6] px-6 py-10 md:px-12 lg:py-16">
		<div bind:this={rowEl} class="about-row mx-auto flex max-w-3xl justify-center lg:max-w-5xl">
			<div class="project-tile relative overflow-hidden rounded-2xl">
				<img
					bind:this={imgEl}
					src={coverSrc}
					alt="{project.name} cover"
					loading="lazy"
					decoding="async"
					class="aspect-[3/2] w-full object-cover"
				/>
				<h2 class="about-title">{project.name}</h2>
				<div class="bevel-edge"></div>
			</div>
		</div>
	</section>
{:else}
	<section id={project.id} class="relative z-[6] px-6 py-10 md:px-12 lg:py-16">
		<div
			bind:this={rowEl}
			class="project-row mx-auto grid max-w-3xl grid-cols-1 items-start gap-10 lg:max-w-5xl lg:gap-16"
			style="--cols: {reversed ? '1fr 1.28fr' : '1.28fr 1fr'};"
		>
			<!-- Image -->
			<div
				class="project-tile overflow-hidden rounded-2xl"
				class:lg:order-2={reversed}
			>
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
				<div class="bevel-edge"></div>
			</div>

			<!-- Text column -->
			<div class="flex flex-col justify-start" class:lg:order-1={reversed}>
				<a href="{base}/projects/{project.id}" data-sveltekit-reload class="project-text-link text-text no-underline">
					<h2 class="project-title">{project.name}</h2>
					<p class="text-text text-base lg:text-lg">
						{project.description}
					</p>
				</a>
			</div>
		</div>
	</section>
{/if}

<style>
	section > div:first-child {
		@media (min-width: 1024px) {
			grid-template-columns: var(--cols);
		}
	}

	.project-row {
		transform-origin: top center;
		will-change: transform;
	}

	.about-row .project-tile {
		width: calc((100% - 2.5rem) * 1.28 / 2.28);
	}

	@media (min-width: 1024px) {
		.about-row .project-tile {
			width: calc((100% - 4rem) * 1.28 / 2.28);
		}
	}

	.about-title {
		position: absolute;
		left: 2rem;
		bottom: 2rem;
		margin: 0;
		font-family: 'area-inktrap', sans-serif;
		font-weight: 900;
		font-size: 1.25rem;
		color: #fff;
	}

	@media (max-width: 767px) {
		.about-title {
			left: 1.25rem;
			bottom: 1.25rem;
		}
	}

	.project-tile {
		position: relative;
		box-shadow: 0 15px 50px rgba(0, 0, 0, 0.35), 0 5px 15px rgba(0, 0, 0, 0.2);
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
