<script lang="ts">
	import { tick } from 'svelte';
	import { generateGarlandPath, samplePointsAlongPath, getPathLength } from '$lib/utils/garlandPath';
	import type { GarlandPoint } from '$lib/types';

	interface Props {
		onpoints?: (points: GarlandPoint[]) => void;
		featuredCount?: number;
		pathOverride?: string;
	}

	let { onpoints, featuredCount = 3, pathOverride }: Props = $props();

	let pathElement: SVGPathElement | undefined = $state();
	let pathD = $state('');
	let totalLength = $state(0);
	let heroPathFraction = $state(0.15);
	let dashOffset = $state(0);
	let pageWidth = $state(0);
	let pageHeight = $state(0);
	let heroHeight = $state(0);

	function recalculate() {
		if (typeof document === 'undefined') return;
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
		heroHeight = window.innerHeight;
		if (!pathOverride) {
			pathD = generateGarlandPath(pageWidth, pageHeight, heroHeight);
		}
	}

	$effect(() => {
		if (pathOverride) pathD = pathOverride;
	});

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

		tick().then(() => {
			if (!pathElement) return;
			const len = pathElement.getTotalLength();
			if (len <= 0) return;

			totalLength = len;

			// Figure out what fraction of path length is in the hero
			// by sampling where the path exits the hero viewport
			for (let i = 0; i <= 100; i++) {
				const pt = pathElement.getPointAtLength((i / 100) * len);
				if (pt.y > heroHeight) {
					heroPathFraction = i / 100;
					break;
				}
				if (i === 100) heroPathFraction = 1;
			}

			if (onpoints && featuredCount > 0) {
				const points = samplePointsAlongPath(pathElement, featuredCount, heroHeight);
				onpoints(points);
			}
		});
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
	class="pointer-events-none absolute top-0 left-0 z-[5] hidden sm:block"
	width={pageWidth}
	height={pageHeight}
	aria-hidden="true"
>
	<path
		bind:this={pathElement}
		d={pathD}
		fill="none"
		stroke="var(--color-line)"
		stroke-width="12"
		stroke-linecap="round"
		stroke-dasharray={totalLength}
		stroke-dashoffset={dashOffset}
		style="will-change: stroke-dashoffset;"
	/>
</svg>
