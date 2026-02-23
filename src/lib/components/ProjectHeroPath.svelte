<script lang="ts">
	import { tick } from 'svelte';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	interface Props {
		src: string;
	}

	let { src }: Props = $props();

	const SVG_W = 1920;
	const SVG_H = 7737.26;
	const SVG_TOP_OFFSET = 140;

	const marqueeText =
		'\u26BD\uFE0F How can soccer function as a participatory framework for negotiating and experiencing democratic rule- and decision-making among young people?  \u00B7  ';
	const repeatCount = 30;
	const fullText = marqueeText.repeat(repeatCount);
	const chars = [...fullText]; // Unicode-aware split

	function scalePath(d: string, sx: number, sy: number): string {
		let idx = 0;
		return d.replace(/-?\d*\.?\d+/g, (m) => {
			const s = idx % 2 === 0 ? sx : sy;
			idx++;
			return (parseFloat(m) * s).toFixed(2);
		});
	}

	let pathEl: SVGPathElement | undefined = $state();
	let canvasEl: HTMLCanvasElement | undefined = $state();
	let rawPathD = $state('');
	let totalLength = $state(0);
	let pageWidth = $state(1920);
	let pageHeight = $state(0);

	let vwScale = $derived(Math.min(1, pageWidth / 1440));
	let yShift = $derived(-78 * vwScale * vwScale);
	let svgTop = $derived(SVG_TOP_OFFSET + yShift);
	let svgHeight = $derived(SVG_H * (pageWidth / SVG_W));
	let fontSize = $derived(Math.max(12, (24 / 0.85) * vwScale));
	let strokeWidth = $derived(Math.max(18, 36 * Math.min(1, pageWidth / 1440)));

	let pathD = $derived.by(() => {
		if (!rawPathD || !pageWidth || !pageHeight) return '';
		const sx = pageWidth / SVG_W;
		const syFixed = sx * 1.002;
		const syFill = (pageHeight - svgTop) / SVG_H;
		const sy = pageWidth < 768 ? Math.max(syFixed, syFill) : syFixed;
		return scalePath(rawPathD, sx, sy);
	});

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

	function recalc() {
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
	}

	// Resize canvas when dimensions change — also rebuilds char widths on font-size change
	$effect(() => {
		if (!canvasEl || !pageWidth || !svgHeight) return;
		const dpr = window.devicePixelRatio || 1;
		canvasEl.width = Math.round(pageWidth * dpr);
		canvasEl.height = Math.round(svgHeight * dpr);
		canvasEl.style.width = pageWidth + 'px';
		canvasEl.style.height = svgHeight + 'px';
		const ctx = canvasEl.getContext('2d');
		if (ctx) buildCharWidths(ctx);
	});

	// Re-measure path length and rebuild LUT whenever scaled path changes
	$effect(() => {
		if (!pathEl || !pathD) return;
		tick().then(() => {
			if (!pathEl) return;
			const len = pathEl.getTotalLength();
			if (len > 0) {
				totalLength = len;
				buildPathLUT(pathEl);
				if (canvasEl) {
					const ctx = canvasEl.getContext('2d');
					if (ctx) buildCharWidths(ctx);
				}
			}
		});
	});

	onMount(() => {
		let running = true;
		let rafId: number;
		let lastTime = 0;
		let currentOffset = -1;
		let prevTotalLength = 0;
		let textStart = 0;
		let cachedScrollY = window.scrollY;
		let cachedInnerH = window.innerHeight;

		function loop(now: number) {
			if (!running) return;

			const dt = lastTime === 0 ? 16.667 : Math.min(now - lastTime, 50);
			lastTime = now;

			const tl = totalLength;
			if (tl <= 0) {
				rafId = requestAnimationFrame(loop);
				return;
			}

			if (tl !== prevTotalLength) {
				currentOffset = prevTotalLength > 0 ? currentOffset * (tl / prevTotalLength) : tl;
				prevTotalLength = tl;
			}

			// Time-based lerp: consistent at any refresh rate
			const lerpT = 1 - Math.pow(0.88, dt / 16.667);

			const pageH = pageHeight;
			const ahead = 0.45 + 4.0 * (1 - vwScale);
			const scrollFraction =
				pageH > 0 ? Math.min(1, (cachedScrollY + cachedInnerH * ahead) / pageH) : 0;
			const targetOffset = tl * (1 - scrollFraction);
			currentOffset += (targetOffset - currentOffset) * lerpT;
			if (Math.abs(currentOffset - targetOffset) < 0.5) currentOffset = targetOffset;

			// Path draw — direct setAttribute
			if (pathEl) pathEl.setAttribute('stroke-dashoffset', currentOffset.toFixed(1));

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

		let timers: ReturnType<typeof setTimeout>[] = [];

		fetch(`${base}${src}`)
			.then((res) => res.text())
			.then((text) => {
				const parser = new DOMParser();
				const doc = parser.parseFromString(text, 'image/svg+xml');
				const path = doc.querySelector('path');
				if (path) rawPathD = path.getAttribute('d') ?? '';
				recalc();
				timers = [setTimeout(recalc, 300), setTimeout(recalc, 1000)];
				window.addEventListener('resize', recalc, { passive: true });
			})
			.catch(() => {});

		const onScroll = () => { cachedScrollY = window.scrollY; };
		window.addEventListener('scroll', onScroll, { passive: true });

		rafId = requestAnimationFrame(loop);

		return () => {
			running = false;
			cancelAnimationFrame(rafId);
			timers.forEach(clearTimeout);
			window.removeEventListener('resize', recalc);
			window.removeEventListener('scroll', onScroll);
		};
	});
</script>

<canvas
	bind:this={canvasEl}
	class="pointer-events-none absolute left-0 z-[1]"
	style="top: {svgTop}px; mask-image: linear-gradient(to bottom, transparent 0px, black 400px); -webkit-mask-image: linear-gradient(to bottom, transparent 0px, black 400px);"
	aria-hidden="true"
></canvas>

<svg
	class="pointer-events-none absolute left-0 z-0"
	style="top: {svgTop}px;"
	width={pageWidth}
	height={svgHeight}
	overflow="visible"
	aria-hidden="true"
>
	{#if pathD}
		<path
			id="project-hero-path"
			bind:this={pathEl}
			d={pathD}
			fill="none"
			stroke="var(--color-line)"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={totalLength > 0 ? totalLength : '0 999999'}
		/>
	{/if}
</svg>
