<script lang="ts">
	import { getConfig } from '$lib/utils/theme';
	import { page } from '$app/state';
	import { base } from '$app/paths';

	const config = getConfig();
	let scrolled = $state(false);
	let menuOpen = $state(false);
	let narrow = $state(false);

	const isHomepage = $derived(page.url.pathname === `${base}/` || page.url.pathname === base);
	const showBg = $derived(scrolled || narrow);

	$effect(() => {
		function onScroll() {
			scrolled = window.scrollY > 50;
		}
		function onResize() {
			narrow = window.innerWidth < 768;
		}
		onResize();
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onResize, { passive: true });
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onResize);
		};
	});

	function scrollTo(id: string) {
		document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
	}

	function navigate(id: string) {
		menuOpen = false;
		if (isHomepage) {
			scrollTo(id);
		} else {
			window.location.href = `${base}/#${id}`;
		}
	}
</script>

<nav
	class="nav-bar fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-300"
	class:scrolled={showBg}
>
	<a href="{base}/" class="text-text text-2xl font-semibold no-underline">{config.meta.name}</a>

	<!-- Desktop links -->
	<div class="desktop-links">
		<button onclick={() => navigate('brand-refresh')} class="nav-link">Projects</button>
		<button onclick={() => navigate('about')} class="nav-link">About</button>
		<button onclick={() => navigate('contact')} class="nav-link">Contact</button>
	</div>

	<!-- Mobile hamburger -->
	<button
		class="hamburger"
		class:open={menuOpen}
		onclick={() => (menuOpen = !menuOpen)}
		aria-label="Menu"
	>
		<span></span>
		<span></span>
		<span></span>
	</button>
</nav>

<!-- Mobile dropdown -->
{#if menuOpen}
	<div class="mobile-menu" class:scrolled>
		<button onclick={() => navigate('brand-refresh')} class="mobile-link">Projects</button>
		<button onclick={() => navigate('about')} class="mobile-link">About</button>
		<button onclick={() => navigate('contact')} class="mobile-link">Contact</button>
	</div>
{/if}

<style>
	.scrolled {
		background-color: color-mix(in srgb, var(--color-bg) 80%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	@media (min-width: 768px) {
		.nav-bar {
			padding-left: 3rem;
			padding-right: 3rem;
		}
	}

	.desktop-links {
		display: none;
		align-items: center;
		gap: 1.5rem;
	}

	.hamburger {
		display: flex;
	}

	.mobile-menu {
		display: flex;
	}

	@media (min-width: 768px) {
		.desktop-links {
			display: flex;
		}
		.hamburger {
			display: none !important;
		}
		.mobile-menu {
			display: none !important;
		}
	}

	.nav-link {
		color: var(--color-text);
		font-size: 1.375rem;
		font-weight: 500;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		transition: opacity 0.2s;
	}

	.nav-link:hover {
		opacity: 0.6;
	}

	/* Hamburger */
	.hamburger {
		flex-direction: column;
		justify-content: center;
		gap: 5px;
		width: 28px;
		height: 28px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
	}

	.hamburger span {
		display: block;
		width: 100%;
		height: 2px;
		background: var(--color-text);
		border-radius: 1px;
		transition: transform 0.3s, opacity 0.3s;
	}

	.hamburger.open span:nth-child(1) {
		transform: translateY(7px) rotate(45deg);
	}

	.hamburger.open span:nth-child(2) {
		opacity: 0;
	}

	.hamburger.open span:nth-child(3) {
		transform: translateY(-7px) rotate(-45deg);
	}

	/* Mobile dropdown */
	.mobile-menu {
		position: fixed;
		top: 64px;
		left: 0;
		right: 0;
		z-index: 49;
		display: flex;
		flex-direction: column;
		padding: 16px 24px;
		background-color: color-mix(in srgb, var(--color-bg) 92%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	.mobile-link {
		color: var(--color-text);
		font-size: 1.25rem;
		font-weight: 500;
		background: none;
		border: none;
		cursor: pointer;
		padding: 12px 0;
		text-align: left;
		transition: opacity 0.2s;
	}

	.mobile-link:hover {
		opacity: 0.6;
	}
</style>
