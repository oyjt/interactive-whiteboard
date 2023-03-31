<template>
    <div class="menu-annex-box" style="outline: 0">
        <div class="menu-title-line-box">
            <div class="menu-title-line">
                <div class="menu-title-text-box">
                    预览
                </div>
                <div class="menu-title-left">
                    <div class="menu-head-btn">
                        <img :src="addPage" alt="添加页面" />
                    </div>
                    <div class="menu-head-btn" :style="{ marginLeft: '8px' }" @click="handlePreviewState(false)">
                        <img :src="close" alt="关闭" />
                    </div>
                </div>
            </div>
        </div>
        <div style="height: 64px"></div>
        <div class="menu-annex-body">
            <div class="preview-cells-box">
                <div class="page-out-box" v-for="(item, index) in scenes">
                    <div @click="setScenePath(index)" class="page-box" :class="{active: activeIndex === index}"> 
                        <img class="ppt-image" :src="item" />
                    </div>
                    <div class="page-box-under">
                        <div class="page-box-under-left">
                            {{index + 1}}
                        </div>
                        <div @click="removeScenes(index)" class="page-box-under-right">
                            <img :src="deleteIcon" alt="删除" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">

import { inject, Ref, ref, watchEffect } from 'vue';
import close from "./image/close.svg";
import addPage from "./image/add-page.svg";
import deleteIcon from "./image/delete.svg";
import FabricCanvas from '@/core';

const canvas = inject<Ref<FabricCanvas>>('canvas');
const scenes = ref<string[]>([]);
const activeIndex = ref<number>(0);

const emit = defineEmits(['handlePreviewState'])
function handlePreviewState(state: boolean) {
    emit('handlePreviewState', state)
}

function setScenePath(index: number) {
    canvas?.value.setCurrentImage(index)
}

function removeScenes(index: number) {

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
.menu-title-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 22px;
    margin-top: 24px;
}

.menu-title-line-box {
    height: 62px;
    background-color: white;
    position: absolute;
    z-index: 10;
    width: 100%;
}

.menu-head-btn {
    width: 22px;
    height: 22px;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    border-radius: 2px;

    &:hover {
        background: rgba(33, 35, 36, 0.1);
    }
}

.menu-title-left {
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 16px;
}

.menu-title-text-box {
    margin-left: 16px;
}

.menu-title-close-icon {
    width: 16px;
}

.menu-annex-box {
    width: 100%;
    height: 100%;
    background-color: white;
    overflow: scroll;
}

.menu-annex-body {
    width: 100%;
    height: calc(100vh - 64px);
    background-color: white;
}

.menu-add-page {
    margin-right: 16px;
}

.menu-under-btn-inner {
    width: 100%;
    height: 42px;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
        background-color: #F5F5F5;
        transition-timing-function: ease-in-out;
        transition-duration: 200ms;
    }

    img {
        width: 14px;
    }
}

.ppt-image {
    width: 208px;
    height: 156px;
    overflow: hidden;
}

.menu-under-btn-right {
    width: 42px;
    height: 42px;
}

.menu-under-btn {
    width: 100%;
    height: 42px;
    position: absolute;
    bottom: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 15;
    border-top: 1px solid #F5F5F5;
    cursor: pointer;
    background-color: white;

    img {
        width: 14px;
        opacity: 0.6;
        margin-right: 12px;
    }
}

.menu-under-btn-right-inner {
    width: 42px;
    height: 42px;
    display: flex;
    justify-content: center;
    align-items: center;
}

.menu-page-box {
    width: 280px;
    height: 157.5px;
    background-color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
}

.menu-cell-box {
    width: 200px;
    height: 112.5px;
    /* Rectangle 11: */
    background: #FFFFFF;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.15);
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
        width: 40px;
    }
}

.page-out-box {
    width: 240px;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    outline: none;
}

.page-box-inner-index-left {
    width: 32px;
    height: 112.5px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.page-mid-box {
    width: 192px;
    height: 112.5px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    margin-right: 6px;
    margin-left: 6px;
}

.page-box {
    width: 208px;
    height: 156px;
    background-color: #F4F4F4;
    border-radius: 4px;
    cursor: pointer;
    border-width: 1px;
    border-style: solid;
    border: 1px solid #F4F4F4;
    &.active {
        border-color: #71C3FC;
    }
}

.page-box-under {
    width: 100%;
    height: 22px;
    margin-bottom: 22px;
    margin-top: 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.page-box-under-left {
    margin-left: 16px;
    font-size: 14px;
    color: #212324;
    opacity: 0.6;
}

.page-box-under-right {
    margin-right: 16px;
    width: 22px;
    height: 22px;
    border-radius: 2px;
    cursor: pointer;

    &:hover {
        background: rgba(33, 35, 36, 0.1);
    }
}

.preview-cells-box {
    height: calc(100vh - 62px);
}

.page-box-inner-index-right {
    width: 20px;
    height: 112.5px;
}

.page-box-inner-index-delete {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border-radius: 50%;
}

.page-box-inner-index-delete-box {
    width: 24px;
    height: 24px;
}

.page-box-close {
    width: 24px;
    height: 24px;
    background-color: white;
    border-radius: 50%;
    position: absolute;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.15);
    display: flex;
    justify-content: center;
    align-items: center;
    margin-left: 182px;
    margin-top: -10px;
}
</style>