<script lang="ts">
	import { tick } from 'svelte';

	interface Props {
		color: string;
		seed?: number;
		pathOverride?: string;
	}

	let { color, seed = 0, pathOverride }: Props = $props();

	let pathElement: SVGPathElement | undefined = $state();
	let pathD = $state('');
	let totalLength = $state(0);
	let dashOffset = $state(0);
	let pageWidth = $state(0);
	let pageHeight = $state(0);

	/**
	 * Simple seeded pseudo-random (mulberry32) so each project
	 * gets a distinct but deterministic curve.
	 */
	function seededRandom(s: number) {
		let t = s + 0x6d2b79f5;
		return () => {
			t = Math.imul(t ^ (t >>> 15), t | 1);
			t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
			return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
		};
	}

	/**
	 * Catmull-Rom spline to SVG cubic beziers — same as garlandPath.ts
	 */
	function catmullRomToBezier(points: { x: number; y: number }[], tension = 0.75): string {
		if (points.length < 2) return '';
		let d = `M ${points[0].x} ${points[0].y}`;
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[Math.max(0, i - 1)];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[Math.min(points.length - 1, i + 2)];
			const cp1x = p1.x + ((p2.x - p0.x) * tension) / 3;
			const cp1y = p1.y + ((p2.y - p0.y) * tension) / 3;
			const cp2x = p2.x - ((p3.x - p1.x) * tension) / 3;
			const cp2y = p2.y - ((p3.y - p1.y) * tension) / 3;
			d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
		}
		return d;
	}

	function generatePath(width: number, height: number): string {
		const rand = seededRandom(seed);
		const margin = width * 0.08;
		const left = margin;
		const right = width - margin;
		const points: { x: number; y: number }[] = [];

		// Start near top
		const startX = left + rand() * (right - left);
		points.push({ x: startX, y: height * 0.02 });

		// Gentle S-curves down the page, same feel as frontpage below-hero section
		const curves = Math.max(3, Math.round(height / 600));
		const segH = height / curves;

		for (let i = 0; i < curves; i++) {
			const y = (i + 1) * segH;
			// Alternate sides with some randomness, staying within 20%-80% range
			const goLeft = i % 2 === (rand() > 0.5 ? 0 : 1);
			const base = goLeft ? 0.15 + rand() * 0.15 : 0.7 + rand() * 0.15;
			const x = left + (right - left) * base;
			points.push({ x, y });
		}

		return catmullRomToBezier(points, 0.75);
	}

	function recalculate() {
		if (typeof document === 'undefined') return;
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
		if (!pathOverride) {
			pathD = generatePath(pageWidth, pageHeight);
		}
	}

	// If an override path is provided, use it directly
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
