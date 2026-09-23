<template>
  <Teleport to="body">
  <section class="brush-settings island" :aria-label="eraser ? '橡皮擦设置' : '画笔设置'">
    <div v-if="!eraser" class="setting-group">
      <span class="setting-label">描边</span>
      <div class="color-presets">
        <button
          v-for="color in colors"
          :key="color"
          type="button"
          :aria-label="`选择颜色 ${color}`"
          :aria-pressed="model.color === color"
          :style="{ backgroundColor: color }"
          @click="updateColor(color)"
        />
        <label class="custom-color" title="自定义颜色">
          <span :style="{ background: model.color }">＋</span>
          <input
            aria-label="自定义画笔颜色"
            type="color"
            :value="model.color"
            @input="updateColor(($event.target as HTMLInputElement).value)"
          />
        </label>
      </div>
    </div>

    <div class="setting-group">
      <span class="setting-label">{{ eraser ? '橡皮擦大小' : '描边宽度' }}</span>
      <div class="size-presets">
        <button
          v-for="width in sizes"
          :key="width"
          type="button"
          :aria-label="`${width} 像素`"
          :aria-pressed="size === width"
          @click="updateSize(width)"
        >
          <span v-if="eraser" class="eraser-size" :style="{ width: `${Math.min(width, 24)}px`, height: `${Math.min(width, 24)}px` }" />
          <span v-else class="stroke-size" :style="{ height: `${Math.max(2, Math.min(width, 10))}px` }" />
          <span class="sr-only">{{ width }}</span>
        </button>
      </div>
      <label class="range-row" :for="sliderId">
        <input
          :id="sliderId"
          type="range"
          min="1"
          :max="eraser ? 80 : 40"
          step="1"
          :value="size"
          @input="updateSize(Number(($event.target as HTMLInputElement).value))"
        />
        <output>{{ size }}</output>
      </label>
    </div>

    <p>{{ eraser ? '命中对象后删除整个对象' : '设置应用于后续绘制' }}</p>
  </section>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue';
import type { BrushSettings } from '@/core/brushSettings';

const model = defineModel<BrushSettings>({ required: true });
const props = defineProps<{ eraser: boolean }>();
const sliderId = useId();
const colors = ['#1b1b1f', '#e03131', '#f08c00', '#2f9e44', '#1971c2', '#6741d9'];
const sizes = computed(() => props.eraser ? [10, 20, 40, 80] : [2, 5, 10, 20]);
const size = computed(() => props.eraser ? model.value.eraserWidth : model.value.width);

function updateSize(width: number) {
  model.value = { ...model.value, [props.eraser ? 'eraserWidth' : 'width']: width };
}

function updateColor(color: string) {
  model.value = { ...model.value, color };
}
</script>

<style scoped>
.brush-settings { position: fixed; top: 72px; left: 16px; width: 196px; padding: 12px; color: var(--color-text); text-align: left; }
.setting-group + .setting-group { margin-top: 14px; }
.setting-label { display: block; margin-bottom: 8px; color: var(--color-text-muted); font-size: 12px; font-weight: 500; }
.color-presets, .size-presets { display: flex; gap: 6px; }
.color-presets > button, .custom-color { position: relative; width: 26px; height: 26px; border: 1px solid #d6d6dc; border-radius: 7px; box-sizing: border-box; }
.color-presets > button[aria-pressed=true] { box-shadow: 0 0 0 2px #fff, 0 0 0 4px var(--color-primary); }
.custom-color { display: grid; place-items: center; overflow: hidden; cursor: pointer; }
.custom-color span { display: grid; width: 100%; height: 100%; place-items: center; color: #fff; font-size: 16px; text-shadow: 0 1px 2px #0008; }
.custom-color input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.size-presets button { display: grid; width: 38px; height: 36px; place-items: center; border-radius: 8px; background: var(--color-button); }
.size-presets button:hover { background: var(--color-button-hover); }
.size-presets button[aria-pressed=true] { background: var(--color-primary-light); color: var(--color-primary); }
.stroke-size { display: block; width: 22px; border-radius: 999px; background: currentColor; }
.eraser-size { display: block; border: 1.5px solid currentColor; border-radius: 50%; box-sizing: border-box; }
.range-row { display: grid; grid-template-columns: 1fr 30px; align-items: center; gap: 8px; margin-top: 10px; }
input[type=range] { width: 100%; accent-color: var(--color-primary); cursor: pointer; }
output { color: var(--color-text-muted); font-size: 12px; font-variant-numeric: tabular-nums; text-align: right; }
p { margin: 12px 0 0; color: var(--color-text-muted); font-size: 11px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
</style>
