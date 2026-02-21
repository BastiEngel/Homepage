import type { Action } from 'svelte/action';

export const revealCard: Action<HTMLElement, void> = (node) => {
	const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	if (prefersReducedMotion) {
		node.classList.add('is-revealed');
		return;
	}

	const ENTER = '1.1s cubic-bezier(0.22, 1, 0.36, 1)';
	const EXIT = '0.7s ease';

	node.style.opacity = '0';
	node.style.transform = 'translateY(80px) scale(0.88)';
	node.style.transition = `opacity ${ENTER}, transform ${ENTER}`;

	let visible = false;
	let resetTimer: ReturnType<typeof setTimeout> | undefined;

	const observer = new IntersectionObserver((entries) => {
		for (const entry of entries) {
			if (entry.isIntersecting) {
				clearTimeout(resetTimer);
				visible = true;
				node.style.transition = `opacity ${ENTER}, transform ${ENTER}`;
				node.style.opacity = '1';
				node.style.transform = 'translateY(0) scale(1)';
				node.classList.add('is-revealed');
			} else if (visible) {
				// Fade out — opacity only, no transform jump
				visible = false;
				node.classList.remove('is-revealed');
				node.style.transition = `opacity ${EXIT}`;
				node.style.opacity = '0';
				// Silently reset transform after fade-out so next enter animates from below again
				resetTimer = setTimeout(() => {
					if (!visible) {
						node.style.transition = 'none';
						node.style.transform = 'translateY(80px) scale(0.88)';
						requestAnimationFrame(() => {
							node.style.transition = `opacity ${ENTER}, transform ${ENTER}`;
						});
					}
				}, 750);
			}
		}
	}, { threshold: 0.08 });

	observer.observe(node);

	return {
		destroy() {
			observer.disconnect();
			clearTimeout(resetTimer);
		}
	};
};

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
