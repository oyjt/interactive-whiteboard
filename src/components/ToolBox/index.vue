<template>
  <div ref="toolbarRoot" class="tools-layout">
    <div class="tool-mid-box-left" role="toolbar" aria-label="绘图工具">
      <button v-for="(item, index) in tools" :key="item.shapeType" type="button" class="tool-box-cell-box-left"
        :title="`${item.name} (${index + 1})`" :aria-label="item.name" :aria-pressed="item.shapeType === currentShapType"
        :aria-expanded="hasSettings(item.shapeType) ? item.shapeType === currentShapType && settingsOpen : undefined"
        :disabled="busy" @click="clickAppliance(item.shapeType)">
        <span class="tool-icon" :style="{ maskImage: `url(&quot;${item.icon}&quot;)` }" aria-hidden="true"></span>
      </button>
      <button type="button" class="tool-box-cell-box-left" title="清除批注（保留背景）" aria-label="清除批注" :disabled="busy" @click="clickClear">
        <img :src="clear" alt="" />
      </button>
    </div>
    <BrushSettings v-if="settingsOpen && hasSettings(currentShapType)"
      :model-value="settings" :tool="currentShapType" @update:model-value="updateSettings" />
  </div>
</template>
<script setup lang="ts">
import { inject, onMounted, onBeforeUnmount, ref, type Ref, watch } from 'vue'
import { IText } from 'fabric'
import BrushSettings from './BrushSettings.vue'
import { readBrushSettings, type BrushSettings as BrushOptions } from '@/core/brushSettings'
import FabricCanvas, { DrawingTool } from '@/core'
import selector from "./image/selector.svg";
import pen from "./image/pencil.svg";
import text from "./image/text.svg";
import eraser from "./image/eraser.svg";
import arrow from "./image/arrow.svg";
import ellipse from "./image/ellipse.svg";
import rectangle from "./image/rectangle.svg";
import straight from "./image/straight.svg";
import triangle from "./image/triangle.svg";
import clear from "./image/clear.svg";

const canvas = inject<Ref<FabricCanvas | undefined>>('canvas');
const settings = ref(readBrushSettings());
const settingsOpen = ref(false);
const busy = ref(false);
const toolbarRoot = ref<HTMLElement | null>(null);
function hasSettings(type: DrawingTool) {
  return type === 'pencil' || type === 'text' || type === 'line' || type === 'arrow' ||
    type === 'rectangle' || type === 'circle' || type === 'triangle' || type === 'ellipse';
}
function updateSettings(value: BrushOptions) { canvas?.value?.setBrushSettings(value); }

function onPointerDown(event: PointerEvent) {
  if (!toolbarRoot.value?.contains(event.target as Node)) settingsOpen.value = false;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && settingsOpen.value) {
    settingsOpen.value = false;
    return;
  }
  const board = canvas?.value;
  if (!board || busy.value || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      document.activeElement !== board.getCanvas().upperCanvasEl ||
      (board.getActiveObject() instanceof IText && (board.getActiveObject() as IText).isEditing)) return;
  const tool = tools.value[Number(event.key) - 1];
  if (tool) {
    event.preventDefault();
    clickAppliance(tool.shapeType);
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeyDown);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('keydown', onKeyDown);
});
watch(() => canvas?.value, (board, _, cleanup) => {
  if (!board) return;
  const update = () => {
    settings.value = board.getBrushSettings();
    currentShapType.value = board.getDrawingTool();
    busy.value = board.getHistoryState().busy;
  };
  for (const event of ['settings:changed', 'tool:changed', 'history:changed']) board.on(event, update);
  update();
  cleanup(() => { for (const event of ['settings:changed', 'tool:changed', 'history:changed']) board.off(event, update); });
});

type Appliance = {
    readonly name: string;
    readonly icon: string;
    readonly shapeType: DrawingTool;
};
const tools = ref<Appliance[]>([{
    name: '选择',
    icon: selector,
    shapeType: "select",
}, {
    name: '笔',
    icon: pen,
    shapeType: "pencil",
},{
    name: '文本',
    icon: text,
    shapeType: "text",
},{
    name: '橡皮擦',
    icon: eraser,
    shapeType: "eraser",
},{
    name: '三角形',
    icon: triangle,
    shapeType: "triangle",
},{
    name: '圆形',
    icon: ellipse,
    shapeType: "circle",
},{
    name: '矩形',
    icon: rectangle,
    shapeType: "rectangle",
},{
    name: '直线',
    icon: straight,
    shapeType: "line",
},{
    name: '箭头',
    icon: arrow,
    shapeType: "arrow",
}])

const currentShapType = ref<DrawingTool>("pencil");

function clickAppliance(type: DrawingTool) {
    if (type === currentShapType.value) {
      if (hasSettings(type)) settingsOpen.value = !settingsOpen.value;
      return;
    }
    canvas?.value?.setDrawingTool(type)
    settingsOpen.value = hasSettings(type);
}

function clickClear() {
  if (canvas?.value?.getObjects().length && !window.confirm('清除当前页所有批注？可通过撤销恢复。')) return;
  settingsOpen.value = false;
  canvas?.value?.clearCanvas()
}
</script>
<style scoped>
@reference "tailwindcss";
.tools-layout { @apply flex items-center gap-2; }
.tool-mid-box-left { @apply flex w-10 flex-col items-center rounded-md bg-white py-1 shadow-md; }
.tool-box-cell-box-left { @apply h-8 w-8 shrink-0 rounded p-1 text-[#444e60]; }
.tool-box-cell-box-left img { @apply h-6 w-6; }
.tool-icon { @apply block h-6 w-6 bg-current; mask: center / contain no-repeat; }
.tool-box-cell-box-left:hover, .tool-box-cell-box-left[aria-pressed=true] { @apply bg-blue-50; }
.tool-box-cell-box-left[aria-pressed=true] { color: #2563eb; }
</style>
