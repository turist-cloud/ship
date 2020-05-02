import { ParsedUrlQuery } from 'querystring';
import Cookies from 'cookies';
import { SiteConfig } from './get-site-config';

export interface ParsedRequestOpts {
	host: string;
	pathname: string;
	siteConfig: SiteConfig;
}

export type AuthOpts = ParsedRequestOpts & {
	query: ParsedUrlQuery;
	cookies: Cookies;
};
