<template>
  <main class="mx-auto max-w-[850px] p-6 max-[600px]:p-3">
    <header class="mb-5 flex items-center justify-between gap-3 max-[600px]:items-start">
      <div>
        <h1 class="text-[22px] tracking-[-.5px]">互动白板</h1>
        <p class="mt-1 text-xs text-slate-500">记录想法，自由书写</p>
      </div>
      <div class="flex gap-2 max-[600px]:flex-wrap max-[600px]:justify-end">
        <button
          class="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs"
          :disabled="busy"
          @click="insertPPT"
        >
          打开示例课件
        </button>
        <button
          class="rounded-lg border border-[#2563eb] bg-[#2563eb] px-3 py-2 text-xs text-white"
          :disabled="busy"
          @click="exportPNG"
        >
          导出 PNG
        </button>
      </div>
    </header>
    <p v-if="error" class="rounded-md bg-rose-50 p-2.5 text-[13px] text-rose-700" role="alert">
      {{ error }} <button @click="error = ''">关闭</button>
    </p>
    <div data-testid="canvas-scroll" class="overflow-x-auto max-[600px]:overflow-visible">
      <div
        class="relative aspect-[16/9] w-full max-w-[800px] overflow-hidden rounded-lg bg-white ring-1 ring-inset ring-[#dbe3ee] max-[600px]:z-[2] max-[600px]:overflow-visible"
      >
        <div
          class="absolute top-1/2 left-2 z-[3] -translate-y-1/2 max-[600px]:top-2 max-[600px]:z-[5] max-[600px]:translate-y-0"
        >
          <ToolBox />
        </div>
        <div class="absolute bottom-2 left-2 z-[3]"><RedoUndo /></div>
        <div class="absolute bottom-2 left-[76px] z-[3]">
          <ZoomController />
        </div>
        <div
          v-show="hasScenes"
          class="absolute right-2 bottom-2 z-[3] flex items-center rounded bg-white p-1"
        >
          <PageController />
          <button aria-label="页面预览" @click="isPreviewShow = !isPreviewShow">
            <img class="h-6 w-6" :src="pages" alt="" />
          </button>
        </div>
        <div
          v-if="hasScenes && isPreviewShow"
          class="absolute top-0 right-0 z-[4] h-full w-60 shadow-lg"
        >
          <PreviewController @handle-preview-state="isPreviewShow = $event" />
        </div>
        <canvas id="canvas" width="800" height="450"></canvas>
      </div>
      <div class="mt-5 mb-2 text-[13px]">
        同步预览
        <span class="ml-2 text-[11px] text-slate-400">gzip / Base64 本地模拟 · 内容变更后更新</span>
      </div>
      <div
        class="relative aspect-[16/9] w-full max-w-[800px] overflow-hidden rounded-lg bg-white ring-1 ring-inset ring-[#dbe3ee]"
      >
        <canvas id="canvas2" width="800" height="450"></canvas>
      </div>
    </div>
    <p class="text-[11px] leading-[1.8] text-slate-500">
      画笔、图形和文字均可设置 · 文字拖拽指定宽度 · 橡皮擦松手删除对象
    </p>
  </main>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, provide, ref, shallowRef } from 'vue';

import pages from './assets/images/pages.svg';
import PageController from './components/PageController/index.vue';
import PreviewController from './components/PreviewController/index.vue';
import RedoUndo from './components/RedoUndo/index.vue';
import ToolBox from './components/ToolBox/index.vue';
import ZoomController from './components/ZoomController/index.vue';
import FabricCanvas from './core';
import { createPreview } from './core/preview';

const canvas = shallowRef<FabricCanvas>();
provide('canvas', canvas);
const isPreviewShow = ref(false);
const hasScenes = ref(false);
const busy = ref(false);
const error = ref('');
let preview: ReturnType<typeof createPreview> | undefined;

async function insertPPT() {
  if (
    !hasScenes.value &&
    canvas.value?.getObjects().length &&
    !window.confirm('打开课件会替换当前白板，请先导出需要保留的内容。继续？')
  )
    return;
  error.value = '';
  const images = import.meta.glob('@/assets/ppt/*.jpeg', { eager: true, import: 'default' });
  await canvas.value?.insertPPT(
    Object.entries(images)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([, url]) => url as string),
  );
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
  } catch {
    error.value = '导出失败，请检查图片是否允许跨域访问。';
  } finally {
    board.setViewportTransform(transform);
    board.requestRenderAll();
  }
}

onMounted(() => {
  const board = new FabricCanvas('canvas');
  canvas.value = board;
  preview = createPreview('canvas2', (message) => {
    error.value = message;
  });
  board.on('content:changed', preview.sync);
  board.on('insert:images', () => {
    hasScenes.value = board.getScenes().length > 0;
  });
  board.on('history:changed', () => {
    busy.value = board.getHistoryState().busy;
  });
  board.on('error', (message: string) => {
    error.value = message;
  });
  preview.sync(board.toJSON());
});
onBeforeUnmount(() => {
  void canvas.value?.destroy();
  void preview?.dispose();
});
</script>
