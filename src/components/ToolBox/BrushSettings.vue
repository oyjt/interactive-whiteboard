<template>
  <section class="brush-settings" :aria-label="`${toolName}设置`">
    <div class="settings-title">{{ toolName }}设置</div>
    <label class="size-label" :for="sliderId">
      {{ tool === 'pencil' ? '画笔尺寸' : '线宽' }} <output>{{ model.width }} px</output>
    </label>
    <input :id="sliderId" type="range" min="1" max="40" step="1"
      :value="model.width" @input="updateSize(Number(($event.target as HTMLInputElement).value))" />
    <div class="size-presets">
      <button v-for="width in [2, 5, 10, 20]" :key="width"
        type="button" :aria-pressed="model.width === width" @click="updateSize(width)">{{ width }}</button>
    </div>
    <div class="color-label">{{ tool === 'pencil' ? '画笔颜色' : '线条颜色' }} <span>{{ model.color.toUpperCase() }}</span></div>
    <div class="color-presets">
      <button v-for="color in colors" :key="color" type="button" :aria-label="`选择颜色 ${color}`"
        :aria-pressed="model.color === color" :style="{ backgroundColor: color }" @click="updateColor(color)">
        <span v-if="model.color === color" :style="{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#fff' }">✓</span>
      </button>
      <label class="custom-color">自定义 <input :aria-label="`${toolName}自定义颜色`" type="color" :value="model.color"
        @input="updateColor(($event.target as HTMLInputElement).value)" /></label>
    </div>
    <div class="stroke-preview" :aria-label="`${toolName}预览`">
      <svg viewBox="0 0 180 60" role="img" aria-label="当前颜色和粗细">
        <path :d="tool === 'pencil' ? 'M25 35 Q55 10 90 30 T155 25' : 'M25 30 L155 30'"
          fill="none" :stroke="model.color" :stroke-width="model.width" stroke-linecap="round" />
      </svg>
    </div>
    <p>{{ tool === 'pencil' ? '应用于下一笔' : '应用于新绘制的图形' }}，已有内容不变</p>
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
  pencil: '画笔', line: '直线', arrow: '箭头', rectangle: '矩形',
  circle: '圆形', ellipse: '椭圆', triangle: '三角形',
};
const toolName = computed(() => names[props.tool] ?? '线条');
function updateSize(width: number) {
  model.value = { ...model.value, width };
}
function updateColor(color: string) { model.value = { ...model.value, color }; }
</script>
<style scoped>
.brush-settings { width: 210px; padding: 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 8px 30px #0f172a14; color: #1e293b; text-align: left; }
.settings-title { font-size: 14px; font-weight: 650; margin-bottom: 16px; }
.size-label, .color-label { display: flex; justify-content: space-between; align-items: center; font-size: 12px; margin: 10px 0; }
output, .color-label span { color: #64748b; font-variant-numeric: tabular-nums; }
input[type=range] { width: 100%; accent-color: #2563eb; cursor: pointer; }
.size-presets { display: flex; gap: 6px; margin: 8px 0 18px; }
.size-presets button { flex: 1; border: 1px solid #e2e8f0; padding: 5px 0; font-size: 12px; border-radius: 5px; }
.size-presets button[aria-pressed=true] { background: #eff6ff; color: #1d4ed8; border-color: #93c5fd; }
.color-presets { display: flex; gap: 8px; flex-wrap: wrap; }
.color-presets > button { width: 26px; height: 26px; border-radius: 50%; border: 1px solid #cbd5e1; padding: 0; }
.color-presets > button[aria-pressed=true] { outline: 2px solid #2563eb; outline-offset: 2px; }
.custom-color { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #64748b; }
input[type=color] { width: 32px; height: 26px; padding: 0; border: 0; cursor: pointer; background: none; }
.stroke-preview { height: 80px; margin-top: 14px; background: #f1f5f9; border-radius: 8px; display: flex; justify-content: center; align-items: center; overflow: hidden; }
.stroke-preview svg { width: 100%; height: 70px; }
p { font-size: 11px; color: #64748b; margin: 10px 0 0; }
</style>
