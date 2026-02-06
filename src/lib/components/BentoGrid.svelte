<script lang="ts">
	import type { ProjectImage } from '$lib/types';
	import BentoTile from './BentoTile.svelte';

	interface Props {
		cover: string;
		coverAlt?: string;
		images?: ProjectImage[];
	}

	let { cover, coverAlt = 'Project cover image', images = [] }: Props = $props();
</script>

<div class="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
	<!-- Cover is always the first, large tile -->
	<BentoTile src={cover} alt={coverAlt} tileSize="large" index={0} eager />

	{#each images as image, i}
		<BentoTile
			src={image.src}
			alt={image.alt}
			tileSize={image.tileSize ?? 'medium'}
			index={i + 1}
		/>
	{/each}
</div>
