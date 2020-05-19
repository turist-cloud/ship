import ms from 'ms';
import SWR from '../src/cache/swr';

const sleep = (t: string) => new Promise((r) => setTimeout(r, ms(t)));

describe('constructor', () => {
	test('constructor creates an instance', () => {
		const swr = new SWR<[string]>({
			max: 5,
			maxAge: 100,
			revalidateAfter: 50,
			revalidate: async (_k, v) => v,
		});

		expect(swr).toBeDefined();
		expect(typeof swr.get).toBe('function');
		expect(typeof swr.set).toBe('function');
		expect(typeof swr.del).toBe('function');
	});

	test('constructor rejects invalid revalidateAfter', () => {
		expect(
			() =>
				new SWR<[string]>({
					maxAge: 5,
					revalidateAfter: 10,
					revalidate: async (_k, v) => v,
				})
		).toThrow();
	});
});

describe('set, get, and del basic functionality', () => {
	test('Can set a value', () => {
		const swr = new SWR<[string]>({
			max: 5,
			maxAge: 100,
			revalidateAfter: 50,
			revalidate: async (_k, v) => v,
		});

		expect(() => swr.set('x', ['value'])).not.toThrow();
	});

	test('Can get a value previously set', () => {
		const swr = new SWR<object>({
			max: 5,
			maxAge: 100,
			revalidateAfter: 50,
			revalidate: async (_k, v) => v,
		});

		const o = {};
		swr.set('x', o);
		const v = swr.get('x');

		expect(v).toBe(o);
	});

	test('getting a non-existing value returns undefined and no revalidation happens', async () => {
		const revalidate = jest.fn(async (_k, v) => v);
		const swr = new SWR<object>({
			max: 5,
			maxAge: 100,
			revalidateAfter: 50,
			revalidate,
		});

		const v = swr.get('x');

		expect(v).toBeUndefined();
		await sleep('10ms');
		expect(revalidate).not.toHaveBeenCalled();
	});

	test('a value is not available after deletion', () => {
		const swr = new SWR<[string]>({
			max: 5,
			maxAge: 100,
			revalidateAfter: 50,
			revalidate: async (_k, v) => v,
		});

		swr.set('x', ['v']);
		swr.del('x');
		expect(swr.get('x')).toBeUndefined();
	});
});

describe('revalidation', () => {
	test('revalidate() is not called before revalidateAfter has exceeded', async () => {
		const revalidate = jest.fn(async (_k, v) => v);
		const swr = new SWR<object>({
			max: 5,
			maxAge: ms('100ms'),
			revalidateAfter: ms('50ms'),
			revalidate,
		});

		const o = {};
		swr.set('x', o);
		await sleep('10ms');
		const v = swr.get('x');

		expect(v).toBe(o);
		expect(revalidate).not.toHaveBeenCalled();
	});

	test('revalidate() after is not called if the value is never needeed', async () => {
		const revalidate = jest.fn(async (_k, v) => v);
		const swr = new SWR<object>({
			max: 5,
			maxAge: ms('100ms'),
			revalidateAfter: ms('30ms'),
			revalidate,
		});

		const o = {};
		swr.set('x', o);
		await sleep('4ms');
		const v = swr.get('x');

		expect(v).toBe(o);
		expect(revalidate).not.toHaveBeenCalled();
	});

	test('revalidate() is is not called if the value has expired and get() is called', async () => {
		const revalidate = jest.fn(async (_k, v) => v);
		const swr = new SWR<object>({
			max: 5,
			maxAge: ms('5ms'),
			revalidateAfter: ms('1ms'),
			revalidate,
		});

		const o = {};
		swr.set('x', o);
		await sleep('10ms');
		const v = swr.get('x');

		expect(v).toBeUndefined();
		expect(revalidate).not.toHaveBeenCalled();
	});

	test('revalidate() is called when revalidateAfter has passed and get() is called', async () => {
		const key = 'x';
		const o1: any = [];
		const o2: any = [[]];
		const revalidate = jest.fn(async (_k, _v) => o2);
		const swr = new SWR<object>({
			max: 5,
			maxAge: ms('100ms'),
			revalidateAfter: ms('5ms'),
			revalidate,
		});

		swr.set(key, o1);
		await sleep('10ms');
		const v = swr.get(key);
		await sleep('1ms');

		expect(v).toBe(o1);
		expect(revalidate).toHaveBeenCalledTimes(1);
		expect(revalidate).toHaveBeenCalledWith(key, o1);
	});

	test('revalidate() result is available on second get', async () => {
		const key = 'x';
		const o1: any = [];
		const o2: any = [[]];
		const revalidate = jest.fn(async (_k, _v) => o2);
		const swr = new SWR<object>({
			max: 5,
			maxAge: ms('100ms'),
			revalidateAfter: ms('5ms'),
			revalidate,
		});

		swr.set(key, o1);
		await sleep('10ms');
		const v1 = swr.get(key);
		await sleep('1ms');
		const v2 = swr.get(key);

		expect(v1).toBe(o1);
		expect(v2).toBe(o2);
		expect(revalidate).toHaveBeenCalledTimes(1);
		expect(revalidate).toHaveBeenCalledWith(key, o1);
	});

	test('revalidate() can discard a value from the cache', async () => {
		const key = 'x';
		const o1: any = [];
		const revalidate = jest.fn(async (_k, _v) => null);
		const swr = new SWR<object>({
			max: 5,
			maxAge: ms('100ms'),
			revalidateAfter: ms('5ms'),
			revalidate,
		});

		swr.set(key, o1);
		await sleep('10ms');
		swr.get(key);
		await sleep('1ms');
		const v = swr.get(key);
		await sleep('1ms');

		expect(v).toBeUndefined();
		expect(revalidate).toHaveBeenCalledTimes(1);
		expect(revalidate).toHaveBeenCalledWith(key, o1);
	});

	test('revalidate() can keep the original in the cache', async () => {
		const key = 'x';
		const o1: any = [];
		const revalidate = jest.fn(async (_k, v) => v);
		const swr = new SWR<object>({
			max: 5,
			maxAge: ms('100ms'),
			revalidateAfter: ms('5ms'),
			revalidate,
		});

		swr.set(key, o1);
		await sleep('10ms');
		const v = swr.get(key);
		await sleep('1ms');

		expect(v).toBe(o1);
		expect(revalidate).toHaveBeenCalledTimes(1);
		expect(revalidate).toHaveBeenCalledWith(key, o1);
	});

	test('onError() is called on revalidation error', async () => {
		const key = 'x';
		const o1: any = [];
		const revalidate = jest.fn(async (_k, _v) => {
			throw new Error('test 1');
		});
		const onError = jest.fn();
		const swr = new SWR<object>({
			max: 5,
			maxAge: ms('100ms'),
			revalidateAfter: ms('5ms'),
			revalidate,
			onError,
		});

		swr.set(key, o1);
		await sleep('10ms');
		const v = swr.get(key);
		await sleep('1ms');

		expect(v).toBe(o1);
		expect(revalidate).toHaveBeenCalledTimes(1);
		expect(revalidate).toHaveBeenCalledWith(key, o1);
		expect(onError).toHaveBeenCalled();
	});

	test('onError() can be triggered multiple times', async () => {
		const key = 'x';
		const o1: any = [];
		const revalidate = jest.fn(async (_k, _v) => {
			throw new Error('test 2');
		});
		const onError = jest.fn();
		const swr = new SWR<any>({
			max: 5,
			maxAge: ms('100ms'),
			revalidateAfter: ms('5ms'),
			revalidate,
			onError,
		});

		swr.set(key, o1);
		await sleep('10ms');
		const v1 = swr.get(key);
		await sleep('1ms');
		const v2 = swr.get(key);
		await sleep('1ms');
		const v3 = swr.get(key);
		await sleep('1ms');

		expect(v1).toBe(o1);
		expect(v2).toBe(o1);
		expect(v3).toBe(o1);
		expect(revalidate).toHaveBeenCalledTimes(3);
		expect(revalidate).toHaveBeenCalledWith(key, o1);
		expect(onError).toHaveBeenCalledTimes(3);
	});
});

// TODO test that revalidating refreshes the TTL
