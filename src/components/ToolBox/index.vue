<template>
  <div
    ref="toolbarRoot"
    class="relative flex items-center gap-2 max-[600px]:flex-col max-[600px]:items-start"
  >
    <div
      class="flex w-10 flex-col items-center rounded-md bg-white py-1 shadow-md max-[600px]:w-auto max-[600px]:max-w-[calc(100vw-40px)] max-[600px]:flex-row max-[600px]:overflow-x-auto max-[600px]:px-1"
      role="toolbar"
      aria-label="绘图工具"
    >
      <button
        v-for="(item, index) in tools"
        :key="item.shapeType"
        type="button"
        class="relative h-8 w-8 shrink-0 rounded p-1 text-[#444e60] hover:bg-blue-50 aria-pressed:text-[#2563eb]"
        :title="`${item.name} (${index + 1})`"
        :aria-label="item.name"
        :aria-pressed="item.shapeType === currentShapType"
        :aria-expanded="
          hasSettings(item.shapeType)
            ? item.shapeType === currentShapType && settingsOpen
            : undefined
        "
        :disabled="busy"
        @click="clickAppliance(item.shapeType)"
      >
        <span
          class="tool-icon block h-6 w-6 bg-current"
          :style="{ maskImage: `url(&quot;${item.icon}&quot;)` }"
          aria-hidden="true"
        ></span>
        <span
          v-if="hasSettings(item.shapeType)"
          data-testid="settings-corner"
          class="pointer-events-none absolute right-0 bottom-0 size-0 border-b-[4px] border-l-[4px] border-b-current border-l-transparent"
          aria-hidden="true"
        ></span>
      </button>
      <button
        type="button"
        class="h-8 w-8 shrink-0 rounded p-1 text-[#444e60] hover:bg-blue-50"
        title="清除批注（保留背景）"
        aria-label="清除批注"
        :disabled="busy"
        @click="clickClear"
      >
        <img class="h-6 w-6" :src="clear" alt="" />
      </button>
    </div>
    <div
      v-if="settingsOpen && hasSettings(currentShapType)"
      ref="settingsPanel"
      class="absolute z-[5]"
      :style="panelPosition"
    >
      <BrushSettings
        :model-value="settings"
        :tool="currentShapType"
        @update:model-value="updateSettings"
      />
    </div>
  </div>
</template>
<script setup lang="ts">
import { IText } from 'fabric';
import { inject, nextTick, onMounted, onBeforeUnmount, ref, type Ref, watch } from 'vue';

import FabricCanvas, { DrawingTool } from '@/core';
import { readBrushSettings, type BrushSettings as BrushOptions } from '@/core/brushSettings';

import BrushSettings from './BrushSettings.vue';
import arrow from './image/arrow.svg';
import clear from './image/clear.svg';
import ellipse from './image/ellipse.svg';
import eraser from './image/eraser.svg';
import pen from './image/pencil.svg';
import rectangle from './image/rectangle.svg';
import selector from './image/selector.svg';
import straight from './image/straight.svg';
import text from './image/text.svg';
import triangle from './image/triangle.svg';

const canvas = inject<Ref<FabricCanvas | undefined>>('canvas');
const settings = ref(readBrushSettings());
const settingsOpen = ref(false);
const currentShapType = ref<DrawingTool>('pencil');
const busy = ref(false);
const toolbarRoot = ref<HTMLElement | null>(null);
const settingsPanel = ref<HTMLElement | null>(null);
const panelPosition = ref({ top: '0px', left: '48px' });

/** 将配置面板贴近当前按钮，同时避免桌面画布裁切或手机屏幕横向溢出。 */
function positionSettings() {
  const root = toolbarRoot.value;
  const panel = settingsPanel.value;
  const button = root?.querySelector<HTMLElement>('button[aria-pressed="true"]');
  const frame = root?.parentElement?.parentElement;
  if (!root || !panel || !button || !frame) return;
  const rootRect = root.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const frameRect = frame.getBoundingClientRect();
  if (window.matchMedia('(max-width: 600px)').matches) {
    panelPosition.value = {
      top: `${rootRect.height + 8}px`,
      left: `${Math.max(0, Math.min(buttonRect.left - rootRect.left, frameRect.right - rootRect.left - panel.offsetWidth - 8))}px`,
    };
  } else {
    panelPosition.value = {
      top: `${Math.max(0, Math.min(buttonRect.top - rootRect.top, frameRect.bottom - rootRect.top - panel.offsetHeight - 8))}px`,
      left: '48px',
    };
  }
}

watch([settingsOpen, currentShapType], async () => {
  await nextTick();
  positionSettings();
});
function hasSettings(type: DrawingTool) {
  return (
    type === 'pencil' ||
    type === 'text' ||
    type === 'line' ||
    type === 'arrow' ||
    type === 'rectangle' ||
    type === 'circle' ||
    type === 'triangle' ||
    type === 'ellipse'
  );
}
function updateSettings(value: BrushOptions) {
  canvas?.value?.setBrushSettings(value);
}

function onPointerDown(event: PointerEvent) {
  if (!toolbarRoot.value?.contains(event.target as Node)) settingsOpen.value = false;
}

function onKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape' && settingsOpen.value) {
    settingsOpen.value = false;
    return;
  }
  const board = canvas?.value;
  if (
    !board ||
    busy.value ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey ||
    document.activeElement !== board.getCanvas().upperCanvasEl ||
    (board.getActiveObject() instanceof IText && (board.getActiveObject() as IText).isEditing)
  )
    return;
  const tool = tools.value[Number(event.key) - 1];
  if (tool) {
    event.preventDefault();
    clickAppliance(tool.shapeType);
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDown);
  document.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', positionSettings);
});
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onPointerDown);
  document.removeEventListener('keydown', onKeyDown);
  window.removeEventListener('resize', positionSettings);
});
watch(
  () => canvas?.value,
  (board, _, cleanup) => {
    if (!board) return;
    const update = () => {
      settings.value = board.getBrushSettings();
      currentShapType.value = board.getDrawingTool();
      busy.value = board.getHistoryState().busy;
    };
    for (const event of ['settings:changed', 'tool:changed', 'history:changed'])
      board.on(event, update);
    update();
    cleanup(() => {
      for (const event of ['settings:changed', 'tool:changed', 'history:changed'])
        board.off(event, update);
    });
  },
);

type Appliance = {
  readonly name: string;
  readonly icon: string;
  readonly shapeType: DrawingTool;
};
const tools = ref<Appliance[]>([
  {
    name: '选择',
    icon: selector,
    shapeType: 'select',
  },
  {
    name: '笔',
    icon: pen,
    shapeType: 'pencil',
  },
  {
    name: '文本',
    icon: text,
    shapeType: 'text',
  },
  {
    name: '橡皮擦',
    icon: eraser,
    shapeType: 'eraser',
  },
  {
    name: '三角形',
    icon: triangle,
    shapeType: 'triangle',
  },
  {
    name: '圆形',
    icon: ellipse,
    shapeType: 'circle',
  },
  {
    name: '矩形',
    icon: rectangle,
    shapeType: 'rectangle',
  },
  {
    name: '直线',
    icon: straight,
    shapeType: 'line',
  },
  {
    name: '箭头',
    icon: arrow,
    shapeType: 'arrow',
  },
]);

function clickAppliance(type: DrawingTool) {
  if (type === currentShapType.value) {
    if (hasSettings(type)) settingsOpen.value = !settingsOpen.value;
    return;
  }
  canvas?.value?.setDrawingTool(type);
  settingsOpen.value = hasSettings(type);
}

function clickClear() {
  if (canvas?.value?.getObjects().length && !window.confirm('清除当前页所有批注？可通过撤销恢复。'))
    return;
  settingsOpen.value = false;
  canvas?.value?.clearCanvas();
}
</script>
<style scoped>
.tool-icon {
  mask: center / contain no-repeat;
}
</style>
