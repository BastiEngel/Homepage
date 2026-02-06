<script lang="ts">
	import type { Project } from '$lib/types';
	import { scrollReveal } from '$lib/utils/scrollAnimation';
	import { base } from '$app/paths';

	interface Props {
		project: Project;
		index?: number;
	}

	let { project, index = 0 }: Props = $props();

	const reversed = index % 2 === 1;
	const coverSrc = `${base}${project.cover}`;
	const isGif = project.cover.endsWith('.gif');

	let imgEl: HTMLImageElement | undefined = $state();
	let visible = $state(false);

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

<section id={project.id} class="relative px-6 py-12 md:px-12 lg:py-20" style="z-index: 1;">
	<div
		class="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 lg:gap-16"
		style="--cols: {reversed ? '2fr 3fr' : '3fr 2fr'};"
	>
		<!-- Image -->
		<div class="project-tile overflow-hidden rounded-xl" class:lg:order-2={reversed}>
			<img
				bind:this={imgEl}
				src={isGif ? (visible ? coverSrc : undefined) : coverSrc}
				alt="{project.name} cover"
				loading="lazy"
				class="aspect-4/3 w-full object-cover"
			/>
			<div class="bevel-edge"></div>
		</div>

		<!-- Text column -->
		<div class="flex flex-col justify-start" class:lg:order-1={reversed} use:scrollReveal>
			<h2 class="font-heading text-text text-2xl font-bold sm:text-3xl lg:text-5xl">
				{project.name}
			</h2>
			<p class="text-text mt-6 text-base leading-relaxed lg:text-lg">
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
	}

	.bevel-edge {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		border: 2px solid rgba(255, 255, 255, 0.35);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);

		/* Two mask layers: XOR padding-box vs border-box = only border strip */
		-webkit-mask-image: linear-gradient(#000, #000), linear-gradient(#000, #000);
		mask-image: linear-gradient(#000, #000), linear-gradient(#000, #000);
		-webkit-mask-clip: padding-box, border-box;
		mask-clip: padding-box, border-box;
		-webkit-mask-composite: xor;
		mask-composite: exclude;
	}
</style>
