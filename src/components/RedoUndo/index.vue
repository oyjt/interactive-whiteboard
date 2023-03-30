<template>
<div class="redo-undo">
    <div class="redo-undo-controller-btn" @click="handleUndo">
        <img :src="undoSteps === 0 ? undoDisabled : undo" alt="撤销"/>
    </div>
    <div class="redo-undo-controller-btn" @click="handleRedo">
        <img :src="redoSteps === 0 ? redoDisabled : redo" alt="恢复"/>
    </div>
</div>
</template>
<script setup lang="ts">
import { inject, onMounted, ref, Ref } from 'vue'
import FabricCanvas from '@/core'
import redo from "./image/redo.svg";
import undo from "./image/undo.svg";
import redoDisabled from "./image/redo-disabled.svg";
import undoDisabled from "./image/undo-disabled.svg";

// 最大步数
// const maxStep = 10;
const canvas = inject<Ref<FabricCanvas>>('canvas');
const undoSteps = ref<number>(0);
const redoSteps = ref<number>(0);

// 撤销
function handleUndo() {
    if(!canvas?.value) return;
    canvas.value.undo();
    updateSteps()
}

// 重做
function handleRedo() {
    if(!canvas?.value) return;
    canvas.value.redo();
    updateSteps()
}

// 更新步数
function updateSteps() {
  if(!canvas?.value) return;
  undoSteps.value = canvas.value.getUndoSteps()
  redoSteps.value = canvas.value.getRedoSteps()
}

function initEvent() {
  if(!canvas?.value) return;
  canvas.value.on('object:added', () => {
    updateSteps()
  })
  canvas.value.on('object:modified', () => {
    updateSteps()
  })
}

onMounted(() => {
  initEvent()
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