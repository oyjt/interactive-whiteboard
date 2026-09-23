<template>
  <div
    class="scale-controller-box flex h-8 select-none items-center justify-center rounded bg-white text-xs shadow-md"
  >
    <div
      class="scale-controller-btn mx-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm hover:bg-gray-200"
      @click="rSet"
    >
      <img :src="reset" alt="重置" />
    </div>
    <div class="scale-controller-cut-line h-5 w-px bg-gray-200" />
    <div
      class="scale-controller-btn mx-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm hover:bg-gray-200"
      @click="small"
    >
      <img :src="less" alt="缩小" />
    </div>
    <div>{{ zoomRatio }} <span class="opacity-60">%</span></div>
    <div
      class="scale-controller-btn mx-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm hover:bg-gray-200"
      @click="big"
    >
      <img :src="plus" alt="放大" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, inject, ref, Ref } from 'vue';

import FabricCanvas from '@/core';

import less from './image/less.svg';
import plus from './image/plus.svg';
import reset from './image/reset.svg';

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
