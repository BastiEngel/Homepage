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
	const pathText = marqueeText.repeat(10);

	// Scale all coordinates in a path d string independently per axis.
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

	// Set initial stroke-dashoffset for CSS scroll-driven animation.
	// Starts fully hidden at scroll=0, reveals to fully drawn at scroll=100%.
	$effect(() => {
		if (!pathEl || !totalLength) return;
		pathEl.style.strokeDashoffset = String(totalLength);
	});

	$effect(() => {
		if (!maskPathEl || !totalLength) return;
		// Mask lags slightly so text appears just behind the draw front
		maskPathEl.style.strokeDashoffset = String(totalLength * 1.001);
	});

	onMount(() => {
		const onScroll = () => {
			if (textPathEl && pageHeight > 0) {
				const offset = ((window.scrollY / pageHeight) * 35) % 100;
				textPathEl.setAttribute('startOffset', `${offset.toFixed(1)}%`);
			}
		};

		let timers: ReturnType<typeof setTimeout>[] = [];

		// Fetch path async, but register cleanup synchronously
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
				window.addEventListener('scroll', onScroll, { passive: true });
			})
			.catch(() => {});

		return () => {
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
			stroke-dasharray={totalLength > 0 ? totalLength : '0 999999'}
			class="project-path-anim"
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
						class="project-path-anim"
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

<style>
	@keyframes project-path-reveal {
		to {
			stroke-dashoffset: 0;
		}
	}

	@supports (animation-timeline: scroll()) {
		.project-path-anim {
			animation-name: project-path-reveal;
			animation-timing-function: linear;
			animation-fill-mode: both;
			animation-duration: auto;
			animation-timeline: scroll(root block);
		}
	}
</style>
