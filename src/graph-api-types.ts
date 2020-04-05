export type Folder = {
	createdDateTime: string;
	eTag: string;
	id: string;
	lastModifiedDateTime: string;
	name: string;
	webUrl: string;
	cTag: string;
	size: number;
	createdBy: {
		user: {
			id: string;
			displayName: string;
		};
	};
	lastModifiedBy: {
		user: {
			id: string;
			displayName: string;
		};
	};
	parentReference: {
		driveId: string;
		driveType: string;
		id: string;
		path: string;
	};
	fileSystemInfo: {
		createdDateTime: string;
		lastModifiedDateTime: string;
	};
	folder: {
		childCount: number;
	};
};

export type File = {
	'@microsoft.graph.downloadUrl': string;
	createdDateTime: string;
	eTag: string;
	id: string;
	lastModifiedDateTime: string;
	name: string;
	webUrl: string;
	cTag: string;
	size: string;
	createdBy: {
		user: {
			id: string;
			displayName: string;
		};
	};
	lastModifiedBy: {
		user: {
			id: string;
			displayName: string;
		};
	};
	parentReference: {
		driveId: string;
		driveType: string;
		id: string;
		path: string;
	};
	file: {
		mimeType: string;
		hashes: {
			quickXorHash: string;
		};
	};
	fileSystemInfo: {
		createdDateTime: string;
		lastModifiedDateTime: string;
	};
};

export type DirectoryListing = {
	'@odata.context': string;
	value: Array<File | Folder>;
};
