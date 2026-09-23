<template>
  <div class="whiteboard-annex-box">
    <button aria-label="首页" :disabled="isFirst()" @click="setFirstStep" class="whiteboard-annex-arrow">
      <img :src="isFirst() ? firstDisabled : first" alt="first" />
    </button>
    <button aria-label="上一页" :disabled="isFirst()" @click="handlePptPreviousStep" class="whiteboard-annex-arrow">
      <img :src="isFirst() ? backDisabled : back" alt="back" />
    </button>
    <div class="whiteboard-annex-arrow-page">
      {{activeIndex + 1}} / {{scenes.length}}
    </div>
    <button aria-label="下一页" :disabled="isLast()" @click="handlePptNextStep" class="whiteboard-annex-arrow">
      <img :src="isLast() ? nextDisabled : next" alt="next" />
    </button>
    <button aria-label="末页" :disabled="isLast()" @click="setLastStep" class="whiteboard-annex-arrow">
      <img :src="isLast() ? lastDisabled : last" alt="last" />
    </button>
  </div>
</template>
<script setup lang="ts">
import { inject, ref, type Ref, watch } from 'vue';
import FabricCanvas from '@/core';
import next from './image/next.svg';
import nextDisabled from './image/next-disabled.svg';
import back from './image/back.svg';
import backDisabled from './image/back-disable.svg';
import first from './image/first-active.svg';
import firstDisabled from './image/first-disable.svg';
import last from './image/last-active.svg';
import lastDisabled from './image/last-disable.svg';
const canvas = inject<Ref<FabricCanvas | undefined>>('canvas');
const activeIndex = ref(0);
const scenes = ref<string[]>([]);
const busy = ref(false);
const isFirst = () => busy.value || activeIndex.value <= 0;
const isLast = () => busy.value || activeIndex.value >= scenes.value.length - 1;
const handlePptPreviousStep = () => canvas?.value?.setCurrentScene(activeIndex.value - 1);
const handlePptNextStep = () => canvas?.value?.setCurrentScene(activeIndex.value + 1);
const setFirstStep = () => canvas?.value?.setCurrentScene(0);
const setLastStep = () => canvas?.value?.setCurrentScene(scenes.value.length - 1);
watch(() => canvas?.value, (board, _, cleanup) => {
  if (!board) return;
  const update = () => {
    scenes.value = board.getScenes(); activeIndex.value = board.getCurrentScene(); busy.value = board.getHistoryState().busy;
  };
  const events = ['insert:images', 'current:image', 'history:changed'];
  events.forEach(event => board.on(event, update));
  update();
  cleanup(() => events.forEach(event => board.off(event, update)));
}, { immediate: true });
</script>
<style>
@reference "tailwindcss";
.whiteboard-annex-box { @apply flex h-6 select-none items-center justify-center bg-white; }
.whiteboard-annex-arrow { @apply flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm hover:bg-gray-200; }
.whiteboard-annex-arrow-page { @apply mx-2 text-[#212324]; }
</style>
