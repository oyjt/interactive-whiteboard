<template>
  <div class="whiteboard-annex-box">
    <div @click="setFirstStep" class="whiteboard-annex-arrow">
      <img :src="isFirst() ? firstDisabled : first" alt="first" />
    </div>
    <div @click="handlePptPreviousStep" class="whiteboard-annex-arrow">
      <img :src="isFirst() ? backDisabled : back" alt="back" />
    </div>
    <div className="whiteboard-annex-arrow-page">
      {{activeIndex + 1}} / {{scenes.length}}
    </div>
    <div @click="handlePptNextStep" class="whiteboard-annex-arrow">
      <img :src="isLast() ? nextDisabled : next" alt="next" />
    </div>
    <div @click="setLastStep" class="whiteboard-annex-arrow">
      <img :src="isLast() ? lastDisabled : last" alt="last" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { inject, ref, Ref, watchEffect } from 'vue'
import FabricCanvas from '@/core'
import next from "./image/next.svg";
import nextDisabled from "./image/next-disabled.svg";
import back from "./image/back.svg";
import backDisabled from "./image/back-disable.svg";
import first from "./image/first-active.svg";
import firstDisabled from "./image/first-disable.svg";
import last from "./image/last-active.svg";
import lastDisabled from "./image/last-disable.svg";

const canvas = inject<Ref<FabricCanvas>>('canvas');
const activeIndex = ref<number>(0);
const scenes = ref<string[]>([]);

// 图片渲染
function renderImg() {
  canvas?.value.clearCanvas();
  canvas?.value.setCurrentScense(activeIndex.value);
}

function handlePptPreviousStep() {
  --activeIndex.value;
  if (activeIndex.value < 0) {
    activeIndex.value = 0;
    return;
  }
  renderImg();
}

function handlePptNextStep() {
  ++activeIndex.value;
  if (activeIndex.value >= scenes.value.length-1) {
    activeIndex.value = scenes.value.length-1;
    return;
  }
  renderImg();
}

function isFirst() {
  return activeIndex.value === 0;
}

function isLast() {
  const lastIndex = scenes.value.length - 1;
  return activeIndex.value === lastIndex;
}

function setLastStep() {
  activeIndex.value = scenes.value.length - 1;
  renderImg();
}

function setFirstStep() {
  activeIndex.value = 0;
  renderImg();
}

watchEffect(()=> {
  if(canvas?.value) {
    canvas.value.on('insert:images', (urls: string[]) => {
        scenes.value = urls;
    })
    canvas.value.on('current:image', (index: number) => {
      activeIndex.value = index;
    })
  }
})
</script>
<style lang="scss">
.whiteboard-annex-box {
  height: 24px;
  background-color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.whiteboard-annex-arrow {
  display: flex;
  width: 24px;
  height: 24px;
  border-radius: 2px;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  &:hover {
    background: rgba(33, 35, 36, 0.1);
  }
}

.whiteboard-annex-arrow-page {
  margin-left: 8px;
  margin-right: 8px;
  color: #212324;
}
</style>