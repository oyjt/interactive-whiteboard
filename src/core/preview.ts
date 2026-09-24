import { StaticCanvas } from 'fabric';

import { simulatePreviewTransport } from '@/utils/previewSync';

import type FabricCanvas from './index';

type Snapshot = ReturnType<FabricCanvas['toJSON']>;

/** 串行恢复模拟传输的快照；加载中只保留最新内容，卸载时等待加载结束。 */
export function createPreview(canvasId: string, onError: (message: string) => void) {
  const canvas = new StaticCanvas(canvasId);
  let pending: Snapshot | undefined;
  let loading: Promise<void> | undefined;
  let disposed = false;

  function sync(snapshot: Snapshot) {
    if (disposed) return;
    try {
      pending = simulatePreviewTransport(snapshot);
    } catch {
      onError('同步数据编码或解码失败，请重新编辑后重试。');
      return;
    }
    if (loading) return;
    loading = (async () => {
      while (pending && !disposed) {
        const data = pending;
        pending = undefined;
        try {
          await canvas.loadFromJSON(data);
          if (!disposed) canvas.requestRenderAll();
        } catch {
          if (!disposed) onError('同步预览加载失败，请重新编辑后重试。');
        }
      }
    })().finally(() => {
      loading = undefined;
    });
  }

  async function dispose() {
    disposed = true;
    pending = undefined;
    await loading;
    await canvas.dispose();
  }

  return { sync, dispose };
}
