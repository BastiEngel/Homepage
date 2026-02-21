<script lang="ts">
	import type { Project, GarlandPoint } from '$lib/types';
	import { base } from '$app/paths';

	interface Props {
		project: Project;
		point: GarlandPoint;
		index: number;
		viewportWidth?: number;
	}

	let { project, point, index, viewportWidth = 1440 }: Props = $props();

	const swayDuration = 2.5 + Math.random() * 1.5;
	const swayDelay = Math.random() * 2;
	const variant = (index % 7) + 1;
	const variantPad = String(variant).padStart(2, '0');

	// Per-variant config: [splitBack, splitFront, splitH%, yOffset, labelRotDeg, labelShiftY, labelShiftX]
	const SPLITS: Record<number, number[]> = {
		1: [60, 56, 24.5, 0, 3, -4, 0], 2: [57, 53, 24.5, 4, 0, 0, 8], 7: [57, 53, 24.5, 0, 0, 0, 0],
		3: [54, 50, 24.5, 4, 0, 0, 0], 4: [54, 50, 24.5, 4, 0, 0, 0], 5: [57, 53, 24, 0, 0, 0, 0], 6: [57, 53, 24.5, 0, 0, 0, 0],
	};
	const s = SPLITS[variant] ?? [60, 56, 24.5, 0, 0, 0, 0];
	const [splitBack, splitFront, splitH, yOff, labelRot, labelShiftY, labelShiftX] = s;
	const labelTransform = (labelRot || labelShiftY || labelShiftX) ? `transform: rotate(${labelRot}deg) translate(${labelShiftX}px, ${labelShiftY}px);` : '';
	let tagScale = $derived(Math.max(0.4, Math.min(0.9, (viewportWidth || 1440) / 1440 * 0.9)));
	let topY = $derived(point.y - 41 * tagScale + yOff * tagScale - 12 * tagScale);

	const zBack = 2;
	const zFrontBase = 8;
	let zFront = $derived(hovered ? 30 : zFrontBase);

	let pendulumEl: HTMLElement | undefined = $state();
	let hovered = $state(false);
	let swayBlend = 1;

	// Direct-DOM refs for per-frame animation — bypasses Svelte reactive scheduler entirely
	let backSwayEl: HTMLElement | undefined = $state();
	let backPushEl: HTMLElement | undefined = $state();
	let frontSwayEl: HTMLElement | undefined = $state();
	let frontPushEl: HTMLElement | undefined = $state();
	let keyImgEl: HTMLImageElement | undefined = $state();
	let sheenEl: HTMLElement | undefined = $state();

	// Idle sway + spring physics in a single RAF loop
	const swayAmplitude = 6;
	const swaySpeed = (2 * Math.PI) / swayDuration;
	const keySwaySpeed = (2 * Math.PI) / (swayDuration * 1.3);
	const keySwayAmplitude = 12;
	let startTime = 0;
	let running = false;
	let lastFrame = 0;

	// Spring physics state
	let angle = 0;
	let velocity = 0;
	let target = 0;
	const stiffness = 0.08;
	const damping = 0.88;

	function animationLoop(now: number) {
		if (!running) return;

		// Throttle to ~30fps
		if (now - lastFrame < 33) {
			requestAnimationFrame(animationLoop);
			return;
		}
		lastFrame = now;

		if (!startTime) startTime = now + swayDelay * 1000;

		// Sway
		const blendTarget = hovered ? 0 : 1;
		swayBlend += (blendTarget - swayBlend) * 0.04;

		let swayA = 0, keySwayA = 0;
		if (now >= startTime) {
			const t = (now - startTime) / 1000;
			swayA = Math.sin(t * swaySpeed) * swayAmplitude * swayBlend;
			keySwayA = Math.sin(t * keySwaySpeed + 1.2) * keySwayAmplitude * swayBlend;
		}

		// Spring
		const force = (target - angle) * stiffness;
		velocity = (velocity + force) * damping;
		angle += velocity;
		let pushA = angle;

		if (Math.abs(velocity) < 0.05 && Math.abs(target - angle) < 0.05) {
			angle = target;
			velocity = 0;
			pushA = target;
		}

		// Direct DOM writes — no Svelte reactive overhead per frame
		const swayT = `rotate(${swayA.toFixed(3)}deg)`;
		const pushT = `rotate(${pushA.toFixed(3)}deg)`;
		if (backSwayEl) backSwayEl.style.transform = swayT;
		if (backPushEl) backPushEl.style.transform = pushT;
		if (frontSwayEl) frontSwayEl.style.transform = swayT;
		if (frontPushEl) frontPushEl.style.transform = pushT;
		if (keyImgEl) keyImgEl.style.transform = `rotate(${(keySwayA - pushA * 0.7).toFixed(3)}deg)`;
		if (sheenEl) sheenEl.style.backgroundPosition = `${(50 + (swayA + pushA) * 3).toFixed(1)}% 0`;

		requestAnimationFrame(animationLoop);
	}

	$effect(() => {
		running = true;
		requestAnimationFrame(animationLoop);
		return () => { running = false; };
	});

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
	}

	function handleMouseLeave() {
		hovered = false;
		velocity += velocity * 0.5;
		target = 0;
	}
</script>

<!-- Back layer: left half of ring -->
<div
	class="garland-tag-back absolute"
	style="left: {point.x}px; top: {topY}px; z-index: {zBack}; transform: translateX(-50%) scale({tagScale}); transform-origin: top center;"
>
	<div class="fan-layer" style="transform: rotate({point.fanAngle ?? 0}deg);">
		<div class="sway-layer" bind:this={backSwayEl}>
			<div class="push-layer" bind:this={backPushEl}>
				<div class="tag-shell">
					<img
						src="{base}/images/keytags/Keytag_{variantPad}.png?v=2"
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
	class="garland-tag-front absolute"
	style="left: {point.x}px; top: {topY}px; z-index: {zFront}; pointer-events: none; transform: translateX(-50%) scale({tagScale}); transform-origin: top center;"
>
	<div class="fan-layer" style="transform: rotate({point.fanAngle ?? 0}deg);">
		<div class="sway-layer" bind:this={frontSwayEl}>
			<div class="push-layer" bind:this={frontPushEl}>
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
						bind:this={keyImgEl}
						src="{base}/images/key-01.png"
						alt=""
						class="dangling-key"
						draggable="false"
					/>
					<!-- Right half of ring + full body (in front of the line) -->
					<img
						src="{base}/images/keytags/Keytag_{variantPad}.png?v=2"
						alt=""
						class="tag-img ring-front"
						style="clip-path: polygon({splitFront}% 0, 100% 0, 100% 100%, 0 100%, 0 26%, {splitFront}% {splitH}%);"
						draggable="false"
					/>
					<!-- Cover image visible through the transparent label window -->
					{#if project.tagImage}
						<div class="tag-cover tag-cover-logo" style={labelTransform}>
							<img
								src="{base}{project.tagImage}"
								alt={project.name}
								class="tag-logo-img"
								draggable="false"
							/>
						</div>
					{:else}
						<img
							src="{base}{project.cover}"
							alt={project.name}
							class="tag-cover"
							style={labelTransform}
							draggable="false"
						/>
					{/if}
					<div class="tag-sheen" bind:this={sheenEl} style={labelTransform}></div>
					<span class="tag-title" class:visible={hovered} style={labelTransform}>{project.name}</span>
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
		will-change: transform;
	}

	.fan-layer {
		transform-origin: calc(50% + 10px) 25px;
	}

	.sway-layer {
		transform-origin: calc(50% + 10px) 25px;
		will-change: transform;
	}

	.push-layer {
		transform-origin: calc(50% + 10px) 25px;
		will-change: transform;
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
		/* Tight shape matching the keytag: ring at top, narrower body below */
		clip-path: polygon(30% 0%, 70% 0%, 72% 22%, 75% 30%, 75% 90%, 65% 97%, 32% 97%, 22% 90%, 22% 30%, 25% 22%);
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

	.tag-cover-logo {
		object-fit: unset;
		display: flex;
		align-items: center;
		justify-content: center;
		background: white;
		padding: 5%;
	}

	.tag-logo-img {
		width: 100%;
		height: 100%;
		object-fit: contain;
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
