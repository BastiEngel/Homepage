<script lang="ts">
	import type { Project, GarlandPoint } from '$lib/types';
	import { base } from '$app/paths';

	interface Props {
		project: Project;
		point: GarlandPoint;
		index: number;
	}

	let { project, point, index }: Props = $props();

	const swayDuration = 3 + Math.random() * 2;
	const swayDelay = Math.random() * 2;

	function scrollToProject() {
		document.getElementById(project.id)?.scrollIntoView({ behavior: 'smooth' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			scrollToProject();
		}
	}
</script>

<div
	class="garland-tag absolute z-10 hidden -translate-x-1/2 -translate-y-1/2 sm:block"
	style="left: {point.x}px; top: {point.y}px; --sway-duration: {swayDuration}s; --sway-delay: {swayDelay}s;"
>
	<button
		onclick={scrollToProject}
		onkeydown={handleKeydown}
		class="tag-card bg-tag-bg border-tag-border text-tag-text flex cursor-pointer items-center gap-2.5 rounded-xl border px-3.5 py-2 shadow-lg transition-all duration-200"
	>
		<img
			src="{base}{project.cover}"
			alt=""
			class="h-10 w-10 rounded-lg object-cover"
			loading="lazy"
		/>
		<span class="whitespace-nowrap text-sm font-medium">{project.name}</span>
	</button>
</div>

<style>
	.garland-tag {
		animation: sway var(--sway-duration) ease-in-out var(--sway-delay) infinite;
	}

	.garland-tag:hover {
		animation-play-state: paused;
	}

	.tag-card:hover {
		transform: scale(1.08);
		background-color: var(--color-accent);
		color: var(--color-text-inverse);
		border-color: var(--color-accent);
	}

	@keyframes sway {
		0%,
		100% {
			transform: translate(-50%, -50%) rotate(-1.5deg);
		}
		50% {
			transform: translate(-50%, -50%) rotate(1.5deg);
		}
	}
</style>
