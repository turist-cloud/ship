import { initRoutes, initHooks, findRoute } from '../src/routes';

test('parses routes properly', () => {
	const routes = initRoutes([
		['/users/(?<id>[^/]*)', '/users.js?id=$<id>'],
		['/pages/(?<id>[^/]*)', '/pages.js?id=$<id>'],
	]);

	expect(Array.isArray(routes)).toBeTruthy();
	expect(routes).toEqual([
		[new RegExp('/users/(?<id>[^/]*)'), '/users.js?id=$<id>'],
		[new RegExp('/pages/(?<id>[^/]*)'), '/pages.js?id=$<id>'],
	]);
});

test('parses hooks properly', () => {
	const hooks = initHooks({
		a: [
			['/users/(?<id>[^/]*)', '/users.js?id=$<id>'],
			['/pages/(?<id>[^/]*)', '/pages.js?id=$<id>'],
		],
		b: [
			['/users/(?<id>[^/]*)', '/users.js?id=$<id>'],
			['/pages/(?<id>[^/]*)', '/pages.js?id=$<id>'],
		],
	});

	expect(hooks).toEqual({
		a: [
			[new RegExp('/users/(?<id>[^/]*)'), '/users.js?id=$<id>'],
			[new RegExp('/pages/(?<id>[^/]*)'), '/pages.js?id=$<id>'],
		],
		b: [
			[new RegExp('/users/(?<id>[^/]*)'), '/users.js?id=$<id>'],
			[new RegExp('/pages/(?<id>[^/]*)'), '/pages.js?id=$<id>'],
		],
	});
});

test('findRoute() finds a route', () => {
	const routes: [RegExp, string][] = [
		[new RegExp('/users/(?<id>[^/]*)'), '/users.js?id=$<id>'],
		[new RegExp('/pages/(?<id>[^/]*)'), '/pages.js?id=$<id>'],
	];

	const out = findRoute('/pages/123', routes);
	expect(out).toStrictEqual(['/pages.js?id=123', '/pages.js']);
});

test.skip('findRoute() finds a route and preserves existing query', () => {
	const routes: [RegExp, string][] = [
		[new RegExp('/users/(?<id>[^/]*)'), '/users.js?id=$<id>'],
		[new RegExp('/pages/(?<id>[^/]*)'), '/pages.js?id=$<id>'],
	];

	const out = findRoute('/pages/123?xyz=abc', routes);
	expect(out).toStrictEqual(['/pages.js?xyz=abc&id=123', '/pages.js']);
});

test('findRoute() returns the original path if nothing was found', () => {
	const routes: [RegExp, string][] = [
		[new RegExp('/users/(?<id>[^/]*)'), '/users.js?id=$<id>'],
		[new RegExp('/pages/(?<id>[^/]*)'), '/pages.js?id=$<id>'],
	];

	const out = findRoute('/page/123', routes);
	expect(out).toStrictEqual(['/page/123', '/page/123']);
});
