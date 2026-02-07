export interface SocialLink {
	platform: string;
	url: string;
}

export interface Meta {
	name: string;
	title: string;
	description: string;
	url: string;
	ogImage: string;
	email: string;
	about?: string;
	socialLinks: SocialLink[];
}

export interface Colors {
	primary: string;
	primaryHover: string;
	secondary: string;
	accent: string;
	accentHover: string;
	background: string;
	surface: string;
	surfaceHover: string;
	border: string;
	text: string;
	textMuted: string;
	textInverse: string;
	line: string;
	tagBg: string;
	tagBorder: string;
	tagText: string;
}

export interface Fonts {
	heading: string;
	body: string;
}

export interface SiteConfig {
	meta: Meta;
	colors: Colors;
	fonts: Fonts;
	heroLinePath?: string;
	heroLineViewBox?: string;
}

export type TileSize = 'small' | 'medium' | 'large';

export interface ProjectImage {
	src: string;
	alt: string;
	tileSize?: TileSize;
}

export interface Project {
	id: string;
	name: string;
	description: string;
	role: string;
	year: string;
	client?: string;
	tags: string[];
	cover: string;
	images?: ProjectImage[];
	externalUrl?: string;
	featured?: boolean;
	linePath?: string;
	lineColor?: string;
	detailImages?: ProjectImage[];
}

export interface GarlandPoint {
	x: number;
	y: number;
	angle?: number;
}
