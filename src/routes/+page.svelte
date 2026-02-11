<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Hero from '$lib/components/Hero.svelte';
	import GarlandLine from '$lib/components/GarlandLine.svelte';
	import GarlandTag from '$lib/components/GarlandTag.svelte';
	import ProjectSection from '$lib/components/ProjectSection.svelte';

	import ContactForm from '$lib/components/ContactForm.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import type { Project, GarlandPoint } from '$lib/types';
	import projectsData from '../data/projects.json';

	const projects = projectsData as Project[];
	const featuredProjects = projects.filter((p) => p.featured);

	let garlandPoints = $state<GarlandPoint[]>([]);
	let innerWidth = $state(1440);

	function handleGarlandPoints(points: GarlandPoint[]) {
		garlandPoints = points;
	}
</script>

<svelte:window bind:innerWidth={innerWidth} />

<Nav />

<main class="relative">
	<!-- Garland SVG line spanning the full page -->
	<GarlandLine
		onpoints={handleGarlandPoints}
		featuredCount={featuredProjects.length}
	/>

	<!-- Garland tags hanging from the line (desktop only) -->
	{#each featuredProjects as project, i}
		{#if garlandPoints[i]}
			<GarlandTag {project} point={garlandPoints[i]} index={i} viewportWidth={innerWidth} />
		{/if}
	{/each}

	<Hero />


	{#each projects as project, i}
		<ProjectSection {project} index={i} />
	{/each}

	<ContactForm />
</main>

<Footer />
