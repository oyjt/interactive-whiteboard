import { gzip, ungzip } from 'pako';

/** Local codec round-trip that stands in for a whiteboard network message. */
export function simulatePreviewTransport<T>(snapshot: T): T {
  const bytes = gzip(JSON.stringify(snapshot));
  const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
  const message = btoa(binary);

  // WebSocket 发送位置：实际接入时在这里发送 message。
  // WebSocket 接收位置：当前直接使用 message 模拟远端收到的数据。
  const received = Uint8Array.from(atob(message), char => char.charCodeAt(0));
  return JSON.parse(ungzip(received, { toText: true })) as T;
}
