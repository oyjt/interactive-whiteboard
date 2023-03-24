<template>
    <div class="zoom-wrap">
        <button type="button" @click="big">放大</button>
        <button type="button" @click="small">缩小</button>
        <button type="button" @click="rSet">1:1</button>
    </div>
</template>
<script setup lang="ts">
import { inject, Ref} from 'vue'
import FabricCanvas from '@/core'

const canvas = inject<Ref<FabricCanvas>>('canvas');

function rSet() {
    canvas?.value.zoom(1);
}
function big() {
    canvas?.value.zoomIn();
}
function small() {
    canvas?.value.zoomOut();
}
</script>
<style lang="scss" scoped>
.zoom-wrap {
  position: absolute;
  right: 10px;
  bottom: 10px;
}
</style>