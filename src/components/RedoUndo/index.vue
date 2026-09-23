<template>
  <div class="redo-undo">
    <button class="redo-undo-controller-btn" aria-label="撤销" :disabled="!state.canUndo" @click="canvas?.undo()">
      <img :src="state.canUndo ? undo : undoDisabled" alt="" />
    </button>
    <button class="redo-undo-controller-btn" aria-label="重做" :disabled="!state.canRedo" @click="canvas?.redo()">
      <img :src="state.canRedo ? redo : redoDisabled" alt="" />
    </button>
  </div>
</template>
<script setup lang="ts">
import { inject, ref, type Ref, watch } from 'vue';
import FabricCanvas from '@/core';
import redo from './image/redo.svg';
import undo from './image/undo.svg';
import redoDisabled from './image/redo-disabled.svg';
import undoDisabled from './image/undo-disabled.svg';
const canvas = inject<Ref<FabricCanvas | undefined>>('canvas');
const state = ref({ canUndo: false, canRedo: false, busy: false });
watch(() => canvas?.value, (board, _, cleanup) => {
  if (!board) return;
  const update = () => { state.value = board.getHistoryState(); };
  board.on('history:changed', update);
  update();
  cleanup(() => board.off('history:changed', update));
}, { immediate: true });
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
