<script lang="ts">
	import { tick, onMount } from 'svelte';
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
	let yShift = $derived(-80 * vwScale * vwScale);
	let yScale = $derived(0.85 + 0.15 * vwScale);
	let heroHeight = $state(0);
	let textOffset = $state(0);
	let textVisible = $state(false);
	let measureEl: SVGTextElement | undefined = $state();
	let marqueeTextLengthPct = 0; // length of ONE repeat in path%, set after measurement
	const marqueeText = '\u{1F44B} I\'M BASTIAN. HAVE A LOOK AT MY PROJECTS THAT BRING PEOPLE TOGETHER. :)  \u00B7  ';
	const repeatedText = marqueeText.repeat(60);

	// Cache layout values to avoid thrashing — updated on scroll/resize via passive listeners
	let cachedScrollY = 0;
	let cachedInnerH = 0;
	let cachedPageH = 0;

	function recalculate() {
		if (typeof document === 'undefined') return;
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
		cachedInnerH = window.innerHeight;
		cachedPageH = pageHeight;
		cachedScrollY = window.scrollY;
		const heroEl = document.querySelector('section.relative[class*="h-"]');
		heroHeight = heroEl ? heroEl.getBoundingClientRect().height : window.innerHeight;
		const effectiveYScale = 0.85 + 0.15 * Math.min(1, pageWidth / 1440);
		pathD = generateGarlandPath(pageWidth, pageHeight / effectiveYScale, heroHeight);
	}

	$effect(() => {
		recalculate();

		let resizeTimer: ReturnType<typeof setTimeout> | undefined;
		const onResize = () => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(recalculate, 100);
		};
		const onScroll = () => { cachedScrollY = window.scrollY; };

		window.addEventListener('resize', onResize);
		window.addEventListener('scroll', onScroll, { passive: true });

		const timers = [
			setTimeout(() => recalculate(), 100),
			setTimeout(() => recalculate(), 500)
		];

		const ro = new ResizeObserver(() => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(recalculate, 100);
		});
		ro.observe(document.body);

		return () => {
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onScroll);
			timers.forEach(clearTimeout);
			clearTimeout(resizeTimer);
			ro.disconnect();
		};
	});

	// Measure path and sample tag points after DOM flush
	$effect(() => {
		if (!pathElement || !pathD) return;
		const hh = heroHeight;

		tick().then(() => {
			if (!pathElement) return;
			const len = pathElement.getTotalLength();
			if (len <= 0) return;

			totalLength = len;

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
					.map(p => ({ ...p, x: p.x, y: p.y * yScale + yShift }));
				onpoints(points);
			}
		});
	});

	// --- Scroll draw animation (reacts to totalLength / heroPathFraction) ---
	$effect(() => {
		if (!totalLength) return;

		// Measure one marqueeText repeat length in path% (once)
		if (marqueeTextLengthPct === 0 && measureEl) {
			const px = measureEl.getComputedTextLength();
			if (px > 0) marqueeTextLengthPct = (px / totalLength) * 100;
		}

		let running = true;
		let rafId: number;
		let lastTime = 0;
		let currentOffset = totalLength * (1 - heroPathFraction);

		function scrollLoop(now: number) {
			if (!running) return;
			const dt = now - lastTime;
			if (dt < 25) { rafId = requestAnimationFrame(scrollLoop); return; }
			lastTime = now;

			const viewBottom = cachedScrollY + cachedInnerH;
			const scrollFraction = cachedPageH > 0 ? Math.min(1, viewBottom / cachedPageH) : 0;
			const ahead = 1.0 + 0.3 * (1 - vwScale);
			const revealed = Math.max(heroPathFraction, Math.min(1, scrollFraction * ahead));
			const targetOffset = totalLength * (1 - revealed);

			currentOffset += (targetOffset - currentOffset) * 0.12;
			if (Math.abs(currentOffset - targetOffset) < 0.5) currentOffset = targetOffset;
			dashOffset = currentOffset;

			rafId = requestAnimationFrame(scrollLoop);
		}

		rafId = requestAnimationFrame(scrollLoop);
		return () => { running = false; cancelAnimationFrame(rafId); };
	});

	// --- Marquee animation (onMount = runs exactly once, never restarted by reactivity) ---
	onMount(() => {
		let running = true;
		let rafId: number;
		let lastTime = 0;
		textVisible = true;

		function marqueeLoop(now: number) {
			if (!running) return;
			const dt = now - lastTime;
			if (dt < 25) { rafId = requestAnimationFrame(marqueeLoop); return; }
			lastTime = now;

			const period = marqueeTextLengthPct > 0 ? marqueeTextLengthPct : 10;

			// Initialise once period is known
			if (textOffset === 0 && period > 0) textOffset = -period;

			// Move in positive direction (text scrolls right), always ≤ 0 so left side stays filled
			textOffset += 0.008 * (dt / 16.67) * 0.67;

			// Seamless reset: at 0% content = content at -period% (same repeat)
			if (textOffset >= 0) textOffset -= period;

			rafId = requestAnimationFrame(marqueeLoop);
		}

		rafId = requestAnimationFrame(marqueeLoop);
		return () => { running = false; cancelAnimationFrame(rafId); };
	});
</script>

<svg
	class="pointer-events-none absolute left-0 z-[5]"
	style="top: {yShift}px; transform: scaleY({yScale}); transform-origin: top center;"
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
	/>
	<!-- Hidden text to measure one marqueeText repeat length -->
	<text
		bind:this={measureEl}
		visibility="hidden"
		font-size={Math.max(12, (24 / 0.85) * vwScale)}
		font-weight="900"
		font-family="'area-inktrap', sans-serif"
	>{marqueeText}</text>

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
			font-weight="900"
			font-family="'area-inktrap', sans-serif"
			dy="0.35em"
			word-spacing="12"
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
