<script lang="ts">
	import Nav from '$lib/components/Nav.svelte';
	import Footer from '$lib/components/Footer.svelte';
	import ProjectHeroPath from '$lib/components/ProjectHeroPath.svelte';
	import GalleryCarousel from '$lib/components/GalleryCarousel.svelte';
	import { scrollReveal, revealCard } from '$lib/utils/scrollAnimation';
	import { base } from '$app/paths';

	let { data } = $props();
	const project = data.project;

	const coverSrc = `${base}${project.cover}`;
	const isVideo = project.coverType === 'video';
	const isGif = !isVideo && project.cover.endsWith('.gif');

	const contentBlocks = project.contentBlocks ?? [];
	const gallery = project.gallery ?? [];
	const hasFullWidthBg = contentBlocks.some(b => b.fullWidthBg);
	const firstContentBlockIndex = contentBlocks.findIndex(b => !b.fullWidthBg);

</script>

<Nav />

<main class="relative pt-16">
	{#if project.heroPathSrc}
		<ProjectHeroPath src={project.heroPathSrc} topOffset={project.heroPathTopOffset} pathScale={project.heroPathScale} marqueeText={project.heroPathText} />
	{/if}
	<!-- Hero + GIF: outside z-[2] so mix-blend-mode blends with body background -->
	<div class="hero-gif-wrapper">
		<section class="hero-media hero-z">
			{#if isVideo}
				<video
					src={coverSrc}
					autoplay
					loop
					muted
					playsinline
					class="hero-cover"
				></video>
			{:else}
				<img
					src={coverSrc}
					alt="{project.name} cover"
					class="hero-cover"
				/>
			{/if}
		</section>

		{#each contentBlocks.filter(b => b.fullWidthBg) as block}
			<div class="fullwidth-bg-section">
				<img
					src="{base}{block.image}"
					alt={block.alt || ''}
					loading="lazy"
					class="fullwidth-bg-img"
				/>
			</div>
		{/each}
	</div>

	<!-- Content: z-[2] renders above GIF -->
	<div class="relative z-[2]">
	<!-- Project info -->
	<section class="relative px-6 pt-12 pb-16 md:px-12 lg:pt-20 lg:pb-24">
		<div class="mx-auto max-w-4xl" use:scrollReveal>
			<h1 class="text-text project-heading">
				{project.name}
			</h1>

			{#if project.description}
				<p class="text-text mt-2 max-w-3xl text-base lg:text-lg">
					{project.description}
				</p>
			{/if}

			{#if project.subtitle}
				<p class="text-text-muted mt-2 whitespace-pre-line text-sm project-light">{project.subtitle}</p>
			{:else}
				<div class="text-text-muted mt-6 flex flex-wrap items-center gap-4 text-sm">
					{#if project.role}<span>{project.role}</span>{/if}
					{#if project.year}<span class="opacity-40">|</span><span>{project.year}</span>{/if}
					{#if project.client}<span class="opacity-40">|</span><span>{project.client}</span>{/if}
				</div>
			{/if}

			{#if project.externalUrl}
				<a
					href={project.externalUrl}
					target="_blank"
					rel="noopener noreferrer"
					class="text-line hover:opacity-70 mt-6 inline-flex items-center gap-2 text-sm font-semibold transition-opacity"
				>
					view live project
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
					</svg>
				</a>
			{/if}
		</div>
	</section>

	<!-- Content blocks — image + text -->
	{#each contentBlocks as block, i}
		{#if !block.fullWidthBg}
			{#if block.layout === 'image-left'}
				<section class="content-block-section relative px-6 md:px-12" class:first-content-block={hasFullWidthBg && i === firstContentBlockIndex}>
					<div class="mx-auto max-w-4xl">
						<div class="image-left-grid mb-8">
							<div class="content-tile" use:revealCard>
								<img
									src="{base}{block.image}"
									alt={block.alt || `${project.name} detail ${i + 1}`}
									loading="lazy"
									class="content-img"
									style={block.imageFit === 'contain' ? 'object-fit: contain; object-position: center 77%;' : ''}
								/>
								<div class="bevel-edge"></div>
							</div>
							<div class="image-left-text" use:scrollReveal={{ delay: 180 }}>
								{#if block.postHeading}
									<p class="text-text text-base lg:text-lg" style="font-weight: 900;">{block.postHeading}</p>
								{/if}
								{#if block.text}
									<p class="text-text whitespace-pre-line text-base lg:text-lg">{block.text}</p>
								{/if}
							</div>
						</div>
					</div>
				</section>
			{:else if block.layout === 'gallery'}
				<section class="content-block-section relative" class:first-content-block={hasFullWidthBg && i === firstContentBlockIndex}>
					{#if block.heading || block.textBefore}
						<div class="mx-auto mb-8 max-w-4xl px-6 md:px-12" use:scrollReveal={{ delay: 180 }}>
							{#if block.heading}
								<p class="text-text text-base lg:text-lg" style="font-weight: 900;">{block.heading}</p>
							{/if}
							{#if block.textBefore}
								<p class="text-text whitespace-pre-line text-base lg:text-lg">{block.textBefore}</p>
							{/if}
						</div>
					{/if}
					<GalleryCarousel images={block.galleryImages ?? []} projectName={project.name} />
				</section>
		{:else}
				<section class="content-block-section relative px-6 md:px-12" class:first-content-block={hasFullWidthBg && i === firstContentBlockIndex}>
					<div class="mx-auto max-w-4xl">
						{#if block.heading || block.textBefore}
							<div class="mx-auto mb-8 max-w-4xl" use:scrollReveal={{ delay: 180 }}>
								{#if block.heading}
									<p class="text-text text-base lg:text-lg" style="font-weight: 900;">{block.heading}</p>
								{/if}
								{#if block.textBefore}
									<p class="text-text whitespace-pre-line text-base lg:text-lg">{block.textBefore}</p>
								{/if}
							</div>
						{/if}
						<div class="content-tile" use:revealCard>
							<img
								src="{base}{block.image}"
								alt={block.alt || `${project.name} detail ${i + 1}`}
								loading="lazy"
								class="content-img"
								style={block.imageFit === 'contain' ? 'object-fit: contain; object-position: center 77%;' : ''}
							/>
							<div class="bevel-edge"></div>
						</div>
						{#if block.postHeading || block.text}
							<div class="mx-auto mt-8 mb-8 max-w-4xl" use:scrollReveal={{ delay: 180 }}>
								{#if block.postHeading}
									<p class="text-text text-base lg:text-lg" style="font-weight: 900;">{block.postHeading}</p>
								{/if}
								{#if block.text}
									<p class="text-text whitespace-pre-line text-base lg:text-lg">{block.text}</p>
								{/if}
							</div>
						{:else}
							<div class="mb-8"></div>
						{/if}
					</div>
				</section>
			{/if}
		{/if}
	{/each}

	<!-- Learnings -->
	{#if project.learnings}
		<section class="relative px-6 md:px-12">
			<div class="mx-auto max-w-6xl" use:scrollReveal>
				{#if project.learningsImage}
					<div class="content-tile">
						<img
							src="{base}{project.learningsImage}"
							alt="{project.name} learnings"
							loading="lazy"
							class="content-img"
						/>
						<div class="bevel-edge"></div>
					</div>
				{/if}
				<p class="text-text mx-auto mt-8 mb-8 max-w-4xl text-base lg:text-lg">{project.learnings}</p>
			</div>
		</section>
	{/if}

	<!-- Scrolling gallery -->
	{#if gallery.length > 0}
		<section class="relative pt-12 pb-0 lg:pt-20">
			<GalleryCarousel images={gallery} projectName={project.name} />
		</section>
	{/if}

	<!-- Credits -->
	{#if project.credits}
		<section class="relative px-6 mt-28 md:px-12">
			<div class="mx-auto max-w-4xl" use:scrollReveal>
				<p class="text-text whitespace-pre-line text-center text-base lg:text-lg project-light">{project.credits}</p>
			</div>
		</section>
	{/if}

	<div class="flex justify-center py-24">
		<a
			href="{base}/"
			class="back-pill"
		>
			<span>back to projects</span>
			<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		</a>
	</div>
	</div><!-- /z-[2] over GIF -->
</main>

<Footer />

<style>
	.hero-media {
		width: 100%;
	}

	.hero-cover {
		width: 100%;
		height: auto;
		display: block;
	}

	/* Content block images — uniform aspect ratio with crop */
	.content-tile {
		position: relative;
		width: 100%;
		aspect-ratio: 3 / 2;
		border-radius: 0.75rem;
		overflow: hidden;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	/* Frosted glass overlay — always present, dissolves when .is-revealed is added */
	.content-tile::before {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 10;
		border-radius: inherit;
		background: rgba(200, 215, 230, 0.3);
		backdrop-filter: blur(18px);
		-webkit-backdrop-filter: blur(18px);
		transition:
			opacity 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.12s,
			backdrop-filter 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.12s,
			-webkit-backdrop-filter 1.0s cubic-bezier(0.22, 1, 0.36, 1) 0.12s;
		pointer-events: none;
	}

	/* :global() prevents Svelte from stripping this as "unused" (class added via JS) */
	.content-tile:global(.is-revealed)::before {
		opacity: 0;
		backdrop-filter: blur(0px);
		-webkit-backdrop-filter: blur(0px);
	}

	.content-img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	/* Parallax on content images — CSS scroll-driven, GPU-composited, zero JS */
	@supports (animation-timeline: view()) {
		.content-img {
			height: 120%;
			margin-top: -10%;
			will-change: transform;
			animation: parallax-img linear both;
			animation-timeline: view(block);
			animation-range: entry 0% exit 100%;
		}
	}

	@keyframes parallax-img {
		from { transform: translateY(10%); }
		to   { transform: translateY(-10%); }
	}

	.back-pill {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: 9999px;
		border: 1.5px solid var(--color-text-muted);
		color: var(--color-text);
		font-size: 0.875rem;
		font-weight: 500;
		text-decoration: none;
		transition: opacity 0.2s;
	}

	.back-pill:hover {
		opacity: 0.6;
	}

	.bevel-edge {
		position: absolute;
		inset: 0;
		border-radius: inherit;
		pointer-events: none;
		border: 2px solid rgba(255, 255, 255, 0.35);
	}

	.hero-gif-wrapper {
		position: relative;
	}

	/* hero-media gets its own z-index so it stays above HeroPath on projects that use it */
	.hero-z {
		position: relative;
		z-index: 2;
	}

	.first-content-block {
		margin-top: 18rem;
	}

	.fullwidth-bg-section {
		position: absolute;
		top: 92%;
		left: 0;
		width: 100%;
		pointer-events: none;
	}

	.fullwidth-bg-img {
		width: 85%;
		height: auto;
		display: block;
		margin: 0 auto;
		mix-blend-mode: multiply;
	}

	.image-left-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: start;
	}

	.image-left-text {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin-top: -0.55rem;
	}

	@media (max-width: 767px) {
		.image-left-grid {
			grid-template-columns: 1fr;
		}
	}

	.project-heading {
		font-family: 'area-inktrap', sans-serif;
		font-weight: 900;
		font-size: 52.358px;
		line-height: calc(2 * 32.36px); /* 2 baseline units */
	}

	.project-light {
		font-family: 'area-inktrap-light', sans-serif;
		font-style: italic;
	}
</style>
