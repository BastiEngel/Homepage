<script lang="ts">
	import { tick, onMount } from 'svelte';
	import { generateGarlandPath, sampleFanPoints } from '$lib/utils/garlandPath';
	import type { GarlandPoint } from '$lib/types';

	interface Props {
		onpoints?: (points: GarlandPoint[]) => void;
		featuredCount?: number;
	}

	let { onpoints, featuredCount = 3 }: Props = $props();

	let pathElement: SVGPathElement | undefined = $state();
	let maskPathEl: SVGPathElement | undefined = $state();
	let pathD = $state('');
	let totalLength = $state(0);
	let heroPathFraction = $state(0.15);
	let pageWidth = $state(1440);
	let pageHeight = $state(0);
	let textPathEl: SVGTextPathElement | undefined = $state();
	let vwScale = $derived(Math.min(1, pageWidth / 1440));
	let yShift = $derived(-80 * vwScale * vwScale);
	let yScale = $derived(0.85 + 0.15 * vwScale);
	let heroHeight = $state(0);
	const marqueeText =
		'\u{1F44B} I\'M BASTIAN. HAVE A LOOK AT MY PROJECTS THAT BRING PEOPLE TOGETHER. :)  \u00B7  ';
	const pathText = marqueeText.repeat(8);

	let cachedScrollY = 0;
	let cachedPageH = 0;

	function recalculate() {
		if (typeof document === 'undefined') return;
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
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

		window.addEventListener('resize', onResize);

		const timers = [setTimeout(() => recalculate(), 100), setTimeout(() => recalculate(), 500)];

		const ro = new ResizeObserver(() => {
			clearTimeout(resizeTimer);
			resizeTimer = setTimeout(recalculate, 100);
		});
		ro.observe(document.body);

		return () => {
			window.removeEventListener('resize', onResize);
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
				const points = sampleFanPoints(pathElement, featuredCount, hh, pageWidth).map((p) => ({
					...p,
					x: p.x,
					y: p.y * yScale + yShift
				}));
				onpoints(points);
			}
		});
	});

	// Set initial stroke-dashoffset for CSS scroll-driven animation.
	// The CSS animation animates this value → 0 as the user scrolls.
	// Re-runs on resize (totalLength / heroPathFraction change).
	$effect(() => {
		if (!pathElement || !totalLength) return;
		const startOff = totalLength * (1 - heroPathFraction);
		pathElement.style.strokeDashoffset = String(startOff);
	});

	$effect(() => {
		if (!maskPathEl || !totalLength) return;
		// Mask lags the visible path by a tiny amount so text appears just behind the draw front
		const startOff = totalLength * (1 - heroPathFraction);
		maskPathEl.style.strokeDashoffset = String(startOff + totalLength * 0.001);
	});

	// Scroll listener for textPath startOffset — no RAF needed, runs only when scroll changes
	onMount(() => {
		const onScroll = () => {
			cachedScrollY = window.scrollY;
			if (textPathEl && cachedPageH > 0) {
				const offset = (cachedScrollY / cachedPageH * 35) % 100;
				textPathEl.setAttribute('startOffset', `${offset.toFixed(1)}%`);
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
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
		stroke-dasharray={totalLength > 0 ? totalLength : '0 999999'}
		class="garland-path-anim"
	/>
	{#if totalLength > 0}
		<defs>
			<mask id="path-reveal-mask">
				<path
					bind:this={maskPathEl}
					d={pathD}
					fill="none"
					stroke="white"
					stroke-width={Math.max(18, 36 * Math.min(1, pageWidth / 1440)) + 20}
					stroke-linecap="round"
					stroke-dasharray={totalLength}
					class="garland-path-anim"
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
			<textPath href="#garland-path" startOffset="0%" bind:this={textPathEl}>
				{pathText}
			</textPath>
		</text>
	{/if}
</svg>

<style>
	/* CSS scroll-driven animation for stroke-dashoffset.
	   The initial value (from) is set via inline style by JS.
	   No JavaScript runs per frame — the browser handles interpolation.
	   Fallback (no @supports): path is fully drawn (always visible). */
	@keyframes garland-reveal {
		to {
			stroke-dashoffset: 0;
		}
	}

	@supports (animation-timeline: scroll()) {
		.garland-path-anim {
			animation-name: garland-reveal;
			animation-timing-function: linear;
			animation-fill-mode: both;
			animation-duration: auto;
			animation-timeline: scroll(root block);
		}
	}
</style>
