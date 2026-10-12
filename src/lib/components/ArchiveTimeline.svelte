<script lang="ts">
	import { base } from '$app/paths';
	import type { Project } from '$lib/types';
	import { generateArchivePath } from '$lib/utils/archivePath';

	interface Props {
		projects: Project[];
	}

	let { projects }: Props = $props();

	// Deterministic per-character jitter (rotation + vertical offset) so
	// the Caveat handwriting font doesn't look like a font — the same
	// letter repeating identically everywhere is the tell. Seeded by
	// char code + position, so it's stable across renders, not flickery.
	interface JitterChar { ch: string; rot: number; dy: number; scale: number }
	function jitterChars(text: string): JitterChar[] {
		return [...text].map((ch, i) => {
			const h = (i * 131 + ch.charCodeAt(0) * 7) % 100;
			const rot = ((h % 9) - 4) * 1.4;
			const dy = (((h * 3) % 7) - 3) * 0.06;
			const scale = 0.85 + ((h * 5) % 10) * 0.035;
			return { ch: ch === ' ' ? ' ' : ch, rot, dy, scale };
		});
	}

	let viewportWidth = $state(1440);
	let viewportHeight = $state(900);

	let spacerEl: HTMLDivElement | undefined = $state();
	let stageEl: HTMLDivElement | undefined = $state();

	const SCREEN_COUNT = 15;
	const pathData = $derived(generateArchivePath(viewportWidth, viewportHeight, SCREEN_COUNT));
	const scrollableWidth = $derived(Math.max(0, pathData.totalWidth - viewportWidth));
	const spacerHeight = $derived(scrollableWidth + viewportHeight);
	const strokeWidth = $derived(Math.max(18, 36 * Math.min(1, viewportWidth / 1440)));

	function extractYear(project: Project): string {
		if (project.year) return project.year;
		const match = project.subtitle?.match(/20\d{2}(\/\d{2})?/);
		return match ? match[0] : '';
	}

	// project.subtitle's first line is "Role/Type | ... | Year" (e.g.
	// "Bachelor Thesis | Product Design | 2024") — year/category already
	// pull their own values out of it, so showing that same line again as
	// the "subtitle" field was pure duplication. Use the second line
	// instead (the more descriptive discipline/focus tagline), falling
	// back to the first line for subtitles with no second line.
	function subtitleLine(project: Project): string {
		const lines = project.subtitle?.split('\n') ?? [];
		// Some projects have a credits/supervisors line right after the
		// first line (e.g. "Kristina Keil · Benjamin Amiel ..." or
		// "Supervisors: Prof. Dr. ..."), with the actual discipline tagline
		// only on the line after that. Credits lines don't use "|" the way
		// every discipline tagline in this dataset does, so pick the first
		// later line that contains one instead of always taking line 2.
		const tagline = lines.slice(1).find((l) => l.includes('|'));
		return tagline ?? lines[1] ?? lines[0] ?? '';
	}

	// Short role/type (e.g. "Bachelor Thesis", "Individual work") — just the
	// first "|"-segment of the first subtitle line, not everything before
	// the year (that left artifacts like "...| Product Design" or "...| WS" in).
	function roleText(project: Project): string {
		if (project.tags?.[0]) return project.tags[0];
		const firstLine = project.subtitle?.split('\n')[0] ?? '';
		return firstLine.split('|')[0]?.trim() ?? '';
	}

	// One sign per wave valley — cycle through the sorted project list so
	// every valley gets a card even when there are more valleys than projects.
	const cards = $derived(
		projects.length === 0
			? []
			: pathData.valleys.map((anchor, i) => ({ anchor, project: projects[i % projects.length] }))
	);

	let ticking = false;
	function updateScroll() {
		if (!spacerEl || !stageEl) return;
		const rect = spacerEl.getBoundingClientRect();
		const scrolled = -rect.top;
		const progress = scrollableWidth > 0 ? Math.max(0, Math.min(1, scrolled / scrollableWidth)) : 0;
		stageEl.style.transform = `translateX(-${progress * scrollableWidth}px)`;
	}

	function onScroll() {
		if (ticking) return;
		ticking = true;
		requestAnimationFrame(() => {
			ticking = false;
			updateScroll();
		});
	}

	$effect(() => {
		// Force-start at the top: on a client-side navigation (e.g. the
		// archive-tile zoom transition from the homepage), SvelteKit's own
		// scroll-to-top can land a tick after this component mounts, so the
		// very first updateScroll() below would otherwise read the leftover
		// scroll position from the page we navigated from and briefly show
		// the timeline scrolled to the wrong spot before snapping back.
		window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
		window.addEventListener('scroll', onScroll, { passive: true });
		window.addEventListener('resize', onScroll, { passive: true });
		updateScroll();
		return () => {
			window.removeEventListener('scroll', onScroll);
			window.removeEventListener('resize', onScroll);
		};
	});
</script>

{#snippet handwritten(text: string)}
	<span class="handwritten">
		{#each jitterChars(text) as c}
			<span class="handwritten-char" style="transform: rotate({c.rot}deg) translateY({c.dy}px) scale({c.scale});">{c.ch}</span>
		{/each}
	</span>
{/snippet}

<svelte:window bind:innerWidth={viewportWidth} bind:innerHeight={viewportHeight} />

<div bind:this={spacerEl} class="archive-spacer" style="height: {spacerHeight}px;">
	<div class="archive-stage">
		<div
			bind:this={stageEl}
			class="archive-track"
			style="width: {pathData.totalWidth}px; height: {viewportHeight}px;"
		>
			<svg
				class="archive-svg"
				width={pathData.totalWidth}
				height={viewportHeight}
				viewBox="0 0 {pathData.totalWidth} {viewportHeight}"
			>
				<path
					d={pathData.d}
					fill="none"
					stroke="var(--color-line, #6a5ae0)"
					stroke-width={strokeWidth}
					stroke-linecap="round"
				/>
			</svg>

			{#each cards as card, i}
				<a
					href="{base}/projects/{card.project.id}"
					class="archive-card"
					style="left: {card.anchor.x}px; top: {card.anchor.y}px; animation-delay: {i * 0.4}s;"
				>
					<div class="archive-card-inner">
						<div class="archive-ring"></div>
						<div class="archive-thread"></div>
						<div class="archive-tag">
							<div class="archive-tag-hole-wrap"><div class="archive-tag-hole"></div></div>
							<div class="archive-tag-frame">
								<div class="archive-fields">
								<div class="archive-field-row">
									<div class="archive-field archive-field-title">
										{@render handwritten(card.project.name)}
										<span class="archive-field-label">title</span>
									</div>
									<div class="archive-field archive-field-year">
										{@render handwritten(extractYear(card.project))}
										<span class="archive-field-label">year</span>
									</div>
								</div>
								<div class="archive-field archive-field-subtitle">
									{@render handwritten(card.project.shortSubtitle ?? roleText(card.project))}
									<span class="archive-field-label">subtitle</span>
								</div>
								<div class="archive-field archive-field-category">
									{@render handwritten(subtitleLine(card.project))}
									<span class="archive-field-label">category</span>
								</div>
								<div class="archive-field archive-field-description">
									{@render handwritten(card.project.description)}
									<span class="archive-field-label">description</span>
								</div>
							</div>
							<div class="archive-tag-photo-frame">
								<div class="archive-tag-photo">
									<img src="{base}{card.project.tileImage ?? card.project.cover}" alt="" />
								</div>
							</div>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
</div>

<style>
	.archive-spacer {
		position: relative;
	}

	.archive-stage {
		position: sticky;
		top: 0;
		height: 100vh;
		overflow: hidden;
		view-transition-name: archive-hero;
	}

	.archive-track {
		position: relative;
		will-change: transform;
	}

	.archive-svg {
		position: absolute;
		top: 0;
		left: 0;
		pointer-events: none;
	}

	.archive-card {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		transform: translate(-50%, 0);
		text-decoration: none;
		animation: archive-sway 5s ease-in-out infinite;
		transform-origin: top center;
	}

	.archive-card-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		transform: scale(3);
		transform-origin: top center;
	}

	.archive-ring {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		border: 4px solid #c0c0c0;
		background: linear-gradient(135deg, #e8e8e8, #a8a8a8);
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.25);
	}

	.archive-thread {
		width: 1.5px;
		height: 14px;
		background: #999;
	}

	.archive-tag {
		position: relative;
		width: 118px;
		display: flex;
		flex-direction: column;
		align-items: stretch;
		background: #ece9e3;
		border-radius: 2px;
		padding-top: 16px;
		padding-bottom: 6px;
		box-shadow:
			0 1px 0 rgba(255, 255, 255, 0.6) inset,
			0 -2px 3px rgba(0, 0, 0, 0.12) inset,
			0 10px 18px rgba(0, 0, 0, 0.25);
	}

	.archive-tag-hole-wrap {
		position: absolute;
		top: 4px;
		left: 50%;
		transform: translateX(-50%);
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 1px solid #999;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.archive-tag-hole {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: #fff;
		box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.35);
	}

	.archive-tag-frame {
		margin: 0 6px 6px;
		box-shadow: inset 0 0 0 0.45px #1a1a1a;
	}

	.archive-fields {
		display: flex;
		flex-direction: column;
	}

	.archive-field {
		display: flex;
		flex-direction: column;
		box-shadow: inset 0 -0.45px 0 0 #1a1a1a;
		padding: 1px 3px 0;
		font-family: 'area-inktrap-light', sans-serif;
		font-size: 4.4px;
		line-height: 1.15;
		color: #1a1a1a;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.handwritten {
		font-family: 'Caveat', cursive;
		font-weight: 600;
		font-size: 1.5em;
		line-height: 1;
	}

	.handwritten-char {
		display: inline-block;
	}

	.archive-field-label {
		font-family: 'area-inktrap-light', sans-serif;
		font-size: 2px;
		line-height: 1;
		letter-spacing: 0.3px;
		text-transform: uppercase;
		color: #1a1a1a;
		margin-top: auto;
		margin-bottom: 0.75px;
	}

	.archive-field-title {
		font-family: 'area-inktrap', sans-serif;
		font-weight: 900;
		font-size: 6.5px;
		padding-top: 2px;
		padding-bottom: 0;
	}

	.archive-field-subtitle {
		padding-top: 2px;
		padding-bottom: 0;
	}

	.archive-field-row {
		display: flex;
		box-shadow: inset 0 -0.45px 0 0 #1a1a1a;
	}

	.archive-field-row .archive-field {
		flex: 1;
		min-width: 0;
		box-shadow: inset -0.45px 0 0 0 #1a1a1a;
	}

	.archive-field-row .archive-field:last-child {
		box-shadow: none;
	}

	.archive-field-year {
		flex: 0 0 26%;
	}

	.archive-field-category {
		flex: 1;
	}

	.archive-field-description {
		height: 36px;
		white-space: normal;
		overflow: hidden;
		padding-top: 2px;
		padding-bottom: 0;
	}

	.archive-tag-photo-frame {
		margin: 5px;
		box-shadow: inset 0 0 0 0.45px #1a1a1a;
		padding: 3px;
	}

	.archive-tag-photo {
		box-shadow: inset 0 0 0 0.45px #1a1a1a;
	}

	.archive-tag-photo img {
		display: block;
		width: 100%;
		aspect-ratio: 4 / 3;
		object-fit: cover;
	}

	@keyframes archive-sway {
		0%, 100% { transform: translate(-50%, 0) rotate(-2deg); }
		50% { transform: translate(-50%, 0) rotate(2deg); }
	}
</style>
