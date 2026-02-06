import type { Action } from 'svelte/action';

interface ScrollRevealOptions {
	delay?: number;
	threshold?: number;
}

export const scrollReveal: Action<HTMLElement, ScrollRevealOptions | undefined> = (
	node,
	options = {}
) => {
	const { delay = 0, threshold = 0.1 } = options ?? {};

	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (prefersReducedMotion) {
		node.style.opacity = '1';
		return;
	}

	node.style.opacity = '0';
	node.style.transform = 'translateY(30px)';
	node.style.transition = `opacity 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`;

	const observer = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) {
					node.style.opacity = '1';
					node.style.transform = 'translateY(0)';
					observer.unobserve(node);
				}
			}
		},
		{ threshold }
	);

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
		}
	};
};
