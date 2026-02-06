<script lang="ts">
	import type { Project, GarlandPoint } from '$lib/types';
	import { base } from '$app/paths';

	interface Props {
		project: Project;
		point: GarlandPoint;
		index: number;
	}

	let { project, point, index }: Props = $props();

	const threadLength = 14 + Math.random() * 12;
	const swayDuration = 3 + Math.random() * 2;
	const swayDelay = Math.random() * 2;
	const tilt = -3 + Math.random() * 6;
	// Each ring gets a slightly different 3D tilt angle
	const ringTilt = 55 + Math.random() * 20;

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

<!-- Offset top by half the ring size so the ring center sits exactly on the line -->
<div
	class="garland-tag absolute z-10 hidden -translate-x-1/2 sm:block"
	style="left: {point.x}px; top: {point.y - 14}px; --sway-duration: {swayDuration}s; --sway-delay: {swayDelay}s;"
>
	<!-- 3D Keyring -->
	<div class="flex justify-center" style="perspective: 120px;">
		<svg
			class="ring"
			width="28"
			height="28"
			viewBox="0 0 28 28"
			style="transform: rotateX({ringTilt}deg); overflow: visible; background: none;"
			fill="none"
		>
			<defs>
				<linearGradient id="ring-grad-{index}" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0%" stop-color="#999" />
					<stop offset="40%" stop-color="#ddd" />
					<stop offset="60%" stop-color="#bbb" />
					<stop offset="100%" stop-color="#888" />
				</linearGradient>
			</defs>
			<circle cx="14" cy="14" r="10" fill="none" stroke="url(#ring-grad-{index})" stroke-width="3" />
		</svg>
	</div>

	<!-- Thread -->
	<div class="thread mx-auto" style="height: {threadLength}px;"></div>

	<!-- Physical tag -->
	<button
		onclick={scrollToProject}
		onkeydown={handleKeydown}
		class="tag-body relative block cursor-pointer border-0 bg-transparent p-0 outline-none transition-transform duration-200"
		style="transform: rotate({tilt}deg); -webkit-appearance: none; appearance: none;"
	>
		<div class="tag-card relative overflow-hidden px-2.5 pb-2.5 pt-5">
			<!-- Punched hole -->
			<div class="tag-hole absolute top-1.5 left-1/2 -translate-x-1/2"></div>

			<!-- Thumbnail -->
			<div class="thumb mb-1.5 overflow-hidden rounded-sm">
				<img
					src="{base}{project.cover}"
					alt=""
					class="block h-14 w-full border-0 object-cover outline-none"
					style="min-width: 76px;"
					loading="lazy"
				/>
			</div>

			<!-- Name -->
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

	.ring {
		transform-style: preserve-3d;
		backface-visibility: hidden;
		background: transparent !important;
		border: none;
		filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.5));
	}

	.thread {
		width: 1px;
		background: linear-gradient(to bottom, #aaa, #777);
	}

	.tag-body {
		border: none;
		background: none;
		outline: none;
	}

	.tag-body:focus-visible .tag-card {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.tag-card {
		background: var(--color-surface);
		border: none;
		border-radius: 4px 4px 8px 8px;
		box-shadow:
			0 3px 10px rgba(0, 0, 0, 0.4),
			0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.tag-card img {
		border: none;
		outline: none;
	}

	.tag-hole {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: var(--color-bg);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
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

	.tag-body:hover .tag-hole {
		background: var(--color-accent-hover);
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
