<script lang="ts">
	import type { TileSize } from '$lib/types';
	import { scrollReveal } from '$lib/utils/scrollAnimation';
	import { base } from '$app/paths';

	interface Props {
		src: string;
		alt: string;
		tileSize?: TileSize;
		index?: number;
		eager?: boolean;
	}

	let { src, alt, tileSize = 'medium', index = 0, eager = false }: Props = $props();

	const spanClass = {
		large: 'col-span-2',
		medium: 'col-span-1',
		small: 'col-span-1'
	};
</script>

<div
	class="project-tile group overflow-hidden rounded-xl {spanClass[tileSize]} transition-all duration-300 hover:scale-[1.02]"
	use:scrollReveal={{ delay: index * 100 }}
>
	<div class="aspect-4/3 w-full overflow-hidden">
		<img
			src="{base}{src}"
			{alt}
			loading={eager ? 'eager' : 'lazy'}
			fetchpriority={eager ? 'high' : undefined}
			class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
		/>
	</div>
	<div class="bevel-edge"></div>
</div>

<style>
	.project-tile {
		position: relative;
		box-shadow: 0 15px 50px rgba(0, 0, 0, 0.35), 0 5px 15px rgba(0, 0, 0, 0.2);
	}

	.bevel-edge {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		border: 2px solid rgba(255, 255, 255, 0.35);
		backdrop-filter: blur(8px);
		-webkit-backdrop-filter: blur(8px);
		-webkit-mask-image: linear-gradient(#000, #000), linear-gradient(#000, #000);
		mask-image: linear-gradient(#000, #000), linear-gradient(#000, #000);
		-webkit-mask-clip: padding-box, border-box;
		mask-clip: padding-box, border-box;
		-webkit-mask-composite: xor;
		mask-composite: exclude;
	}
</style>
