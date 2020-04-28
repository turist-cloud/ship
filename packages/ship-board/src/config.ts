import fs from 'fs';
import Ajv from 'ajv';

export const IGNORE_PATH = '.ignore';
export const CONFIG_PATH = 'ship-config.json';
export const DEFAULT_IGNORE_PATTERNS = [CONFIG_PATH, IGNORE_PATH];

const configSchema = {
	$schema: 'http://json-schema.org/schema#',
	type: 'object',
	additionalProperties: false,
	required: ['tenant', 'authorityHostUrl', 'clientId', 'spoRoot', 'domain'],
	properties: {
		tenant: {
			type: 'string',
			pattern: '^[\x00-\x7F]*$',
		},
		authorityHostUrl: {
			type: 'string',
		},
		clientId: {
			type: 'string',
		},
		spoRoot: {
			type: 'string',
		},
		domain: {
			type: 'string',
			minLength: 1,
			maxLength: 255,
			pattern: '^[\x00-\x7F]*$',
		},
	},
};

type Config = {
	tenant: string;
	authorityHostUrl: string;
	clientId: string;
	spoRoot: string;
	domain: string;
};

export function readConfig(configFilePath: string): Config {
	const { TENANT, AUTHORITY_HOST_URL, CLIENT_ID, SPO_ROOT, DOMAIN } = process.env;
	let fromFile;

	if (!TENANT || !AUTHORITY_HOST_URL || !CLIENT_ID || !SPO_ROOT || !DOMAIN) {
		const data = fs.readFileSync(configFilePath);
		fromFile = JSON.parse(data.toString()) as Config;
	}
	const config = {
		tenant: TENANT || fromFile?.tenant,
		authorityHostUrl: AUTHORITY_HOST_URL || fromFile?.authorityHostUrl,
		clientId: CLIENT_ID || fromFile?.clientId,
		spoRoot: SPO_ROOT || fromFile?.spoRoot,
		domain: DOMAIN || fromFile?.domain,
	};

	const ajv = new Ajv({ useDefaults: true });
	const validateBody = ajv.compile(configSchema);
	validateBody(config);
	if (validateBody.errors) {
		console.error('There is an error in the configuration');
		console.error(validateBody.errors.map((e: Ajv.ErrorObject) => `"${e.dataPath}" ${e.message}`).join(', '));

		process.exit(1);
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
	// @ts-ignore
	return config;
}
