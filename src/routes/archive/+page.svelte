<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import ArchiveTimeline from '$lib/components/ArchiveTimeline.svelte';
	import type { Project } from '$lib/types';
	import projectsData from '../../data/projects.json';

	const allProjects = projectsData as Project[];

	function yearValue(project: Project): number {
		const source = project.year || project.subtitle || '';
		// "2024/25" spans into the next year, so it should sort after plain
		// "2024" — encode the "/25" suffix as a fraction (2024.5) rather than
		// discarding it, which previously made "2024" and "2024/25" compare
		// equal and fall back to unstable original-array order.
		const match = source.match(/20(\d{2})(?:\/(\d{2}))?/);
		if (!match) return 0;
		const year = 2000 + parseInt(match[1], 10);
		return match[2] ? year + 0.5 : year;
	}

	const timelineProjects = allProjects
		.filter((p) => p.featured && p.id !== 'archive' && p.id !== 'about')
		.sort((a, b) => yearValue(b) - yearValue(a));
</script>

<Nav />

<main class="relative">
	<ArchiveTimeline projects={timelineProjects} />
</main>
