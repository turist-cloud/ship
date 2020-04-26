import { normalize as _pathNormalize } from 'path';
import { parse } from 'url';

function removeTrailing(str: string, ch: string): string {
	return !str.endsWith(ch) ? str : removeTrailing(str.slice(0, -1), ch);
}

export function normalizePath(path: string): string {
	path = _pathNormalize(path);
	path = removeTrailing(path, '/');

	return path;
}

export function findRoute(url: string, routes: [RegExp, string][]): [string, string] {
	let path = normalizePath(parse(url || '/', true).pathname || '');

	for (const route of routes) {
		const out = path.replace(route[0], route[1]);
		if (out !== path) {
			path = out;
			break;
		}
	}

	const newPathname = normalizePath(parse(path || '/').pathname || '');

	return [path, newPathname];
}

export function initRoutes(routes: [string, string][]): [RegExp, string][] {
	return routes.map(([src, dst]) => [new RegExp(src), dst]);
}

export function initHooks(hooks: { [index: string]: [string, string][] }) {
	const r: { [index: string]: [RegExp, string][] } = {};

	Object.keys(hooks).forEach((key: string) => (r[key] = initRoutes(hooks[key])));

	return r;
}
