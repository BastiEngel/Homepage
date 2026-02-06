<script lang="ts">
	import { generateGarlandPath, samplePointsAlongPath, getPathLength } from '$lib/utils/garlandPath';
	import type { GarlandPoint } from '$lib/types';

	interface Props {
		onpoints?: (points: GarlandPoint[]) => void;
		featuredCount?: number;
	}

	let { onpoints, featuredCount = 3 }: Props = $props();

	let svgElement: SVGSVGElement | undefined = $state();
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

	$effect(() => {
		recalculate();

		function onResize() {
			recalculate();
		}

		window.addEventListener('resize', onResize);
		// Recalculate once content has loaded
		const raf = requestAnimationFrame(() => recalculate());

		return () => {
			window.removeEventListener('resize', onResize);
			cancelAnimationFrame(raf);
		};
	});

	// Get path length and sample points once path is rendered
	$effect(() => {
		if (pathElement && pathD) {
			totalLength = getPathLength(pathElement);
			if (onpoints && featuredCount > 0) {
				const points = samplePointsAlongPath(pathElement, featuredCount);
				onpoints(points);
			}
		}
	});

	// Scroll-driven draw animation
	$effect(() => {
		if (!totalLength) return;

		let ticking = false;

		function updateDashOffset() {
			const scrollFraction =
				window.scrollY / (document.documentElement.scrollHeight - window.innerHeight);
			dashOffset = totalLength * (1 - scrollFraction);
			ticking = false;
		}

		function onScroll() {
			if (!ticking) {
				requestAnimationFrame(updateDashOffset);
				ticking = true;
			}
		}

		// Initial
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
