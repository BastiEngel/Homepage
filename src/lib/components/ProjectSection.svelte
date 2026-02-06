<script lang="ts">
	import type { Project } from '$lib/types';
	import BentoTile from './BentoTile.svelte';
	import { scrollReveal } from '$lib/utils/scrollAnimation';

	interface Props {
		project: Project;
	}

	let { project }: Props = $props();

	const allImages = [
		{ src: project.cover, alt: `${project.name} cover`, tileSize: 'large' as const },
		...(project.images ?? [])
	];
</script>

<section id={project.id} class="relative px-6 py-16 md:px-12 lg:py-24">
	<div class="mx-auto grid max-w-6xl grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
		<!-- Images column -->
		<div class="grid grid-cols-2 gap-3">
			{#each allImages as image, i}
				<BentoTile
					src={image.src}
					alt={image.alt}
					tileSize={image.tileSize ?? 'medium'}
					index={i}
					eager={i === 0}
				/>
			{/each}
		</div>

		<!-- Text column -->
		<div class="flex flex-col justify-center" use:scrollReveal>
			<h2 class="font-heading text-text text-2xl font-bold sm:text-3xl lg:text-5xl">
				{project.name}
			</h2>
			<p class="text-text mt-6 text-base leading-relaxed lg:text-lg">
				{project.description}
			</p>
		</div>
	</div>
</section>
