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
		large: 'sm:col-span-2 sm:row-span-2',
		medium: 'sm:col-span-2 sm:row-span-1',
		small: 'col-span-1 row-span-1'
	};

	const aspectClass = {
		large: 'aspect-4/3',
		medium: 'aspect-video',
		small: 'aspect-square'
	};
</script>

<div
	class="group bg-surface overflow-hidden rounded-xl {spanClass[tileSize]} transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
	use:scrollReveal={{ delay: index * 100 }}
>
	<div class="{aspectClass[tileSize]} w-full overflow-hidden">
		<img
			src="{base}{src}"
			{alt}
			loading={eager ? 'eager' : 'lazy'}
			fetchpriority={eager ? 'high' : undefined}
			class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
		/>
	</div>
</div>
