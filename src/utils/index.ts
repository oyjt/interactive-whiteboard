import pako from 'pako';
// 解压
export const ungzip = (data: pako.Data) => {
  const uncompressedData = pako.ungzip(data, { to: 'string' });
  return JSON.parse(uncompressedData);
};

// 压缩
export const gzip = (data: any) => {
  return pako.gzip(JSON.stringify(data));
};
