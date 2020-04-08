import promiseCache from '../src/promise-cache';

function createFakeCache() {
	const data: { [index: string]: any } = {};

	return {
		get: jest.fn((key: any): any => {
			return data[JSON.stringify(key)];
		}),
		set: jest.fn((key: any, value: Promise<any>) => {
			data[JSON.stringify(key)] = value;
		}),
		del: jest.fn((key: any) => {
			delete data[JSON.stringify(key)];
		})
	};
}

describe('same args in all calls', () => {
	test('first call works as expected', async () => {
		const mock = jest.fn((_arg) => {
			return new Promise((resolve) => resolve(true))
		});

		const cache = createFakeCache();
		const memoMock = promiseCache(cache, mock);

		const res = await memoMock('hello');

		expect(res).toBe(true);
		expect(cache.get).toHaveBeenCalledTimes(1);
		expect(cache.get).toHaveBeenCalledWith(JSON.stringify(['hello']));
		expect(cache.set).toHaveBeenCalledTimes(1);
		expect(cache.del).toHaveBeenCalledTimes(0);
		expect(mock).toHaveBeenCalledTimes(1);
	});

	test('second synchronous call is cached', async () => {
		const mock = jest.fn((_arg) => {
			return new Promise((resolve) => resolve(true))
		});

		const cache = createFakeCache();
		const memoMock = promiseCache(cache, mock);

		const p1 = memoMock('hello');
		const p2 = memoMock('hello');
		const [res1, res2] = await Promise.all([p1, p2]);

		expect(res1).toBe(true);
		expect(res2).toBe(true);
		expect(p1).toBe(p2);
		expect(cache.get).toHaveBeenCalledTimes(2);
		expect(cache.get).toHaveBeenCalledWith(JSON.stringify(['hello']));
		expect(cache.set).toHaveBeenCalledTimes(1);
		expect(cache.del).toHaveBeenCalledTimes(0);
		expect(mock).toHaveBeenCalledTimes(1);
	});

	test('concurrent calls will resolve only a single cached promise', async () => {
		const mock = jest.fn((_arg) => {
			return new Promise((resolve) => setTimeout(() => resolve(true), 500))
		});

		const cache = createFakeCache();
		const memoMock = promiseCache(cache, mock);

		const [res1, res2, res3, res4] = await Promise.all([
			memoMock('hello'),
			memoMock('hello'),
			memoMock('hello'),
			memoMock('hello')
		]);

		expect(res1).toBe(true);
		expect(res2).toBe(true);
		expect(res3).toBe(true);
		expect(res4).toBe(true);
		expect(cache.get).toHaveBeenCalledTimes(4);
		expect(cache.get).toHaveBeenCalledWith(JSON.stringify(['hello']));
		expect(cache.set).toHaveBeenCalledTimes(1);
		expect(cache.del).toHaveBeenCalledTimes(0);
		expect(mock).toHaveBeenCalledTimes(1);
	});
});

describe('trigger multiple promises', () => {
	test('concurrent calls with different args will resolve with different promises', async () => {
		const mock = jest.fn((arg) => {
			return new Promise((resolve) => setTimeout(() => resolve(arg), 500))
		});

		const cache = createFakeCache();
		const memoMock = promiseCache(cache, mock);

		const [res1, res2, res3, res4] = await Promise.all([
			memoMock('hello'),
			memoMock('hello'),
			memoMock('hi'),
			memoMock('hi')
		]);

		expect(res1).toBe('hello');
		expect(res2).toBe('hello');
		expect(res3).toBe('hi');
		expect(res4).toBe('hi');
		expect(cache.get).toHaveBeenCalledTimes(4);
		expect(cache.set).toHaveBeenCalledTimes(2);
		expect(cache.del).toHaveBeenCalledTimes(0);
		expect(mock).toHaveBeenCalledTimes(2);
	});
});

describe('error handling', () => {
	test('a rejected promise is deleted', async () => {
		const mock = jest.fn((_arg) => {
			return new Promise((_, reject) => setTimeout(() => reject(new Error()), 1))
		});

		const cache = createFakeCache();
		const memoMock = promiseCache(cache, mock);

		await expect(memoMock('a')).rejects.toThrowError();
		expect(cache.del).toHaveBeenCalledTimes(1);
		expect(cache.del).toHaveBeenCalledWith(JSON.stringify(['a']));
	});
});
