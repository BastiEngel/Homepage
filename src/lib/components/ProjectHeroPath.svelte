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
	const pathText = marqueeText.repeat(10);

	function scalePath(d: string, sx: number, sy: number): string {
		let idx = 0;
		return d.replace(/-?\d*\.?\d+/g, (m) => {
			const s = idx % 2 === 0 ? sx : sy;
			idx++;
			return (parseFloat(m) * s).toFixed(2);
		});
	}

	let pathEl: SVGPathElement | undefined = $state();
	let maskPathEl: SVGPathElement | undefined = $state();
	let textPathEl: SVGTextPathElement | undefined = $state();
	let rawPathD = $state('');
	let totalLength = $state(0);
	let pageWidth = $state(1920);
	let pageHeight = $state(0);

	let vwScale = $derived(Math.min(1, pageWidth / 1440));
	let yShift = $derived(-78 * vwScale * vwScale);
	let svgTop = $derived(SVG_TOP_OFFSET + yShift);
	let svgHeight = $derived(SVG_H * (pageWidth / SVG_W));

	let pathD = $derived.by(() => {
		if (!rawPathD || !pageWidth || !pageHeight) return '';
		const sx = pageWidth / SVG_W;
		const syFixed = sx * 1.002;
		const syFill = (pageHeight - svgTop) / SVG_H;
		const sy = pageWidth < 768 ? Math.max(syFixed, syFill) : syFixed;
		return scalePath(rawPathD, sx, sy);
	});

	let strokeWidth = $derived(Math.max(18, 36 * Math.min(1, pageWidth / 1440)));
	let fontSize = $derived(Math.max(12, (24 / 0.85) * vwScale));

	function recalc() {
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
	}

	onMount(() => {
		let running = true;
		let rafId: number;
		let lastTime = 0;
		let currentOffset = -1;
		let prevTotalLength = 0;
		let textOffset = 0;
		let isScrolling = false;
		let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;

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
				pageH > 0 ? Math.min(1, (window.scrollY + window.innerHeight * ahead) / pageH) : 0;
			const targetOffset = tl * (1 - scrollFraction);
			currentOffset += (targetOffset - currentOffset) * lerpT;
			if (Math.abs(currentOffset - targetOffset) < 0.5) currentOffset = targetOffset;

			// Direct DOM writes — no Svelte state touched per frame
			if (pathEl) pathEl.setAttribute('stroke-dashoffset', currentOffset.toFixed(1));
			if (maskPathEl)
				maskPathEl.setAttribute('stroke-dashoffset', (currentOffset + tl * 0.001).toFixed(1));

			// Text: idle marquee only — no glyph layout during scroll
			if (textPathEl && !isScrolling) {
				textOffset = (textOffset + 0.04) % 100;
				const rounded = textOffset.toFixed(1);
				if (textPathEl.getAttribute('startOffset') !== rounded + '%') {
					textPathEl.setAttribute('startOffset', rounded + '%');
				}
			}

			rafId = requestAnimationFrame(loop);
		}

		const onScroll = () => {
			isScrolling = true;
			clearTimeout(scrollEndTimer);
			scrollEndTimer = setTimeout(() => {
				isScrolling = false;
			}, 150);
		};
		window.addEventListener('scroll', onScroll, { passive: true });

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

		rafId = requestAnimationFrame(loop);

		return () => {
			running = false;
			cancelAnimationFrame(rafId);
			clearTimeout(scrollEndTimer);
			timers.forEach(clearTimeout);
			window.removeEventListener('resize', recalc);
			window.removeEventListener('scroll', onScroll);
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

		{#if totalLength > 0}
			<defs>
				<mask id="project-path-reveal-mask">
					<path
						bind:this={maskPathEl}
						d={pathD}
						fill="none"
						stroke="white"
						stroke-width={strokeWidth + 20}
						stroke-linecap="round"
						stroke-dasharray={totalLength}
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
