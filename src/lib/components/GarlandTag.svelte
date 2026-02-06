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
	style="left: {point.x}px; top: {point.y - 20}px; --sway-duration: {swayDuration}s; --sway-delay: {swayDelay}s;"
>
	<div class="sway-layer">
		<div
			bind:this={pendulumEl}
			class="push-layer"
			style="transform: rotate({pushAngle}deg);"
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
		>
			<!-- Ring back half -->
			<svg class="ring-back mx-auto block" width="32" height="32" viewBox="0 0 32 32" fill="none">
				<defs>
					<linearGradient id="rb-{index}" x1="0" y1="0" x2="32" y2="32">
						<stop offset="0%" stop-color="#aaa" />
						<stop offset="50%" stop-color="#d0d0d0" />
						<stop offset="100%" stop-color="#888" />
					</linearGradient>
				</defs>
				<circle cx="16" cy="16" r="11" stroke="url(#rb-{index})" stroke-width="3" fill="none" />
			</svg>

			<!-- Acrylic charm -->
			<button
				onclick={scrollToProject}
				onkeydown={handleKeydown}
				class="charm-btn relative mx-auto block cursor-pointer p-0"
			>
				<div class="charm">
					<!-- Hole for ring -->
					<div class="charm-hole"></div>

					<!-- Printed image -->
					<img
						src="{base}{project.cover}"
						alt=""
						class="charm-image"
						loading="lazy"
					/>

					<!-- Project name overlay -->
					<div class="charm-label">
						<span>{project.name}</span>
					</div>

					<!-- Acrylic gloss highlight -->
					<div class="charm-gloss"></div>
				</div>
			</button>

			<!-- Ring front half -->
			<svg class="ring-front absolute left-1/2 -translate-x-1/2" width="32" height="32" viewBox="0 0 32 32" fill="none" style="top: 0;">
				<defs>
					<linearGradient id="rf-{index}" x1="0" y1="0" x2="32" y2="32">
						<stop offset="0%" stop-color="#bbb" />
						<stop offset="50%" stop-color="#e8e8e8" />
						<stop offset="100%" stop-color="#999" />
					</linearGradient>
				</defs>
				<path d="M 7 22 A 11 11 0 1 1 25 22" stroke="url(#rf-{index})" stroke-width="3" stroke-linecap="round" fill="none" />
			</svg>
		</div>
	</div>
</div>

<style>
	.sway-layer {
		transform-origin: center 16px;
		animation: sway var(--sway-duration) ease-in-out var(--sway-delay) infinite;
	}

	.garland-tag:hover .sway-layer {
		animation-play-state: paused;
	}

	.push-layer {
		transform-origin: center 16px;
		transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
	}

	.ring-back {
		position: relative;
		z-index: 0;
	}

	.ring-front {
		z-index: 20;
		pointer-events: none;
	}

	.charm-btn {
		position: relative;
		z-index: 10;
		margin-top: -14px;
		border: none;
		background: none;
		outline: none;
		appearance: none;
		-webkit-appearance: none;
	}

	.charm-btn:focus-visible .charm {
		outline: 2px solid var(--color-accent);
		outline-offset: 2px;
	}

	.charm {
		width: 80px;
		height: 100px;
		position: relative;
		border-radius: 18px;
		overflow: hidden;
		/* Acrylic plastic look */
		background: rgba(255, 255, 255, 0.5);
		border: 3px solid rgba(255, 255, 255, 0.7);
		box-shadow:
			0 4px 16px rgba(0, 0, 0, 0.1),
			0 1px 4px rgba(0, 0, 0, 0.06),
			inset 0 1px 0 rgba(255, 255, 255, 0.8);
	}

	.charm-hole {
		position: absolute;
		top: 4px;
		left: 50%;
		transform: translateX(-50%);
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.4);
		border: 2px solid rgba(255, 255, 255, 0.6);
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.1);
		z-index: 3;
	}

	.charm-image {
		position: absolute;
		inset: 6px;
		width: calc(100% - 12px);
		height: calc(100% - 12px);
		object-fit: cover;
		border-radius: 12px;
	}

	.charm-label {
		position: absolute;
		bottom: 6px;
		left: 6px;
		right: 6px;
		padding: 4px 6px;
		background: rgba(0, 0, 0, 0.55);
		backdrop-filter: blur(4px);
		border-radius: 0 0 12px 12px;
		color: #fff;
		font-size: 10px;
		font-weight: 600;
		text-align: center;
		line-height: 1.2;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		z-index: 2;
	}

	.charm-gloss {
		position: absolute;
		inset: 0;
		border-radius: 18px;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.5) 0%,
			rgba(255, 255, 255, 0.15) 30%,
			transparent 55%,
			rgba(255, 255, 255, 0.05) 100%
		);
		pointer-events: none;
		z-index: 4;
	}

	.charm-btn:hover .charm {
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.14),
			0 2px 8px rgba(0, 0, 0, 0.08),
			inset 0 1px 0 rgba(255, 255, 255, 0.8);
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
