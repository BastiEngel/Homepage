// Svelte action for <video autoplay loop muted playsinline> elements.
//
// Previously every project-detail video started downloading + decoding the
// instant the page mounted, regardless of scroll position — several
// simultaneous video decodes is a major source of CPU load and, combined
// with `preload="none"`, this also defers the network fetch until the
// video is actually about to be seen (cuts initial page-load payload).
//
// Use together with `preload="none"` and no `autoplay` attribute on the
// <video> tag itself — this action drives play()/pause() from visibility.
export function lazyAutoplay(node: HTMLVideoElement) {
	const io = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.play().catch(() => {
						/* autoplay can be rejected before user interaction on some browsers — ignore */
					});
				} else {
					node.pause();
				}
			}
		},
		{ rootMargin: '200px' }
	);
	io.observe(node);
	return {
		destroy() {
			io.disconnect();
		}
	};
}
