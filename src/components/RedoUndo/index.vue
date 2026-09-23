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
<style scoped>
.redo-undo {
  height: 40px;
  padding: 4px;
  background: var(--color-surface);
  display: flex;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  user-select: none;
  box-shadow: var(--shadow-island);
}

.redo-undo-controller-btn {
  width: 32px;
  height: 32px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 7px;

  &:hover {
    background: var(--color-button-hover);
  }
}
</style>
