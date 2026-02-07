<script lang="ts">
	import { getConfig } from '$lib/utils/theme';
	import { page } from '$app/state';
	import { base } from '$app/paths';

	const config = getConfig();
	let scrolled = $state(false);

	const isHomepage = $derived(page.url.pathname === `${base}/` || page.url.pathname === base);

	$effect(() => {
		function onScroll() {
			scrolled = window.scrollY > 50;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function scrollTo(id: string) {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
	}

	function navigate(id: string) {
		if (isHomepage) {
			scrollTo(id);
		} else {
			window.location.href = `${base}/#${id}`;
		}
	}
</script>

<nav
	class="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-300 md:px-12"
	class:scrolled
>
	<a href="{base}/" class="text-text text-lg font-semibold no-underline">{config.meta.name}</a>
	<div class="flex items-center gap-6">
		<button onclick={() => navigate('brand-refresh')} class="nav-link">Projects</button>
		<button onclick={() => navigate('about')} class="nav-link">About</button>
		<button onclick={() => navigate('contact')} class="nav-link">Contact</button>
	</div>
</nav>

<style>
	.scrolled {
		background-color: color-mix(in srgb, var(--color-bg) 80%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.nav-link {
		color: var(--color-text);
		font-size: 1.125rem;
		font-weight: 600;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: opacity 0.2s;
	}

	.nav-link:hover {
		opacity: 0.6;
	}
</style>
