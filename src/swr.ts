import LRU from 'lru-cache';
import { AnyCache } from './promise-cache';

type RevalidateFn<T> = (key: string, value: T) => Promise<T | null>;

export type SWROpts<T extends object> = {
	max?: number;
	maxAge: number;
	length?: (n: T, key: string) => number;
	revalidateAfter: number;
	revalidate: RevalidateFn<T>;
	onError?: (err: Error) => void;
};

/**
 * A stale-while-revalidate LRU cache.
 */
export default class SWR<T extends object> implements AnyCache {
	#lru: LRU<string, T>;
	#revalidateMap: WeakMap<any, { revalidateAfterTs: number; revalidating: boolean }>;
	#revalidateAfter: number;
	#revalidate: RevalidateFn<T>;
	#onError?: (err: Error) => void;

	constructor(opts: SWROpts<T>) {
		if (typeof opts.maxAge !== 'number' || typeof opts.revalidateAfter !== 'number') {
			throw new TypeError('maxAge and revalidateAfter must be type of number');
		}
		if (opts.maxAge <= opts.revalidateAfter) {
			throw new Error('maxAge must be greater than revalidateAfter');
		}

		this.#lru = new LRU<string, T>({
			max: opts.max,
			maxAge: opts.maxAge,
			updateAgeOnGet: true,
			noDisposeOnSet: false,
			length: opts.length,
		});
		this.#revalidateMap = new WeakMap();
		this.#revalidateAfter = opts.revalidateAfter;
		this.#revalidate = opts.revalidate;
		this.#onError = opts.onError;
	}

	get(key: string) {
		const v = this.#lru.get(key);

		// Note that == is here on purpose
		if (v == null) {
			return v;
		}

		const r = this.#revalidateMap.get(v);

		if (r && !r.revalidating && r.revalidateAfterTs <= Date.now()) {
			r.revalidating = true;

			process.nextTick(() => {
				this.#revalidate(key, v)
					.then((nextV) => {
						if (nextV === null || nextV === undefined) {
							this.del(key);
						} else if (nextV !== v) {
							this.set(key, nextV);
						}
					})
					.catch((err) => {
						if (this.#onError) {
							this.#onError(err);
						} else {
							console.error(`Revalidation for "${key}" failed:`, err);
						}
					})
					.finally(() => (r.revalidating = false));
			});
		}

		return v;
	}

	set(key: string, value: T) {
		this.#revalidateMap.set(value, {
			revalidateAfterTs: Date.now() + this.#revalidateAfter,
			revalidating: false,
		});

		return this.#lru.set(key, value);
	}

	del(key: string) {
		return this.#lru.del(key);
	}
}
