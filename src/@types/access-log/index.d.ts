declare module 'access-log' {
	import { IncomingMessage, ServerResponse } from 'http';
	export default function accesslog(
		req: IncomingMessage,
		res: ServerResponse,
		format?: string,
		cb?: (...arg: any) => void
	): void;
}
