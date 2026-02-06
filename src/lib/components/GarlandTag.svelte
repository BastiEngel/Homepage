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

	let tagEl: HTMLElement | undefined = $state();
	let tiltX = $state(0);
	let tiltY = $state(0);

	function scrollToProject() {
		document.getElementById(project.id)?.scrollIntoView({ behavior: 'smooth' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			scrollToProject();
		}
	}

	function handleMouseMove(e: MouseEvent) {
		if (!tagEl) return;
		const rect = tagEl.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		const dx = (e.clientX - cx) / (rect.width / 2);
		const dy = (e.clientY - cy) / (rect.height / 2);
		tiltY = dx * 15;
		tiltX = -dy * 10;
	}

	function handleMouseLeave() {
		tiltX = 0;
		tiltY = 0;
	}
</script>

<div
	class="garland-tag absolute z-10 hidden -translate-x-1/2 sm:block"
	style="left: {point.x}px; top: {point.y - 20}px; --sway-duration: {swayDuration}s; --sway-delay: {swayDelay}s;"
>
	<div class="relative" style="transform: rotate({tilt}deg);">
		<!-- Garland line passing through the ring -->
		<svg class="garland-through absolute top-0 left-1/2 -translate-x-1/2" width="40" height="40" viewBox="0 0 40 40" fill="none">
			<line x1="0" y1="20" x2="40" y2="20" stroke="var(--color-line)" stroke-width="2" />
		</svg>

		<!-- Back half of ring (behind the tag) -->
		<svg class="ring-back absolute top-0 left-1/2 -translate-x-1/2" width="40" height="40" viewBox="0 0 40 40" fill="none">
			<defs>
				<linearGradient id="ring-b-{index}" x1="0" y1="0" x2="40" y2="40">
					<stop offset="0%" stop-color="#999" />
					<stop offset="50%" stop-color="#ccc" />
					<stop offset="100%" stop-color="#777" />
				</linearGradient>
			</defs>
			<circle cx="20" cy="20" r="15" stroke="url(#ring-b-{index})" stroke-width="3" fill="none" />
		</svg>

		<!-- Tag card — overlaps the bottom of the ring -->
		<button
			bind:this={tagEl}
			onclick={scrollToProject}
			onkeydown={handleKeydown}
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
			class="tag-body relative block cursor-pointer p-0"
			style="margin-top: 26px; transform: perspective(300px) rotateX({tiltX}deg) rotateY({tiltY}deg);"
		>
			<div class="tag-card relative overflow-hidden px-2.5 pb-2.5 pt-4">
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

	.garland-through {
		z-index: 1;
		pointer-events: none;
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
		transition: transform 0.15s ease-out;
		will-change: transform;
	}

	.tag-body:focus-visible .tag-card {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.tag-card {
		background: #1e1e35;
		border: 1px solid rgba(255, 255, 255, 0.08);
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
		outline: 3px solid #1e1e35;
	}

	.thumb {
		background: var(--color-surface-hover);
	}

	.tag-name {
		color: var(--color-tag-text);
	}

	.tag-body:hover .tag-card {
		box-shadow:
			0 8px 25px rgba(0, 0, 0, 0.5),
			0 2px 6px rgba(0, 0, 0, 0.4);
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
