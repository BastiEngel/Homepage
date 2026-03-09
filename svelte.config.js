import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: undefined,
			precompress: true,
			strict: true
		}),
		paths: {
			base: process.env.BASE_PATH || ''
		},
		prerender: {
			handleHttpError: ({ path, message }) => {
				if (path.endsWith('.mp4') || path.endsWith('.webm')) return;
				throw new Error(message);
			}
		}
	}
};

export default config;
