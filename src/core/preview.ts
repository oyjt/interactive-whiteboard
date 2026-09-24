/** 下方只读画布：模拟传输快照，并串行加载最新内容。 */
import { StaticCanvas } from 'fabric';

import { simulatePreviewTransport } from '@/utils/previewSync';

import type FabricCanvas from './index';

type Snapshot = ReturnType<FabricCanvas['toJSON']>;

/** 串行恢复模拟传输的快照；加载中只保留最新内容，卸载时等待加载结束。 */
export function createPreview(canvasId: string, onError: (message: string) => void) {
  const canvas = new StaticCanvas(canvasId);
  canvas.setDimensions({ width: '100%', height: '100%' }, { cssOnly: true });
  let pending: Snapshot | undefined;
  let loading: Promise<void> | undefined;
  let disposed = false;

  /** 只保留最新待处理快照，避免异步加载时预览旧数据排队。 */
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

  /** 等待在途快照加载完成后释放 Fabric 资源。 */
  async function dispose() {
    disposed = true;
    pending = undefined;
    await loading;
    await canvas.dispose();
  }

  return { sync, dispose };
}
