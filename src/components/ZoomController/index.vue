<template>
    <div class="scale-controller-box">
        <div class="scale-controller-btn" @click="rSet">
            <img :src="reset" alt="重置" />
        </div>
        <div class="scale-controller-cut-line" />
        <div class="scale-controller-btn" @click="small">
            <img :src="less" alt="缩小" />
        </div>
        <div>
            {{zoomRatio}} <span style="opacity: 0.6">%</span>
        </div>
        <div class="scale-controller-btn" @click="big">
            <img :src="plus" alt="放大" />
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, inject, ref, Ref } from 'vue'
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
  height: 32px;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  user-select: none;
  font-size: 12px;
  box-shadow:0 8px 24px 0 rgba(0,0,0,0.08);
}

.scale-controller-btn {
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-left: 4px;
  margin-right: 4px;
  cursor: pointer;
  border-radius: 2px;
  &:hover {
    background: rgba(33,35,36,0.1);
  }
}

.scale-controller-cut-line {
  background-color: #E7E7E7;
  height: 20px;
  width: 0.5px;
}

</style>