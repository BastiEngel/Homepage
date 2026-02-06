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
	const tilt = -2 + Math.random() * 4;

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
	style="left: {point.x}px; top: {point.y - 20}px; --sway-duration: {swayDuration}s; --sway-delay: {swayDelay}s;"
>
	<div class="relative" style="transform: rotate({tilt}deg);">
		<!-- Back half of ring (behind the tag) -->
		<svg class="ring-back absolute top-0 left-1/2 -translate-x-1/2" width="40" height="40" viewBox="0 0 40 40" fill="none">
			<defs>
				<linearGradient id="ring-b-{index}" x1="0" y1="0" x2="40" y2="40">
					<stop offset="0%" stop-color="#999" />
					<stop offset="50%" stop-color="#ccc" />
					<stop offset="100%" stop-color="#777" />
				</linearGradient>
			</defs>
			<!-- Full ring, the tag card will cover the bottom portion -->
			<circle cx="20" cy="20" r="15" stroke="url(#ring-b-{index})" stroke-width="3" fill="none" />
		</svg>

		<!-- Tag card — overlaps the bottom of the ring -->
		<button
			onclick={scrollToProject}
			onkeydown={handleKeydown}
			class="tag-body relative block cursor-pointer p-0"
			style="margin-top: 26px;"
		>
			<div class="tag-card relative overflow-hidden px-2.5 pb-2.5 pt-4">
				<!-- Hole where ring passes through -->
				<div class="tag-hole absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>

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

		<!-- Front half of ring (in front of the tag) — just the top arc -->
		<svg class="ring-front absolute top-0 left-1/2 -translate-x-1/2" width="40" height="40" viewBox="0 0 40 40" fill="none">
			<defs>
				<linearGradient id="ring-f-{index}" x1="0" y1="0" x2="40" y2="40">
					<stop offset="0%" stop-color="#aaa" />
					<stop offset="50%" stop-color="#e0e0e0" />
					<stop offset="100%" stop-color="#888" />
				</linearGradient>
			</defs>
			<!-- Top arc only: from left side up and over to right side -->
			<path
				d="M 8.5 28 A 15 15 0 1 1 31.5 28"
				stroke="url(#ring-f-{index})"
				stroke-width="3"
				stroke-linecap="round"
				fill="none"
			/>
		</svg>
	</div>
</div>

<style>
	.garland-tag {
		transform-origin: top center;
		animation: sway var(--sway-duration) ease-in-out var(--sway-delay) infinite;
	}

	.garland-tag:hover {
		animation-play-state: paused;
	}

	.ring-back {
		z-index: 0;
	}

	.ring-front {
		z-index: 20;
		pointer-events: none;
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
	}

	.tag-body {
		position: relative;
		z-index: 10;
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

	.tag-hole {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: transparent;
		box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
		/* Punch through the tag to reveal the ring behind */
		outline: 3px solid var(--color-surface);
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
		outline-color: var(--color-accent);
	}

	.tag-body:hover {
		transform: scale(1.05) !important;
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
