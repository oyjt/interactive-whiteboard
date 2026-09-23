<template>
  <main class="whiteboard-app mx-auto max-w-[850px] p-6 max-[600px]:p-3">
    <header class="app-header mb-5 flex items-center justify-between gap-3 max-[600px]:items-start">
      <div>
        <h1 class="text-[22px] tracking-[-.5px]">互动白板</h1>
        <p class="mt-1 text-xs text-slate-500">记录想法，自由书写</p>
      </div>
      <div class="header-actions flex gap-2 max-[600px]:flex-wrap max-[600px]:justify-end">
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
    <p
      v-if="error"
      class="error-message rounded-md bg-rose-50 p-2.5 text-[13px] text-rose-700"
      role="alert"
    >
      {{ error }} <button @click="error = ''">关闭</button>
    </p>
    <div class="canvas-scroll overflow-x-auto p-0.5">
      <div
        class="canvas-wrap relative h-[450px] w-[800px] overflow-hidden rounded-lg border border-[#dbe3ee] bg-white"
      >
        <div class="tool-box-out absolute top-1/2 left-2 z-[3] -translate-y-1/2"><ToolBox /></div>
        <div class="redo-undo-box absolute bottom-2 left-2 z-[3]"><RedoUndo /></div>
        <div class="zoom-controller-box absolute bottom-2 left-[76px] z-[3]">
          <ZoomController />
        </div>
        <div
          v-show="hasScenes"
          class="page-controller-box absolute right-2 bottom-2 z-[3] flex items-center rounded bg-white p-1"
        >
          <PageController />
          <button aria-label="页面预览" @click="isPreviewShow = !isPreviewShow">
            <img class="h-6 w-6" :src="pages" alt="" />
          </button>
        </div>
        <div
          v-if="hasScenes && isPreviewShow"
          class="preview-controller-box absolute top-0 right-0 z-[4] h-full w-60 shadow-lg"
        >
          <PreviewController @handle-preview-state="isPreviewShow = $event" />
        </div>
        <canvas id="canvas" width="800" height="450"></canvas>
      </div>
      <div class="mirror-heading mt-5 mb-2 text-[13px]">
        同步预览
        <span class="ml-2 text-[11px] text-slate-400">gzip / Base64 本地模拟 · 内容变更后更新</span>
      </div>
      <div
        class="canvas-wrap mirror-wrap relative h-[450px] w-[800px] overflow-hidden rounded-lg border border-[#dbe3ee] bg-white"
      >
        <canvas id="canvas2" width="800" height="450"></canvas>
      </div>
    </div>
    <p class="usage-hint text-[11px] leading-[1.8] text-slate-500">
      画笔、图形和文字均可设置 · 文字拖拽指定宽度 · 橡皮擦松手删除对象
    </p>
  </main>
</template>
<script setup lang="ts">
import { onMounted, onBeforeUnmount, provide, ref, shallowRef } from "vue";
import { StaticCanvas } from "fabric";
import FabricCanvas from "./core";
import ToolBox from "./components/ToolBox/index.vue";
import RedoUndo from "./components/RedoUndo/index.vue";
import ZoomController from "./components/ZoomController/index.vue";
import PageController from "./components/PageController/index.vue";
import PreviewController from "./components/PreviewController/index.vue";
import pages from "./assets/images/pages.svg";
import { simulatePreviewTransport } from "./utils/previewSync";

const canvas = shallowRef<FabricCanvas>();
provide("canvas", canvas);
const isPreviewShow = ref(false);
const hasScenes = ref(false);
const busy = ref(false);
const error = ref("");
let mirror: StaticCanvas | undefined;
let pending: ReturnType<FabricCanvas["toJSON"]> | undefined;
let syncing: Promise<void> | undefined;
let disposed = false;

/** 串行加载预览快照；上一帧尚未完成时只保留最新一帧。 */
function renderPreview(data: ReturnType<FabricCanvas["toJSON"]>) {
  pending = data;
  if (syncing) return;
  syncing = (async () => {
    while (pending && mirror && !disposed) {
      const data = pending;
      pending = undefined;
      try {
        await mirror.loadFromJSON(data);
        if (!disposed) mirror.requestRenderAll();
      } catch {
        if (!disposed) error.value = "同步预览加载失败，请重新编辑后重试。";
      }
    }
  })().finally(() => {
    syncing = undefined;
  });
}

/** 在内容提交时模拟一次编码往返，避免渲染事件触发重复传输。 */
function syncContent(snapshot?: ReturnType<FabricCanvas["toJSON"]>) {
  if (!canvas.value || disposed) return;
  try {
    renderPreview(simulatePreviewTransport(snapshot ?? canvas.value.toJSON()));
  } catch {
    error.value = "同步数据编码或解码失败，请重新编辑后重试。";
  }
}

async function insertPPT() {
  if (
    !hasScenes.value &&
    canvas.value?.getObjects().length &&
    !window.confirm("打开课件会替换当前白板，请先导出需要保留的内容。继续？")
  )
    return;
  error.value = "";
  const images = import.meta.glob("@/assets/ppt/*.jpeg", { eager: true, import: "default" });
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
    const link = document.createElement("a");
    link.download = `白板-${(canvas.value?.getCurrentScene() ?? 0) + 1}.png`;
    link.href = board.toDataURL({ format: "png", multiplier: 2 });
    link.click();
  } catch {
    error.value = "导出失败，请检查图片是否允许跨域访问。";
  } finally {
    board.setViewportTransform(transform);
    board.requestRenderAll();
  }
}

onMounted(() => {
  const board = new FabricCanvas("canvas");
  canvas.value = board;
  mirror = new StaticCanvas("canvas2");
  board.on("content:changed", syncContent);
  board.on("insert:images", () => {
    hasScenes.value = board.getScenes().length > 0;
  });
  board.on("history:changed", () => {
    busy.value = board.getHistoryState().busy;
  });
  board.on("error", (message: string) => {
    error.value = message;
  });
  syncContent();
});
onBeforeUnmount(() => {
  disposed = true;
  pending = undefined;
  void canvas.value?.destroy();
  void (syncing ?? Promise.resolve()).finally(() => mirror?.dispose());
});
</script>
