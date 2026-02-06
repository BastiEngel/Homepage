<script lang="ts">
	import { getConfig } from '$lib/utils/theme';

	const config = getConfig();
</script>

<section class="relative flex h-screen items-center justify-center overflow-hidden">
	<div class="relative z-10 text-center">
		<h1 class="font-heading text-text text-4xl font-bold sm:text-6xl lg:text-8xl">
			{config.meta.name}
		</h1>
		<p class="text-text-muted mt-4 text-xl font-normal sm:text-2xl">
			{config.meta.title}
		</p>
	</div>
</section>
