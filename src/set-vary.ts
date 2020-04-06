import { ServerResponse } from 'micri';

export default (res: ServerResponse) => res.setHeader('Vary', 'Accept, Accept-Encoding, Range');
