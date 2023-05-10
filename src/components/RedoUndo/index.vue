<template>
  <div class="redo-undo">
    <div class="redo-undo-controller-btn" @click="handleUndo">
      <img :src="stage !== historyList.length ? undo : undoDisabled" alt="后退" />
    </div>
    <div class="redo-undo-controller-btn" @click="handleRedo">
      <img :src="stage ? redo : redoDisabled" alt="重做" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { inject, ref, Ref, watchEffect } from 'vue'
import FabricCanvas from '@/core'
import { keyNames, hotkeys } from '@/core/initHotKeys';
import redo from "./image/redo.svg";
import undo from "./image/undo.svg";
import redoDisabled from "./image/redo-disabled.svg";
import undoDisabled from "./image/undo-disabled.svg";

const canvas = inject<Ref<FabricCanvas>>('canvas');
// 最大步数
const maxStep = 10;
// 当前阶段
const stage = ref<number>(0);
const historyList = ref<any>([]);

// 根据数据渲染
function renderCanvas(data: any) {
  if (!canvas?.value) return;
  canvas.value.clearCanvas();
  canvas.value.loadFromJSON(data, () => {
    canvas.value.renderAll();
  });
}

// 撤销
function handleUndo() {
  const length = historyList.value.length;
  if (!canvas?.value || !length) return;

  if (stage.value < length) {
    const canvasState = historyList.value[length - 1 - stage.value - 1];
    renderCanvas(canvasState);
    stage.value += 1;
  }
}

// 重做
function handleRedo() {
  const length = historyList.value.length;
  if (!canvas?.value || !length) return;

  if (stage.value > 0) {
    const canvasState = historyList.value[length - 1 - stage.value + 1];
    renderCanvas(canvasState);
    stage.value -= 1;
  }
}

function addToUndoStack() {
  if (!canvas?.value) return;
  const data = canvas.value.toJSON()
  if (historyList.value.length > maxStep) {
    historyList.value.shift();
  }
  historyList.value.push(data);
}

function initEvent() {
  if (!canvas?.value) return;
  canvas.value.on('mouse:up', addToUndoStack)

  hotkeys(keyNames.ctrlz, handleUndo);
  hotkeys(keyNames.ctrly, handleRedo);
}

watchEffect(() => {
  if (canvas?.value) {
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
  box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.1);
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
    background: rgba(33, 35, 36, 0.1);
  }
}
</style>