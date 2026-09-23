<template>
  <div
    class="redo-undo flex h-8 w-[60px] cursor-pointer select-none items-center justify-center rounded bg-white text-xs shadow-md"
  >
    <button
      class="redo-undo-controller-btn mx-0.5 flex h-6 w-6 items-center justify-center rounded-sm hover:bg-gray-200"
      aria-label="撤销"
      :disabled="!state.canUndo"
      @click="canvas?.undo()"
    >
      <img :src="state.canUndo ? undo : undoDisabled" alt="" />
    </button>
    <button
      class="redo-undo-controller-btn mx-0.5 flex h-6 w-6 items-center justify-center rounded-sm hover:bg-gray-200"
      aria-label="重做"
      :disabled="!state.canRedo"
      @click="canvas?.redo()"
    >
      <img :src="state.canRedo ? redo : redoDisabled" alt="" />
    </button>
  </div>
</template>
<script setup lang="ts">
import { inject, ref, type Ref, watch } from "vue";
import FabricCanvas from "@/core";
import redo from "./image/redo.svg";
import undo from "./image/undo.svg";
import redoDisabled from "./image/redo-disabled.svg";
import undoDisabled from "./image/undo-disabled.svg";
const canvas = inject<Ref<FabricCanvas | undefined>>("canvas");
const state = ref({ canUndo: false, canRedo: false, busy: false });
watch(
  () => canvas?.value,
  (board, _, cleanup) => {
    if (!board) return;
    const update = () => {
      state.value = board.getHistoryState();
    };
    board.on("history:changed", update);
    update();
    cleanup(() => board.off("history:changed", update));
  },
  { immediate: true },
);
</script>
