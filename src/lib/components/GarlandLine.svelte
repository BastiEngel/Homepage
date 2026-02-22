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

	// Cached layout values — updated via passive scroll/resize listeners
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

	// Unified animation loop — direct DOM writes, no Svelte state touched per frame
	onMount(() => {
		let running = true;
		let rafId: number;
		let lastTime = 0;
		let currentOffset = -1;
		let prevTotalLength = 0;
		let textOffset = 0;
		let isScrolling = false;
		let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;

		function loop(now: number) {
			if (!running) return;

			// dt capped at 50ms to avoid large jumps after tab visibility changes
			const dt = lastTime === 0 ? 16.667 : Math.min(now - lastTime, 50);
			lastTime = now;

			const tl = totalLength;
			if (tl <= 0) {
				rafId = requestAnimationFrame(loop);
				return;
			}

			// Proportional re-init on resize
			if (tl !== prevTotalLength) {
				currentOffset =
					prevTotalLength > 0
						? currentOffset * (tl / prevTotalLength)
						: tl * (1 - heroPathFraction);
				prevTotalLength = tl;
			}

			// Time-based lerp: consistent feel at any refresh rate (60 / 120 / 144 Hz)
			const lerpT = 1 - Math.pow(0.88, dt / 16.667);

			const viewBottom = cachedScrollY + cachedInnerH;
			const scrollFraction = cachedPageH > 0 ? Math.min(1, viewBottom / cachedPageH) : 0;
			const ahead = 1.0 + 0.3 * (1 - vwScale);
			const revealed = Math.max(heroPathFraction, Math.min(1, scrollFraction * ahead));
			const targetOffset = tl * (1 - revealed);
			currentOffset += (targetOffset - currentOffset) * lerpT;
			if (Math.abs(currentOffset - targetOffset) < 0.5) currentOffset = targetOffset;

			// Direct setAttribute — bypasses Svelte scheduler, no reconciliation per frame
			if (pathElement)
				pathElement.setAttribute('stroke-dashoffset', currentOffset.toFixed(1));
			if (maskPathEl)
				maskPathEl.setAttribute(
					'stroke-dashoffset',
					(currentOffset + tl * 0.001).toFixed(1)
				);

			// Text: idle marquee only — glyph layout never runs during scroll
			if (textPathEl && !isScrolling) {
				textOffset = (textOffset + 0.04) % 100;
				// setAttribute only when rounded value changes (~every 2-3 frames)
				const rounded = textOffset.toFixed(1);
				if (textPathEl.getAttribute('startOffset') !== rounded + '%') {
					textPathEl.setAttribute('startOffset', rounded + '%');
				}
			}

			rafId = requestAnimationFrame(loop);
		}

		// Detect scroll start/end to pause text animation during scroll
		const onScroll = () => {
			cachedScrollY = window.scrollY;
			isScrolling = true;
			clearTimeout(scrollEndTimer);
			scrollEndTimer = setTimeout(() => {
				isScrolling = false;
			}, 150);
		};
		window.addEventListener('scroll', onScroll, { passive: true });

		rafId = requestAnimationFrame(loop);
		return () => {
			running = false;
			cancelAnimationFrame(rafId);
			clearTimeout(scrollEndTimer);
			window.removeEventListener('scroll', onScroll);
		};
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
