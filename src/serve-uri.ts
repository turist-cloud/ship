import { IncomingMessage, ServerResponse } from 'micri';
import execFile from './exec-file';
import sendFile from './send-file';
import sendFileList from './send-file-list';
import { HIDDEN_FILES } from './config';
import { File, Folder } from './graph-api-types';
import { ParsedRequestOpts } from './types';
import { normalizePath, findRoute } from './routes';
import { sendNotFoundError, sendInvalidPathError } from './error';
import { isIndexFile, shouldExec } from './mode';
import { apiFetch, getMeta, getMetaAuto } from './graph-api';
import getServerPushHint from './server-push-hints';

export default async function serveUri(
	req: IncomingMessage,
	res: ServerResponse,
	{ host, pathname, siteConfig }: ParsedRequestOpts
): Promise<void> {
	// Handle routes
	if (siteConfig.routes) {
		const newPathname = findRoute(req.url || '/', siteConfig.routes);
		pathname = newPathname;
	} else {
		pathname = normalizePath(pathname);
	}

	const [[graphUrl, meta], _] = await Promise.all([
		getMetaAuto(siteConfig, host, pathname),
		siteConfig.useServerPushHints ? getServerPushHint(host, pathname) : null, // Get it cached
	]);
	if (graphUrl === null) {
		return sendInvalidPathError(req, res, siteConfig);
	}

	if (!meta) {
		// notFound hook handling
		if (siteConfig.hooks && siteConfig.hooks.notFound) {
			const newPathname = findRoute(req.url || '/', siteConfig.hooks.notFound);
			if (newPathname !== pathname) {
				pathname = newPathname;

				const [graphUrl, meta] = await getMeta(host, pathname);
				if (graphUrl === null) {
					return sendInvalidPathError(req, res, siteConfig);
				}

				if (meta && meta.file) {
					if (shouldExec(siteConfig, pathname)) {
						return execFile(req, res, siteConfig, meta);
					} else {
						return sendFile(req, res, meta, siteConfig);
					}
				}
			}
		}

		return sendNotFoundError(req, res, siteConfig);
	} else if (meta.folder) {
		const { value: dir } = await apiFetch(`${graphUrl}/children`);
		const index = dir.find(
			(o: File) =>
				o.name &&
				o.file && // It's a file
				isIndexFile(o.name)
		);
		if (index) {
			const indexPath = `${pathname}/${index.name}`;

			if (shouldExec(siteConfig, indexPath)) {
				return execFile(req, res, siteConfig, index);
			}

			const serverPushFiles = siteConfig.useServerPushHints
				? await getServerPushHint(host, indexPath)
				: undefined;
			return sendFile(req, res, index, siteConfig, serverPushFiles);
		} else {
			if (siteConfig.dirListing) {
				return sendFileList(
					req,
					res,
					pathname,
					dir.filter((e: File | Folder) => HIDDEN_FILES.every((re) => !re.test(e.name.toLowerCase())))
				);
			} else {
				return sendNotFoundError(req, res, siteConfig);
			}
		}
	} else if (meta.file) {
		if (shouldExec(siteConfig, `${pathname}/${meta.name}`)) {
			return execFile(req, res, siteConfig, meta);
		}

		const serverPushFiles = siteConfig.useServerPushHints ? await getServerPushHint(host, pathname) : undefined;
		return sendFile(req, res, meta, siteConfig, serverPushFiles);
	}

	return sendNotFoundError(req, res, siteConfig);
}
