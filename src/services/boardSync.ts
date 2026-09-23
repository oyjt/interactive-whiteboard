import type FabricCanvas from '@/core';
import { gzip, ungzip } from '@/utils';

type Snapshot = ReturnType<FabricCanvas['toJSON']>;

/** Two independent connections: the preview only renders data received from the server. */
export function createBoardSync(url: string, room: string, callbacks: {
  receive: (snapshot: Snapshot) => void;
  status: (message: string) => void;
  error: (message: string) => void;
}) {
  let latest: Snapshot | undefined;
  let sender: WebSocket | undefined;
  let receiver: WebSocket | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  function sendLatest() {
    if (!latest || sender?.readyState !== WebSocket.OPEN) return;
    try { sender.send(gzip(latest)); }
    catch { callbacks.error('同步发送失败，请检查白板内容或重新连接。'); }
  }

  function connect() {
    if (disposed) return;
    const endpoint = new URL(url, location.href);
    endpoint.searchParams.set('room', room);
    endpoint.searchParams.set('role', 'source');
    sender = new WebSocket(endpoint);
    endpoint.searchParams.set('role', 'preview');
    receiver = new WebSocket(endpoint);
    receiver.binaryType = 'arraybuffer';
    sender.onopen = () => {
      if (receiver?.readyState === WebSocket.OPEN) callbacks.status('WebSocket 已连接');
      sendLatest();
    };
    receiver.onopen = () => {
      if (sender?.readyState === WebSocket.OPEN) callbacks.status('WebSocket 已连接');
    };
    receiver.onmessage = ({ data }) => {
      try { callbacks.receive(ungzip(new Uint8Array(data))); }
      catch { callbacks.error('收到的同步数据无法解压或解析。'); }
    };
    const reconnect = () => {
      if (disposed || reconnectTimer) return;
      callbacks.status('WebSocket 断开，正在重连');
      sender?.close();
      receiver?.close();
      reconnectTimer = setTimeout(() => { reconnectTimer = undefined; connect(); }, 1000);
    };
    sender.onclose = receiver.onclose = reconnect;
  }

  connect();
  return {
    publish(snapshot: Snapshot) { latest = snapshot; sendLatest(); },
    dispose() {
      disposed = true;
      clearTimeout(reconnectTimer);
      sender?.close();
      receiver?.close();
    },
  };
}
