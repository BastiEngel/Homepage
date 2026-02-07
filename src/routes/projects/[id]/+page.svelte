<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ProjectDetailLine from '$lib/components/ProjectDetailLine.svelte';
	import BentoGrid from '$lib/components/BentoGrid.svelte';
	import { scrollReveal } from '$lib/utils/scrollAnimation';
	import { base } from '$app/paths';

	let { data } = $props();
	const project = data.project;
	const images = project.detailImages ?? project.images ?? [];
</script>

<Nav />

<main class="relative">
	{#if project.linePath && project.lineColor}
		<ProjectDetailLine
			pathD={project.linePath}
			color={project.lineColor}
			viewBox={project.lineViewBox}
		/>
	{/if}

	<!-- Hero -->
	<section class="relative px-6 pt-24 pb-12 md:px-12 lg:pt-32 lg:pb-16" style="z-index: 1;">
		<div class="mx-auto max-w-6xl" use:scrollReveal>
			<a
				href="{base}/"
				class="text-text-muted hover:text-accent mb-8 inline-flex items-center gap-2 text-sm transition-colors"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
				</svg>
				Back to projects
			</a>

			<h1 class="font-heading text-text text-3xl font-bold sm:text-4xl lg:text-6xl">
				{project.name}
			</h1>

			<div class="text-text-muted mt-4 flex flex-wrap items-center gap-4 text-sm">
				{#if project.role}
					<span>{project.role}</span>
				{/if}
				{#if project.year}
					<span class="opacity-40">|</span>
					<span>{project.year}</span>
				{/if}
				{#if project.client}
					<span class="opacity-40">|</span>
					<span>{project.client}</span>
				{/if}
			</div>

			{#if project.tags.length > 0}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each project.tags as tag}
						<span class="bg-tag-bg border-tag-border text-tag-text rounded-full border px-3 py-1 text-xs">
							{tag}
						</span>
					{/each}
				</div>
			{/if}

			<p class="text-text mt-6 max-w-3xl text-base leading-relaxed lg:text-lg">
				{project.description}
			</p>

			{#if project.externalUrl}
				<a
					href={project.externalUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-accent hover:text-accent-hover mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
				>
					View live project
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
				</a>
			{/if}
		</div>
	</section>

	<!-- Image gallery -->
	<section class="relative px-6 pb-16 md:px-12" style="z-index: 1;">
		<div class="mx-auto max-w-6xl">
			<BentoGrid cover={project.cover} coverAlt="{project.name} cover" images={images} />
		</div>
	</section>
</main>

<Footer />
