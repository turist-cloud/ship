import { send, IncomingMessage, ServerResponse } from 'micri';
import { parseAll } from '@hapi/accept';
import allowedMethod from './headers/allowed-method';
import setVary from './headers/set-vary';
import { File, Folder } from './graph-api-types';

/**
 * Get path to the parent folder of path.
 */
function getParent(path: string): string {
	const prev = path.split('/').slice(0, -1).join('/');

	return prev.length === 0 ? '/' : prev;
}

function getFileType(file: File | Folder, emoji = false): string {
	const e = file as any;
	const types = {
		file: ['file', '📄'],
		folder: ['folder', '📁'],
		unknownType: ['unknown', '🛸'],
	};

	if (e.file) {
		return types.file[+emoji];
	} else if (e.folder) {
		return types.folder[+emoji];
	}

	return types.unknownType[+emoji];
}

function condense(files: Array<File | Folder>) {
	return files.map((e) => ({
		name: e.name,
		type: getFileType(e),
		eTag: e.eTag,
		size: e.size,
		lastModifiedDateTime: e.lastModifiedDateTime,
	}));
}

export default function sendFileList(
	req: IncomingMessage,
	res: ServerResponse,
	pathname: string,
	files: Array<File | Folder>
): void {
	let types = ['*/*'];

	// Some methods are not allowed here and some will need special
	// handling.
	if (!allowedMethod(req, res)) {
		return;
	}

	try {
		const parsed = parseAll(req.headers);
		types = parsed.mediaTypes;
	} catch (err) {
		// eslint-disable-next-line
		console.error(err);
	}

	setVary(res);
	if (types.includes('text/html')) {
		return send(
			res,
			200,
			`<html lang=en>
	<head>
		<meta charset=utf-8>
		<title>File listing - ${pathname}</title>
	</head>
	<body>
		<h2>${pathname}</h2>
		<hr/>
		<table>
			<thead>
				<tr>
					<th></th>
					<th>Filename</th>
					<th>Size <small>(bytes)</small></th>
					<th>Date Modified</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td></td>
					<td><a href="${getParent(pathname)}">..</a></td>
					<td></td>
					<td></td>
				</tr>
				${files
					.map(
						(e) => `<tr>
					<td>${getFileType(e, true)}</td>
					<td><a href="${pathname}/${encodeURIComponent(e.name)}">${e.name}</a></td>
					<td>${e.size}</td>
					<td>${e.lastModifiedDateTime}</td>
				</tr>`
					)
					.join('\n')}
			</tbody>
		</table>
		<hr>
	</body>
</html>
`
		);
	} else if (types.includes('*/*')) {
		return send(res, 200, {
			path: pathname,
			files: condense(files),
		});
	} else if (types.includes('text/plain')) {
		return send(
			res,
			200,
			files.map((e) => `${getFileType(e)} ${pathname}/${encodeURIComponent(e.name)}`).join('\n')
		);
	} else {
		return send(res, 200, {
			path: pathname,
			files: condense(files),
		});
	}
}
