import ExecQueue from '../src/exec-queue';

async function promiseState(promise: Promise<any>): Promise<string> {
	return new Promise((resolve) => {
		const uniq = Symbol('unique');
		const pendingOrResolved = (value: any) => {
			if (value === uniq) {
				resolve('pending');
			} else {
				resolve('fulfilled');
			}
		};
		const rejected = () => {
			resolve('rejected');
		};

		Promise.race([promise, Promise.resolve(uniq)]).then(pendingOrResolved, rejected);
	});
}

const sleep = (t: number) => new Promise((r) => setTimeout(r, t));

test('Can create a queue', () => {
	const execQueue = new ExecQueue(1, 1, 1);

	expect(execQueue).toBeTruthy();
});

test('accepts when there is room 1', async () => {
	const execQueue = new ExecQueue(1, 0, 0);

	const v = await execQueue.getExecSlot();

	expect(v).toBeTruthy();
});

test('accepts when there is room 2', async () => {
	const execQueue = new ExecQueue(1, 1, 0);

	const v = await execQueue.getExecSlot();

	expect(v).toBeTruthy();
});

test('accepts when there is room 3', async () => {
	const execQueue = new ExecQueue(1, 1, 1);

	const v = await execQueue.getExecSlot();

	expect(v).toBeTruthy();
});

test('accepts when the queue clears', async () => {
	const execQueue = new ExecQueue(1, 1, 1000);

	await execQueue.getExecSlot();
	await sleep(10);
	const p = execQueue.getExecSlot();
	await sleep(10);
	expect(await promiseState(p)).toBe('pending');
	execQueue.releaseExecSlot();
	await sleep(10);

	expect(await promiseState(p)).toBe('fulfilled');
	await expect(p).resolves.toBeTruthy();
});

test('rejects when there is no more room', async () => {
	const execQueue = new ExecQueue(1, 0, 0);

	await execQueue.getExecSlot();
	await sleep(1);
	const p = execQueue.getExecSlot();
	await sleep(1);
	expect(await promiseState(p)).toBe('fulfilled');

	const v = await p;
	expect(v).toBeFalsy();
});

test('rejects when there is now more room (2)', async () => {
	const execQueue = new ExecQueue(1, 1, 0);

	await execQueue.getExecSlot();
	await sleep(1);
	await execQueue.getExecSlot();
	await sleep(1);
	const p = execQueue.getExecSlot();
	await sleep(1);
	expect(await promiseState(p)).toBe('fulfilled');

	const v = await p;
	expect(v).toBeFalsy();
});

test('rejects when there is more room and the timeout is exceeded', async () => {
	const execQueue = new ExecQueue(1, 1, 100);

	await execQueue.getExecSlot();
	await sleep(10);
	const p = execQueue.getExecSlot();

	await sleep(10);
	expect(await promiseState(p)).toBe('pending');
	await sleep(110);
	expect(await promiseState(p)).toBe('fulfilled');

	const v = await p;
	expect(v).toBeFalsy();
});
