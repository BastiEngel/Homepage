<script lang="ts">
	import { tick, onMount } from 'svelte';
	import { base } from '$app/paths';

	interface Props {
		src: string;
		topOffset?: number;
		pathScale?: number;
		pathScaleY?: number;
	}

	let { src, topOffset = 0, pathScale = 1, pathScaleY = 1 }: Props = $props();

	let svgW = $state(1909.03);
	let svgH = $state(10543.49);
	let rawMainD = $state('');
	let rawBranchDs = $state<string[]>([]);

	let svgEl: SVGSVGElement | undefined = $state();
	let mainPathEl: SVGPathElement | undefined = $state();
	let mainTotalLength = $state(0);

	let pageWidth = $state(1440);
	let pageHeight = $state(0);

	let vwScale = $derived(Math.min(1, pageWidth / 1440));
	let yShift = $derived(-78 * vwScale * vwScale);
	let svgTop = $derived(topOffset + yShift);
	let strokeWidth = $derived(Math.max(18, 36 * vwScale));
	let sx = $derived((pageWidth / svgW) * pathScale);
	let sy = $derived(sx * 1.002 * pathScaleY);

	function scalePath(d: string, scaleX: number, scaleY: number): string {
		let idx = 0;
		return d.replace(/-?\d*\.?\d+/g, (m) => {
			const s = idx % 2 === 0 ? scaleX : scaleY;
			idx++;
			return (parseFloat(m) * s).toFixed(2);
		});
	}

	let mainPathD = $derived(rawMainD && pageWidth && pageHeight ? scalePath(rawMainD, sx, sy) : '');
	let branchPathDs = $derived(rawBranchDs.map((d) => scalePath(d, sx, sy)));

	let cachedScrollY = 0;
	let cachedInnerH = 0;
	let cachedPageH = 0;
	let cachedSy = 1;
	let cachedSvgTop = 0;

	function recalc() {
		pageWidth = window.innerWidth;
		pageHeight = document.documentElement.scrollHeight;
		cachedInnerH = window.innerHeight;
		cachedPageH = pageHeight;
		cachedScrollY = window.scrollY;
		const vwS = Math.min(1, pageWidth / 1440);
		cachedSy = (pageWidth / svgW) * pathScale * 1.002;
		cachedSvgTop = topOffset + (-78 * vwS * vwS);
	}

	$effect(() => {
		if (!mainPathEl || !mainPathD) return;
		tick().then(() => {
			if (!mainPathEl) return;
			const len = mainPathEl.getTotalLength();
			if (len > 0) mainTotalLength = len;
		});
	});

	onMount(() => {
		let running = true;
		let rafId: number;
		let lastTime = 0;
		let currentMainOffset = -1;
		let prevTotalLength = 0;
		let prevRevealedLength = 0;

		// Branch state — populated once DOM is ready
		type LUTEntry = { x: number; y: number };
		let mainLUT: LUTEntry[] = [];
		let mainLUTStep = 2;
		let branchEls: SVGPathElement[] = [];
		let branchLengths: number[] = [];
		let branchParents: number[] = [];      // -1 = main path, >=0 = index of parent branch
		let branchTriggers: number[] = [];     // distance along parent path at junction
		let branchReveals: number[] = [];      // 0 = hidden → length = fully shown
		let branchTriggered: boolean[] = [];
		let branchReverse: boolean[] = [];     // true = animate end→start (top-to-bottom)
		let branchDataBuilt = false;

		function buildMainLUT() {
			if (!mainPathEl) return;
			const total = mainPathEl.getTotalLength();
			if (total <= 0) return;
			const step = Math.max(1, Math.round(total / 2000));
			mainLUT = [];
			for (let d = 0; d < total; d += step) {
				const p = mainPathEl.getPointAtLength(d);
				mainLUT.push({ x: p.x, y: p.y });
			}
			mainLUTStep = step;
		}

		function buildBranchData() {
			if (!svgEl || !mainPathEl || mainLUT.length === 0) return;
			const allPaths = svgEl.querySelectorAll('path');
			if (allPaths.length < 2) return;

			branchEls = Array.from(allPaths).slice(1) as SVGPathElement[];
			const n = branchEls.length;
			branchLengths = new Array(n);
			branchParents = new Array(n);
			branchTriggers = new Array(n);
			branchReveals = new Array(n).fill(0);
			branchTriggered = new Array(n).fill(false);
			branchReverse = new Array(n);

			// Sample each branch for parent-detection (used by other branches)
			const branchSamples: { x: number; y: number; d: number }[][] = [];
			for (let i = 0; i < n; i++) {
				const len = branchEls[i].getTotalLength();
				branchLengths[i] = len;
				const step = Math.max(1, Math.round(len / 200));
				const samples: { x: number; y: number; d: number }[] = [];
				for (let d = 0; d <= len; d += step) {
					const p = branchEls[i].getPointAtLength(d);
					samples.push({ x: p.x, y: p.y, d });
				}
				branchSamples.push(samples);
			}

			// Pass 1: find junction endpoint (start or end) by min distance to parent.
			// junctionOnParentRaw = distance from START of parent path to junction point.
			const junctionOnParentRaw = new Array(n).fill(0);

			for (let i = 0; i < n; i++) {
				const el = branchEls[i];
				const L = branchLengths[i];
				const startPt = el.getPointAtLength(0);
				const endPt   = el.getPointAtLength(L);

				let bestDistS = Infinity, triggerS = 0, parentS = -1;
				let bestDistE = Infinity, triggerE = 0, parentE = -1;

				// Check main path for both endpoints
				for (let j = 0; j < mainLUT.length; j++) {
					const t = j * mainLUTStep;
					const dxS = mainLUT[j].x - startPt.x, dyS = mainLUT[j].y - startPt.y;
					const d2S = dxS*dxS + dyS*dyS;
					if (d2S < bestDistS) { bestDistS = d2S; triggerS = t; parentS = -1; }

					const dxE = mainLUT[j].x - endPt.x, dyE = mainLUT[j].y - endPt.y;
					const d2E = dxE*dxE + dyE*dyE;
					if (d2E < bestDistE) { bestDistE = d2E; triggerE = t; parentE = -1; }
				}

				// Check other branches for both endpoints
				for (let k = 0; k < n; k++) {
					if (k === i) continue;
					for (const s of branchSamples[k]) {
						const dxS = s.x - startPt.x, dyS = s.y - startPt.y;
						const d2S = dxS*dxS + dyS*dyS;
						if (d2S < bestDistS) { bestDistS = d2S; triggerS = s.d; parentS = k; }

						const dxE = s.x - endPt.x, dyE = s.y - endPt.y;
						const d2E = dxE*dxE + dyE*dyE;
						if (d2E < bestDistE) { bestDistE = d2E; triggerE = s.d; parentE = k; }
					}
				}

				if (bestDistS <= bestDistE) {
					// Start is junction → animate forward (start → end = junction → tip)
					branchReverse[i] = false;
					branchParents[i] = parentS;
					junctionOnParentRaw[i] = triggerS;
				} else {
					// End is junction → animate reverse (end → start = junction → tip)
					branchReverse[i] = true;
					branchParents[i] = parentE;
					junctionOnParentRaw[i] = triggerE;
				}

				// Init hidden
				el.setAttribute('stroke-dasharray', String(L));
				el.setAttribute('stroke-dashoffset', String(L));
			}

			// Pass 2: convert raw trigger distances into parent's "revealed length" coordinate.
			// For a reversed parent the reveal grows from its END, so the trigger coordinate
			// is (parentLength - rawDist) rather than rawDist.
			for (let i = 0; i < n; i++) {
				const p = branchParents[i];
				const raw = junctionOnParentRaw[i];
				if (p === -1 || !branchReverse[p]) {
					// Main path or forward branch — distance from start = reveal coordinate
					branchTriggers[i] = raw;
				} else {
					// Reversed branch parent — reveal grows from end, convert coordinate
					branchTriggers[i] = branchLengths[p] - raw;
				}
			}

			branchDataBuilt = true;
		}

		// Returns how much of a path is currently revealed (main or branch)
		function getParentRevealed(parentIdx: number, revealedMain: number): number {
			return parentIdx === -1 ? revealedMain : (branchReveals[parentIdx] ?? 0);
		}

		function loop(now: number) {
			if (!running) return;
			const dt = lastTime === 0 ? 16.667 : Math.min(now - lastTime, 50);
			lastTime = now;

			const tl = mainTotalLength;
			if (tl <= 0) { rafId = requestAnimationFrame(loop); return; }

			// Build LUT + branch data once on first valid frame
			if (!branchDataBuilt && mainLUT.length === 0) {
				buildMainLUT();
				buildBranchData();
			}

			// Rebuild on resize
			if (tl !== prevTotalLength) {
				const ratio = prevTotalLength > 0 ? tl / prevTotalLength : 1;
				currentMainOffset = prevTotalLength > 0 ? currentMainOffset * ratio : tl;
				prevTotalLength = tl;
				buildMainLUT();
				buildBranchData();
			}

			// Main path scroll reveal — tip tracks 80% down the viewport in SVG coordinate space
			const lerpT = 1 - Math.pow(0.93, dt / 16.667);
			const tipPageY = cachedScrollY + cachedInnerH * 0.6;
			const tipSvgY = cachedSy > 0 ? (tipPageY - cachedSvgTop) / cachedSy : 0;
			const tipSvgYMax = cachedSy > 0 ? (cachedPageH - cachedInnerH * 0.4 - cachedSvgTop) / cachedSy : svgH;
			const t = Math.max(0, Math.min(1, tipSvgY / Math.max(1, tipSvgYMax)));
			const revealed = Math.pow(t, 1.25);
			const targetOffset = tl * (1 - revealed);
			currentMainOffset += (targetOffset - currentMainOffset) * lerpT;
			if (Math.abs(currentMainOffset - targetOffset) < 0.5) currentMainOffset = targetOffset;
			if (mainPathEl) mainPathEl.setAttribute('stroke-dashoffset', currentMainOffset.toFixed(1));

			const revealedLength = tl - currentMainOffset;
			const isScrollingUp = revealedLength < prevRevealedLength - 0.5;
			prevRevealedLength = revealedLength;

			// Branch animations
			if (branchDataBuilt) {
				const growSpeed = 4 * (dt / 16.667);
				const mainRetractSpeed = Math.max(0, prevRevealedLength - revealedLength);
				const shrinkSpeed = Math.max(growSpeed * 4, mainRetractSpeed * 5);
				const earlyOffset = isScrollingUp ? 900 : 0;

				for (let i = 0; i < branchEls.length; i++) {
					const el = branchEls[i];
					if (!el) continue;

					const parentRevealed = getParentRevealed(branchParents[i], revealedLength);
					const L = branchLengths[i];
					const shouldGrow = parentRevealed >= branchTriggers[i] + earlyOffset;

					if (shouldGrow) {
						if (!branchTriggered[i]) {
							branchTriggered[i] = true;
							el.setAttribute('visibility', 'visible');
							// Reset to clean hidden state before animating
							el.setAttribute('stroke-dasharray', String(L));
							el.setAttribute('stroke-dashoffset', String(L));
						}
						branchReveals[i] = Math.min(L, branchReveals[i] + growSpeed);
					} else if (branchReveals[i] > 0) {
						// Parent retreated past junction — shrink fast from tip to root
						branchReveals[i] = Math.max(0, branchReveals[i] - shrinkSpeed);
						if (branchReveals[i] === 0) {
							branchTriggered[i] = false;
							el.setAttribute('visibility', 'hidden');
						}
					}

					// Update stroke — guard against near-zero flicker
					const r = branchReveals[i];
					if (r < 1) continue;

					if (branchReverse[i]) {
						el.setAttribute('stroke-dasharray', `${r.toFixed(1)} 999999`);
						el.setAttribute('stroke-dashoffset', (-(L - r)).toFixed(1));
					} else {
						el.setAttribute('stroke-dashoffset', (L - r).toFixed(1));
					}
				}
			}


			rafId = requestAnimationFrame(loop);
		}

		const timers: ReturnType<typeof setTimeout>[] = [];

		fetch(`${base}${src}`)
			.then((r) => r.text())
			.then((text) => {
				const doc = new DOMParser().parseFromString(text, 'image/svg+xml');
				const vb = doc.querySelector('svg')?.getAttribute('viewBox')?.trim().split(/[\s,]+/);
				if (vb && vb.length >= 4) {
					const w = parseFloat(vb[2]), h = parseFloat(vb[3]);
					if (w > 0 && h > 0) { svgW = w; svgH = h; }
				}
				const paths = doc.querySelectorAll('path');
				if (paths.length > 0) {
					rawMainD = paths[0].getAttribute('d') ?? '';
					rawBranchDs = Array.from(paths).slice(1)
						.map((p) => p.getAttribute('d') ?? '')
						.filter(Boolean);
				}
				recalc();
				timers.push(setTimeout(recalc, 300), setTimeout(recalc, 1000));
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
	bind:this={svgEl}
	class="pointer-events-none absolute left-0 z-0"
	style="top: {svgTop}px; transform-origin: top center; overflow: visible;"
	width={pageWidth}
	height={1}
	aria-hidden="true"
>
	{#if mainPathD}
		<path
			bind:this={mainPathEl}
			d={mainPathD}
			fill="none"
			stroke="var(--color-line)"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			stroke-dasharray={mainTotalLength > 0 ? mainTotalLength : '0 999999'}
		/>
	{/if}
	{#each branchPathDs as d}
		<path
			{d}
			fill="none"
			stroke="var(--color-line)"
			stroke-width={strokeWidth}
			stroke-linecap="round"
			visibility="hidden"
		/>
	{/each}
</svg>
