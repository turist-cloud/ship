import { join as pathJoin } from 'path';
import Adal from './adal';
import graphFetch from './fetch-graph-api';

export async function createFolder(adal: Adal, spoRoot: string, name: string) {
	const newFolder = await graphFetch(adal, `${spoRoot}:/children`, {
		method: 'POST',
		body: {
			name,
			folder: {},
			'@microsoft.graph.conflictBehavior': 'fail',
		},
	});

	return newFolder;
}

export async function renameFolder(adal: Adal, spoRoot: string, oldName: string, newName: string) {
	await graphFetch(adal, `${pathJoin(spoRoot, oldName)}:`, {
		method: 'PATCH',
		body: {
			name: newName,
		},
	});
}
