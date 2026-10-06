<script lang="ts">
	import '../app.css';
	import { generateCssVars, getConfig } from '$lib/utils/theme';
	import { base } from '$app/paths';
	import { onNavigate } from '$app/navigation';

	let { children } = $props();

	const config = getConfig();
	const cssVars = generateCssVars();

	// View Transitions API — instant-feeling page navigation
	onNavigate((navigation) => {
		if (!document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await navigation.complete;
			});
		});
	});
</script>

<svelte:head>
	{@html `<style>${cssVars}</style>`}
	<title>{config.meta.name} – {config.meta.title}</title>
	<meta name="description" content={config.meta.description} />
	<meta property="og:title" content="{config.meta.name} – {config.meta.title}" />
	<meta property="og:description" content={config.meta.description} />
	<meta property="og:image" content="{config.meta.url}{base}{config.meta.ogImage}" />
	<meta property="og:url" content={config.meta.url} />
	<meta property="og:type" content="website" />
	<meta name="twitter:card" content="summary_large_image" />
</svelte:head>

{@render children()}
