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
	const variant = (index % 7) + 1;
	const variantPad = String(variant).padStart(2, '0');

	// Per-variant ring clip-path split (back right edge / front left edge / split height % / y offset px)
	const SPLITS: Record<number, [number, number, number, number]> = {
		1: [60, 56, 24.5, 0], 2: [57, 53, 24.5, 4], 7: [57, 53, 24.5, 0],
		3: [54, 50, 24.5, 4], 4: [54, 50, 24.5, 4], 5: [57, 53, 25, 0], 6: [57, 53, 24.5, 0],
	};
	const [splitBack, splitFront, splitH, yOff] = SPLITS[variant] ?? [60, 56, 24.5, 0];
	const topY = point.y - 41 + yOff;

	const zBack = 2;
	const zFront = 8;

	let pendulumEl: HTMLElement | undefined = $state();
	let pushAngle = $state(0);
	let swayAngle = $state(0);
	let keySwayAngle = $state(0);
	let hovered = $state(false);
	let swayBlend = 1;
	let sheenPos = $derived(50 + (swayAngle + pushAngle) * 3);

	// Idle sway driven by JS for perfect sheen sync
	const swayAmplitude = 6;
	const swaySpeed = (2 * Math.PI) / swayDuration;
	const keySwaySpeed = (2 * Math.PI) / (swayDuration * 1.3); // slower, out of phase
	const keySwayAmplitude = 12;
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
			keySwayAngle = Math.sin(t * keySwaySpeed + 1.2) * keySwayAmplitude * swayBlend;
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

<!-- Back layer: left half of ring -->
<div
	class="garland-tag-back absolute hidden -translate-x-1/2 sm:block"
	style="left: {point.x}px; top: {topY}px; z-index: {zBack};"
>
	<div class="fan-layer" style="transform: rotate({point.fanAngle ?? 0}deg);">
		<div class="sway-layer" style="transform: rotate({swayAngle}deg);">
			<div class="push-layer" style="transform: rotate({pushAngle}deg);">
				<div class="tag-shell">
					<img
						src="{base}/images/keytags/Keytag_{variantPad}.png"
						alt=""
						class="tag-img ring-back"
						style="clip-path: polygon(0 0, {splitBack}% 0, {splitBack}% {splitH}%, 0 26%);"
						draggable="false"
					/>
				</div>
			</div>
		</div>
	</div>
</div>

<!-- Front layer: right half of ring + body -->
<div
	class="garland-tag-front absolute hidden -translate-x-1/2 sm:block"
	style="left: {point.x}px; top: {topY}px; z-index: {zFront}; pointer-events: none;"
>
	<div class="fan-layer" style="transform: rotate({point.fanAngle ?? 0}deg);">
		<div class="sway-layer" style="transform: rotate({swayAngle}deg);">
			<div
				class="push-layer"
				style="transform: rotate({pushAngle}deg);"
			>
				<button
					bind:this={pendulumEl}
					onclick={scrollToProject}
					onkeydown={handleKeydown}
					onmouseenter={handleMouseEnter}
					onmousemove={handleMouseMove}
					onmouseleave={handleMouseLeave}
					class="tag-btn"
				>
					<!-- Key dangling from the ring hole, behind everything -->
					<img
						src="{base}/images/key-01.png"
						alt=""
						class="dangling-key"
						style="transform: rotate({keySwayAngle - pushAngle * 0.7}deg);"
						draggable="false"
					/>
					<!-- Right half of ring + full body (in front of the line) -->
					<img
						src="{base}/images/keytags/Keytag_{variantPad}.png"
						alt=""
						class="tag-img ring-front"
						style="clip-path: polygon({splitFront}% 0, 100% 0, 100% 100%, 0 100%, 0 26%, {splitFront}% {splitH}%);"
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
				</button>
			</div>
		</div>
	</div>
</div>

<style>
	.dangling-key {
		position: absolute;
		/* Key 240px wide, ~289px tall. Hole at 49.1% x, 13.7% y = (118px, 40px) */
		/* Keychain hole at (197px, 117px), nudged down+left */
		top: 94px;
		left: 82px;
		width: 240px;
		height: auto;
		z-index: 0;
		transform-origin: 49.1% 13.7%;
		pointer-events: none;
		user-select: none;
	}

	.fan-layer {
		transform-origin: calc(50% + 10px) 25px;
	}

	.sway-layer {
		transform-origin: calc(50% + 10px) 25px;
	}

	.push-layer {
		transform-origin: calc(50% + 10px) 25px;
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
		pointer-events: auto;
		/* T-shape: narrow at ring top, full width at body — excludes empty corners */
		clip-path: polygon(25% 0%, 75% 0%, 75% 22%, 100% 22%, 100% 100%, 0% 100%, 0% 22%, 25% 22%);
	}

	.tag-btn:focus-visible {
		outline: 2px solid var(--color-accent);
		outline-offset: 4px;
		border-radius: 8px;
	}

	.tag-img {
		width: 416px;
		height: auto;
		min-height: 416px;
		pointer-events: none;
		user-select: none;
	}

	/* Back layer: left half of ring only */
	.ring-back {
		position: relative;
		z-index: 1;
	}

	/* Front layer: right half of ring + full body below */
	.ring-front {
		position: relative;
		z-index: 10;
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

	.tag-shell {
		position: relative;
		width: 416px;
		height: 416px;
	}
</style>
