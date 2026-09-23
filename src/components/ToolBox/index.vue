<template>
  <div ref="toolbarRoot" class="tools-layout">
    <div class="tool-mid-box-left" role="toolbar" aria-label="绘图工具">
      <button v-for="(item, index) in tools" :key="item.shapeType" type="button" class="tool-box-cell-box-left"
        :title="`${item.name} (${index + 1})`" :aria-label="item.name" :aria-pressed="item.shapeType === currentShapType"
        :disabled="busy" @click="clickAppliance(item.shapeType)">
        <img :src="item.shapeType === currentShapType ? item.iconActive : item.icon" alt="" />
      </button>
      <button type="button" class="tool-box-cell-box-left" title="清除批注（保留背景）" aria-label="清除批注" :disabled="busy" @click="clickClear">
        <img :src="clear" alt="" />
      </button>
      <button v-if="currentShapType === 'pencil' || currentShapType === 'eraser'" type="button" class="tool-box-cell-box-left"
        aria-label="切换工具设置" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen">⚙</button>
    </div>
    <BrushSettings v-if="settingsOpen && (currentShapType === 'pencil' || currentShapType === 'eraser')"
      :model-value="settings" :eraser="currentShapType === 'eraser'" @update:model-value="updateSettings" />
  </div>
</template>
<script setup lang="ts">
import { inject, onMounted, onBeforeUnmount, ref, type Ref, watch } from 'vue'
import { IText } from 'fabric'
import BrushSettings from './BrushSettings.vue'
import { readBrushSettings, type BrushSettings as BrushOptions } from '@/core/brushSettings'
import FabricCanvas, { DrawingTool } from '@/core'
import selector from "./image/selector.svg";
import selectorActive from "./image/selector-active.svg";
import pen from "./image/pencil.svg";
import penActive from "./image/pencil-active.svg";
import text from "./image/text.svg";
import textActive from "./image/text-active.svg";
import eraser from "./image/eraser.svg";
import eraserActive from "./image/eraser-active.svg";
import arrow from "./image/arrow.svg";
import arrowActive from "./image/arrow-active.svg";
import ellipse from "./image/ellipse.svg";
import ellipseActive from "./image/ellipse-active.svg";
import rectangle from "./image/rectangle.svg";
import rectangleActive from "./image/rectangle-active.svg";
import straight from "./image/straight.svg";
import straightActive from "./image/straight-active.svg";
import triangle from "./image/triangle.svg";
import triangleActive from "./image/triangle-active.svg";
import clear from "./image/clear.svg";

const canvas = inject<Ref<FabricCanvas | undefined>>('canvas');
const settings = ref(readBrushSettings());
const settingsOpen = ref(false);
const busy = ref(false);
const toolbarRoot = ref<HTMLElement | null>(null);
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
    readonly iconActive: string;
    readonly shapeType: DrawingTool;
};
const tools = ref<Appliance[]>([{
    name: '选择',
    icon: selector,
    iconActive: selectorActive,
    shapeType: "select",
}, {
    name: '笔',
    icon: pen,
    iconActive: penActive,
    shapeType: "pencil",
},{
    name: '文本',
    icon: text,
    iconActive: textActive,
    shapeType: "text",
},{
    name: '橡皮擦',
    icon: eraser,
    iconActive: eraserActive,
    shapeType: "eraser",
},{
    name: '三角形',
    icon: triangle,
    iconActive: triangleActive,
    shapeType: "triangle",
},{
    name: '圆形',
    icon: ellipse,
    iconActive: ellipseActive,
    shapeType: "circle",
},{
    name: '矩形',
    icon: rectangle,
    iconActive: rectangleActive,
    shapeType: "rectangle",
},{
    name: '直线',
    icon: straight,
    iconActive: straightActive,
    shapeType: "line",
},{
    name: '箭头',
    icon: arrow,
    iconActive: arrowActive,
    shapeType: "arrow",
}])

const currentShapType = ref<string>("pencil");

function clickAppliance(type: DrawingTool) {
    if (type === currentShapType.value) {
      if (type === 'pencil' || type === 'eraser') settingsOpen.value = !settingsOpen.value;
      return;
    }
    canvas?.value?.setDrawingTool(type)
    settingsOpen.value = type === 'pencil' || type === 'eraser';
}

function clickClear() {
  if (canvas?.value?.getObjects().length && !window.confirm('清除当前页所有批注？可通过撤销恢复。')) return;
  settingsOpen.value = false;
  canvas?.value?.clearCanvas()
}
</script>
<style scoped>
.tools-layout { display: flex; align-items: center; gap: 8px; }
.tool-mid-box-left { width: 40px; display: flex; flex-direction: column; align-items: center; background: white; padding: 4px 0; border-radius: 6px; box-shadow: 0 4px 12px #0f172a14; }
.tool-box-cell-box-left { width: 32px; height: 32px; padding: 4px; border: none; background: transparent; border-radius: 4px; flex-shrink: 0; }
.tool-box-cell-box-left img { width: 24px; height: 24px; }
.tool-box-cell-box-left:hover, .tool-box-cell-box-left[aria-pressed=true] { background: #eff6ff; }
</style>
