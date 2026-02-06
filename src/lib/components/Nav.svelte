<script lang="ts">
	import { getConfig } from '$lib/utils/theme';

	const config = getConfig();
	let scrolled = $state(false);

	$effect(() => {
		function onScroll() {
			scrolled = window.scrollY > 50;
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	function scrollToContact() {
		document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
	}
</script>

<nav
	class="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-300 md:px-12"
	class:scrolled
>
	<span class="text-text text-lg font-semibold">{config.meta.name}</span>
	<button
		onclick={scrollToContact}
		class="bg-accent hover:bg-accent-hover text-text-inverse cursor-pointer rounded-lg px-5 py-2 text-sm font-medium transition-colors duration-200"
	>
		Contact
	</button>
</nav>

<style>
	.scrolled {
		background-color: color-mix(in srgb, var(--color-bg) 80%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}
</style>
