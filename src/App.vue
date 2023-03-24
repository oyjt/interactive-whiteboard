<template>
  <div>
    <Tools></Tools>
    <div class="canvas-wrap">
      <canvas id="canvas" width="800" height="450"></canvas>
      <Control></Control>
      <Zoom></Zoom>
    </div>
    <div class="canvas-wrap">
      <canvas id="canvas2" width="800" height="450"></canvas>
    </div>
  </div>
</template>

<script setup lang="ts">
import {onMounted, provide, ref} from 'vue'
import { fabric } from 'fabric';
import FabricCanvas from './core'
import Tools from './components/Tools.vue'
import Zoom from './components/Zoom.vue'
import Control from './components/Control.vue'
import { Canvas as ICanvas } from 'fabric/fabric-impl'

const canvas = ref<FabricCanvas>();
provide('canvas', canvas)
let canvas1: FabricCanvas;
let canvas2: ICanvas;

function init() {
  // 初始化画布
  canvas1 = new FabricCanvas('canvas');
  canvas.value = canvas1;

  // 初始化画布2
  canvas2 = new fabric.Canvas('canvas2');
  canvas2.selection = false;
  canvas2.skipTargetFind = true; 

    // 画布重绘后同步到远程
  canvas1.on('after:render', () => {
    canvas2?.loadFromJSON(canvas1.toJSON(), ()=>{
      console.log('画布同步成功！');
    });
  })
}

onMounted(() => {
  init()
})
</script>

<style lang="scss" scoped>
.canvas-wrap {
  position: relative;
  width: 800px;
  height: 450px;
  margin: 0 auto;
  border: 1px solid #ccc;
}
</style>
