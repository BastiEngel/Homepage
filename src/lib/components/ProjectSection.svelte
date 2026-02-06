<script lang="ts">
	import type { Project } from '$lib/types';
	import BentoTile from './BentoTile.svelte';
	import { scrollReveal } from '$lib/utils/scrollAnimation';

	interface Props {
		project: Project;
		index?: number;
	}

	let { project, index = 0 }: Props = $props();

	const reversed = index % 2 === 1;

	const tiles = [
		{ src: project.cover, alt: `${project.name} cover`, tileSize: 'large' as const },
		...(project.images ?? [])
	].slice(0, 4);
</script>

<section id={project.id} class="relative px-6 py-12 md:px-12 lg:py-20">
	<div
		class="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16"
		class:lg:grid-cols-[2fr_3fr]={reversed}
	>
		<!-- Images column -->
		<div class="grid grid-cols-2 gap-3" class:lg:order-2={reversed}>
			{#each tiles as image, i}
				<BentoTile
					src={image.src}
					alt={image.alt}
					tileSize={tiles.length === 1 ? 'large' : (image.tileSize ?? 'medium')}
					index={i}
					eager={i === 0}
				/>
			{/each}
		</div>

		<!-- Text column -->
		<div class="flex flex-col justify-center" class:lg:order-1={reversed} use:scrollReveal>
			<h2 class="font-heading text-text text-2xl font-bold sm:text-3xl lg:text-5xl">
				{project.name}
			</h2>
			<p class="text-text mt-6 text-base leading-relaxed lg:text-lg">
				{project.description}
			</p>
		</div>
	</div>
</section>
