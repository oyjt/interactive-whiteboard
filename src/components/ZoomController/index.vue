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
<style scoped>
@reference "tailwindcss";
.scale-controller-box { @apply flex h-8 select-none items-center justify-center rounded bg-white text-xs shadow-md; }
.scale-controller-btn { @apply mx-1 flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm hover:bg-gray-200; }
.scale-controller-cut-line { @apply h-5 w-px bg-gray-200; }
</style>
