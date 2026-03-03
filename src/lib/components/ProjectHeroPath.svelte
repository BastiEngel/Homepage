<script lang="ts">
	import { tick, onMount } from 'svelte';
	import { base } from '$app/paths';

	interface Props {
		src: string;
		topOffset?: number;
		pathScale?: number;
	}

	let { src, topOffset = 0, pathScale = 1 }: Props = $props();

	// SVG source dimensions — overwritten from viewBox on fetch
	let svgW = $state(1920);
	let svgH = $state(7737.26);
	let rawPathD = $state('');

	let pathEl: SVGPathElement | undefined = $state();
	let totalLength = $state(0);
	let pageWidth  = $state(1440);
	let pageHeight = $state(0);

	// Same derived layout as GarlandLine
	let vwScale     = $derived(Math.min(1, pageWidth / 1440));
	let yShift      = $derived(-78 * vwScale * vwScale);
	let svgTop      = $derived(topOffset + yShift);
	let strokeWidth = $derived(Math.max(18, 36 * vwScale));

	let pathD = $derived.by(() => {
		if (!rawPathD || !pageWidth || !pageHeight) return '';
		const sx = (pageWidth / svgW) * pathScale;
		const sy = sx * 1.002;
		return scalePath(rawPathD, sx, sy);
	});

	function scalePath(d: string, sx: number, sy: number): string {
		let idx = 0;
		return d.replace(/-?\d*\.?\d+/g, (m) => {
			const s = idx % 2 === 0 ? sx : sy;
			idx++;
			return (parseFloat(m) * s).toFixed(2);
		});
	}

	// Cached scroll state — plain vars, same pattern as GarlandLine
	let cachedScrollY = 0;
	let cachedInnerH  = 0;
	let cachedPageH   = 0;

	function recalc() {
		pageWidth    = window.innerWidth;
		pageHeight   = document.documentElement.scrollHeight;
		cachedInnerH = window.innerHeight;
		cachedPageH  = pageHeight;
		cachedScrollY = window.scrollY;
	}

	// Remeasure path length after DOM update
	$effect(() => {
		if (!pathEl || !pathD) return;
		tick().then(() => {
			if (!pathEl) return;
			const len = pathEl.getTotalLength();
			if (len > 0) totalLength = len;
		});
	});

	// Animation loop — identical to GarlandLine's path section
	onMount(() => {
		let running = true;
		let rafId: number;
		let lastTime = 0;
		let currentOffset = -1;
		let prevTotalLength = 0;

		function loop(now: number) {
			if (!running) return;

			const dt = lastTime === 0 ? 16.667 : Math.min(now - lastTime, 50);
			lastTime = now;

			const tl = totalLength;
			if (tl <= 0) { rafId = requestAnimationFrame(loop); return; }

			if (tl !== prevTotalLength) {
				currentOffset = prevTotalLength > 0 ? currentOffset * (tl / prevTotalLength) : tl;
				prevTotalLength = tl;
			}

			const lerpT = 1 - Math.pow(0.88, dt / 16.667);

			const viewBottom     = cachedScrollY + cachedInnerH;
			const scrollFraction = cachedPageH > 0 ? Math.min(1, viewBottom / cachedPageH) : 0;
			const revealed       = Math.min(1, scrollFraction * (0.65 + scrollFraction * 0.35));
			const targetOffset   = tl * (1 - revealed);
			currentOffset += (targetOffset - currentOffset) * lerpT;
			if (Math.abs(currentOffset - targetOffset) < 0.5) currentOffset = targetOffset;

			if (pathEl) pathEl.setAttribute('stroke-dashoffset', currentOffset.toFixed(1));

			rafId = requestAnimationFrame(loop);
		}

		let timers: ReturnType<typeof setTimeout>[] = [];

		fetch(`${base}${src}`)
			.then(r => r.text())
			.then(text => {
				const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
				const vb = doc.querySelector('svg')?.getAttribute('viewBox')?.trim().split(/[\s,]+/);
				if (vb && vb.length >= 4) {
					const w = parseFloat(vb[2]), h = parseFloat(vb[3]);
					if (w > 0 && h > 0) { svgW = w; svgH = h; }
				}
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

<svg
	class="pointer-events-none absolute left-0 z-0"
	style="top: {svgTop}px; transform: scaleY(1); transform-origin: top center; overflow: visible;"
	width={pageWidth}
	height={1}
	aria-hidden="true"
>
	{#if pathD}
		<path
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
