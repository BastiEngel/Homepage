<script lang="ts">
	import type { Project } from '$lib/types';
	import TagPill from './TagPill.svelte';
	import BentoGrid from './BentoGrid.svelte';
	import { scrollReveal } from '$lib/utils/scrollAnimation';

	interface Props {
		project: Project;
	}

	let { project }: Props = $props();

	let metaParts = $derived([project.role, project.year, project.client].filter(Boolean));
</script>

<section id={project.id} class="relative px-6 py-16 md:px-12 lg:py-24">
	<div class="mx-auto max-w-6xl">
		<!-- Project header -->
		<div use:scrollReveal>
			<h2 class="font-heading text-text text-2xl font-bold sm:text-3xl lg:text-5xl">
				{project.name}
			</h2>

			<p class="text-text-muted mt-2 text-sm">
				{metaParts.join(' · ')}
			</p>

			{#if project.tags.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each project.tags as tag}
						<TagPill label={tag} />
					{/each}
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
					class="text-accent hover:text-accent-hover mt-4 inline-flex items-center gap-1 text-sm font-medium transition-colors duration-200"
				>
					View Project
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
					</svg>
				</a>
			{/if}
		</div>

		<!-- Bento grid -->
		<BentoGrid
			cover={project.cover}
			coverAlt="{project.name} cover"
			images={project.images}
		/>
	</div>
</section>
