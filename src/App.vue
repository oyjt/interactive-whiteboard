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
      <div class="mirror-heading">同步预览 <span>{{ syncStatus }}</span></div>
      <div class="canvas-wrap mirror-wrap"><canvas id="canvas2" width="800" height="450"></canvas></div>
    </div>
    <p class="usage-hint">画笔、图形和文字均可设置 · 文字拖拽指定宽度 · 橡皮擦松手删除对象</p>
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
import { createBoardSync } from './services/boardSync';

const canvas = shallowRef<FabricCanvas>();
provide('canvas', canvas);
const isPreviewShow = ref(false);
const hasScenes = ref(false);
const busy = ref(false);
const error = ref('');
const syncUrl = import.meta.env.VITE_WHITEBOARD_WS_URL as string | undefined;
const syncStatus = ref(syncUrl ? '正在连接 WebSocket' : '本地预览 · 内容变更后更新');
let mirror: StaticCanvas | undefined;
let pending: ReturnType<FabricCanvas['toJSON']> | undefined;
let syncing: Promise<void> | undefined;
let disposed = false;
let sync: ReturnType<typeof createBoardSync> | undefined;

function renderPreview(data: ReturnType<FabricCanvas['toJSON']>) {
  pending = data;
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

function syncContent(snapshot?: ReturnType<FabricCanvas['toJSON']>) {
  if (!canvas.value || disposed) return;
  const latest = snapshot ?? canvas.value.toJSON();
  if (sync) sync.publish(latest);
  else if (!syncUrl) renderPreview(latest);
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
  if (syncUrl) {
    sync = createBoardSync(syncUrl, new URLSearchParams(location.search).get('room') || 'demo', {
      receive: renderPreview,
      status: message => { syncStatus.value = message; },
      error: message => { error.value = message; },
    });
  }
  syncContent();
});
onBeforeUnmount(() => {
  disposed = true;
  pending = undefined;
  sync?.dispose();
  void canvas.value?.destroy();
  void (syncing ?? Promise.resolve()).finally(() => mirror?.dispose());
});
</script>
<style scoped>
@reference "tailwindcss";
.whiteboard-app { @apply mx-auto max-w-[850px] p-6; }
.app-header { @apply mb-5 flex items-center justify-between gap-3; }
h1 { @apply text-[22px] tracking-[-.5px]; }
.app-header p { @apply mt-1 text-xs text-slate-500; }
.header-actions { @apply flex gap-2; }
.header-actions button { @apply rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs; }
.header-actions button:last-child { @apply border-blue-600 bg-blue-600 text-white; }
.canvas-scroll { @apply overflow-x-auto p-0.5; }
.canvas-wrap { @apply relative h-[450px] w-[800px] overflow-hidden rounded-lg border border-[#dbe3ee] bg-white; }
.tool-box-out { @apply absolute top-1/2 left-2 z-[3] -translate-y-1/2; }
.redo-undo-box { @apply absolute bottom-2 left-2 z-[3]; }
.zoom-controller-box { @apply absolute bottom-2 left-[76px] z-[3]; }
.page-controller-box { @apply absolute right-2 bottom-2 z-[3] flex items-center rounded bg-white p-1; }
.page-controller-box img { @apply h-6 w-6; }
.preview-controller-box { @apply absolute top-0 right-0 z-[4] h-full w-60 shadow-lg; }
.mirror-heading { @apply mt-5 mb-2 text-[13px]; }
.mirror-heading span { @apply ml-2 text-[11px] text-slate-400; }
.usage-hint { @apply text-[11px] leading-[1.8] text-slate-500; }
.error-message { @apply rounded-md bg-rose-50 p-2.5 text-[13px] text-rose-700; }
@media (max-width: 600px) { .whiteboard-app { padding: 12px; } .app-header { align-items: flex-start; } .header-actions { flex-wrap: wrap; justify-content: flex-end; } }
</style>
