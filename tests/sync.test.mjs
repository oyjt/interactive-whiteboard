import assert from 'node:assert/strict';
import { once } from 'node:events';
import { test } from 'node:test';
import WebSocket from 'ws';
import { startSyncServer } from '../server/sync.mjs';

test('binary snapshots reach previews, including late joiners in the same room', async () => {
  const server = startSyncServer({ port: 0 });
  await once(server, 'listening');
  const base = `ws://127.0.0.1:${server.address().port}/sync?room=lesson`;
  const sockets = [];
  const connect = async role => {
    const socket = new WebSocket(`${base}&role=${role}`);
    sockets.push(socket);
    await once(socket, 'open');
    return socket;
  };
  try {
    const source = await connect('source');
    const preview = await connect('preview');
    const first = once(preview, 'message');
    source.send(Buffer.from('compressed snapshot'), { binary: true });
    assert.equal((await first)[0].toString(), 'compressed snapshot');

    const late = new WebSocket(`${base}&role=preview`);
    sockets.push(late);
    const received = once(late, 'message');
    assert.equal((await received)[0].toString(), 'compressed snapshot');

    source.send('text is not a binary snapshot');
    const another = new WebSocket(`${base}&role=preview`);
    sockets.push(another);
    const stillLatest = once(another, 'message');
    assert.equal((await stillLatest)[0].toString(), 'compressed snapshot');
  } finally {
    for (const socket of sockets) socket.terminate();
    await new Promise(resolve => server.close(resolve));
  }
});
