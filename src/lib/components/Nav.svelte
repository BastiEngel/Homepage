<script lang="ts">
	import { getConfig } from '$lib/utils/theme';
	import { page } from '$app/state';
	import { base } from '$app/paths';
import projectsData from '../../data/projects.json';

	const config = getConfig();
	let scrolled = $state(false);
	let menuOpen = $state(false);
	let projectsOpen = $state(false);
	let mobileProjectsOpen = $state(false);
	let hoveredIdx = $state(-1);

	const isHomepage = $derived(page.url.pathname === `${base}/` || page.url.pathname === base);

	$effect(() => {
		page.url.pathname;
		projectsOpen = false;
		menuOpen = false;
	});
	const showBg = $derived(scrolled);

	const SPLITS: Record<number, number[]> = {
		1: [60, 56, 24.5, 0, 3, -4, 0], 2: [57, 53, 24.5, 4, 0, 0, 8], 7: [57, 53, 24.5, 0, 0, 0, 0],
		3: [54, 50, 24.5, 4, 0, 0, 0], 4: [54, 50, 24.5, 4, 0, 0, 0], 5: [57, 53, 24, 0, 0, 0, 0],  6: [57, 53, 24.5, 0, 0, 0, 0],
	};

	type NavProject = { id: string; name: string; tagImage?: string; cover: string };
	const navProjects = (projectsData as NavProject[]).filter((p) => p.id !== 'about');

	const tagData = navProjects.map((project, i) => {
		const n = navProjects.length;
		const spread = 100;
		const fanRot = spread / 2 - (spread / (n - 1)) * i;
		const variant = (i % 7) + 1;
		const pad = String(variant).padStart(2, '0');
		const s = SPLITS[variant] ?? [60, 56, 24.5, 0, 0, 0, 0];
		const [splitBack, splitFront, splitH, , labelRot, labelShiftY, labelShiftX] = s;
		const clipBack = `polygon(0 0, ${splitBack}% 0, ${splitBack}% ${splitH}%, 0 26%)`;
		const clipFront = `polygon(${splitFront}% 0, 100% 0, 100% 100%, 0 100%, 0 26%, ${splitFront}% ${splitH}%)`;
		const labelTransform = (labelRot || labelShiftY || labelShiftX)
			? `transform: rotate(${labelRot}deg) translate(${labelShiftX}px, ${labelShiftY}px);`
			: '';
		const dropDelay = `${(i * 0.05).toFixed(3)}s`;
		const zFront = 8 + i;
		return { project, fanRot, pad, clipBack, clipFront, labelTransform, dropDelay, zFront };
	});

	// ── RAF physics (same as GarlandTag) ─────────────────────────────────────
	const backSwayEls: (HTMLElement | undefined)[] = [];
	const frontSwayEls: (HTMLElement | undefined)[] = [];
	const keyImgEls: (HTMLImageElement | undefined)[] = [];
	const sheenEls: (HTMLElement | undefined)[] = [];
	const pendulumEls: (HTMLButtonElement | undefined)[] = [];

	const physics = tagData.map((_, i) => ({
		angle: 0, velocity: 0, target: 0, swayBlend: 1, t0: 0,
		swayDur: 2.5 + i * 0.3,
		noiseAmp: 0.4 + Math.random() * 0.6,
		noiseFreq: 0.7 + Math.random() * 0.5,
		noisePhase: Math.random() * Math.PI * 2,
	}));

	let bundleSwayEl: HTMLElement | undefined = $state();
	let masterAngle = 0;
	let bundleT0 = 0;
	let rafId = 0;
	let lastFrame = 0;

	function rafLoop(now: number) {
		if (now - lastFrame < 33) { rafId = requestAnimationFrame(rafLoop); return; }
		lastFrame = now;

		// Master pendulum sway
		if (!bundleT0) bundleT0 = now;
		const bt = (now - bundleT0) / 1000;
		const prevMaster = masterAngle;
		masterAngle = 8 * Math.sin(bt * 0.65);
		const masterVel = masterAngle - prevMaster;
		if (bundleSwayEl) bundleSwayEl.style.transform = `rotate(${masterAngle.toFixed(3)}deg)`;

		for (let i = 0; i < tagData.length; i++) {
			const p = physics[i];
			if (!p.t0) p.t0 = now;
			const t = (now - p.t0) / 1000;
			const sp  = (2 * Math.PI) / p.swayDur;
			const ksp = (2 * Math.PI) / (p.swayDur * 1.3);

			p.swayBlend += ((hoveredIdx === i ? 0 : 1) - p.swayBlend) * 0.04;
			const swayA    = Math.sin(t * sp  + i * 0.8) * 4 * p.swayBlend;
			const keySwayA = Math.sin(t * ksp + 1.2 + i * 0.5) * 12 * p.swayBlend;

			// Tags lag behind master + random noise per tag
			if (hoveredIdx !== i) {
				const noise = p.noiseAmp * Math.sin(bt * p.noiseFreq + p.noisePhase);
				p.target = masterVel * 12 + noise;
			}

			p.velocity = (p.velocity + (p.target - p.angle) * 0.06) * 0.90;
			p.angle   += p.velocity;
			const pushA = p.angle;
			const totalA = (swayA + pushA).toFixed(3);

			if (backSwayEls[i])  backSwayEls[i]!.style.transform  = `rotate(${totalA}deg)`;
			if (frontSwayEls[i]) frontSwayEls[i]!.style.transform = `rotate(${totalA}deg)`;
			if (keyImgEls[i])    keyImgEls[i]!.style.transform    = `rotate(${(keySwayA - pushA * 0.7).toFixed(3)}deg)`;
			if (sheenEls[i])     sheenEls[i]!.style.backgroundPosition = `${(50 + (swayA + pushA) * 3).toFixed(1)}% 0`;
		}
		rafId = requestAnimationFrame(rafLoop);
	}

	$effect(() => {
		if (projectsOpen) {
			masterAngle = 0; bundleT0 = 0;
			physics.forEach(p => { p.angle = 0; p.velocity = 0; p.target = 0; p.swayBlend = 1; p.t0 = 0; });
			rafId = requestAnimationFrame(rafLoop);
			return () => cancelAnimationFrame(rafId);
		}
	});
	// ─────────────────────────────────────────────────────────────────────────

	$effect(() => {
		function onScroll() { scrolled = window.scrollY > 50; }
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	});

	$effect(() => {
		if (!projectsOpen) return;
		function onClickOutside(e: MouseEvent) {
			if (!(e.target as Element).closest('.projects-dropdown-wrapper')) projectsOpen = false;
		}
		window.addEventListener('click', onClickOutside);
		return () => window.removeEventListener('click', onClickOutside);
	});

	const tagRects: (DOMRect | undefined)[] = [];

	function handleMouseEnter(i: number) {
		hoveredIdx = i;
		tagRects[i] = pendulumEls[i]?.getBoundingClientRect();
	}
	function handleMouseMove(e: MouseEvent, i: number) {
		const rect = tagRects[i];
		if (!rect) return;
		const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
		physics[i].target = dx * 22;
	}
	function handleMouseLeave(i: number) {
		hoveredIdx = -1;
		physics[i].velocity *= 1.5;
		physics[i].target = 0;
	}

	function scrollTo(id: string) { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); }
	function navigate(id: string) {
		menuOpen = false; projectsOpen = false; mobileProjectsOpen = false;
		if (isHomepage) scrollTo(id);
		else window.location.href = `${base}/#${id}`;
	}
</script>

<nav
	class="nav-bar fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between px-6 transition-all duration-300"
	class:scrolled={showBg}
>
	<a href="{base}/" class="text-text text-2xl font-semibold no-underline">{config.meta.name}</a>

	<div class="desktop-links">
		<div class="projects-dropdown-wrapper">
			<button onclick={() => isHomepage ? window.scrollTo({ top: 0, behavior: 'smooth' }) : (projectsOpen = !projectsOpen)} class="nav-link projects-btn" class:active={projectsOpen && !isHomepage}>
				projects
				{#if !isHomepage}
				<svg class="chevron" class:rotated={projectsOpen} width="12" height="12" viewBox="0 0 12 12" fill="none">
					<path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
				</svg>
				{/if}
			</button>

			{#if projectsOpen}
				<div class="keyring-drop">
					<div class="bundle-sway" bind:this={bundleSwayEl}>

					<!-- PASS 1: back ring halves (behind keyring, z-index auto) -->
					{#each tagData as td, i}
						<div class="fan-arm" style="transform: rotate({td.fanRot.toFixed(2)}deg);">
							<div class="drop-anim" style="--drop-delay: {td.dropDelay};">
								<div class="sway-arm" bind:this={backSwayEls[i]}>
									<div class="tag-scaled">
										<div class="tag-shell">
											<img src="{base}/images/keytags/Keytag_{td.pad}.webp" alt="" class="tag-img ring-back" style="clip-path: {td.clipBack};" draggable="false"/>
										</div>
									</div>
								</div>
							</div>
						</div>
					{/each}

					<!-- Shared keyring (z-index 5) -->
					<div class="nav-keyring">
						<img src="{base}/images/Schluesselring_dropdown.webp" alt="" class="keyring-img" draggable="false"/>
					</div>

					<!-- PASS 2: front ring + body (above keyring) -->
					{#each tagData as td, i}
						<div class="fan-arm fan-front" style="transform: rotate({td.fanRot.toFixed(2)}deg); z-index: {hoveredIdx === i ? 30 : td.zFront};">
							<div class="drop-anim" style="--drop-delay: {td.dropDelay};">
								<div class="sway-arm" bind:this={frontSwayEls[i]}>
									<div class="tag-scaled">
										<a
											href="{base}/projects/{td.project.id}"
											class="tag-btn"
											data-sveltekit-reload
											bind:this={pendulumEls[i]}
											onmouseenter={() => handleMouseEnter(i)}
											onmousemove={(e) => handleMouseMove(e, i)}
											onmouseleave={() => handleMouseLeave(i)}
											onclick={() => { projectsOpen = false; }}
										>
											<img bind:this={keyImgEls[i]} src="{base}/images/key-01.webp" alt="" class="dangling-key" draggable="false"/>
											<img src="{base}/images/keytags/Keytag_{td.pad}.webp" alt="" class="tag-img ring-front" style="clip-path: {td.clipFront};" draggable="false"/>
											{#if td.project.tagImage}
												<div class="tag-cover tag-cover-logo" style={td.labelTransform}>
													<img src="{base}{td.project.tagImage}" alt={td.project.name} class="tag-logo-img" draggable="false"/>
												</div>
											{:else}
												<img src="{base}{td.project.cover}" alt={td.project.name} class="tag-cover" style={td.labelTransform} draggable="false"/>
											{/if}
											<div bind:this={sheenEls[i]} class="tag-sheen" style={td.labelTransform}></div>
											<span class="tag-title">{td.project.name}</span>
										</a>
									</div>
								</div>
							</div>
						</div>
					{/each}

					</div><!-- /bundle-sway -->
				</div>
			{/if}
		</div>

		<button onclick={() => navigate('about')} class="nav-link">about</button>
		<button onclick={() => navigate('contact')} class="nav-link">contact</button>
	</div>

	<button class="hamburger" class:open={menuOpen} onclick={() => (menuOpen = !menuOpen)} aria-label="Menu">
		<span></span><span></span><span></span>
	</button>
</nav>

{#if menuOpen}
	<div class="mobile-menu" class:scrolled>
		<button onclick={() => (mobileProjectsOpen = !mobileProjectsOpen)} class="mobile-link mobile-projects-btn">
			projects
			<svg class="mobile-chevron" class:rotated={mobileProjectsOpen} width="12" height="12" viewBox="0 0 12 12" fill="none">
				<path d="M2 4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
			</svg>
		</button>
		{#if mobileProjectsOpen}
			<div class="mobile-sub-items">
				{#each navProjects as project}
					<button onclick={() => navigate(project.id)} class="mobile-sub-link">{project.name}</button>
				{/each}
			</div>
		{/if}
		<button onclick={() => navigate('about')} class="mobile-link">about</button>
		<button onclick={() => navigate('contact')} class="mobile-link">contact</button>
	</div>
{/if}

<style>
	.scrolled {
		background-color: color-mix(in srgb, var(--color-bg) 80%, transparent);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
	}

	@media (min-width: 768px) {
		.nav-bar { padding-left: 3rem; padding-right: 3rem; }
	}

	.desktop-links { display: none; align-items: center; gap: 1.5rem; }
	@media (min-width: 768px) {
		.desktop-links { display: flex; }
		.hamburger { display: none !important; }
		.mobile-menu { display: none !important; }
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
	.nav-link:hover { opacity: 0.6; }

	.projects-dropdown-wrapper { position: relative; }
	.projects-btn { display: flex; align-items: center; gap: 5px; }
	.projects-btn.active { opacity: 0.6; }
	.chevron { transition: transform 0.2s ease; flex-shrink: 0; position: relative; top: 4px; }
	.chevron.rotated { transform: rotate(180deg); }

	/* ── Keyring dropdown ─────────────────────────────── */
	.bundle-sway {
		transform-origin: 0px -55px;
		will-change: transform;
	}

	.keyring-drop {
		position: absolute;
		top: calc(100% - 8px);
		left: 50%;
		z-index: 60;
		width: 0;
		height: 0;
		overflow: visible;
	}

	.nav-keyring {
		position: absolute;
		left: -75px;
		top: -65px;
		z-index: 5;
		pointer-events: none;
	}

	.keyring-img {
		display: block;
		width: 150px;
		height: auto;
		max-width: none;
		pointer-events: none;
		user-select: none;
	}

	.fan-arm {
		position: absolute;
		top: 0; left: 0;
		transform-origin: 0 0;
		pointer-events: none;
	}
	.fan-front { z-index: 8; }

	.drop-anim {
		transform-origin: 0 0;
		animation: dropOpen 0.4s cubic-bezier(0.34, 1.52, 0.64, 1) both;
		animation-delay: var(--drop-delay);
	}
	@keyframes dropOpen {
		from { transform: scale(0.05); opacity: 0; }
		to   { transform: scale(1);    opacity: 1; }
	}

	/* RAF controls transform — no CSS animation here */
	.sway-arm {
		transform-origin: 0 0;
		will-change: transform;
	}

	.tag-scaled {
		position: absolute;
		top: 25px; left: 0;
		transform-origin: 0 0;
		transform: scale(0.65) translate(-208px, -11px);
	}

	/* ── Tag internals (identical to GarlandTag) ─────── */
	.tag-shell { position: relative; width: 416px; height: 416px; }

	.tag-img { width: 416px; height: auto; min-height: 416px; pointer-events: none; user-select: none; }
	.ring-back  { position: relative; z-index: 1; }
	.ring-front { position: relative; z-index: 10; }

	.dangling-key {
		position: absolute;
		top: 94px; left: 82px;
		width: 240px; height: auto;
		z-index: 0;
		transform-origin: 49.1% 13.7%;
		pointer-events: none; user-select: none;
		will-change: transform;
	}

	.tag-btn {
		position: relative;
		display: block;
		width: 416px; height: 416px;
		border: none; background: none; outline: none;
		appearance: none; -webkit-appearance: none;
		cursor: pointer; padding: 0;
		pointer-events: auto;
		clip-path: polygon(30% 0%, 70% 0%, 72% 22%, 75% 30%, 75% 90%, 65% 97%, 32% 97%, 22% 90%, 22% 30%, 25% 22%);
	}

	.tag-cover {
		position: absolute;
		top: 34%; left: 39%; width: 20%; height: 44%;
		object-fit: cover; z-index: 2;
		pointer-events: none; user-select: none;
	}
	.tag-cover-logo {
		object-fit: unset; display: flex;
		align-items: center; justify-content: center;
		background: white; padding: 5%;
	}
	.tag-logo-img { width: 100%; height: 100%; object-fit: contain; pointer-events: none; user-select: none; }

	.tag-title {
		position: absolute;
		top: 34%; left: 39%; width: 20%; height: 44%;
		display: flex; align-items: center; justify-content: center;
		z-index: 4;
		writing-mode: vertical-rl; text-orientation: mixed;
		font-size: 14px; font-weight: 700; color: #fff;
		text-align: center; line-height: 1.2; padding: 4px;
		background: rgba(0,0,0,0.55);
		opacity: 0; pointer-events: none;
		transition: opacity 0.25s ease;
		word-break: break-word; overflow: hidden;
	}
	.tag-btn:hover .tag-title { opacity: 1; }

	.tag-sheen {
		position: absolute;
		top: 34%; left: 39%; width: 20%; height: 44%;
		z-index: 3; pointer-events: none; overflow: hidden;
		background: linear-gradient(
			110deg,
			rgba(255,255,255,0) 0%, rgba(255,255,255,0) 35%,
			rgba(255,255,255,0.15) 47%, rgba(255,255,255,0.2) 50%,
			rgba(255,255,255,0.15) 53%, rgba(255,255,255,0) 65%,
			rgba(255,255,255,0) 100%
		);
		background-size: 300% 100%;
		will-change: background-position;
	}

	/* ── Hamburger ───────────────────────────────────── */
	.hamburger {
		display: flex; flex-direction: column; justify-content: center;
		gap: 5px; width: 28px; height: 28px;
		background: none; border: none; cursor: pointer; padding: 0;
	}
	.hamburger span {
		display: block; width: 100%; height: 2px;
		background: var(--color-text); border-radius: 1px;
		transition: transform 0.3s, opacity 0.3s;
	}
	.hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
	.hamburger.open span:nth-child(2) { opacity: 0; }
	.hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

	/* ── Mobile ──────────────────────────────────────── */
	.mobile-menu {
		position: fixed; top: 64px; left: 0; right: 0; z-index: 49;
		display: flex; flex-direction: column; padding: 16px 24px;
		background-color: color-mix(in srgb, var(--color-bg) 92%, transparent);
		backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
	}
	.mobile-link {
		color: var(--color-text); font-size: 1.25rem; font-weight: 500;
		background: none; border: none; cursor: pointer;
		padding: 12px 0; text-align: left; transition: opacity 0.2s;
	}
	.mobile-link:hover { opacity: 0.6; }
	.mobile-projects-btn { display: flex; align-items: center; gap: 6px; }
	.mobile-chevron { transition: transform 0.2s ease; flex-shrink: 0; }
	.mobile-chevron.rotated { transform: rotate(180deg); }
	.mobile-sub-items { display: flex; flex-direction: column; padding-left: 16px; padding-bottom: 4px; }
	.mobile-sub-link {
		color: var(--color-text); font-size: 1rem; font-weight: 500;
		background: none; border: none; cursor: pointer;
		padding: 8px 0; text-align: left; opacity: 0.75; transition: opacity 0.2s;
	}
	.mobile-sub-link:hover { opacity: 1; }
</style>
