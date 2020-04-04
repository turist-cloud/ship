/**
 * Get environment variables or fail.
 */
export default function getEnv(...vars: Array<string>) {
	return vars.map((name) => {
		const value = process.env[name];
		if (typeof value !== 'string') {
			// eslint-disable-next-line
			console.error(`Mandatory environment variable "${name}" is not set`);
			process.exit(1);
		}

		return value;
	});
}
