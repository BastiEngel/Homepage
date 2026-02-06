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
	const variant = (index % 2) + 1;

	// Offset the line segment along the path tangent to thread through one side of the ring
	const angleRad = ((point.angle ?? 0) * Math.PI) / 180;
	const lineOffsetX = Math.cos(angleRad) * -31;
	const lineOffsetY = Math.sin(angleRad) * -31;

	let pendulumEl: HTMLElement | undefined = $state();
	let pushAngle = $state(0);
	let swayAngle = $state(0);
	let hovered = $state(false);
	let swayBlend = 1; // 1 = full sway, 0 = no sway (smooth blend)
	let sheenPos = $derived(50 + (swayAngle + pushAngle) * 3);

	// Idle sway driven by JS for perfect sheen sync
	const swayAmplitude = 6;
	const swaySpeed = (2 * Math.PI) / swayDuration;
	let startTime = 0;
	let swayRunning = false;

	function swayTick(now: number) {
		if (!swayRunning) return;
		if (!startTime) startTime = now + swayDelay * 1000;

		// Smoothly blend sway in/out on hover
		const blendTarget = hovered ? 0 : 1;
		swayBlend += (blendTarget - swayBlend) * 0.04;

		if (now >= startTime) {
			const t = (now - startTime) / 1000;
			swayAngle = Math.sin(t * swaySpeed) * swayAmplitude * swayBlend;
		}
		requestAnimationFrame(swayTick);
	}

	$effect(() => {
		swayRunning = true;
		requestAnimationFrame(swayTick);
		return () => { swayRunning = false; };
	});

	// Spring physics for mouse interaction
	let angle = 0;
	let velocity = 0;
	let target = 0;
	let animating = false;
	const stiffness = 0.08;
	const damping = 0.88;

	function springTick() {
		const force = (target - angle) * stiffness;
		velocity = (velocity + force) * damping;
		angle += velocity;
		pushAngle = angle;

		if (Math.abs(velocity) > 0.05 || Math.abs(target - angle) > 0.05) {
			requestAnimationFrame(springTick);
		} else {
			angle = target;
			velocity = 0;
			pushAngle = target;
			animating = false;
		}
	}

	function startSpring() {
		if (!animating) {
			animating = true;
			requestAnimationFrame(springTick);
		}
	}

	function scrollToProject() {
		document.getElementById(project.id)?.scrollIntoView({ behavior: 'smooth' });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			scrollToProject();
		}
	}

	function handleMouseEnter() {
		hovered = true;
	}

	function handleMouseMove(e: MouseEvent) {
		if (!pendulumEl) return;
		const rect = pendulumEl.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const dx = (e.clientX - cx) / (rect.width / 2);
		target = dx * 22;
		startSpring();
	}

	function handleMouseLeave() {
		hovered = false;
		velocity += velocity * 0.5;
		target = 0;
		startSpring();
	}
</script>

<div
	class="garland-tag absolute z-10 hidden -translate-x-1/2 sm:block"
	style="left: {point.x}px; top: {point.y - 47}px;"
>
	<!-- Line segment through the ring — stays fixed, aligned to path tangent, offset along tangent -->
	<div class="ring-line" style="left: calc(50% + {lineOffsetX}px); top: {47 + lineOffsetY}px; transform: translate(-50%, -50%) rotate({point.angle ?? 0}deg);"></div>

	<div class="sway-layer" style="transform: rotate({swayAngle}deg);">
		<div
			bind:this={pendulumEl}
			class="push-layer"
			style="transform: rotate({pushAngle}deg);"
			onmouseenter={handleMouseEnter}
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
		>
			<button
				onclick={scrollToProject}
				onkeydown={handleKeydown}
				class="tag-btn"
			>
				<!-- Back half of ring (behind the line) -->
				<img
					src="{base}/images/keychain-0{variant}.png"
					alt=""
					class="tag-img ring-back"
					draggable="false"
				/>
				<!-- Cover image visible through the transparent label window -->
				<img
					src="{base}{project.cover}"
					alt={project.name}
					class="tag-cover"
					draggable="false"
				/>
				<div class="tag-sheen" style="background-position: {sheenPos}% 0;"></div>
				<span class="tag-title" class:visible={hovered}>{project.name}</span>
				<!-- Line passes through here (ring-line div above) -->
				<!-- Front half of ring + body (above the line) -->
				<img
					src="{base}/images/keychain-0{variant}.png"
					alt=""
					class="tag-img ring-front"
					draggable="false"
				/>
			</button>
		</div>
	</div>
</div>

<style>
	.sway-layer {
		transform-origin: center 47px;
	}

	.push-layer {
		transform-origin: center 47px;
	}

	.tag-btn {
		position: relative;
		display: block;
		width: 416px;
		height: 416px;
		border: none;
		background: none;
		outline: none;
		appearance: none;
		-webkit-appearance: none;
		cursor: pointer;
		padding: 0;
	}

	.tag-btn:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 4px;
		border-radius: 8px;
	}

	.ring-line {
		position: absolute;
		top: 47px;
		left: 50%;
		width: 36px;
		height: 12px;
		background: var(--color-line);
		border-radius: 6px;
		z-index: 5;
	}

	.tag-img {
		width: 416px;
		height: auto;
		min-height: 416px;
		pointer-events: none;
		user-select: none;
	}

	/* Back half: only the top ring area, behind the line */
	.ring-back {
		position: relative;
		z-index: 1;
		clip-path: inset(0 0 85% 0);
	}

	/* Front half: ring bottom arc + full body, above the line */
	.ring-front {
		position: absolute;
		top: 0;
		left: 0;
		z-index: 10;
		clip-path: inset(8% 0 0 0);
	}

	.tag-cover {
		position: absolute;
		top: 34%;
		left: 39%;
		width: 20%;
		height: 44%;
		object-fit: cover;
		z-index: 2;
		pointer-events: none;
		user-select: none;
	}

	.tag-title {
		position: absolute;
		top: 34%;
		left: 39%;
		width: 20%;
		height: 44%;
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 4;
		writing-mode: vertical-rl;
		text-orientation: mixed;
		font-size: 14px;
		font-weight: 700;
		color: #fff;
		text-align: center;
		line-height: 1.2;
		padding: 4px;
		background: rgba(0, 0, 0, 0.55);
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.25s ease;
		word-break: break-word;
		overflow: hidden;
	}

	.tag-title.visible {
		opacity: 1;
	}

	.tag-sheen {
		position: absolute;
		top: 34%;
		left: 39%;
		width: 20%;
		height: 44%;
		z-index: 3;
		pointer-events: none;
		overflow: hidden;
		background:
			linear-gradient(
				110deg,
				rgba(255, 255, 255, 0) 0%,
				rgba(255, 255, 255, 0) 35%,
				rgba(255, 255, 255, 0.15) 47%,
				rgba(255, 255, 255, 0.2) 50%,
				rgba(255, 255, 255, 0.15) 53%,
				rgba(255, 255, 255, 0) 65%,
				rgba(255, 255, 255, 0) 100%
			);
		background-size: 300% 100%;
	}
</style>
