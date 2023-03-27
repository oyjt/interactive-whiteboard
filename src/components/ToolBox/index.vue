<template>
    <div class="tool-mid-box-left">
        <div class="tool-box-cell-box-left"  v-for="item in tools" :key="item.shapeType">
            <div class="tool-box-cell"
                    @click="clickAppliance(item.shapeType)">
                <img :src="item.shapeType === currentShapType ? item.iconActive : item.icon" :alt="item.name"/>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { inject, ref, Ref } from 'vue'
import FabricCanvas, { DrawingTool } from '@/core'
import selector from "./image/selector.svg";
import selectorActive from "./image/selector-active.svg";
import pen from "./image/pencil.svg";
import penActive from "./image/pencil-active.svg";
import text from "./image/text.svg";
import textActive from "./image/text-active.svg";
import eraser from "./image/eraser.svg";
import eraserActive from "./image/eraser-active.svg";
import arrow from "./image/arrow.svg";
import arrowActive from "./image/arrow-active.svg";
import ellipse from "./image/ellipse.svg";
import ellipseActive from "./image/ellipse-active.svg";
import rectangle from "./image/rectangle.svg";
import rectangleActive from "./image/rectangle-active.svg";
import straight from "./image/straight.svg";
import straightActive from "./image/straight-active.svg";
import triangle from "./image/triangle.svg";
import triangleActive from "./image/triangle-active.svg";
import clear from "./image/clear.svg";
import clearActive from "./image/clear-active.svg";

const canvas = inject<Ref<FabricCanvas>>('canvas');

type Appliance = {
    readonly name: string;
    readonly icon: string;
    readonly iconActive: string;
    readonly shapeType: DrawingTool;
};
const tools = ref<Appliance[]>([{
    name: '选择',
    icon: selector,
    iconActive: selectorActive,
    shapeType: "select",
}, {
    name: '笔',
    icon: pen,
    iconActive: penActive,
    shapeType: "pencil",
},{
    name: '文本',
    icon: text,
    iconActive: textActive,
    shapeType: "text",
},{
    name: '橡皮擦',
    icon: eraser,
    iconActive: eraserActive,
    shapeType: "eraser",
},{
    name: '三角形',
    icon: triangle,
    iconActive: triangleActive,
    shapeType: "triangle",
},{
    name: '圆形',
    icon: ellipse,
    iconActive: ellipseActive,
    shapeType: "circle",
},{
    name: '矩形',
    icon: rectangle,
    iconActive: rectangleActive,
    shapeType: "rectangle",
},{
    name: '直线',
    icon: straight,
    iconActive: straightActive,
    shapeType: "line",
},{
    name: '箭头',
    icon: arrow,
    iconActive: arrowActive,
    shapeType: "arrow",
},{
    name: '清屏',
    icon: clear,
    iconActive: clearActive,
    shapeType: "clear",
}])

const currentShapType = ref<string>("pencil")

function clickAppliance(type: DrawingTool) {
    currentShapType.value = type;
    canvas?.value.setDrawingTool(type)
}
</script>
<style lang="scss" scoped>
.tool-mid-box {
  height: 32px;
  display: flex;
  border-radius: 4px;
  justify-content: space-between;
  padding-left: 6px;
  padding-right: 6px;
  background-color: white;
}

.tool-mid-box-left {
  width: 40px;
  display: flex;
  border-radius: 4px;
  background-color: white;
  justify-content: space-between;
  align-items: center;
  flex-direction: column;
  padding-bottom: 4px;
  padding-top: 4px;
  box-shadow:0 8px 24px 0 rgba(0,0,0,0.1);
}

.tool-box-cell {
  width: 24px;
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.tool-box-cell-color {
  width: 14px;
  height: 14px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.24);
}

.tool-box-cell-subscript {
  position: absolute;
  bottom: 0;
  right: 0;
}

.tool-box-cell-box-left {
  width: 32px;
  height: 32px;
  user-select: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 2px;
  &:hover {
    background: rgba(33,35,36,0.1);
  }
}

.tool-box-cell-step-two {
  height: 2px;
  border-radius: 1px;
  margin-top: -4px;
  margin-left: auto;
  margin-right: auto;
}

.tool-box-cell-step-two {
  height: 2px;
  border-radius: 1px;
  margin-top: -4px;
  margin-left: auto;
  margin-right: auto;
}

.palette-box {
  width: 188px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.palette-box-color {
  width: 188px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.stroke-script {
  width: 156px;
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  height: 17px;
}

.stroke-script-text {
  height: 17px;
  font-size: 12px;
  font-family: PingFangSC-Regular, PingFang SC, sans-serif;
  font-weight: 400;
  color: rgba(33, 35, 36, 1);
  line-height: 17px;
}

.draw-tool-box-title {
  width: 100%;
  div {
    font-weight: bold;
    margin-left: 16px;
    margin-top: 8px;
    margin-bottom: 8px;
  }
}

.palette-stroke-under-layer {
  width: 242px;
  height: 32px;
  position: absolute;
  z-index: 1;
}

.palette-stroke-slider-mask {
  width: 290px;
  height: 32px;
  position: absolute;
  z-index: 3;
  display: flex;
  justify-content: center;
}
</style>