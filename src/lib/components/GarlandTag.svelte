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
	const tilt = -3 + Math.random() * 6;

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
	style="left: {point.x}px; top: {point.y - 10}px; --sway-duration: {swayDuration}s; --sway-delay: {swayDelay}s;"
>
	<!-- Keyring hook: loop that clips onto the line, stem down to the tag -->
	<svg class="mx-auto block" width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
		<defs>
			<linearGradient id="hook-{index}" x1="4" y1="0" x2="20" y2="28">
				<stop offset="0%" stop-color="#aaa" />
				<stop offset="45%" stop-color="#ddd" />
				<stop offset="100%" stop-color="#888" />
			</linearGradient>
		</defs>
		<!-- Ring loop clipping onto the garland line -->
		<path
			d="M 8 10 C 8 3, 16 3, 16 10 C 16 17, 8 17, 8 10"
			stroke="url(#hook-{index})"
			stroke-width="2.5"
			stroke-linecap="round"
			fill="none"
		/>
		<!-- Stem hanging down from the ring to the tag -->
		<line x1="12" y1="17" x2="12" y2="40" stroke="url(#hook-{index})" stroke-width="1.5" stroke-linecap="round" />
	</svg>

	<!-- Tag card -->
	<button
		onclick={scrollToProject}
		onkeydown={handleKeydown}
		class="tag-body relative block cursor-pointer p-0"
		style="transform: rotate({tilt}deg);"
	>
		<div class="tag-card relative overflow-hidden px-2.5 pb-2.5 pt-2.5">
			<div class="thumb mb-1.5 overflow-hidden rounded-sm">
				<img
					src="{base}{project.cover}"
					alt=""
					class="block h-14 w-full object-cover"
					style="min-width: 76px;"
					loading="lazy"
				/>
			</div>
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

	.tag-body {
		border: none;
		background: none;
		outline: none;
		appearance: none;
		-webkit-appearance: none;
	}

	.tag-body:focus-visible .tag-card {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.tag-card {
		background: var(--color-surface);
		border-radius: 4px 4px 8px 8px;
		box-shadow:
			0 3px 10px rgba(0, 0, 0, 0.4),
			0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.thumb {
		background: var(--color-surface-hover);
	}

	.tag-name {
		color: var(--color-tag-text);
	}

	.tag-body:hover .tag-card {
		background: var(--color-accent);
		box-shadow:
			0 6px 20px rgba(0, 0, 0, 0.5),
			0 2px 6px rgba(0, 0, 0, 0.4);
	}

	.tag-body:hover .tag-name {
		color: var(--color-text-inverse);
	}

	.tag-body:hover {
		transform: rotate(0deg) scale(1.08) !important;
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
