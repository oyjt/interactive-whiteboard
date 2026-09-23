<template>
  <main class="whiteboard-app">
    <header class="app-header">
      <div><h1>互动白板</h1><p>记录想法，自由书写</p></div>
      <div class="header-actions">
        <button :disabled="busy" @click="insertPPT">打开示例课件</button>
        <button :disabled="busy" @click="exportPNG">导出 PNG</button>
      </div>
    </header>
    <p v-if="error" class="error-message" role="alert">{{ error }} <button @click="error = ''">关闭</button></p>
    <div class="canvas-scroll">
      <div class="canvas-wrap">
        <div class="tool-box-out"><ToolBox /></div>
        <div class="redo-undo-box"><RedoUndo /></div>
        <div class="zoom-controller-box"><ZoomController /></div>
        <div v-show="hasScenes" class="page-controller-box">
          <PageController />
          <button aria-label="页面预览" @click="isPreviewShow = !isPreviewShow"><img :src="pages" alt="" /></button>
        </div>
        <div v-if="hasScenes && isPreviewShow" class="preview-controller-box">
          <PreviewController @handle-preview-state="isPreviewShow = $event" />
        </div>
        <canvas id="canvas" width="800" height="450"></canvas>
      </div>
      <div class="mirror-heading">同步预览 <span>内容变更后更新</span></div>
      <div class="canvas-wrap mirror-wrap"><canvas id="canvas2" width="800" height="450"></canvas></div>
    </div>
    <p class="usage-hint">点击画笔或 ⚙ 调整颜色和尺寸 · 清除批注保留课件背景 · 画布聚焦时支持 Ctrl / ⌘ 快捷键</p>
  </main>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, provide, ref, shallowRef } from 'vue';
import { StaticCanvas } from 'fabric';
import FabricCanvas from './core';
import ToolBox from './components/ToolBox/index.vue';
import RedoUndo from './components/RedoUndo/index.vue';
import ZoomController from './components/ZoomController/index.vue';
import PageController from './components/PageController/index.vue';
import PreviewController from './components/PreviewController/index.vue';
import pages from './assets/images/pages.svg';

const canvas = shallowRef<FabricCanvas>();
provide('canvas', canvas);
const isPreviewShow = ref(false);
const hasScenes = ref(false);
const busy = ref(false);
const error = ref('');
let mirror: StaticCanvas | undefined;
let pending: ReturnType<FabricCanvas['toJSON']> | undefined;
let syncing: Promise<void> | undefined;
let disposed = false;

function syncContent() {
  if (!canvas.value || disposed) return;
  pending = canvas.value.toJSON();
  if (syncing) return;
  syncing = (async () => {
    while (pending && mirror && !disposed) {
      const data = pending;
      pending = undefined;
      try {
        await mirror.loadFromJSON(data);
        if (!disposed) mirror.requestRenderAll();
      } catch { if (!disposed) error.value = '同步预览加载失败，请重新编辑后重试。'; }
    }
  })().finally(() => { syncing = undefined; });
}

async function insertPPT() {
  if (!hasScenes.value && canvas.value?.getObjects().length && !window.confirm('打开课件会替换当前白板，请先导出需要保留的内容。继续？')) return;
  error.value = '';
  const images = import.meta.glob('@/assets/ppt/*.jpeg', { eager: true, import: 'default' });
  await canvas.value?.insertPPT(Object.entries(images).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([, url]) => url as string));
}

function exportPNG() {
  const board = canvas.value?.getCanvas();
  if (!board || busy.value) return;
  const transform = [...board.viewportTransform] as typeof board.viewportTransform;
  try {
    board.viewportTransform = [1, 0, 0, 1, 0, 0];
    const link = document.createElement('a');
    link.download = `白板-${(canvas.value?.getCurrentScene() ?? 0) + 1}.png`;
    link.href = board.toDataURL({ format: 'png', multiplier: 2 });
    link.click();
  } catch { error.value = '导出失败，请检查图片是否允许跨域访问。'; }
  finally { board.setViewportTransform(transform); board.requestRenderAll(); }
}

onMounted(() => {
  const board = new FabricCanvas('canvas');
  canvas.value = board;
  mirror = new StaticCanvas('canvas2');
  board.on('content:changed', syncContent);
  board.on('insert:images', () => { hasScenes.value = board.getScenes().length > 0; });
  board.on('history:changed', () => { busy.value = board.getHistoryState().busy; });
  board.on('error', (message: string) => { error.value = message; });
  syncContent();
});
onBeforeUnmount(() => {
  disposed = true;
  pending = undefined;
  void canvas.value?.destroy();
  void (syncing ?? Promise.resolve()).finally(() => mirror?.dispose());
});
</script>
<style scoped>
.whiteboard-app { max-width: 850px; margin: 0 auto; padding: 24px; }
.app-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; gap: 12px; }
h1 { font-size: 22px; margin: 0; letter-spacing: -.5px; }
.app-header p { font-size: 12px; color: #64748b; margin: 4px 0 0; }
.header-actions { display: flex; gap: 8px; }
.header-actions button { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; background: white; }
.header-actions button:last-child { color: white; background: #2563eb; border-color: #2563eb; }
.canvas-scroll { overflow-x: auto; padding: 2px; }
.canvas-wrap { position: relative; width: 800px; height: 450px; background: white; border: 1px solid #dbe3ee; border-radius: 8px; overflow: hidden; }
.tool-box-out { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); z-index: 3; }
.redo-undo-box { position: absolute; bottom: 8px; left: 8px; z-index: 3; }
.zoom-controller-box { position: absolute; bottom: 8px; left: 76px; z-index: 3; }
.page-controller-box { position: absolute; bottom: 8px; right: 8px; z-index: 3; display: flex; align-items: center; background: white; padding: 4px; border-radius: 4px; }
.page-controller-box img { width: 24px; height: 24px; }
.preview-controller-box { position: absolute; right: 0; top: 0; width: 240px; height: 100%; z-index: 4; box-shadow: 0 4px 12px #0002; }
.mirror-heading { font-size: 13px; margin: 20px 0 8px; }
.mirror-heading span { color: #94a3b8; font-size: 11px; margin-left: 8px; }
.usage-hint { font-size: 11px; color: #64748b; line-height: 1.8; }
.error-message { padding: 10px; border-radius: 6px; background: #fff1f2; color: #be123c; font-size: 13px; }
@media (max-width: 600px) { .whiteboard-app { padding: 12px; } .app-header { align-items: flex-start; } .header-actions { flex-wrap: wrap; justify-content: flex-end; } }
</style>
