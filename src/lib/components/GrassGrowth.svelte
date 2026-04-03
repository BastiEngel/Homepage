<script lang="ts">
	import { onMount } from 'svelte';

	const COUNT = 160;
	const H = 520;
	const DASH = 1100;

	interface Blade {
		d: string;
		sw: number;
		op: number;
		dur: number;
		del: number;
	}

	let blades: Blade[] = $state([]);
	let growing = $state(false);
	let wrapEl: HTMLDivElement | undefined = $state();

	onMount(() => {
		const W = window.innerWidth;
		const generated: Blade[] = [];

		for (let i = 0; i < COUNT; i++) {
			const x = ((i + 0.5) / COUNT) * W + (Math.random() - 0.5) * (W / COUNT) * 1.5;
			const h = 80 + Math.random() * Math.random() * 420;
			const bend = (Math.random() - 0.5) * 60;
			const wobble = (Math.random() - 0.5) * 14;
			const px = Math.max(3, Math.min(W - 3, x));

			generated.push({
				d: `M${px.toFixed(1)},${H} C${(px + wobble).toFixed(1)},${(H - h * 0.38).toFixed(1)} ${(px + bend * 0.65).toFixed(1)},${(H - h * 0.72).toFixed(1)} ${(px + bend).toFixed(1)},${(H - h).toFixed(1)}`,
				sw: 5 + Math.random() * 8,
				op: 0.4 + Math.random() * 0.6,
				dur: 0.55 + Math.random() * 0.55,
				del: Math.random() * 0.8,
			});
		}

		blades = generated;

		const obs = new IntersectionObserver(
			([e]) => { if (e.isIntersecting) growing = true; },
			{ threshold: 0.2 }
		);
		if (wrapEl) obs.observe(wrapEl);
		return () => obs.disconnect();
	});
</script>

<div bind:this={wrapEl} class="w-full overflow-hidden" style="height: {H}px; margin-top: -{H * 0.6 | 0}px;">
	<svg width="100%" height={H} aria-hidden="true" style="overflow: visible; display: block;">
		{#each blades as b}
			<path
				d={b.d}
				fill="none"
				stroke="#517a52"
				stroke-width={b.sw}
				stroke-linecap="round"
				style="
					stroke-dasharray: {DASH};
					stroke-dashoffset: {growing ? 0 : DASH};
					opacity: {b.op};
					transition: stroke-dashoffset {b.dur}s ease-out {b.del}s;
				"
			/>
		{/each}
	</svg>
</div>
