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
	const sheenDelay = 2 + Math.random() * 3;

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
	style="left: {point.x}px; top: {point.y - 32}px; --sway-duration: {swayDuration}s; --sway-delay: {swayDelay}s; --sheen-delay: {sheenDelay}s;"
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
			<svg class="ring-back mx-auto block" width="64" height="64" viewBox="0 0 64 64" fill="none">
				<defs>
					<linearGradient id="rb-{index}" x1="0" y1="0" x2="64" y2="64">
						<stop offset="0%" stop-color="#aaa" />
						<stop offset="50%" stop-color="#d0d0d0" />
						<stop offset="100%" stop-color="#888" />
					</linearGradient>
				</defs>
				<circle cx="32" cy="32" r="22" stroke="url(#rb-{index})" stroke-width="5" fill="none" />
			</svg>

			<!-- Acrylic charm -->
			<button
				onclick={scrollToProject}
				onkeydown={handleKeydown}
				class="charm-btn relative mx-auto block cursor-pointer p-0"
			>
				<div class="charm">
					<div class="charm-hole"></div>

					<img
						src="{base}{project.cover}"
						alt=""
						class="charm-image"
						loading="lazy"
					/>

					<div class="charm-label">
						<span>{project.name}</span>
					</div>

					<!-- Static gloss -->
					<div class="charm-gloss"></div>
				</div>
			</button>

			<!-- Ring sheen -->
			<div class="ring-sheen"></div>

			<!-- Ring front half -->
			<svg class="ring-front absolute left-1/2 -translate-x-1/2" width="64" height="64" viewBox="0 0 64 64" fill="none" style="top: 0;">
				<defs>
					<linearGradient id="rf-{index}" x1="0" y1="0" x2="64" y2="64">
						<stop offset="0%" stop-color="#bbb" />
						<stop offset="50%" stop-color="#e8e8e8" />
						<stop offset="100%" stop-color="#999" />
					</linearGradient>
				</defs>
				<path d="M 14 44 A 22 22 0 1 1 50 44" stroke="url(#rf-{index})" stroke-width="5" stroke-linecap="round" fill="none" />
			</svg>
		</div>
	</div>
</div>

<style>
	.sway-layer {
		transform-origin: center 32px;
		animation: sway var(--sway-duration) ease-in-out var(--sway-delay) infinite;
	}

	.garland-tag:hover .sway-layer {
		animation-play-state: paused;
	}

	.push-layer {
		transform-origin: center 32px;
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
		margin-top: -24px;
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
		width: 150px;
		height: 190px;
		position: relative;
		border-radius: 24px;
		overflow: hidden;
		background: rgba(255, 255, 255, 0.45);
		border: 4px solid rgba(255, 255, 255, 0.65);
		box-shadow:
			0 6px 24px rgba(0, 0, 0, 0.1),
			0 2px 6px rgba(0, 0, 0, 0.06),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
	}

	.charm-hole {
		position: absolute;
		top: 6px;
		left: 50%;
		transform: translateX(-50%);
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.35);
		border: 2px solid rgba(255, 255, 255, 0.6);
		box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
		z-index: 3;
	}

	.charm-image {
		position: absolute;
		inset: 8px;
		width: calc(100% - 16px);
		height: calc(100% - 16px);
		object-fit: cover;
		border-radius: 16px;
	}

	.charm-label {
		position: absolute;
		bottom: 8px;
		left: 8px;
		right: 8px;
		padding: 6px 8px;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(6px);
		border-radius: 0 0 16px 16px;
		color: #fff;
		font-size: 13px;
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
		border-radius: 24px;
		background: linear-gradient(
			135deg,
			rgba(255, 255, 255, 0.45) 0%,
			rgba(255, 255, 255, 0.1) 35%,
			transparent 55%,
			rgba(255, 255, 255, 0.03) 100%
		);
		pointer-events: none;
		z-index: 4;
	}

	.ring-sheen {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: linear-gradient(
			105deg,
			transparent 30%,
			rgba(255, 255, 255, 0.5) 42%,
			rgba(255, 255, 255, 0.8) 50%,
			rgba(255, 255, 255, 0.5) 58%,
			transparent 70%
		);
		background-size: 300% 100%;
		background-position: 200% 0;
		animation: sheen 4s ease-in-out var(--sheen-delay) infinite;
		pointer-events: none;
		z-index: 25;
	}

	.charm-btn:hover .charm {
		box-shadow:
			0 10px 32px rgba(0, 0, 0, 0.14),
			0 3px 10px rgba(0, 0, 0, 0.08),
			inset 0 1px 0 rgba(255, 255, 255, 0.9);
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

	@keyframes sheen {
		0%,
		70%,
		100% {
			background-position: 200% 0;
		}
		35% {
			background-position: -100% 0;
		}
	}
</style>
