import fetch from './fetch';
import { FetchOptions } from '@turist/fetch/dist/types';
import { Response } from 'node-fetch';
import { parse as parseContentType } from 'content-type';
import getEnv from './get-env';

type OauthToken = {
	token_type: string;
	expires_in: number;
	ext_expires_in: number;
	access_token: string;
};

class GraphApiError extends Error {
	method: string;
	path: string;
	responseBody: string;

	constructor(path: string, opts: FetchOptions, res: Response, body: string, message: string) {
		super(`${message} (${res.statusText})`);
		this.method = opts.method || 'GET';
		this.path = path;
		this.responseBody = body;
	}
}

const RESOURCE = 'https://graph.microsoft.com/';
const [TENANT_ID, CLIENT_ID, CLIENT_SECRET] = getEnv('TENANT_ID', 'CLIENT_ID', 'CLIENT_SECRET');
let tokenPromise: Promise<OauthToken> | null;
let tokenTimeout: ReturnType<typeof setTimeout> | null;

async function getToken(): Promise<OauthToken> {
	const res = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: `client_id=${CLIENT_ID}&scope=${RESOURCE}.default&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
	});

	return res.json();
}

export default async function fetchAPI(path: string, opts: FetchOptions = {}) {
	if (!tokenPromise) {
		tokenPromise = getToken();
	}

	const { token_type, expires_in, access_token } = await tokenPromise;
	if (!tokenTimeout) {
		tokenTimeout = setTimeout(() => {
			tokenTimeout = null;
			tokenPromise = null;
		}, Math.floor(expires_in * 1000));
	}

	const url = `https://graph.microsoft.com/v1.0${path}`;
	const headers = {
		Authorization: `${token_type} ${access_token}`,
		...(opts.headers || {}),
	};

	const res = await fetch(url, { ...opts, headers });
	const { type } = parseContentType(res.headers.get('Content-Type') || '');

	if (res.status === 404) {
		return null;
	} else if (res.status === 304) {
		return { status: 'not_modified' };
	} else if (res.status < 200 || res.status >= 300) {
		let message = 'Fetch failed';
		let body = 'Could not read body';

		try {
			const err = await res.json();
			message = err.error.code || message;
			body = JSON.stringify(err);
		} catch (err) {}

		throw new GraphApiError(path, opts, res, body, message);
	} else if (res.status === 204) {
		return null;
	} else {
		if (type === 'application/json') {
			return res.json();
		} else {
			return res.text();
		}
	}
}
