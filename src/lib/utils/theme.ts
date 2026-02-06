import siteConfig from '../../../site.config.json';

function camelToKebab(str: string): string {
	return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

export function generateCssVars(): string {
	const lines: string[] = [];
	for (const [key, value] of Object.entries(siteConfig.colors)) {
		lines.push(`--cfg-${camelToKebab(key)}: ${value};`);
	}
	lines.push(`--cfg-font-heading: '${siteConfig.fonts.heading}', sans-serif;`);
	lines.push(`--cfg-font-body: '${siteConfig.fonts.body}', sans-serif;`);
	return `:root {\n  ${lines.join('\n  ')}\n}`;
}

export function getConfig() {
	return siteConfig;
}
