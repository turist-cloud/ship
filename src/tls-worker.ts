import { readFileSync } from 'fs';
import { isMainThread, parentPort, workerData } from 'worker_threads';
import { CertRequestMessage, CertResponseMessage } from './types';

if (!isMainThread) {
	const certs = new Map<string, [Buffer, Buffer]>();

	// Read static certificates.
	for (const certLoc of workerData.staticCerts) {
		const [domains, certPath, keyPath] = certLoc;
		const cert = readFileSync(certPath);
		const key = readFileSync(keyPath);

		for (const domain of domains) {
			certs.set(domain, [cert, key]);
		}
	}

	// Listen for certificate retrieval requests.
	parentPort?.on('message', (req: CertRequestMessage) => {
		if (!parentPort) {
			process.exit(1);
		}

		const obj = certs.get(req.servername);
		if (!obj) {
			const res: CertResponseMessage = {
				ctxId: req.ctxId,
				servername: req.servername,
				cert: null,
				key: null,
			};

			parentPort.postMessage(res);
			return;
		}

		const res: CertResponseMessage = {
			ctxId: req.ctxId,
			servername: req.servername,
			cert: obj[0],
			key: obj[1],
		};

		parentPort.postMessage(res);
	});
}
