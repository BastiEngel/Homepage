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
	let canvasEl: HTMLCanvasElement | undefined = $state();
	let pathD = $state('');
	let totalLength = $state(0);
	let heroPathFraction = $state(0.15);
	let pageWidth = $state(1440);
	let pageHeight = $state(0);
	let heroHeight = $state(0);

	let vwScale = $derived(Math.min(1, pageWidth / 1440));
	let yShift = $derived(-80 * vwScale * vwScale);
	let yScale = $derived(0.85 + 0.15 * vwScale);
	let strokeWidth = $derived(Math.max(18, 36 * Math.min(1, pageWidth / 1440)));
	let fontSize = $derived(Math.max(12, (24 / 0.85) * vwScale));

	const marqueeText = '  \u{1F44B} HEY I\'M BASTIAN. HAVE A LOOK AT MY PROJECTS THAT BRING PEOPLE TOGETHER. :) ';
	const repeatCount = 40;
	const fullText = marqueeText.repeat(repeatCount);
	const chars = [...fullText]; // Unicode-aware split — emoji = 1 element

	// Path lookup table — built once per path change, interpolated per-frame
	let pathLUT: { x: number; y: number; cos: number; sin: number }[] = [];
	let pathLUTStep = 2;
	let pathLUTTotal = 0;

	// Character layout in CSS pixels
	let charCumWidths: number[] = [];
	let oneRepeatPx = 0;

	function buildPathLUT(el: SVGPathElement) {
		const total = el.getTotalLength();
		if (total <= 0) return;
		const step = Math.max(1, Math.round(total / 4000));
		const lut: typeof pathLUT = [];
		for (let d = 0; d < total; d += step) {
			const p1 = el.getPointAtLength(d);
			const p2 = el.getPointAtLength(Math.min(d + step, total));
			const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
			lut.push({ x: p1.x, y: p1.y, cos: Math.cos(angle), sin: Math.sin(angle) });
		}
		pathLUT = lut;
		pathLUTStep = step;
		pathLUTTotal = total;
	}

	function buildCharWidths(ctx: CanvasRenderingContext2D) {
		// Measure in CSS pixel space (identity transform) for consistency with path LUT coords
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.font = `900 ${fontSize}px 'area-inktrap', sans-serif`;
		const cumWidths: number[] = [];
		let cum = 0;
		for (const ch of chars) {
			cumWidths.push(cum);
			cum += ctx.measureText(ch).width + (ch === ' ' ? 12 : 0); // word-spacing: 12
		}
		charCumWidths = cumWidths;
		oneRepeatPx = cum / repeatCount;
	}

	function lutPoint(dist: number) {
		if (pathLUT.length === 0) return { x: 0, y: 0, cos: 1, sin: 0 };
		const t = dist / pathLUTStep;
		const i = Math.min(Math.floor(t), pathLUT.length - 2);
		const frac = t - i;
		const a = pathLUT[i];
		const b = pathLUT[i + 1];
		return {
			x: a.x + (b.x - a.x) * frac,
			y: a.y + (b.y - a.y) * frac,
			cos: a.cos + (b.cos - a.cos) * frac,
			sin: a.sin + (b.sin - a.sin) * frac
		};
	}

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

	// Resize canvas to match layout — also rebuilds char widths on font-size change
	$effect(() => {
		if (!canvasEl || !pageWidth || !pageHeight) return;
		const dpr = window.devicePixelRatio || 1;
		const logicalH = Math.ceil(pageHeight / yScale);
		canvasEl.width = Math.round(pageWidth * dpr);
		canvasEl.height = Math.round(logicalH * dpr);
		canvasEl.style.width = pageWidth + 'px';
		canvasEl.style.height = logicalH + 'px';
		const ctx = canvasEl.getContext('2d');
		if (ctx) buildCharWidths(ctx);
	});

	// Measure path, build LUT, compute fan points after DOM flush
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

			buildPathLUT(pathElement);

			if (canvasEl) {
				const ctx = canvasEl.getContext('2d');
				if (ctx) buildCharWidths(ctx);
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

	// Unified animation loop — direct DOM + Canvas writes, no Svelte state touched per frame
	onMount(() => {
		let running = true;
		let rafId: number;
		let lastTime = 0;
		let currentOffset = -1;
		let prevTotalLength = 0;
		let textStart = 0;

		function loop(now: number) {
			if (!running) return;

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

			// Time-based lerp — consistent at any refresh rate
			const lerpT = 1 - Math.pow(0.88, dt / 16.667);

			const viewBottom = cachedScrollY + cachedInnerH;
			const scrollFraction = cachedPageH > 0 ? Math.min(1, viewBottom / cachedPageH) : 0;
			const ahead = 1.0 + 0.3 * (1 - vwScale);
			const revealed = Math.max(heroPathFraction, Math.min(1, scrollFraction * ahead));
			const targetOffset = tl * (1 - revealed);
			currentOffset += (targetOffset - currentOffset) * lerpT;
			if (Math.abs(currentOffset - targetOffset) < 0.5) currentOffset = targetOffset;

			// Path draw — direct setAttribute, bypasses Svelte scheduler
			if (pathElement) pathElement.setAttribute('stroke-dashoffset', currentOffset.toFixed(1));

			// Canvas text draw
			if (canvasEl && pathLUTTotal > 0 && oneRepeatPx > 0 && charCumWidths.length > 0) {
				const speedPx = pathLUTTotal * 0.00005 * (dt / 16.667);
				textStart = ((textStart - speedPx) % oneRepeatPx + oneRepeatPx) % oneRepeatPx;

				const revealedLength = tl - currentOffset;
				const dpr = window.devicePixelRatio || 1;
				const ctx = canvasEl.getContext('2d')!;

				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

				ctx.font = `900 ${fontSize}px 'area-inktrap', sans-serif`;
				ctx.fillStyle = '#ffffff';
				ctx.textBaseline = 'middle';

				const charsPerRepeat = Math.round(chars.length / repeatCount);
				const repeatsNeeded = Math.ceil((revealedLength + textStart) / oneRepeatPx) + 1;
				outerLoop: for (let r = 0; r < repeatsNeeded; r++) {
					const repOffset = r * oneRepeatPx - textStart;
					for (let j = 0; j < charsPerRepeat; j++) {
						const pathDist = repOffset + charCumWidths[j];
						if (pathDist < 0) continue;
						if (pathDist > revealedLength || pathDist >= pathLUTTotal) break outerLoop;
						const { x, y, cos, sin } = lutPoint(pathDist);
						ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, x * dpr, y * dpr);
						ctx.fillText(chars[j], 0, 4);
					}
				}
			}

			rafId = requestAnimationFrame(loop);
		}

		const onScroll = () => {
			cachedScrollY = window.scrollY;
		};
		window.addEventListener('scroll', onScroll, { passive: true });

		rafId = requestAnimationFrame(loop);
		return () => {
			running = false;
			cancelAnimationFrame(rafId);
			window.removeEventListener('scroll', onScroll);
		};
	});
</script>

<canvas
	bind:this={canvasEl}
	class="pointer-events-none absolute left-0 z-[6]"
	style="top: {yShift}px; transform: scaleY({yScale}); transform-origin: top center;"
	aria-hidden="true"
></canvas>

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
		stroke-width={strokeWidth}
		stroke-linecap="round"
		stroke-dasharray={totalLength > 0 ? totalLength : '0 999999'}
	/>
</svg>
