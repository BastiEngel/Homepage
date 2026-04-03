<script lang="ts">
	import { tick, onMount } from 'svelte';
	import { base } from '$app/paths';

	interface Props {
		src: string;
		topOffset?: number;
		pathScale?: number;
		pathScaleX?: number;
		revealSpeed?: number;
	}

	let { src, topOffset = 0, pathScale = 1, pathScaleX = 1, revealSpeed = 1 }: Props = $props();

	let svgW = $state(1920);
	let svgH = $state(7737.26);
	let rawPathD = $state('');

	let pathEl: SVGPathElement | undefined = $state();

	let totalLength = $state(0);
	let pageWidth   = $state(1440);
	let pageHeight  = $state(0);

	let vwScale     = $derived(Math.min(1, pageWidth / 1440));
	let yShift      = $derived(-78 * vwScale * vwScale);
	let svgTop      = $derived(topOffset + yShift);
	let svgLeft     = $derived(pageWidth * (1 - pathScale * pathScaleX) / 2);
	let strokeWidth = $derived(Math.max(18, 36 * vwScale));

	let pathD = $derived.by(() => {
		if (!rawPathD || !pageWidth || !pageHeight) return '';
		const sx = (pageWidth / svgW) * pathScale * pathScaleX;
		const sy = (pageWidth / svgW) * pathScale * 1.002;
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

	// ── Bezier subdivision (only used in non-Safari) ─────────────────────────
	type P   = [number, number];
	type Seg = [P, P, P, P];

	function parseCubics(d: string): Seg[] {
		const tokens = d.match(/[MmCcLlSsQqTtAaZz]|[-+]?[0-9]*\.?[0-9]+(?:[eE][-+]?[0-9]+)?/g) || [];
		const segs: Seg[] = [];
		let cx = 0, cy = 0, i = 0;
		while (i < tokens.length) {
			const cmd = tokens[i++];
			if (cmd === 'M') {
				cx = parseFloat(tokens[i++]); cy = parseFloat(tokens[i++]);
				while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
					cx = parseFloat(tokens[i++]); cy = parseFloat(tokens[i++]);
				}
			} else if (cmd === 'C') {
				while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
					const sx = cx, sy = cy;
					const c1x = parseFloat(tokens[i++]), c1y = parseFloat(tokens[i++]);
					const c2x = parseFloat(tokens[i++]), c2y = parseFloat(tokens[i++]);
					const ex  = parseFloat(tokens[i++]), ey  = parseFloat(tokens[i++]);
					segs.push([[sx,sy],[c1x,c1y],[c2x,c2y],[ex,ey]]);
					cx = ex; cy = ey;
				}
			} else if (cmd === 'c') {
				while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) {
					const sx = cx, sy = cy;
					const dc1x = parseFloat(tokens[i++]), dc1y = parseFloat(tokens[i++]);
					const dc2x = parseFloat(tokens[i++]), dc2y = parseFloat(tokens[i++]);
					const dex  = parseFloat(tokens[i++]), dey  = parseFloat(tokens[i++]);
					segs.push([[sx,sy],[cx+dc1x,cy+dc1y],[cx+dc2x,cy+dc2y],[cx+dex,cy+dey]]);
					cx += dex; cy += dey;
				}
			} else {
				while (i < tokens.length && !/[A-Za-z]/.test(tokens[i])) i++;
			}
		}
		return segs;
	}

	function splitSeg(seg: Seg): [Seg, Seg] {
		const [p0, p1, p2, p3] = seg;
		const q0: P = [(p0[0]+p1[0])*.5, (p0[1]+p1[1])*.5];
		const q1: P = [(p1[0]+p2[0])*.5, (p1[1]+p2[1])*.5];
		const q2: P = [(p2[0]+p3[0])*.5, (p2[1]+p3[1])*.5];
		const r0: P = [(q0[0]+q1[0])*.5, (q0[1]+q1[1])*.5];
		const r1: P = [(q1[0]+q2[0])*.5, (q1[1]+q2[1])*.5];
		const s:  P = [(r0[0]+r1[0])*.5, (r0[1]+r1[1])*.5];
		return [[p0,q0,r0,s],[s,r1,q2,p3]];
	}

	function subdivideAdaptive(seg: Seg, maxLen: number, depth = 0): Seg[] {
		const [p0, , , p3] = seg;
		const dx = p3[0] - p0[0], dy = p3[1] - p0[1];
		if (Math.sqrt(dx*dx + dy*dy) <= maxLen || depth >= 9) return [seg];
		const [a, b] = splitSeg(seg);
		return [...subdivideAdaptive(a, maxLen, depth+1), ...subdivideAdaptive(b, maxLen, depth+1)];
	}

	function buildWavedD(segs: Seg[], sx: number, sy: number, amp: number, freq: number, phase: number): string {
		if (!segs.length) return '';
		const parts: string[] = [];
		for (let i = 0; i < segs.length; i++) {
			const [p0, , , p3] = segs[i];
			const w = Math.sin(i * freq - phase) * amp;
			if (i === 0) parts.push(`M${(p0[0]*sx+w).toFixed(2)},${(p0[1]*sy).toFixed(2)}`);
			parts.push(`L${(p3[0]*sx+w).toFixed(2)},${(p3[1]*sy).toFixed(2)}`);
		}
		return parts.join('');
	}

	$effect(() => {
		if (!pathEl || !pathD) return;
		tick().then(() => {
			if (!pathEl) return;
			const len = pathEl.getTotalLength();
			if (len > 0) totalLength = len;
		});
	});

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

	onMount(() => {
		const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
		const speed = revealSpeed; // snapshot prop — avoids reactive closure issues

		let running = true;
		let rafId: number;
		let lastTime = 0;
		let currentOffset = -1;
		let prevTotalLength = 0;
		let wavePhase = 0;
		let subdivSegs: Seg[] = [];

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

			const lerpT          = 1 - Math.pow(0.88, dt / 16.667);
			const viewBottom     = cachedScrollY + cachedInnerH;
			const scrollFraction = cachedPageH > 0 ? Math.min(1, viewBottom / cachedPageH) : 0;
			const sf             = Math.min(1, scrollFraction * speed);
			const revealed       = sf * (0.65 + sf * 0.35);
			const targetOffset   = tl * (1 - revealed);
			currentOffset += (targetOffset - currentOffset) * lerpT;
			if (Math.abs(currentOffset - targetOffset) < 0.5) currentOffset = targetOffset;

			if (isSafari) {
				// Safari: static d, only update dashoffset — identical to K&V
				if (pathEl) pathEl.setAttribute('stroke-dashoffset', currentOffset.toFixed(1));
			} else {
				// Other browsers: wave animation — update d first, then dashoffset
				wavePhase = (wavePhase + 5 * dt * 0.001) % (Math.PI * 2);
				if (pathEl && subdivSegs.length) {
					const sx  = (pageWidth / svgW) * pathScale * pathScaleX;
					const sy  = (pageWidth / svgW) * pathScale * 1.002;
					pathEl.setAttribute('d', buildWavedD(subdivSegs, sx, sy, strokeWidth * 0.09, 1.8, wavePhase));
				}
				if (pathEl) pathEl.setAttribute('stroke-dashoffset', currentOffset.toFixed(1));
			}

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
				if (path) {
					rawPathD = path.getAttribute('d') ?? '';
					if (!isSafari) {
						const raw = parseCubics(rawPathD);
						subdivSegs = raw.flatMap(seg => subdivideAdaptive(seg, 15));
					}
				}
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
	class="pointer-events-none absolute z-0"
	style="top: {svgTop}px; left: {svgLeft}px; transform: scaleY(1); transform-origin: top center; overflow: visible;"
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
			stroke-linejoin="round"
			stroke-dasharray={totalLength > 0 ? totalLength : '0 999999'}
		/>
	{/if}
</svg>
