<template>
  <div>
    <div class="canvas-wrap">
      <div class="tool-box-out">
        <ToolBox></ToolBox>
      </div>
      <div class="redo-undo-box">
          <RedoUndo></RedoUndo>
      </div>
      <div class="zoom-controller-box">
        <ZoomController></ZoomController>
      </div>
      <div class="room-controller-box" v-show="!isPreviewShow">
        <div class="page-controller-mid-box">
          <div className="page-preview-cell" @click="insertPPT">
              <img style="width: 28px" :src="folder" alt="文件"/>
          </div>
        </div>
      </div>
      <div class="page-controller-box" v-show="isShowPPTControl">
          <div className="page-controller-mid-box">
              <PageController></PageController>
              <div className="page-preview-cell" @click="handlePreviewState(true)">
                  <img :src="pages" alt="PPT预览"/>
              </div>
          </div>
      </div>
      <div class="preview-controller-box" v-show="isShowPPTControl&&isPreviewShow">
        <PreviewController @handlePreviewState="handlePreviewState"></PreviewController>
      </div>
      <canvas id="canvas" width="800" height="450"></canvas>
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
import ToolBox from './components/ToolBox/index.vue'
import RedoUndo from './components/RedoUndo/index.vue'
import ZoomController from './components/ZoomController/index.vue'
import PageController from './components/PageController/index.vue'
import PreviewController from './components/PreviewController/index.vue'
import pages from './assets/images/pages.svg'
import folder from "./assets/images/folder.svg";
import { gzip, ungzip, uint8ArrayToBase64, base64ToUint8Array } from '@/utils/index'
import { Canvas } from 'fabric/fabric-impl';

const canvas = ref<FabricCanvas>();
provide('canvas', canvas)
let canvas1: FabricCanvas;
let canvas2: Canvas;
const pptImage = ['http://47.92.172.237/ppt.png',
  'http://47.92.172.237/ppt1.png', 'http://47.92.172.237/ppt2.png', 'http://47.92.172.237/ppt3.png']

const isPreviewShow = ref<boolean>(false)
const isShowPPTControl = ref<boolean>(false)

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
    console.log(canvas1.toJSON());
    const compressedData = gzip(canvas1.toJSON());
    const text = uint8ArrayToBase64(compressedData);
    const data = base64ToUint8Array(text)
    const jsonData = ungzip(data);
    canvas2?.loadFromJSON(jsonData, ()=>{
      console.log('画布同步成功！');
    });
  })
}

function handlePreviewState(state: boolean) {
  isPreviewShow.value = state;
}


function insertPPT() {
  canvas1.insertImages(pptImage)
  isShowPPTControl.value = true;
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

.tool-box-out {
  height: 100%;
  width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: absolute;
  z-index: 3;
  left: 8px;
}

.redo-undo-box {
  position: absolute;
  z-index: 3;
  bottom: 8px;
  left: 8px;
}

.zoom-controller-box {
  position: absolute;
  left: 76px;
  z-index: 3;
  bottom: 8px;
}

.room-controller-box {
  position: absolute;
  right: 8px;
  top: 8px;
  z-index: 100;
}

.page-controller-box {
  position: absolute;
  z-index: 3;
  bottom: 8px;
  right: 8px;
}

.page-controller-mid-box {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
  height: 32px;
  padding-left: 4px;
  padding-right: 4px;
  border-radius: 4px;
  user-select: none;
  font-size: 12px;
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.1);
}

.page-preview-cell {
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  background-color: white;
  border-radius: 2px;
  &:hover {
    background: rgba(33, 35, 36, 0.1);
  }
}

.preview-controller-box {
  position: absolute;
  top: 0;
  right: 0;
  width: 240px;
  height: 100%;
  z-index: 3;
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.1);
}
</style>
