import { gzip as compress, ungzip as decompress } from 'pako';

export const gzip = (data: unknown) => compress(JSON.stringify(data));
export const ungzip = (data: Uint8Array) => JSON.parse(decompress(data, { toText: true }));
