<script lang="ts">
	import { tick } from 'svelte';
	import { generateGarlandPath, sampleFanPoints, getPathLength } from '$lib/utils/garlandPath';
	import type { GarlandPoint } from '$lib/types';

	interface Props {
		onpoints?: (points: GarlandPoint[]) => void;
		featuredCount?: number;
	}

	let { onpoints, featuredCount = 3 }: Props = $props();

	let pathElement: SVGPathElement | undefined = $state();
	let pathD = $state('');
	let totalLength = $state(0);
	let heroPathFraction = $state(0.15);
	let dashOffset = $state(0);
	let pageWidth = $state(1440);
	let pageHeight = $state(0);
	let vwScale = $derived(Math.min(1, pageWidth / 1440));
	let yShift = $derived(-80 * vwScale);
	let yScale = $derived(0.7 + 0.3 * vwScale);
	let heroHeight = $state(0);
	let textOffset = $state(0);
	let textVisible = $state(false);
	const marqueeText = '\u{1F44B} I\'M BASTIAN. HAVE A LOOK AT MY PROJECTS THAT BRING PEOPLE TOGETHER. :)  ·  ';
	const repeatedText = marqueeText.repeat(60);

	function recalculate() {
		if (typeof document === 'undefined') return;
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
		// Use actual hero section height instead of viewport height
		const heroEl = document.querySelector('section.relative[class*="h-"]');
		heroHeight = heroEl ? heroEl.getBoundingClientRect().height : window.innerHeight;
		pathD = generateGarlandPath(pageWidth, pageHeight, heroHeight);
	}

	$effect(() => {
		recalculate();

		const onResize = () => recalculate();
		window.addEventListener('resize', onResize);

		const timers = [
			setTimeout(() => recalculate(), 100),
			setTimeout(() => recalculate(), 500)
		];

		const ro = new ResizeObserver(() => recalculate());
		ro.observe(document.body);

		return () => {
			window.removeEventListener('resize', onResize);
			timers.forEach(clearTimeout);
			ro.disconnect();
		};
	});

	// Measure path and sample tag points after DOM flush
	$effect(() => {
		if (!pathElement || !pathD) return;
		// Track heroHeight so re-sampling fires on vertical resize too
		const hh = heroHeight;

		tick().then(() => {
			if (!pathElement) return;
			const len = pathElement.getTotalLength();
			if (len <= 0) return;

			totalLength = len;

			// Figure out what fraction of path length is in the hero
			// by sampling where the path exits the hero viewport
			for (let i = 0; i <= 100; i++) {
				const pt = pathElement.getPointAtLength((i / 100) * len);
				if (pt.y > hh) {
					heroPathFraction = i / 100;
					break;
				}
				if (i === 100) heroPathFraction = 1;
			}

			if (onpoints && featuredCount > 0) {
				const points = sampleFanPoints(pathElement, featuredCount, hh, pageWidth)
					.map(p => ({ ...p, x: p.x * 0.85 + pageWidth * 0.075, y: p.y * yScale * 0.85 + yShift }));
				onpoints(points);
			}

		});
	});

	// Marquee text animation along path — starts off-screen, flows in
	$effect(() => {
		if (!totalLength) return;
		let running = true;
		let rafId: number;
		const startTime = performance.now();

		// Start far off-screen, don't show until animation begins
		textOffset = -5;
		textVisible = true;

		function tick(now: number) {
			if (!running) return;
			textOffset += 0.005;
				// Seamless loop: reset before text runs out
				if (textOffset > 300) textOffset = -5;
			rafId = requestAnimationFrame(tick);
		}

		rafId = requestAnimationFrame(tick);
		return () => { running = false; cancelAnimationFrame(rafId); };
	});

	// Scroll-driven draw animation with smooth interpolation.
	// The line eases toward the target instead of snapping, and draws
	// slightly ahead of the scroll so it feels responsive.
	$effect(() => {
		if (!totalLength) return;

		let currentOffset = totalLength * (1 - heroPathFraction);
		let targetOffset = currentOffset;
		let rafId: number;
		let running = true;

		function getTargetOffset() {
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			const scrollFraction = scrollable > 0 ? window.scrollY / scrollable : 0;
			const revealed = heroPathFraction + scrollFraction * (1 - heroPathFraction);
			return totalLength * (1 - revealed);
		}

		function animate() {
			if (!running) return;
			targetOffset = getTargetOffset();
			// Smooth lerp — closes 12% of the gap each frame
			currentOffset += (targetOffset - currentOffset) * 0.12;
			// Snap when close enough
			if (Math.abs(currentOffset - targetOffset) < 0.5) {
				currentOffset = targetOffset;
			}
			dashOffset = currentOffset;
			rafId = requestAnimationFrame(animate);
		}

		rafId = requestAnimationFrame(animate);

		return () => {
			running = false;
			cancelAnimationFrame(rafId);
		};
	});
</script>

<svg
	class="pointer-events-none absolute left-0 z-[5]"
	style="top: {yShift}px; transform: scaleX(0.85) scaleY({yScale * 0.85}); transform-origin: top center;"
	width={pageWidth}
	height={pageHeight}
	overflow="visible"
	aria-hidden="true"
>
	<path
		id="garland-path"
		bind:this={pathElement}
		d={pathD}
		fill="none"
		stroke="var(--color-line)"
		stroke-width={Math.max(18, 36 * Math.min(1, pageWidth / 1440))}
		stroke-linecap="round"
		stroke-dasharray={totalLength}
		stroke-dashoffset={dashOffset}
		style="will-change: stroke-dashoffset;"
	/>
	{#if totalLength > 0 && textVisible}
		<defs>
			<mask id="path-reveal-mask">
				<path
					d={pathD}
					fill="none"
					stroke="white"
					stroke-width={Math.max(18, 36 * Math.min(1, pageWidth / 1440)) + 20}
					stroke-linecap="round"
					stroke-dasharray={totalLength}
					stroke-dashoffset={dashOffset + totalLength * 0.001}
				/>
			</mask>
		</defs>
		<text
			fill="#ffffff"
			font-size={Math.max(12, (24 / 0.85) * vwScale)}
			font-weight="700"
			font-family="'Sligoil Micro', sans-serif"
			dominant-baseline="central"
			mask="url(#path-reveal-mask)"
		>
			<textPath
				href="#garland-path"
				startOffset="{textOffset}%"
			>
				{repeatedText}
			</textPath>
		</text>
	{/if}
</svg>
