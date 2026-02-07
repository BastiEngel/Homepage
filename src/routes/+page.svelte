<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import GarlandLine from '$lib/components/GarlandLine.svelte';
	import GarlandTag from '$lib/components/GarlandTag.svelte';
	import ProjectSection from '$lib/components/ProjectSection.svelte';

	import ContactForm from '$lib/components/ContactForm.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { Project, GarlandPoint } from '$lib/types';
	import { getConfig } from '$lib/utils/theme';
	import projectsData from '../data/projects.json';

	const config = getConfig();
	const projects = projectsData as Project[];
	const featuredProjects = projects.filter((p) => p.featured);

	let garlandPoints = $state<GarlandPoint[]>([]);

	function handleGarlandPoints(points: GarlandPoint[]) {
		garlandPoints = points;
	}
</script>

<Nav />

<main class="relative">
	<!-- Garland SVG line spanning the full page -->
	<GarlandLine
		onpoints={handleGarlandPoints}
		featuredCount={featuredProjects.length}
		pathOverride={config.heroLinePath}
		pathViewBox={config.heroLineViewBox}
		pathScaleY={config.heroLineScaleY}
		pathOffsetY={config.heroLineOffsetY}
	/>

	<!-- Garland tags hanging from the line (desktop only) -->
	{#each featuredProjects as project, i}
		{#if garlandPoints[i]}
			<GarlandTag {project} point={garlandPoints[i]} index={i} />
		{/if}
	{/each}

	<Hero />

	<!-- Mobile garland tags: horizontal scroll strip -->
	<div class="flex gap-3 overflow-x-auto px-6 pb-6 sm:hidden">
		{#each featuredProjects as project}
			<button
				onclick={() => document.getElementById(project.id)?.scrollIntoView({ behavior: 'smooth' })}
				class="bg-tag-bg border-tag-border text-tag-text flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm"
			>
				<span class="font-medium">{project.name}</span>
			</button>
		{/each}
	</div>

	{#each projects as project, i}
		<ProjectSection {project} index={i} />
	{/each}

	<ContactForm />
</main>

<Footer />
