import debug from 'debug';
import { Sema } from 'async-sema';

export default class ExecQueue {
	#sema: Sema;
	readonly #maxQueue: number;
	readonly #timeout: number;

	constructor(maxConcurrent: number, maxQueue: number, timeout: number) {
		if (!Number.isSafeInteger(maxConcurrent) || maxConcurrent <= 0) {
			throw new TypeError('maxConcurrent must be a positive integer');
		}
		if (!Number.isSafeInteger(maxQueue) || maxQueue < 0) {
			throw new TypeError('maxQueue must be a positive integer');
		}
		if (typeof timeout !== 'number' || timeout < 0) {
			throw new TypeError('timeout must be positive');
		}

		this.#sema = new Sema(maxConcurrent);
		this.#maxQueue = maxQueue;
		this.#timeout = timeout;
	}

	private acquireTimeout() {
		let timeoutId: null | ReturnType<typeof setTimeout> = null;

		const timeoutPromise = new Promise((_resolve, reject) => {
			timeoutId = setTimeout(() => {
				timeoutId = null;
				reject(new Error('Timeout'));
			}, this.#timeout);
		});
		const acquirePromise = new Promise((resolve, reject) => {
			this.#sema
				.acquire()
				.then((t) => {
					if (timeoutId !== null) {
						clearTimeout(timeoutId);
						resolve(t);
					} else {
						this.#sema.release(t);
						reject(new Error('Timeout already occurred'));
					}
				})
				.catch((err) => reject(err));
		});

		return Promise.race([timeoutPromise, acquirePromise]);
	}

	async getExecSlot() {
		if (this.#maxQueue > 0 && this.#sema.nrWaiting() >= this.#maxQueue) {
			return false;
		}

		try {
			if (this.#timeout === 0) {
				return !!this.#sema.tryAcquire();
			}
			await this.acquireTimeout();
		} catch (err) {
			debug(err.message);
			return false;
		}

		return true;
	}

	releaseExecSlot() {
		this.#sema.release();
	}
}
