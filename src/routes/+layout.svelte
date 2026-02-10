<script lang="ts">
	import '../app.css';
	import { generateCssVars, getConfig } from '$lib/utils/theme';
	import { base } from '$app/paths';

	let { children } = $props();

	const config = getConfig();
	const cssVars = generateCssVars();
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
