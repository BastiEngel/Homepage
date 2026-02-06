<script lang="ts">
	import type { Project, GarlandPoint } from '$lib/types';
	import { base } from '$app/paths';

	interface Props {
		project: Project;
		point: GarlandPoint;
		index: number;
	}

	let { project, point, index }: Props = $props();

	const threadLength = 12 + Math.random() * 10;
	const swayDuration = 3 + Math.random() * 2;
	const swayDelay = Math.random() * 2;
	const tilt = -3 + Math.random() * 6; // slight random tilt ±3°

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
	class="garland-tag absolute z-10 hidden -translate-x-1/2 sm:block"
	style="left: {point.x}px; top: {point.y}px; --sway-duration: {swayDuration}s; --sway-delay: {swayDelay}s; --tilt: {tilt}deg;"
>
	<!-- Keyring: small ring sitting on the line -->
	<div class="flex justify-center">
		<svg width="16" height="16" viewBox="0 0 16 16" class="ring">
			<circle cx="8" cy="8" r="6" fill="none" stroke="var(--color-text-muted)" stroke-width="2" />
		</svg>
	</div>

	<!-- Short thread from ring to tag -->
	<div class="mx-auto" style="width: 2px; height: {threadLength}px; background: var(--color-text-muted);"></div>

	<!-- Tag card — shaped like a physical luggage/gift tag -->
	<button
		onclick={scrollToProject}
		onkeydown={handleKeydown}
		class="tag-body relative block cursor-pointer border-none p-0 transition-transform duration-200"
		style="transform: rotate({tilt}deg);"
	>
		<!-- Tag shape with punched hole -->
		<div class="tag-card relative overflow-hidden rounded-b-lg rounded-t-sm px-3 pb-3 pt-5">
			<!-- Punched hole -->
			<div class="absolute top-1.5 left-1/2 -translate-x-1/2">
				<div class="tag-hole h-2.5 w-2.5 rounded-full"></div>
			</div>

			<!-- Thumbnail -->
			<img
				src="{base}{project.cover}"
				alt=""
				class="mb-2 h-16 w-full rounded object-cover"
				style="min-width: 80px;"
				loading="lazy"
			/>

			<!-- Project name -->
			<span class="tag-name block text-center text-xs font-semibold leading-tight">{project.name}</span>
		</div>
	</button>
</div>

<style>
	.garland-tag {
		transform-origin: top center;
		animation: sway var(--sway-duration) ease-in-out var(--sway-delay) infinite;
	}

	.garland-tag:hover {
		animation-play-state: paused;
	}

	.tag-card {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.3),
			0 1px 2px rgba(0, 0, 0, 0.2);
	}

	.tag-hole {
		border: 2px solid var(--color-text-muted);
		background: var(--color-bg);
	}

	.tag-name {
		color: var(--color-tag-text);
	}

	.tag-body:hover .tag-card {
		background: var(--color-accent);
		border-color: var(--color-accent);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.4),
			0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.tag-body:hover .tag-name {
		color: var(--color-text-inverse);
	}

	.tag-body:hover .tag-hole {
		border-color: var(--color-text-inverse);
		background: var(--color-accent);
	}

	.tag-body:hover {
		transform: rotate(0deg) scale(1.05) !important;
	}

	.ring {
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.3));
	}

	@keyframes sway {
		0%,
		100% {
			transform: translateX(-50%) rotate(-2deg);
		}
		50% {
			transform: translateX(-50%) rotate(2deg);
		}
	}
</style>
