<template>
    <div class="scale-controller-box">
        <button class="scale-controller-btn" aria-label="重置缩放" @click="rSet">
            <img :src="reset" alt="" />
        </button>
        <div class="scale-controller-cut-line" />
        <button class="scale-controller-btn" aria-label="缩小" @click="small">
            <img :src="less" alt="" />
        </button>
        <div class="zoom-value">
            {{zoomRatio}}%
        </div>
        <button class="scale-controller-btn" aria-label="放大" @click="big">
            <img :src="plus" alt="" />
        </button>
    </div>
</template>
<script setup lang="ts">
import { inject, ref, type Ref } from 'vue'
import FabricCanvas from '@/core'
import reset from "./image/reset.svg";
import plus from "./image/plus.svg";
import less from "./image/less.svg";

const canvas = inject<Ref<FabricCanvas>>('canvas');
const zoomRatio = ref<number>(100);

function rSet() {
    canvas?.value.zoom(1);
    zoomRatio.value = 100;
}
function big() {
    canvas?.value.zoomIn();
    zoomRatio.value = Math.floor((canvas?.value.getZoom() as number) * 100);
}
function small() {
    canvas?.value.zoomOut();
    zoomRatio.value = Math.floor((canvas?.value.getZoom() as number) * 100);
}
</script>
<style lang="scss" scoped>

.scale-controller-box {
  height: 40px;
  padding: 4px;
  background: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  user-select: none;
  font-size: 12px;
  box-shadow: var(--shadow-island);
}

.scale-controller-btn {
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0;
  cursor: pointer;
  border-radius: 7px;
  &:hover {
    background: var(--color-button-hover);
  }
}

.scale-controller-cut-line {
  margin: 0 4px;
  background: var(--color-border);
  height: 20px;
  width: 0.5px;
}

.zoom-value {
  min-width: 42px;
  color: var(--color-text-muted);
  font-size: 11px;
  text-align: center;
}

</style>
