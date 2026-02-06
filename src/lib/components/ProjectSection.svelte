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

<section id={project.id} class="relative px-6 py-12 md:px-12 lg:py-20">
	<div
		class="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 lg:gap-16"
		style="--cols: {reversed ? '2fr 3fr' : '3fr 2fr'};"
	>
		<!-- Image -->
		<div class="overflow-hidden rounded-xl bg-surface shadow-sm" class:lg:order-2={reversed}>
			<img
				bind:this={imgEl}
				src={isGif ? (visible ? coverSrc : undefined) : coverSrc}
				alt="{project.name} cover"
				loading="lazy"
				class="aspect-4/3 w-full object-cover"
			/>
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
</style>
