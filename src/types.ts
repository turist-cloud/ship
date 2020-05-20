import { ParsedUrlQuery } from 'querystring';
import Cookies from 'cookies';
import { SiteConfig } from './get-site-config';

export type HttpVersion = '1.1' | '2';

export interface CertRequestMessage {
	ctxId: string;
	servername: string;
}

export interface CertResponseMessage {
	ctxId: string;
	servername: string;
	cert: Buffer | null;
	key: Buffer | null;
}

export interface ParsedRequestOpts {
	host: string;
	pathname: string;
	siteConfig: SiteConfig;
}

export type AuthOpts = ParsedRequestOpts & {
	query: ParsedUrlQuery;
	cookies: Cookies;
};
