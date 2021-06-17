import { FetchOptions } from '@turist/fetch/dist/types';
import { Response } from 'node-fetch';
import { parse as parseContentType } from 'content-type';
import Adal, { TokenPromise } from './adal';
import fetch from './fetch';

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

const RESOURCE = 'https://graph.microsoft.com';
let tokenPromise: null | TokenPromise = null;
let tokenTimeout: null | ReturnType<typeof setTimeout> = null;

export default async function fetchAPI(adal: Adal, path: string, opts: FetchOptions = {}) {
	if (!tokenPromise) {
		tokenPromise = adal.acquireAuthToken(RESOURCE);
	}

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const { tokenType, expiresIn, accessToken } = await tokenPromise;
	if (!tokenTimeout) {
		tokenTimeout = setTimeout(() => {
			tokenTimeout = null;
			tokenPromise = null;
		}, Math.floor(expiresIn * 1000));
		tokenTimeout.unref();
	}

	const url = `https://graph.microsoft.com/v1.0${path}`;
	const headers = {
		Authorization: `${tokenType} ${accessToken}`,
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
