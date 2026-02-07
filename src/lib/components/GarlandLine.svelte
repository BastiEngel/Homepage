<script lang="ts">
	import { tick } from 'svelte';
	import { generateGarlandPath, samplePointsAlongPath, sampleNobPoints } from '$lib/utils/garlandPath';
	import type { GarlandPoint } from '$lib/types';

	interface Props {
		onpoints?: (points: GarlandPoint[]) => void;
		featuredCount?: number;
		pathOverride?: string;
		pathViewBox?: string;
		pathScaleX?: number;
		pathScaleY?: number;
		pathOffsetY?: number;
	}

	let {
		onpoints,
		featuredCount = 3,
		pathOverride,
		pathViewBox,
		pathScaleX = 1,
		pathScaleY = 1,
		pathOffsetY = 0
	}: Props = $props();

	let pathElement: SVGPathElement | undefined = $state();
	let pathD = $state('');
	let totalLength = $state(0);
	let heroPathFraction = $state(0.15);
	let dashOffset = $state(0);
	let pageWidth = $state(0);
	let pageHeight = $state(0);
	let heroHeight = $state(0);

	let vbWidth = $derived.by(() => {
		if (!pathViewBox) return 0;
		const parts = pathViewBox.split(/\s+/).map(Number);
		return parts[2] || 0;
	});
	let vbHeight = $derived.by(() => {
		if (!pathViewBox) return 0;
		const parts = pathViewBox.split(/\s+/).map(Number);
		return parts[3] || 0;
	});

	let hasCustomPath = $derived(!!pathViewBox && !!pathOverride);
	let groupTransform = $derived.by(() => {
		if (!hasCustomPath) return undefined;
		const offsetX = vbWidth * (1 - pathScaleX) / 2;
		return `translate(${offsetX}, ${pathOffsetY}) scale(${pathScaleX}, ${pathScaleY})`;
	});

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

	// Measure path and sample tag points after DOM flush.
	// Read reactive dims synchronously so Svelte tracks them as deps;
	// the async tick callback uses the captured snapshots.
	$effect(() => {
		if (!pathElement || !pathD) return;

		const pw = pageWidth;
		const ph = pageHeight;
		const hh = heroHeight;
		const custom = hasCustomPath;
		const vw = vbWidth;
		const vh = vbHeight;
		const sX = pathScaleX;
		const sY = pathScaleY;
		const oY = pathOffsetY;

		function toPixelLocal(x: number, y: number) {
			if (custom && vw && vh && pw && ph) {
				const ox = vw * (1 - sX) / 2;
				return {
					x: (ox + x * sX) * (pw / vw),
					y: (oY + y * sY) * (ph / vh)
				};
			}
			return { x, y };
		}

		tick().then(() => {
			if (!pathElement) return;
			const len = pathElement.getTotalLength();
			if (len <= 0) return;

			totalLength = len;

			const heroInVB = (custom && vh && ph)
				? (hh * (vh / ph) - oY) / sY
				: hh;

			for (let i = 0; i <= 100; i++) {
				const pt = pathElement.getPointAtLength((i / 100) * len);
				if (pt.y > heroInVB) {
					heroPathFraction = i / 100;
					break;
				}
				if (i === 100) heroPathFraction = 1;
			}

			if (onpoints) {
				let points: GarlandPoint[];

				if (custom) {
					points = sampleNobPoints(pathElement, len);

					for (const pt of points) {
						pt.y += 70;
					}

					for (const pt of points) {
						const px = toPixelLocal(pt.x, pt.y);
						pt.x = px.x;
						pt.y = px.y;
					}
				} else {
					points = samplePointsAlongPath(pathElement, featuredCount, heroInVB);
				}

				onpoints(points);
			}
		});
	});

	// Scroll-driven draw animation with smooth interpolation.
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
	viewBox={pathViewBox || undefined}
	preserveAspectRatio={pathViewBox ? 'none' : undefined}
	aria-hidden="true"
>
	{#if groupTransform}
		<g transform={groupTransform}>
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
		</g>
	{:else}
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
	{/if}
</svg>
