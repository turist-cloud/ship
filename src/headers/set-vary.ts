import { ServerResponse } from 'micri';

export default (res: ServerResponse): void => res.setHeader('Vary', 'Accept, Accept-Encoding, Range');
