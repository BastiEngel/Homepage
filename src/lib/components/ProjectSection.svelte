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
	let visible = $state(false);
	let tileEl: HTMLElement | undefined = $state();
	let tileVisible = $state(false);
	const fromRight = index % 2 === 0;

	$effect(() => {
		if (!tileEl) return;
		const observer = new IntersectionObserver(
			([entry]) => { if (entry.isIntersecting) { tileVisible = true; observer.disconnect(); } },
			{ threshold: 0.05 }
		);
		observer.observe(tileEl);
		return () => observer.disconnect();
	});

	// For GIFs: only set src when in viewport so they play on scroll
	$effect(() => {
		if (!imgEl || !isGif) return;

		const observer = new IntersectionObserver(
			([entry]) => {
				visible = entry.isIntersecting;
			},
			{ threshold: 0.1 }
		);

		observer.observe(imgEl);
		return () => observer.disconnect();
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
			class="project-tile overflow-hidden rounded-xl"
			class:lg:order-2={reversed}
			class:tile-visible={tileVisible}
			style="--fan-origin: {fromRight ? 'right bottom' : 'left bottom'}; --fan-rotate: {fromRight ? '2deg' : '-2deg'};"
		>
			{#if project.id !== 'about'}
				<a href="{base}/projects/{project.id}">
					<img
						bind:this={imgEl}
						src={isGif ? (visible ? coverSrc : undefined) : coverSrc}
						alt="{project.name} cover"
						loading="lazy"
						class="aspect-[3/2] w-full object-cover"
					/>
				</a>
			{:else}
				<img
					bind:this={imgEl}
					src={isGif ? (visible ? coverSrc : undefined) : coverSrc}
					alt="{project.name} cover"
					loading="lazy"
					class="aspect-[3/2] w-full object-cover"
				/>
			{/if}
			<div class="bevel-edge"></div>
		</div>

		<!-- Text column -->
		<div class="flex flex-col justify-start" class:lg:order-1={reversed} use:scrollReveal>
			<h2 class="text-text project-title">
				{project.name}
			</h2>
			<p class="text-text text-base lg:text-lg">
				{project.description}
			</p>
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
		transform-origin: var(--fan-origin);
		transform: rotate(var(--fan-rotate)) scale(0.97);
		opacity: 0;
		transition: transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
	}

	.project-tile.tile-visible {
		transform: rotate(0deg) scale(1);
		opacity: 1;
	}

	@media (max-width: 1023px) {
		.project-tile {
			transform-origin: center center;
			transform: perspective(800px) rotateY(var(--fan-rotate)) scale(0.98);
		}

		.project-tile.tile-visible {
			transform: perspective(800px) rotateY(0deg) scale(1);
		}
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
		border: 2px solid rgba(255, 255, 255, 0.35);
	}
</style>
