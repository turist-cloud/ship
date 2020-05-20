import { readFileSync } from 'fs';
import { SecureContext, createSecureContext } from 'tls';
import { join as pathJoin } from 'path';
import { Worker, isMainThread } from 'worker_threads';
import { CertRequestMessage, CertResponseMessage } from './types';
import {
	ENABLE_TLS,
	TLS_CIPHERS,
	TLS_DH_PARAMS_PATH,
	TLS_MAX_VERSION,
	TLS_MIN_VERSION,
	TLS_STATIC_CERTS,
} from './config';

type SNICallback = (err: Error | null, ctx: SecureContext) => void;

if (!isMainThread) {
	process.exit(1);
}

let worker: Worker | null = null;

// Pending SNI callbacks awaiting for a certificate.
const pendingCtxCb = new Map<string, SNICallback>();

if (ENABLE_TLS) {
	const dhparam = readFileSync(TLS_DH_PARAMS_PATH);

	// A worker is used to manage the TLS certificates and they are
	// only retrieved from the worker when a new connection is being
	// established.
	worker = new Worker(pathJoin(__dirname, 'tls-worker.js'), {
		workerData: {
			staticCerts: TLS_STATIC_CERTS,
		},
	});

	worker.on('message', (res: CertResponseMessage) => {
		const ctxId = res.ctxId;
		const cb = pendingCtxCb.get(ctxId);
		if (!cb) {
			// eslint-disable-next-line no-console
			console.error(`No pending SNICallback for ${ctxId}`);
			return;
		}
		pendingCtxCb.delete(ctxId);

		if (!res.key || !res.cert) {
			// Not found
			// eslint-disable-next-line no-console
			console.error(`Certificate not found for "${res.servername}"`);

			return cb(new Error('Not found'), createSecureContext({}));
		}

		const ctx = createSecureContext({
			key: Buffer.from(res.key),
			cert: Buffer.from(res.cert),
			dhparam,
			minVersion: TLS_MIN_VERSION,
			maxVersion: TLS_MAX_VERSION,
			ciphers: TLS_CIPHERS,
		});

		cb(null, ctx);
	});
	worker.on('error', (error: Error) => {
		// eslint-disable-next-line no-console
		console.error(error);
		// TODO Is some error handling needed here?
	});
	worker.on('exit', (code) => {
		if (code !== 0) {
			// eslint-disable-next-line no-console
			console.error(`Worker stopped with exit code ${code}`);
			process.exit(1);
		}
	});
}

export function SNICallback(servername: string, cb: SNICallback) {
	const msg: CertRequestMessage = {
		ctxId: `${servername}-${Date.now()}-${(Math.random() * 1000) | 0}`,
		servername,
	};

	if (!worker) {
		throw new Error('TLS is not enabled');
	}

	worker.postMessage(msg);
	pendingCtxCb.set(msg.ctxId, cb);
}
