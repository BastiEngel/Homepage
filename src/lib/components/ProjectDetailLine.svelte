<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		pathD: string;
		color: string;
		viewBox?: string;
	}

	let { pathD, color, viewBox = '0 0 1000 3000' }: Props = $props();

	let pathElement: SVGPathElement | undefined = $state();
	let totalLength = $state(0);
	let dashOffset = $state(0);
	let pageWidth = $state(0);
	let pageHeight = $state(0);

	function measure() {
		if (typeof document === 'undefined') return;
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
	}

	$effect(() => {
		measure();

		const onResize = () => measure();
		window.addEventListener('resize', onResize);

		const ro = new ResizeObserver(() => measure());
		ro.observe(document.body);

		return () => {
			window.removeEventListener('resize', onResize);
			ro.disconnect();
		};
	});

	$effect(() => {
		if (!pathElement || !pathD) return;

		tick().then(() => {
			if (!pathElement) return;
			const len = pathElement.getTotalLength();
			if (len > 0) totalLength = len;
		});
	});

	$effect(() => {
		if (!totalLength) return;

		let currentOffset = totalLength;
		let targetOffset = totalLength;
		let rafId: number;
		let running = true;

		function getTargetOffset() {
			const scrollable = document.documentElement.scrollHeight - window.innerHeight;
			const scrollFraction = scrollable > 0 ? window.scrollY / scrollable : 0;
			return totalLength * (1 - scrollFraction);
		}

		function animate() {
			if (!running) return;
			targetOffset = getTargetOffset();
			currentOffset += (targetOffset - currentOffset) * 0.12;
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
	class="pointer-events-none absolute top-0 left-0 z-0 hidden sm:block"
	width={pageWidth}
	height={pageHeight}
	viewBox={viewBox}
	preserveAspectRatio="none"
	aria-hidden="true"
>
	<path
		bind:this={pathElement}
		d={pathD}
		fill="none"
		stroke={color}
		stroke-width="12"
		stroke-linecap="round"
		stroke-dasharray={totalLength}
		stroke-dashoffset={dashOffset}
		style="will-change: stroke-dashoffset;"
	/>
</svg>
