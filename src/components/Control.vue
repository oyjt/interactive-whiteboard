<template>
    <div class="control-wrap">
        <button type="button" @click="prevPPT()">上一页</button> 
        <span id="index">1/4</span> 
        <button type="button" @click="nextPPT()">下一页</button>
    </div>
</template>
<script setup lang="ts">
import { inject, Ref} from 'vue'
import FabricCanvas from '@/core'

var ppts = ['http://47.92.172.237/ppt.png',
  'http://47.92.172.237/ppt1.png', 'http://47.92.172.237/ppt2.png', 'http://47.92.172.237/ppt3.png'];
var pptIndex = 0;

const canvas = inject<Ref<FabricCanvas>>('canvas');

// 图片渲染
function renderImg(url: string) {
  canvas?.value.clearCanvas();
  canvas?.value.insertImage(url);
}

// 前一页ppt
function prevPPT() {
  --pptIndex;
  if (pptIndex < 0) {
    pptIndex = 0;
    return;
  }
  (document.getElementById('index') as HTMLSpanElement).innerHTML = (pptIndex + 1) + '/' + 4;
  renderImg(ppts[pptIndex]);
}

// 后一页ppt
function nextPPT() {
  ++pptIndex;
  if (pptIndex >= 4) {
    pptIndex = 3;
    return;
  }
  (document.getElementById('index') as HTMLSpanElement).innerHTML = (pptIndex + 1) + '/' + 4;
  renderImg(ppts[pptIndex]);
}

</script>
<style lang="scss" scoped>
.control-wrap {
  position: absolute;
  left: 10px;
  bottom: 10px;
  display: flex;
  align-items: center;
}
</style>