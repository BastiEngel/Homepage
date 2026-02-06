<script lang="ts">
	import type { Project, GarlandPoint } from '$lib/types';
	import { base } from '$app/paths';

	interface Props {
		project: Project;
		point: GarlandPoint;
		index: number;
	}

	let { project, point, index }: Props = $props();

	const swayDuration = 2.5 + Math.random() * 1.5;
	const swayDelay = Math.random() * 2;

	let pendulumEl: HTMLElement | undefined = $state();
	let pushAngle = $state(0);

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
		if (!pendulumEl) return;
		const rect = pendulumEl.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const dx = (e.clientX - cx) / (rect.width / 2);
		pushAngle = dx * 18;
	}

	function handleMouseLeave() {
		pushAngle = 0;
	}
</script>

<div
	class="garland-tag absolute z-10 hidden -translate-x-1/2 sm:block"
	style="left: {point.x}px; top: {point.y - 14}px; --sway-duration: {swayDuration}s; --sway-delay: {swayDelay}s;"
>
	<div class="sway-layer">
		<div
			bind:this={pendulumEl}
			class="push-layer"
			style="transform: rotate({pushAngle}deg);"
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
		>
			<!-- Ring back half (behind tag card) -->
			<svg class="ring-back mx-auto block" width="28" height="28" viewBox="0 0 28 28" fill="none">
				<defs>
					<linearGradient id="rb-{index}" x1="0" y1="0" x2="28" y2="28">
						<stop offset="0%" stop-color="#888" />
						<stop offset="50%" stop-color="#bbb" />
						<stop offset="100%" stop-color="#666" />
					</linearGradient>
				</defs>
				<circle cx="14" cy="14" r="10" stroke="url(#rb-{index})" stroke-width="2.5" fill="none" />
			</svg>

			<!-- Tag card -->
			<button
				onclick={scrollToProject}
				onkeydown={handleKeydown}
				class="tag-body relative mx-auto block cursor-pointer p-0"
			>
				<div class="tag-card">
					<div class="tag-hole"></div>
					<div class="tag-content">
						<img
							src="{base}{project.cover}"
							alt=""
							class="tag-thumb"
							loading="lazy"
						/>
						<span class="tag-name">{project.name}</span>
					</div>
				</div>
			</button>

			<!-- Ring front half (top arc in front of tag) -->
			<svg class="ring-front absolute left-1/2 -translate-x-1/2" width="28" height="28" viewBox="0 0 28 28" fill="none" style="top: 0;">
				<defs>
					<linearGradient id="rf-{index}" x1="0" y1="0" x2="28" y2="28">
						<stop offset="0%" stop-color="#999" />
						<stop offset="50%" stop-color="#ddd" />
						<stop offset="100%" stop-color="#777" />
					</linearGradient>
				</defs>
				<path d="M 6 20 A 10 10 0 1 1 22 20" stroke="url(#rf-{index})" stroke-width="2.5" stroke-linecap="round" fill="none" />
			</svg>
		</div>
	</div>
</div>

<style>
	.sway-layer {
		transform-origin: center 14px;
		animation: sway var(--sway-duration) ease-in-out var(--sway-delay) infinite;
	}

	.garland-tag:hover .sway-layer {
		animation-play-state: paused;
	}

	.push-layer {
		transform-origin: center 14px;
		transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
	}

	.ring-back {
		position: relative;
		z-index: 0;
	}

	.ring-front {
		z-index: 20;
		pointer-events: none;
		filter: drop-shadow(0 1px 1px rgba(0, 0, 0, 0.2));
	}

	.tag-body {
		position: relative;
		z-index: 10;
		margin-top: -10px;
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
		width: 38px;
		height: 100px;
		position: relative;
		background: #e8d5b5;
		border-radius: 6px 6px 10px 10px;
		overflow: hidden;
		box-shadow:
			0 3px 10px rgba(0, 0, 0, 0.4),
			0 1px 3px rgba(0, 0, 0, 0.3);
	}

	.tag-hole {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: transparent;
		box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3);
		outline: 3px solid #e8d5b5;
		position: absolute;
		top: -5px;
		left: 50%;
		transform: translateX(-50%);
		z-index: 2;
	}

	.tag-content {
		position: absolute;
		top: 54%;
		left: 50%;
		transform: translate(-50%, -50%) rotate(90deg);
		width: 78px;
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.tag-thumb {
		width: 32px;
		height: 32px;
		object-fit: cover;
		border-radius: 3px;
		flex-shrink: 0;
		background: #d4c4a0;
	}

	.tag-name {
		color: #2a2015;
		font-size: 10px;
		font-weight: 600;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		max-width: 38px;
	}

	.tag-body:hover .tag-card {
		box-shadow:
			0 6px 20px rgba(0, 0, 0, 0.5),
			0 2px 6px rgba(0, 0, 0, 0.4);
	}

	@keyframes sway {
		0%,
		100% {
			transform: rotate(-6deg);
		}
		50% {
			transform: rotate(6deg);
		}
	}
</style>
