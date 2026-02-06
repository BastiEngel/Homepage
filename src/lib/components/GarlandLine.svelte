<script lang="ts">
	import { tick } from 'svelte';
	import { generateGarlandPath, samplePointsAlongPath, getPathLength } from '$lib/utils/garlandPath';
	import type { GarlandPoint } from '$lib/types';

	interface Props {
		onpoints?: (points: GarlandPoint[]) => void;
		featuredCount?: number;
	}

	let { onpoints, featuredCount = 3 }: Props = $props();

	let pathElement: SVGPathElement | undefined = $state();
	let pathD = $state('');
	let totalLength = $state(0);
	let dashOffset = $state(0);
	let pageWidth = $state(0);
	let pageHeight = $state(0);

	function recalculate() {
		if (typeof document === 'undefined') return;
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
		pathD = generateGarlandPath(pageWidth, pageHeight);
	}

	// Recalculate dimensions on mount, resize, and body size changes
	$effect(() => {
		recalculate();

		const onResize = () => recalculate();
		window.addEventListener('resize', onResize);

		// Recalculate after DOM settles (images, layout shifts)
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

	// Measure path and sample tag points AFTER the DOM has flushed pathD
	$effect(() => {
		if (!pathElement || !pathD) return;

		// tick() waits for Svelte to flush the `d` attribute to the DOM
		tick().then(() => {
			if (!pathElement) return;
			const len = pathElement.getTotalLength();
			if (len <= 0) return;

			totalLength = len;

			if (onpoints && featuredCount > 0) {
				const points = samplePointsAlongPath(pathElement, featuredCount);
				onpoints(points);
			}
		});
	});

	// Scroll-driven draw animation
	// The hero area (~first 15% of the line) is visible on load,
	// the rest draws in progressively as you scroll.
	$effect(() => {
		if (!totalLength) return;

		const heroReveal = 0.15;
		let ticking = false;

		function updateDashOffset() {
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			const scrollFraction = scrollable > 0 ? window.scrollY / scrollable : 0;
			const revealed = heroReveal + scrollFraction * (1 - heroReveal);
			dashOffset = totalLength * (1 - revealed);
			ticking = false;
		}

		function onScroll() {
			if (!ticking) {
				requestAnimationFrame(updateDashOffset);
				ticking = true;
			}
		}

		updateDashOffset();

		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});
</script>

<svg
	bind:this={svgElement}
	class="pointer-events-none absolute top-0 left-0 z-0 hidden sm:block"
	width={pageWidth}
	height={pageHeight}
	aria-hidden="true"
>
	<path
		bind:this={pathElement}
		d={pathD}
		fill="none"
		stroke="var(--color-line)"
		stroke-width="2"
		stroke-dasharray={totalLength}
		stroke-dashoffset={dashOffset}
		style="will-change: stroke-dashoffset;"
	/>
</svg>
