<template>
  <div class="tools-layout">
    <div class="tool-bar island" role="toolbar" aria-label="绘图工具">
      <button
        v-for="item in tools"
        :key="item.shapeType"
        type="button"
        class="tool-button"
        :title="`${item.name} — ${item.shortcut}`"
        :aria-label="item.name"
        :aria-pressed="item.shapeType === currentShapeType"
        :disabled="busy"
        @click="selectTool(item.shapeType)"
      >
        <img :src="item.shapeType === currentShapeType ? item.iconActive : item.icon" alt="" />
        <span class="tool-keybinding">{{ item.shortcut }}</span>
      </button>
    </div>

    <BrushSettings
      v-if="currentShapeType === 'pencil' || currentShapeType === 'eraser'"
      :model-value="settings"
      :eraser="currentShapeType === 'eraser'"
      @update:model-value="updateSettings"
    />
  </div>
</template>

<script setup lang="ts">
import { inject, ref, type Ref, watch } from 'vue';
import BrushSettings from './BrushSettings.vue';
import { readBrushSettings, type BrushSettings as BrushOptions } from '@/core/brushSettings';
import FabricCanvas, { type DrawingTool } from '@/core';
import selector from './image/selector.svg';
import selectorActive from './image/selector-active.svg';
import pen from './image/pencil.svg';
import penActive from './image/pencil-active.svg';
import text from './image/text.svg';
import textActive from './image/text-active.svg';
import eraser from './image/eraser.svg';
import eraserActive from './image/eraser-active.svg';
import arrow from './image/arrow.svg';
import arrowActive from './image/arrow-active.svg';
import ellipse from './image/ellipse.svg';
import ellipseActive from './image/ellipse-active.svg';
import rectangle from './image/rectangle.svg';
import rectangleActive from './image/rectangle-active.svg';
import straight from './image/straight.svg';
import straightActive from './image/straight-active.svg';
import triangle from './image/triangle.svg';
import triangleActive from './image/triangle-active.svg';

type ToolItem = {
  name: string;
  icon: string;
  iconActive: string;
  shapeType: DrawingTool;
  shortcut: string;
};

const canvas = inject<Ref<FabricCanvas | undefined>>('canvas');
const settings = ref(readBrushSettings());
const busy = ref(false);
const currentShapeType = ref<DrawingTool>('pencil');
const tools: ToolItem[] = [
  { name: '选择', icon: selector, iconActive: selectorActive, shapeType: 'select', shortcut: '1' },
  { name: '矩形', icon: rectangle, iconActive: rectangleActive, shapeType: 'rectangle', shortcut: '2' },
  { name: '圆形', icon: ellipse, iconActive: ellipseActive, shapeType: 'circle', shortcut: '3' },
  { name: '三角形', icon: triangle, iconActive: triangleActive, shapeType: 'triangle', shortcut: '4' },
  { name: '箭头', icon: arrow, iconActive: arrowActive, shapeType: 'arrow', shortcut: '5' },
  { name: '直线', icon: straight, iconActive: straightActive, shapeType: 'line', shortcut: '6' },
  { name: '笔', icon: pen, iconActive: penActive, shapeType: 'pencil', shortcut: '7' },
  { name: '文本', icon: text, iconActive: textActive, shapeType: 'text', shortcut: '8' },
  { name: '橡皮擦', icon: eraser, iconActive: eraserActive, shapeType: 'eraser', shortcut: '0' },
];

function selectTool(type: DrawingTool) {
  canvas?.value?.setDrawingTool(type);
}

function updateSettings(value: BrushOptions) {
  canvas?.value?.setBrushSettings(value);
}

watch(() => canvas?.value, (board, _, cleanup) => {
  if (!board) return;
  const update = () => {
    settings.value = board.getBrushSettings();
    currentShapeType.value = board.getDrawingTool();
    busy.value = board.getHistoryState().busy;
  };
  const events = ['settings:changed', 'tool:changed', 'history:changed'];
  events.forEach(event => board.on(event, update));
  update();
  cleanup(() => events.forEach(event => board.off(event, update)));
}, { immediate: true });
</script>

<style scoped>
.tools-layout { position: relative; display: flex; justify-content: center; }
.tool-bar { display: flex; align-items: center; gap: 2px; padding: 5px; }
.tool-button { position: relative; display: grid; width: 42px; height: 42px; place-items: center; border-radius: 9px; }
.tool-button:hover { background: var(--color-button-hover); }
.tool-button[aria-pressed=true] { background: var(--color-primary-light); color: var(--color-primary); }
.tool-button img { width: 22px; height: 22px; }
.tool-keybinding { position: absolute; right: 4px; bottom: 2px; color: var(--color-text-muted); font-size: 9px; line-height: 1; }
.tool-button[aria-pressed=true] .tool-keybinding { color: var(--color-primary); }
@media (max-width: 760px) {
  .tool-bar { max-width: calc(100vw - 24px); overflow-x: auto; }
  .tool-button { width: 36px; height: 36px; flex: 0 0 36px; }
  .tool-keybinding { display: none; }
}
</style>
