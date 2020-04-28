import { promisify } from 'util';
import { AuthenticationContext, ErrorResponse, Logging, MemoryCache, TokenResponse, UserCodeInfo } from 'adal-node';

export type TokenPromise = Promise<TokenResponse | ErrorResponse>;

export default class Adal {
	readonly #acquireUserCode: (arg1: string, arg2: string, arg3: string) => Promise<UserCodeInfo>;
	readonly #acquireTokenWithDeviceCode: (arg1: string, arg2: string, arg3: UserCodeInfo) => TokenPromise;
	readonly #acquireToken: (arg1: string, arg2: string, arg3: string) => TokenPromise;
	readonly #clientId: string;
	#userId: null | string = null;

	constructor(authorityHostUrl: string, tenant: string, clientId: string) {
		const context = this.createContext(authorityHostUrl, tenant);

		this.#clientId = clientId;
		this.#acquireUserCode = promisify(context.acquireUserCode).bind(context);
		this.#acquireTokenWithDeviceCode = promisify(context.acquireTokenWithDeviceCode).bind(context);
		this.#acquireToken = promisify(context.acquireToken).bind(context);
	}

	private turnOnLogging() {
		Logging.setLoggingOptions({
			log: (_level, message, error) => {
				console.log(message);
				if (error) {
					console.log(error);
				}
			},
		});
	}

	private createContext(authorityHostUrl: string, tenant: string) {
		const authorityUrl = `${authorityHostUrl}/${tenant}`;

		this.turnOnLogging();

		const tokenCache = new MemoryCache();

		return new AuthenticationContext(authorityUrl, true, tokenCache);
	}

	async acquireAuthToken(resource: string) {
		if (this.#userId !== null) {
			try {
				const token = await this.#acquireToken(resource, this.#userId, this.#clientId);

				console.log('Auth token renew ok');

				return token;
			} catch (err) {
				console.log('Auth token renew failed');
				this.#userId = null;

				throw err;
			}
		}

		const userCodeInfo = await this.#acquireUserCode(resource, this.#clientId, 'en-us');

		console.log(
			'Use a web browser to open the page ' +
				userCodeInfo.verificationUrl +
				' and enter the code ' +
				userCodeInfo.userCode +
				' to sign in.'
		);

		const r = await this.#acquireTokenWithDeviceCode(resource, this.#clientId, userCodeInfo);
		if (r.error) {
			throw new Error('Auth failed');
		}

		// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
		// @ts-ignore
		this.#userId = r.userId;

		return r;
	}
}
