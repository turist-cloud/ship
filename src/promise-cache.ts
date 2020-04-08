export interface AnyCache<T = any> {
	get: (key: string) => T | undefined;
	set: (key: string, value: T) => any;
	del: (key: string) => any;
}

/**
 * Wrap a promise function into a cache.
 * @param {AnyCache} cache - A cache object implementing get(), set(), and del().
 * @param {any} fn - Any any async function.
 */
export default function promiseCache<T = any>(cache: AnyCache<Promise<T>>, fn: (...args: any) => Promise<T>) {
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
