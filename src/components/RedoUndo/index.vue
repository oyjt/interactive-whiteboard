<template>
<div class="redo-undo">
    <div class="redo-undo-controller-btn" @click="handleUndo">
        <img :src="undoList.length ? undo : undoDisabled" alt="后退"/>
    </div>
    <div class="redo-undo-controller-btn" @click="handleRedo">
        <img :src="redoList.length ? redo : redoDisabled" alt="重做"/>
    </div>
</div>
</template>
<script setup lang="ts">
import { inject, ref, Ref, watchEffect } from 'vue'
import FabricCanvas from '@/core'
import { Object as IObject } from "fabric/fabric-impl";
import { keyNames, hotkeys } from '@/core/initHotKeys';
import redo from "./image/redo.svg";
import undo from "./image/undo.svg";
import redoDisabled from "./image/redo-disabled.svg";
import undoDisabled from "./image/undo-disabled.svg";

interface IJson { version: string; objects: IObject[] }

const canvas = inject<Ref<FabricCanvas>>('canvas');
// 最大步数
const maxStep = 10;
// 回放标识
let isReplay = false; 
// 撤销列表
const undoList = ref<IJson[]>([]);
// 重做列表
const redoList = ref<IJson[]>([]);

// 根据数据渲染
function renderCanvas(data:IJson) {
  if(!canvas?.value) return;
  isReplay = true;
  canvas.value.clearCanvas();
  canvas.value.loadFromJSON(data, () => {
    canvas.value.renderAll();
    isReplay = false;
  });
}

// 撤销
function handleUndo() {
    if(!canvas?.value || !undoList.value.length) return;
    const canvasState = undoList.value.pop();
    if(!canvasState) return;
    redoList.value.push(canvasState);
    renderCanvas(canvasState);
}

// 重做
function handleRedo() {
    if(!canvas?.value||!redoList.value.length) return;
    const canvasState = redoList.value.pop();
    if(!canvasState) return;
    undoList.value.push(canvasState);
    renderCanvas(canvasState);
}

function addToUndoStack() {
  if(!canvas?.value || isReplay) return;
  const data = canvas.value.toJSON()
  if(undoList.value.length > maxStep) {
    undoList.value.shift();
  }
  undoList.value.push(data);
  redoList.value = [];
}

function initEvent() {
  if(!canvas?.value) return;
  canvas.value.on('object:added', addToUndoStack)
  canvas.value.on('object:modified', addToUndoStack)
  canvas.value.on('object:removed', addToUndoStack)

  hotkeys(keyNames.ctrlz, handleUndo);
  hotkeys(keyNames.ctrly, handleRedo);
}

watchEffect(() => {
  if(canvas?.value) {
    initEvent()
  }
})
</script>
<style lang="scss">
.redo-undo {
  height: 32px;
  width: 60px;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  user-select: none;
  font-size: 12px;
  cursor: pointer;
  box-shadow:0 4px 12px 0 rgba(0,0,0,0.1);
}

.redo-undo-controller-btn {
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 2px;
  margin-left: 2px;
  margin-right: 2px;
  &:hover {
    background: rgba(33,35,36,0.1);
  }
}

</style>