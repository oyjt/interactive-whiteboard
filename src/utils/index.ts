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


// Uint8Array转换成Base64
export const uint8ArrayToBase64 = (array: Uint8Array): string => {
  let binary = '';
  for (let i = 0; i < array.byteLength; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return window.btoa(binary);
};

// Base64转换成Uint8Array
export const base64ToUint8Array = (base64: string): Uint8Array => {
  const binary = window.atob(base64);
  const array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i);
  }
  return array;
};