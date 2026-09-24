<template>
  <section
    class="w-44 rounded-md border border-slate-200 bg-white/95 p-2 text-slate-700 shadow-[0_6px_20px_#0f172a26] backdrop-blur-sm"
    :aria-label="`${toolName}设置`"
  >
    <div class="flex items-center gap-2">
      <label class="sr-only" :for="sliderId">
        {{ tool === 'text' ? '文字大小' : tool === 'pencil' ? '画笔尺寸' : '线宽' }}
      </label>
      <input
        :id="sliderId"
        class="h-5 min-w-0 flex-1 cursor-pointer accent-blue-600"
        type="range"
        :min="tool === 'text' ? 12 : 1"
        :max="tool === 'text' ? 96 : 40"
        step="1"
        :value="tool === 'text' ? model.fontSize : model.width"
        @input="updateSize(Number(($event.target as HTMLInputElement).value))"
      />
      <output class="w-9 text-right text-[11px] tabular-nums text-slate-500">
        {{ tool === 'text' ? model.fontSize : model.width }} px
      </output>
    </div>
    <div class="my-2 h-px bg-slate-200"></div>
    <div
      class="grid grid-cols-4 justify-items-center gap-1"
      role="group"
      :aria-label="`${toolName}颜色`"
    >
      <button
        v-for="color in colors"
        :key="color"
        class="flex h-7 w-7 items-center justify-center rounded border border-transparent hover:bg-slate-100 aria-pressed:border-blue-600"
        type="button"
        :aria-label="`选择颜色 ${color}`"
        :aria-pressed="model.color === color"
        @click="updateColor(color)"
      >
        <span
          class="h-4 w-4 rounded-[3px] border border-slate-200/70"
          :style="{ backgroundColor: color }"
          aria-hidden="true"
        ></span>
      </button>
      <label
        class="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-slate-200 hover:bg-slate-100"
        title="自定义颜色"
      >
        <span
          class="h-4 w-4 rounded-[3px] border border-slate-300"
          :style="{ backgroundColor: model.color }"
          aria-hidden="true"
        ></span>
        <input
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          :aria-label="`${toolName}自定义颜色`"
          type="color"
          :value="model.color"
          @input="updateColor(($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>
  </section>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue';

import type { DrawingTool } from '@/core';
import type { BrushSettings } from '@/core/brushSettings';
const model = defineModel<BrushSettings>({ required: true });
const props = defineProps<{ tool: DrawingTool }>();
const sliderId = useId();
const colors = [
  '#111827',
  '#ffffff',
  '#ff0000',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#3b82f6',
  '#a855f7',
];
const names: Partial<Record<DrawingTool, string>> = {
  pencil: '画笔',
  text: '文字',
  line: '直线',
  arrow: '箭头',
  rectangle: '矩形',
  circle: '圆形',
  ellipse: '椭圆',
  triangle: '三角形',
};
const toolName = computed(() => names[props.tool] ?? '线条');
function updateSize(width: number) {
  model.value = { ...model.value, [props.tool === 'text' ? 'fontSize' : 'width']: width };
}
function updateColor(color: string) {
  model.value = { ...model.value, color };
}
</script>
