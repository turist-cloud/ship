export function weakEtagMatch(header: string, etag: string): boolean {
	const match = (s: string): boolean => {
		if (s === '*') {
			return true;
		}

		if (s.startsWith('W/')) {
			return s === etag;
		}

		return `W/${s}` === etag;
	};

	return header
		.split(',')
		.map((s) => s.trim())
		.some((s) => match(s));
}
