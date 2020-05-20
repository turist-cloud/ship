import { Server as Http1Server } from 'http';
import { Http2Server } from 'http2';
import { IncomingMessage, ServerResponse } from 'micri';
import apiFetch from './fetch-graph-api';
import { HTTP_VERSION, PORT, PORT_HTTP, ROOT, ENABLE_TLS, ENABLE_ALPN } from './config';
import serveUri from './serve-uri';
import { getServe, parseRequest } from './server';

const servers: Array<Http1Server | Http2Server> = [];

servers.push(
	getServe(HTTP_VERSION, ENABLE_TLS, ENABLE_ALPN)(parseRequest(HTTP_VERSION, ENABLE_ALPN, serveUri)).listen(PORT)
);

// If PORT_HTTP is set it means that we are in standalone HTTPS mode and we need
// to provide a server on port 80 for redirects to HTTPS.
if (PORT_HTTP) {
	const server = getServe(
		'1.1',
		false,
		false
	)((req: IncomingMessage, res: ServerResponse) => {
		const host = req.headers.host?.split(':')[0] || '';
		const dest = `https://${host}${PORT !== 443 ? `:${PORT}` : ''}${req.url}`;

		res.statusCode = 308;
		res.setHeader('Location', dest);
		res.setHeader('Refresh', `0;url=${dest}`);
		res.end();
	});

	server.listen(PORT_HTTP);
	servers.push(server);
}

// Start authentication on startup to minimize the effect to serving traffic.
apiFetch(`${ROOT}:`)
	.then(() => console.log('Authenticated')) // eslint-disable-line no-console
	.catch((err: Error) => {
		console.error(err); // eslint-disable-line no-console
		process.exit(1);
	});

function shutdown() {
	// eslint-disable-next-line no-console
	console.error('Shutting down');

	Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))))
		.then(() => {
			// eslint-disable-next-line no-console
			console.error('Shutdown complete');
			process.exit(1);
		})
		.catch((err) => {
			// eslint-disable-next-line no-console
			console.error('Graceful shutdown failed');
			console.error(err); // eslint-disable-line no-console
			process.exit(1);
		});
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
