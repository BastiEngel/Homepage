<script lang="ts">
	import { tick } from 'svelte';
	import { generateGarlandPath, samplePointsAlongPath, sampleNobPoints } from '$lib/utils/garlandPath';
	import type { GarlandPoint } from '$lib/types';

	interface Props {
		onpoints?: (points: GarlandPoint[]) => void;
		featuredCount?: number;
		pathOverride?: string;
		pathViewBox?: string;
		pathScaleY?: number;
		pathOffsetY?: number;
	}

	let {
		onpoints,
		featuredCount = 3,
		pathOverride,
		pathViewBox,
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
	let groupTransform = $derived(
		hasCustomPath ? `translate(0, ${pathOffsetY}) scale(1, ${pathScaleY})` : undefined
	);

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

	// Transform a point from path-local coords to pixel coords
	function toPixel(x: number, y: number): { x: number; y: number } {
		if (hasCustomPath && vbWidth && vbHeight && pageWidth && pageHeight) {
			const ty = pathOffsetY + y * pathScaleY;
			return {
				x: x * (pageWidth / vbWidth),
				y: ty * (pageHeight / vbHeight)
			};
		}
		return { x, y };
	}

	// Measure path and sample tag points after DOM flush
	$effect(() => {
		if (!pathElement || !pathD) return;

		tick().then(() => {
			if (!pathElement) return;
			const len = pathElement.getTotalLength();
			if (len <= 0) return;

			totalLength = len;

			// Hero height in path-local coords (before group transform)
			const heroInVB = (hasCustomPath && vbHeight && pageHeight)
				? (heroHeight * (vbHeight / pageHeight) - pathOffsetY) / pathScaleY
				: heroHeight;

			// Figure out what fraction of path length is in the hero
			for (let i = 0; i <= 100; i++) {
				const pt = pathElement.getPointAtLength((i / 100) * len);
				if (pt.y > heroInVB) {
					heroPathFraction = i / 100;
					break;
				}
				if (i === 100) heroPathFraction = 1;
			}

			if (onpoints && featuredCount > 0) {
				let points: GarlandPoint[];

				if (hasCustomPath) {
					// Use nob detection for custom paths
					const heroLength = heroPathFraction * len;
					const allNobs = sampleNobPoints(pathElement, heroLength);

					// Select evenly-spaced nobs if we have more than needed
					if (allNobs.length <= featuredCount) {
						points = allNobs;
					} else {
						points = [];
						for (let i = 0; i < featuredCount; i++) {
							const idx = Math.round((i / (featuredCount - 1)) * (allNobs.length - 1));
							points.push(allNobs[idx]);
						}
					}

					// Convert from path-local to pixel coords
					for (const pt of points) {
						const px = toPixel(pt.x, pt.y);
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
