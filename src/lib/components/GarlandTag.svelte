<script lang="ts">
	import type { Project, GarlandPoint } from '$lib/types';
	import { base } from '$app/paths';
	import { addTicker, removeTicker } from '$lib/utils/sharedTicker';

	interface Props {
		project: Project;
		point: GarlandPoint;
		index: number;
		viewportWidth?: number;
		reverseGradient?: boolean;
	}

	let { project, point, index, viewportWidth = 1440, reverseGradient = false }: Props = $props();

	// Custom hand-drawn emoji SVGs, keyed by project id. Falls back to the
	// plain Unicode emoji (project.tagEmoji) for any id without one.
	const EMOJI_FILE: Record<string, string> = {
		'kick-and-vote': 'Kich_and_Vote_Emoji.svg',
		binvisible: 'Binvisible_Emoji.svg',
		myzelfusion: 'Myceliumfusion_Emoji.svg',
		peebee: 'PeeBee_Emoji.svg',
		pivot: 'Pivot_Emoji.svg',
		archive: 'Archive_Emoji.svg',
		about: 'Engel_Bastian_Logo.svg'
	};
	const emojiFile = EMOJI_FILE[project.id];

	const swayDuration = 2.5 + Math.random() * 1.5;
	const swayDelay = Math.random() * 2;
	const variant = (index % 7) + 1;
	const variantPad = String(variant).padStart(2, '0');

	// Per-variant config: [splitBack, splitFront, splitH%, yOffset, labelRotDeg, labelShiftY, labelShiftX]
	const SPLITS: Record<number, number[]> = {
		1: [60, 56, 24.5, 0, 0, 0, 0], 2: [57, 53, 24.5, 4, 0, 0, 0], 7: [57, 53, 24.5, 0, 0, 0, 0],
		3: [54, 50, 24.5, 4, 0, 0, 0], 4: [54, 50, 24.5, 4, 0, 0, 0], 5: [57, 53, 24, 0, 0, 0, 0], 6: [57, 53, 24.5, 0, 0, 0, 0],
	};
	const s = SPLITS[variant] ?? [60, 56, 24.5, 0, 0, 0, 0];
	const [splitBack, splitFront, splitH, yOff, labelRot, labelShiftY, labelShiftX] = s;
	const labelTransform = (labelRot || labelShiftY || labelShiftX) ? `transform: rotate(${labelRot}deg) translate(${labelShiftX}px, ${labelShiftY}px);` : '';

	// Per-variant label-window rect: [top%, left%, width%, height%] — the
	// minimum-area ROTATED rectangle fit to each Keytag_XX.webp's transparent
	// cutout (flood-filled alpha hole, isolated from the ring hole), since
	// several variants are photographed at a slight tilt, so the window isn't
	// axis-aligned. This is the AABB of that rotated rect.
	const WINDOW_RECTS: Record<number, [number, number, number, number]> = {
		1: [35.69, 39.52, 17.79, 40.21],
		2: [35.46, 43.02, 14.25, 41.83],
		3: [35.89, 39.94, 19.19, 42.76],
		4: [35.80, 40.09, 18.84, 41.83],
		5: [35.72, 41.90, 15.43, 40.95],
		6: [35.80, 42.14, 16.05, 41.10],
		7: [36.28, 42.14, 14.98, 39.99]
	};
	// Corners (TL, TR, BR, BL) as % within that AABB — plain rect for the
	// mostly-untilted variants, an actual quadrilateral for 1 and 5 which are
	// visibly rotated/skewed in the source photo.
	const WINDOW_CLIPS: Record<number, string> = {
		1: '14.4% 0%, 100% 2.7%, 84.3% 100%, 0% 92.7%',
		2: '0% 0.6%, 100% 0%, 100% 100%, 0% 97.0%',
		3: '0% 0%, 100% 0%, 100% 98.9%, 1.3% 100%',
		4: '0% 0%, 100% 0%, 100% 100%, 0% 100%',
		5: '0% 0.2%, 98.6% 0%, 100% 98.6%, 1.4% 100%',
		6: '0% 0%, 100% 0%, 100% 98.2%, 0% 100%',
		7: '0% 0%, 100% 0%, 100% 95.9%, 0% 100%'
	};
	const [winTop, winLeft, winWidth, winHeight] = WINDOW_RECTS[variant] ?? WINDOW_RECTS[1];
	const winClip = WINDOW_CLIPS[variant] ?? WINDOW_CLIPS[1];
	const windowRectStyle = `top: ${winTop}%; left: ${winLeft}%; width: ${winWidth}%; height: ${winHeight}%; clip-path: polygon(${winClip});`;
	const windowStyle = `${windowRectStyle} ${labelTransform}`;
	// Shadow drawn as an SVG stroke along the EXACT same points as the paper's
	// clip-path (parsed from winClip) — unlike box-shadow, a stroke follows
	// the true polygon edge precisely for tilted variants too, and this
	// never touches the paper's own clip-path or position.
	const shadowRectStyle = `top: ${winTop}%; left: ${winLeft}%; width: ${winWidth}%; height: ${winHeight}%;`;
	// Points rescaled from 0-100 normalized % into the box's own real
	// width/height ratio, and the SVG viewBox matches that same ratio —
	// otherwise (100x100 viewBox + preserveAspectRatio=none on a tall/narrow
	// box) the blur filter gets stretched non-uniformly per axis, making the
	// top and left shadows look different even with identical stroke-width.
	const winPts = winClip
		.split(',')
		.map((p) => p.trim().replace(/%/g, '').split(' ').map(Number))
		.map(([x, y]) => [(x / 100) * winWidth, (y / 100) * winHeight]);
	const [cTL, cTR, cBR, cBL] = winPts;
	const shadowTopPath = `M${cTR[0]},${cTR[1]} L${cTL[0]},${cTL[1]}`;
	const shadowLeftPath = `M${cTL[0]},${cTL[1]} L${cBL[0]},${cBL[1]}`;
	const shadowWeakPath = `M${cBL[0]},${cBL[1]} L${cBR[0]},${cBR[1]}`; // bottom edge
	// Rotate only the text glyphs (not the paper/clip shape) to match the
	// window's slight photographed tilt.
	const TEXT_ROTATE: Record<number, number> = { 1: 2 };
	const textRotateStyle = TEXT_ROTATE[variant] ? `transform: rotate(${TEXT_ROTATE[variant]}deg);` : '';
	let tagScale = $derived(Math.max(0.4, Math.min(0.9, (viewportWidth || 1440) / 1440 * 0.9)));
	let topY = $derived(point.y - 41 * tagScale + yOff * tagScale - 12 * tagScale);

	const zBack = 2;
	const zFrontBase = 8;
	let hovered = $state(false);
	let zFront = $derived(hovered ? 30 : zFrontBase);

	let pendulumEl: HTMLElement | undefined = $state();
	let swayBlend = 1;

	// Direct-DOM refs for per-frame animation — bypasses Svelte reactive scheduler entirely
	let backSwayEl: HTMLElement | undefined = $state();
	let backPushEl: HTMLElement | undefined = $state();
	let frontSwayEl: HTMLElement | undefined = $state();
	let frontPushEl: HTMLElement | undefined = $state();
	let keyImgEl: HTMLImageElement | undefined = $state();
	let sheenEl: HTMLElement | undefined = $state();

	// Idle sway + spring physics — driven by shared 30fps ticker
	const swayAmplitude = 6;
	const swaySpeed = (2 * Math.PI) / swayDuration;
	const keySwaySpeed = (2 * Math.PI) / (swayDuration * 1.3);
	const keySwayAmplitude = 12;
	let startTime = 0;

	// Spring physics state
	let angle = 0;
	let velocity = 0;
	let target = 0;
	const stiffness = 0.08;
	const damping = 0.88;

	function onTick(now: number) {
		if (!startTime) startTime = now + swayDelay * 1000;

		const blendTarget = hovered ? 0 : 1;
		swayBlend += (blendTarget - swayBlend) * 0.04;

		let swayA = 0, keySwayA = 0;
		if (now >= startTime) {
			const t = (now - startTime) / 1000;
			swayA = Math.sin(t * swaySpeed) * swayAmplitude * swayBlend;
			keySwayA = Math.sin(t * keySwaySpeed + 1.2) * keySwayAmplitude * swayBlend;
		}

		const force = (target - angle) * stiffness;
		velocity = (velocity + force) * damping;
		angle += velocity;
		let pushA = angle;

		if (Math.abs(velocity) < 0.05 && Math.abs(target - angle) < 0.05) {
			angle = target;
			velocity = 0;
			pushA = target;
		}

		const swayT = `rotate(${swayA.toFixed(3)}deg)`;
		const pushT = `rotate(${pushA.toFixed(3)}deg)`;
		if (backSwayEl) backSwayEl.style.transform = swayT;
		if (backPushEl) backPushEl.style.transform = pushT;
		if (frontSwayEl) frontSwayEl.style.transform = swayT;
		if (frontPushEl) frontPushEl.style.transform = pushT;
		if (keyImgEl) keyImgEl.style.transform = `rotate(${(keySwayA - pushA * 0.7).toFixed(3)}deg)`;
		if (sheenEl) sheenEl.style.backgroundPosition = `${(50 + (swayA + pushA) * 3).toFixed(1)}% 0`;
	}

	$effect(() => {
		addTicker(onTick);
		return () => removeTicker(onTick);
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
						src="{base}/images/keytags/Keytag_{variantPad}.webp"
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
						src="{base}/images/key-01.webp"
						alt=""
						class="dangling-key"
						draggable="false"
					/>
					<!-- Right half of ring + full body (in front of the line) -->
					<img
						src="{base}/images/keytags/Keytag_{variantPad}.webp"
						alt=""
						class="tag-img ring-front"
						style="clip-path: polygon({splitFront}% 0, 100% 0, 100% 100%, 0 100%, 0 26%, {splitFront}% {splitH}%);"
						draggable="false"
					/>
					<!-- Text label visible through the transparent label window -->
					<div class="tag-cover tag-cover-text" class:tag-cover-text-reversed={reverseGradient} style={windowStyle}>
						<div class="tag-text-inner" style={textRotateStyle}>
							{#if emojiFile}
							<img class="tag-emoji" class:tag-emoji-logo={project.id === 'about'} src="{base}/emojis/{emojiFile}" alt="" />
						{:else}
							<span class="tag-emoji">{project.tagEmoji}</span>
						{/if}
							<span class="tag-name">{project.name}</span>
						</div>
					</div>
					<svg class="tag-cover tag-shadow" style={shadowRectStyle} viewBox="0 0 {winWidth} {winHeight}">
						<defs>
							<filter id="shadowBlur-{project.id}" x="-50%" y="-50%" width="200%" height="200%">
								<feGaussianBlur stdDeviation="1" />
							</filter>
						</defs>
						<g filter="url(#shadowBlur-{project.id})">
							<path d={shadowTopPath} fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="6" vector-effect="non-scaling-stroke" />
						<path d={shadowLeftPath} fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="6" vector-effect="non-scaling-stroke" />
							<path d={shadowWeakPath} fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="5" vector-effect="non-scaling-stroke" />
						</g>
					</svg>
					<div class="tag-sheen" bind:this={sheenEl} style={windowStyle}></div>
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
		z-index: 2;
		pointer-events: none;
		user-select: none;
	}

	.tag-cover-text {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		gap: 4px;
		background: linear-gradient(90deg, #e9e8e5 0%, #ffffff 100%);
		writing-mode: vertical-rl;
		text-orientation: mixed;
		text-align: center;
		line-height: 1.15;
		padding: 14px 4px 6px 4px;
		overflow: hidden;
	}

	.tag-text-inner {
		display: flex;
		flex-direction: row;
		align-items: center;
		justify-content: flex-start;
		gap: 8px;
	}

	.tag-cover-text-reversed {
		background: linear-gradient(270deg, #e9e8e5 0%, #ffffff 100%);
	}

	/* Rounded helper rect (not clipped to the precise window trapezoid) that
	   exists purely to carry a smooth inset shadow — box-shadow blends
	   naturally around rounded corners, unlike two separately-positioned
	   background-gradient strips which left a visible seam at the corner. */
	.tag-shadow {
		position: absolute;
		z-index: 2;
		pointer-events: none;
		overflow: visible;
	}

	.tag-emoji {
		font-size: 40px;
		line-height: 1;
		display: inline-block;
		width: 40px;
		height: 40px;
		object-fit: contain;
		transform: rotate(90deg);
	}

	.tag-emoji.tag-emoji-logo {
		transform: rotate(0deg);
	}

	.tag-name {
		font-size: 15px;
		font-weight: 700;
		color: #1a1a2e;
		word-break: break-word;
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
				rgba(0, 0, 0, 0) 0%,
				rgba(0, 0, 0, 0) 35%,
				rgba(0, 0, 0, 0.1) 47%,
				rgba(0, 0, 0, 0.14) 50%,
				rgba(0, 0, 0, 0.1) 53%,
				rgba(0, 0, 0, 0) 65%,
				rgba(0, 0, 0, 0) 100%
			);
		background-size: 300% 100%;
	}

	.tag-shell {
		position: relative;
		width: 416px;
		height: 416px;
	}
</style>
