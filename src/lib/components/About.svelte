<script lang="ts">
	import { getConfig } from '$lib/utils/theme';
	import { scrollReveal } from '$lib/utils/scrollAnimation';
	import { base } from '$app/paths';

	const config = getConfig();
</script>

{#if config.meta.about}
	<section id="about" class="relative px-6 py-16 md:px-12 lg:py-24">
		<div class="mx-auto flex max-w-6xl flex-col items-center gap-8 sm:flex-row sm:items-start" use:scrollReveal>
			<img
				src="{base}/images/profile.webp"
				alt="{config.meta.name}"
				class="bg-surface h-40 w-40 shrink-0 rounded-full object-cover"
				loading="lazy"
			/>
			<div>
				<h2 class="font-heading text-text text-2xl font-bold sm:text-3xl lg:text-4xl">
					About
				</h2>
				<p class="text-text mt-4 max-w-2xl text-base lg:text-lg">
					{config.meta.about}
				</p>
			</div>
		</div>
	</section>
{/if}
