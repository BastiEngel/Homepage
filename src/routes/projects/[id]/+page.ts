import type { Project } from '$lib/types';
import projectsData from '../../../data/projects.json';

const projects = projectsData as Project[];

export function entries() {
	return projects.filter((p) => p.id !== 'about').map((p) => ({ id: p.id }));
}

export function load({ params }: { params: { id: string } }) {
	const project = projects.find((p) => p.id === params.id);
	if (!project) {
		throw new Error(`Project not found: ${params.id}`);
	}
	return { project };
}
