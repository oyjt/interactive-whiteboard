<template>
  <main class="whiteboard-app">
    <div class="workspace-scroll">
      <div class="workspace" @pointerdown="closeMenu">
        <div class="top-left" @pointerdown.stop>
          <button class="icon-button island" aria-label="主菜单" :aria-expanded="menuOpen" @click="menuOpen = !menuOpen">
            <span aria-hidden="true">☰</span>
          </button>
          <div v-if="menuOpen" class="main-menu island">
            <strong>互动白板</strong>
            <button :disabled="busy" @click="insertPPT">打开示例课件</button>
            <button :disabled="busy" @click="exportPNG">导出 PNG</button>
            <button :disabled="busy" class="danger-action" @click="clearAnnotations">清除批注</button>
            <small>清除批注会保留课件背景，并且可以撤销。</small>
          </div>
        </div>

        <div class="tool-box-out"><ToolBox /></div>

        <div class="top-right">
          <button class="action-button island" :aria-pressed="showMirror" @click="showMirror = !showMirror">
            同步预览
          </button>
          <button class="action-button island primary-action" :disabled="busy" @click="exportPNG">导出</button>
        </div>

        <div class="canvas-shell">
          <div class="canvas-wrap">
            <canvas id="canvas" width="800" height="450"></canvas>
          </div>
        </div>

        <div class="bottom-left">
          <RedoUndo />
          <ZoomController />
        </div>

        <div v-show="hasScenes" class="page-controller-box island">
          <PageController />
          <span class="control-divider" />
          <button class="small-button" aria-label="页面预览" :aria-pressed="isPreviewShow" @click="isPreviewShow = !isPreviewShow">
            <img :src="pages" alt="" />
          </button>
        </div>

        <div v-if="hasScenes && isPreviewShow" class="preview-controller-box island">
          <PreviewController @handle-preview-state="isPreviewShow = $event" />
        </div>

        <aside v-show="showMirror" class="mirror-panel island">
          <div class="panel-heading">
            <span>同步预览</span>
            <button aria-label="关闭同步预览" @click="showMirror = false">×</button>
          </div>
          <div class="mirror-canvas"><canvas id="canvas2" width="800" height="450"></canvas></div>
          <p>仅在内容提交后更新</p>
        </aside>

        <div class="shortcut-hint island">按 1–8、0 切换工具 · Esc 返回选择</div>

        <div v-if="error" class="error-message island" role="alert">
          <span>{{ error }}</span>
          <button aria-label="关闭错误提示" @click="error = ''">×</button>
        </div>
      </div>
    </div>
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
const menuOpen = ref(false);
const isPreviewShow = ref(false);
const showMirror = ref(false);
const hasScenes = ref(false);
const busy = ref(false);
const error = ref('');
let mirror: StaticCanvas | undefined;
let pending: ReturnType<FabricCanvas['toJSON']> | undefined;
let syncing: Promise<void> | undefined;
let disposed = false;

function closeMenu() {
  menuOpen.value = false;
}

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
      } catch {
        if (!disposed) error.value = '同步预览加载失败，请重新编辑后重试。';
      }
    }
  })().finally(() => { syncing = undefined; });
}

async function insertPPT() {
  if (!hasScenes.value && canvas.value?.getObjects().length && !window.confirm('打开课件会替换当前白板，请先导出需要保留的内容。继续？')) return;
  menuOpen.value = false;
  error.value = '';
  const images = import.meta.glob('@/assets/ppt/*.jpeg', { eager: true, import: 'default' });
  await canvas.value?.insertPPT(
    Object.entries(images)
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([, url]) => url as string),
  );
}

function clearAnnotations() {
  menuOpen.value = false;
  canvas.value?.clearCanvas();
}

function exportPNG() {
  menuOpen.value = false;
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
.whiteboard-app { min-height: 100dvh; background: var(--color-workspace); }
.workspace-scroll { min-height: 100dvh; overflow: auto; }
.workspace { position: relative; width: max(100%, 880px); min-height: 610px; height: 100dvh; overflow: hidden; }
.canvas-shell { width: 800px; margin: 88px auto 0; }
.canvas-wrap { position: relative; width: 800px; height: 450px; overflow: hidden; border: 1px solid var(--color-border); border-radius: 3px; background: #fff; box-shadow: 0 1px 2px #0000000f; }
.tool-box-out { position: absolute; top: 16px; left: 50%; z-index: 10; transform: translateX(-50%); }
.top-left { position: absolute; top: 16px; left: 16px; z-index: 12; }
.top-right { position: absolute; top: 16px; right: 16px; z-index: 10; display: flex; gap: 8px; }
.island { box-sizing: border-box; border: 1px solid var(--color-border); border-radius: 10px; background: var(--color-surface); box-shadow: var(--shadow-island); }
.icon-button { display: grid; width: 44px; height: 44px; place-items: center; font-size: 20px; }
.icon-button:hover, .action-button:hover, .small-button:hover { background: var(--color-button-hover); }
.main-menu { position: absolute; top: 52px; left: 0; display: flex; width: 220px; flex-direction: column; padding: 8px; }
.main-menu strong { padding: 8px 10px 12px; font-size: 14px; }
.main-menu button { padding: 9px 10px; border-radius: 7px; text-align: left; }
.main-menu button:hover { background: var(--color-button-hover); }
.main-menu small { padding: 10px; color: var(--color-text-muted); font-size: 10px; line-height: 1.5; }
.danger-action { color: #c92a2a; }
.action-button { height: 44px; padding: 0 14px; font-size: 12px; }
.action-button[aria-pressed=true] { background: var(--color-primary-light); color: var(--color-primary); }
.primary-action { border-color: var(--color-primary); background: var(--color-primary); color: #fff; box-shadow: none; }
.primary-action:hover { background: #5f3dc4; }
.bottom-left { position: absolute; bottom: 16px; left: 16px; z-index: 8; display: flex; align-items: center; gap: 8px; }
.page-controller-box { position: absolute; bottom: 16px; left: 50%; z-index: 8; display: flex; height: 40px; align-items: center; padding: 7px; transform: translateX(-50%); }
.control-divider { width: 1px; height: 22px; margin: 0 4px; background: var(--color-border); }
.small-button { display: grid; width: 28px; height: 28px; place-items: center; border-radius: 7px; }
.small-button[aria-pressed=true] { background: var(--color-primary-light); }
.small-button img { width: 20px; height: 20px; }
.preview-controller-box { position: absolute; top: 72px; right: 16px; z-index: 11; width: 240px; height: 450px; overflow: hidden; }
.mirror-panel { position: absolute; top: 72px; right: 16px; z-index: 10; width: 344px; padding: 12px; }
.panel-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-size: 12px; font-weight: 600; }
.panel-heading button, .error-message button { width: 24px; height: 24px; border-radius: 6px; font-size: 18px; }
.mirror-canvas { width: 320px; height: 180px; overflow: hidden; border: 1px solid var(--color-border); border-radius: 5px; background: #fff; }
.mirror-canvas :deep(canvas) { width: 320px !important; height: 180px !important; }
.mirror-panel p { margin: 8px 0 0; color: var(--color-text-muted); font-size: 10px; }
.shortcut-hint { position: absolute; right: 16px; bottom: 16px; padding: 8px 10px; color: var(--color-text-muted); font-size: 10px; }
.error-message { position: absolute; bottom: 64px; left: 50%; z-index: 20; display: flex; max-width: 460px; align-items: center; gap: 12px; padding: 10px 12px; color: #c92a2a; font-size: 12px; transform: translateX(-50%); }
@media (max-height: 620px) {
  .workspace { height: 620px; }
}
</style>
