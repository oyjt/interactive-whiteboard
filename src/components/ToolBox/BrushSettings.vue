<template>
  <section class="brush-settings" :aria-label="`${toolName}设置`">
    <div class="settings-title">{{ toolName }}设置</div>
    <label class="size-label" :for="sliderId">
      {{ tool === 'text' ? '文字大小' : tool === 'pencil' ? '画笔尺寸' : '线宽' }}
      <output>{{ tool === 'text' ? model.fontSize : model.width }} px</output>
    </label>
    <input :id="sliderId" type="range" :min="tool === 'text' ? 12 : 1" :max="tool === 'text' ? 96 : 40" step="1"
      :value="tool === 'text' ? model.fontSize : model.width"
      @input="updateSize(Number(($event.target as HTMLInputElement).value))" />
    <div class="size-presets">
      <button v-for="size in (tool === 'text' ? [16, 24, 32, 48] : [2, 5, 10, 20])" :key="size"
        type="button" :aria-pressed="(tool === 'text' ? model.fontSize : model.width) === size"
        @click="updateSize(size)">{{ size }}</button>
    </div>
    <div class="color-label">{{ tool === 'text' ? '文字颜色' : tool === 'pencil' ? '画笔颜色' : '线条颜色' }} <span>{{ model.color.toUpperCase() }}</span></div>
    <div class="color-presets">
      <button v-for="color in colors" :key="color" type="button" :aria-label="`选择颜色 ${color}`"
        :aria-pressed="model.color === color" :style="{ backgroundColor: color }" @click="updateColor(color)">
        <span v-if="model.color === color" :style="{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#fff' }">✓</span>
      </button>
      <label class="custom-color">自定义 <input :aria-label="`${toolName}自定义颜色`" type="color" :value="model.color"
        @input="updateColor(($event.target as HTMLInputElement).value)" /></label>
    </div>
    <div class="stroke-preview" :aria-label="`${toolName}预览`">
      <span v-if="tool === 'text'" :style="{ color: model.color, fontSize: `${model.fontSize}px` }">文字 Aa</span>
      <svg v-else viewBox="0 0 180 60" role="img" aria-label="当前颜色和粗细">
        <path :d="tool === 'pencil' ? 'M25 35 Q55 10 90 30 T155 25' : 'M25 30 L155 30'"
          fill="none" :stroke="model.color" :stroke-width="model.width" stroke-linecap="round" />
      </svg>
    </div>
    <p>{{ tool === 'text' ? '点击输入；拖动可指定换行宽度' : tool === 'pencil' ? '应用于下一笔，已有内容不变' : '应用于新绘制的图形，已有内容不变' }}</p>
  </section>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue';
import type { BrushSettings } from '@/core/brushSettings';
import type { DrawingTool } from '@/core';
const model = defineModel<BrushSettings>({ required: true });
const props = defineProps<{ tool: DrawingTool }>();
const sliderId = useId();
const colors = ['#111827', '#ffffff', '#ff0000', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'];
const names: Partial<Record<DrawingTool, string>> = {
  pencil: '画笔', text: '文字', line: '直线', arrow: '箭头', rectangle: '矩形',
  circle: '圆形', ellipse: '椭圆', triangle: '三角形',
};
const toolName = computed(() => names[props.tool] ?? '线条');
function updateSize(width: number) {
  model.value = { ...model.value, [props.tool === 'text' ? 'fontSize' : 'width']: width };
}
function updateColor(color: string) { model.value = { ...model.value, color }; }
</script>
<style scoped>
@reference "tailwindcss";
.brush-settings { @apply w-[210px] rounded-xl border border-slate-200 bg-white p-4 text-left text-slate-800 shadow-lg; }
.settings-title { @apply mb-4 text-sm font-semibold; }
.size-label, .color-label { @apply my-2.5 flex items-center justify-between text-xs; }
output, .color-label span { @apply text-slate-500 tabular-nums; }
input[type=range] { @apply w-full cursor-pointer accent-blue-600; }
.size-presets { @apply mt-2 mb-[18px] flex gap-1.5; }
.size-presets button { @apply flex-1 rounded-md border border-slate-200 py-1 text-xs; }
.size-presets button[aria-pressed=true] { @apply border-blue-300 bg-blue-50 text-blue-700; }
.color-presets { @apply flex flex-wrap gap-2; }
.color-presets > button { @apply h-[26px] w-[26px] rounded-full border border-slate-300; }
.color-presets > button[aria-pressed=true] { @apply outline-2 outline-offset-2 outline-blue-600; }
.custom-color { @apply flex items-center gap-2 text-xs text-slate-500; }
input[type=color] { @apply h-[26px] w-8 cursor-pointer border-0 bg-transparent p-0; }
.stroke-preview { @apply mt-3.5 flex h-20 items-center justify-center overflow-hidden rounded-lg bg-slate-100; }
.stroke-preview svg { @apply h-[70px] w-full; }
p { @apply mt-2.5 text-[11px] text-slate-500; }
</style>
