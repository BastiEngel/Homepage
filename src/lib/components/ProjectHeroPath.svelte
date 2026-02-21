<script lang="ts">
	import { tick } from 'svelte';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';

	interface Props {
		src: string;
	}

	let { src }: Props = $props();

	// Original SVG coordinate space (from viewBox)
	const SVG_W = 1920;
	const SVG_H = 7737.26;
	const SVG_TOP_OFFSET = 140; // base vertical offset in px

	const marqueeText =
		'\u26BD\uFE0F How can soccer function as a participatory framework for negotiating and experiencing democratic rule- and decision-making among young people?  \u00B7  ';
	// Static text — no per-frame startOffset animation (SVG textPath glyph layout is CPU-only, not GPU-composited)
	const pathText = marqueeText.repeat(10);

	// Scale all coordinates in a path d string independently per axis.
	// Works for M x,y followed by relative c commands (alternating x/y numbers).
	function scalePath(d: string, sx: number, sy: number): string {
		let idx = 0;
		return d.replace(/-?\d*\.?\d+/g, (m) => {
			const s = idx % 2 === 0 ? sx : sy;
			idx++;
			return (parseFloat(m) * s).toFixed(2);
		});
	}

	let pathEl: SVGPathElement | undefined = $state();
	let textPathEl: SVGTextPathElement | undefined = $state();
	let rawPathD = $state(''); // original coordinates from SVG file
	let totalLength = $state(0);
	let dashOffset = $state(0);
	let pageWidth = $state(1920);
	let pageHeight = $state(0);

	let vwScale = $derived(Math.min(1, pageWidth / 1440));
	let yShift = $derived(-78 * vwScale * vwScale);
	let svgTop = $derived(SVG_TOP_OFFSET + yShift);
	// Natural proportional SVG height (used for element size — avoids page-height feedback loop)
	let svgHeight = $derived(SVG_H * (pageWidth / SVG_W));

	// Rubber-band path scaling:
	// sx always uniform with viewport width.
	// sy = sx at 1920px (reference unchanged); at narrower widths, stretches only as much as
	// needed to reach the page bottom — never compresses below the reference appearance.
	let pathD = $derived.by(() => {
		if (!rawPathD || !pageWidth || !pageHeight) return '';
		const sx = pageWidth / SVG_W;
		const syFixed = sx * 1.002;
		const syFill = (pageHeight - svgTop) / SVG_H; // fills page to bottom
		// Mobile (<768px): rubber-band to fill page; desktop: use fixed proportion
		const sy = pageWidth < 768 ? Math.max(syFixed, syFill) : syFixed;
		return scalePath(rawPathD, sx, sy);
	});

	// Stroke and font directly in viewport px — no viewBox conversion needed
	let strokeWidth = $derived(Math.max(18, 36 * Math.min(1, pageWidth / 1440)));
	let fontSize = $derived(Math.max(12, (24 / 0.85) * vwScale));

	function recalc() {
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
	}

	onMount(async () => {
		// Fetch and parse the SVG path
		try {
			const res = await fetch(`${base}${src}`);
			const text = await res.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(text, 'image/svg+xml');
			const path = doc.querySelector('path');
			if (path) rawPathD = path.getAttribute('d') ?? '';
		} catch {
			// silently fail
		}

		recalc();
		// Re-measure after images may have changed page height
		const timers = [setTimeout(recalc, 300), setTimeout(recalc, 1000)];
		window.addEventListener('resize', recalc, { passive: true });

		// --- Unified animation loop: marquee + scroll-draw in one RAF ---
		let running = true;
		let rafId: number;
		let lastTime = 0;
		let currentOffset = -1; // -1 = uninitialized
		let prevTotalLength = 0;
		let lastScrollForText = -1;

		function loop(now: number) {
			if (!running) return;
			const dt = now - lastTime;
			if (dt < 25) { rafId = requestAnimationFrame(loop); return; }
			lastTime = now;

			const tl = totalLength;
			if (tl <= 0) { rafId = requestAnimationFrame(loop); return; }

			// Reinitialize proportionally on resize
			if (tl !== prevTotalLength) {
				currentOffset = prevTotalLength > 0 ? currentOffset * (tl / prevTotalLength) : tl;
				prevTotalLength = tl;
			}

			// Scroll-draw only — no marquee animation (SVG textPath is CPU-only, not GPU)
			const pageH = pageHeight;
			const ahead = 0.45 + 4.0 * (1 - vwScale);
			const scrollFraction =
				pageH > 0 ? Math.min(1, (window.scrollY + window.innerHeight * ahead) / pageH) : 0;
			const targetOffset = tl * (1 - scrollFraction);
			currentOffset += (targetOffset - currentOffset) * 0.12;
			if (Math.abs(currentOffset - targetOffset) < 0.5) currentOffset = targetOffset;
			dashOffset = currentOffset;

			// Shift text along path on scroll — direct setAttribute bypasses Svelte scheduler.
			// Only recalculates SVG glyph layout when scrollY actually changes (not every frame).
			const curScrollY = window.scrollY;
			if (textPathEl && curScrollY !== lastScrollForText) {
				lastScrollForText = curScrollY;
				const offset = pageHeight > 0 ? ((curScrollY / pageHeight) * 35) % 100 : 0;
				textPathEl.setAttribute('startOffset', `${offset.toFixed(1)}%`);
			}

			rafId = requestAnimationFrame(loop);
		}

		rafId = requestAnimationFrame(loop);

		return () => {
			running = false;
			cancelAnimationFrame(rafId);
			timers.forEach(clearTimeout);
			window.removeEventListener('resize', recalc);
		};
	});

	// Re-measure path length whenever scaled path changes
	$effect(() => {
		if (!pathEl || !pathD) return;
		tick().then(() => {
			if (!pathEl) return;
			const len = pathEl.getTotalLength();
			if (len > 0) totalLength = len;
		});
	});
</script>

<!-- No viewBox: coordinates are in viewport px, stroke-width is in viewport px -->
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
			stroke-dasharray={totalLength}
			stroke-dashoffset={dashOffset}
		/>

		{#if totalLength > 0}
			<defs>
				<mask id="project-path-reveal-mask">
					<path
						d={pathD}
						fill="none"
						stroke="white"
						stroke-width={strokeWidth + 20}
						stroke-linecap="round"
						stroke-dasharray={totalLength}
						stroke-dashoffset={dashOffset + totalLength * 0.001}
					/>
				</mask>
			</defs>
			<text
				fill="#ffffff"
				font-size={fontSize}
				font-weight="900"
				font-family="'area-inktrap', sans-serif"
				dy="0.35em"
				word-spacing="12"
				mask="url(#project-path-reveal-mask)"
			>
				<textPath href="#project-hero-path" startOffset="0%" bind:this={textPathEl}>
					{pathText}
				</textPath>
			</text>
		{/if}
	{/if}
</svg>
