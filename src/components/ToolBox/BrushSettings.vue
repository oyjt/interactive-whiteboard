<template>
  <section class="brush-settings" :aria-label="eraser ? '橡皮擦设置' : '画笔设置'">
    <div class="settings-title">{{ eraser ? '橡皮擦' : '画笔' }}设置</div>
    <label class="size-label" :for="sliderId">
      {{ eraser ? '擦除范围' : '画笔尺寸' }} <output>{{ size }} px</output>
    </label>
    <input :id="sliderId" type="range" min="1" :max="eraser ? 80 : 40" step="1"
      :value="size" @input="updateSize(Number(($event.target as HTMLInputElement).value))" />
    <div class="size-presets">
      <button v-for="width in (eraser ? [10, 20, 40, 80] : [2, 5, 10, 20])" :key="width"
        type="button" :aria-pressed="size === width" @click="updateSize(width)">{{ width }}</button>
    </div>
    <template v-if="!eraser">
      <div class="color-label">画笔颜色 <span>{{ model.color.toUpperCase() }}</span></div>
      <div class="color-presets">
        <button v-for="color in colors" :key="color" type="button" :aria-label="`选择颜色 ${color}`"
          :aria-pressed="model.color === color" :style="{ backgroundColor: color }" @click="updateColor(color)">
          <span v-if="model.color === color" :style="{ color: color === '#ffffff' || color === '#facc15' ? '#111827' : '#fff' }">✓</span>
        </button>
        <label class="custom-color">自定义 <input aria-label="自定义画笔颜色" type="color" :value="model.color"
          @input="updateColor(($event.target as HTMLInputElement).value)" /></label>
      </div>
    </template>
    <div class="stroke-preview" aria-label="笔迹预览">
      <span v-if="eraser" class="eraser-preview" :style="{ width: `${size}px`, height: `${size}px` }"></span>
      <svg v-else viewBox="0 0 180 60" role="img" aria-label="当前颜色和粗细">
        <path d="M25 35 Q55 10 90 30 T155 25" fill="none" :stroke="model.color" :stroke-width="model.width" stroke-linecap="round" />
      </svg>
    </div>
    <p>{{ eraser ? '命中后删除整个对象' : '应用于下一笔，已有内容不变' }}</p>
  </section>
</template>
<script setup lang="ts">
import { computed, useId } from 'vue';
import type { BrushSettings } from '@/core/brushSettings';
const model = defineModel<BrushSettings>({ required: true });
const props = defineProps<{ eraser: boolean }>();
const sliderId = useId();
const colors = ['#111827', '#ffffff', '#ff0000', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#a855f7'];
const size = computed(() => props.eraser ? model.value.eraserWidth : model.value.width);
function updateSize(width: number) {
  model.value = { ...model.value, [props.eraser ? 'eraserWidth' : 'width']: width };
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
.eraser-preview { border: 1px dashed #64748b; border-radius: 50%; background: #fff; box-sizing: border-box; }
p { font-size: 11px; color: #64748b; margin: 10px 0 0; }
</style>
