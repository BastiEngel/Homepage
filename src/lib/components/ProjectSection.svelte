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

	const tiles = [
		{ src: project.cover, alt: `${project.name} cover` },
		...(project.images ?? []).map((img) => ({ src: img.src, alt: img.alt }))
	].slice(0, 4);

	// Grid placement per tile count — each tile gets column/row spans
	const layouts: Record<number, { col: string; row: string }[]> = {
		1: [{ col: '1 / 3', row: '1 / 3' }],
		2: [
			{ col: '1 / 2', row: '1 / 3' },
			{ col: '2 / 3', row: '1 / 3' }
		],
		3: [
			{ col: '1 / 2', row: '1 / 3' },
			{ col: '2 / 3', row: '1 / 2' },
			{ col: '2 / 3', row: '2 / 3' }
		],
		4: [
			{ col: '1 / 2', row: '1 / 2' },
			{ col: '2 / 3', row: '1 / 2' },
			{ col: '1 / 2', row: '2 / 3' },
			{ col: '2 / 3', row: '2 / 3' }
		]
	};

	const placement = layouts[tiles.length] ?? layouts[4];
</script>

<section id={project.id} class="relative px-6 py-12 md:px-12 lg:py-20">
	<div
		class="mx-auto grid max-w-6xl grid-cols-1 items-start gap-10 lg:grid-cols-[3fr_2fr] lg:gap-16"
		class:lg:grid-cols-[2fr_3fr]={reversed}
	>
		<!-- Images container -->
		<div class="image-grid" class:lg:order-2={reversed}>
			{#each tiles as image, i}
				<div
					class="bg-surface overflow-hidden rounded-lg shadow-sm"
					style="grid-column: {placement[i].col}; grid-row: {placement[i].row};"
				>
					<img
						src="{base}{image.src}"
						alt={image.alt}
						loading={i === 0 ? 'eager' : 'lazy'}
						class="h-full w-full object-cover"
					/>
				</div>
			{/each}
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
	.image-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		grid-template-rows: 1fr 1fr;
		gap: 6px;
		aspect-ratio: 4 / 3;
	}
</style>
