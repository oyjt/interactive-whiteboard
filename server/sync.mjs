import { WebSocketServer, WebSocket } from 'ws';

// One publisher and any number of previews per room. The last snapshot lets
// previews joining late render the current board immediately.
export function startSyncServer({ port = 8787, host = '127.0.0.1' } = {}) {
  const rooms = new Map();
  const server = new WebSocketServer({ port, host, path: '/sync', maxPayload: 2 * 1024 * 1024 });
  server.on('connection', (socket, request) => {
    const url = new URL(request.url, 'http://localhost');
    const room = url.searchParams.get('room') || 'demo';
    const role = url.searchParams.get('role');
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(room) || !['source', 'preview'].includes(role)) {
      socket.close(1008, 'Invalid room or role');
      return;
    }
    if (!rooms.has(room)) {
      if (rooms.size >= 20) { socket.close(1008, 'Too many rooms'); return; }
      rooms.set(room, { latest: undefined, source: undefined, previews: new Set() });
    }
    const state = rooms.get(room);
    if (role === 'source') {
      state.source?.close(1000, 'Publisher replaced');
      state.source = socket;
    } else {
      state.previews.add(socket);
      if (state.latest) socket.send(state.latest, { binary: true });
    }
    socket.on('message', (data, binary) => {
      if (role !== 'source' || state.source !== socket || !binary) return;
      state.latest = data;
      for (const preview of state.previews) {
        if (preview.readyState === WebSocket.OPEN) preview.send(data, { binary: true });
      }
    });
    socket.on('close', () => {
      if (state.source === socket) state.source = undefined;
      state.previews.delete(socket);
    });
  });
  return server;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const server = startSyncServer({ port: Number(process.env.SYNC_PORT || 8787), host: process.env.SYNC_HOST || '127.0.0.1' });
  server.on('listening', () => console.log(`Whiteboard sync listening on ws://${server.address().address}:${server.address().port}/sync`));
}
