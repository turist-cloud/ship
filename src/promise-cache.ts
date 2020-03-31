interface AnyCache {
	get: (key: any) => any;
	set: (key: any, value: Promise<any>) => any;
	del: (key: any) => any;
}

/**
 * Wrap a promise function into a cache.
 * @param {AnyCache} cache - A cache object implementing get(), set(), and del().
 * @param {any} fn - Any any async function.
 */
export default function promiseCache(cache: AnyCache, fn: any) {
	return (...args: any[]) => {
		const key = JSON.stringify(args);
		let p = cache.get(key);

		if (!p) {
			p = fn(...args);
			p.catch(() => cache.del(key));
			cache.set(key, p);
		}

		return p;
	};
}
