<template>
    <div class="tools-wrap">
        <button type="button" @click="undo">撤销</button>
        <button type="button" @click="redo">重做</button>
        <button type="button" @click="chose">选择</button>
        <button type="button" @click="addRect">矩形</button>
        <button type="button" @click="addTriangle">三角形</button>
        <button type="button" @click="addCircle">圆形</button>
        <button type="button" @click="addEllipse">椭圆</button>
        <button type="button" @click="drawingLine(false)">线段</button>
        <button type="button" @click="drawingLine(true)">箭头</button>
        <button type="button" @click="draw">自由画笔</button>
        <button type="button" @click="addText">文字</button>
        <button type="button" @click="addImg">图片</button>
        <button type="button" @click="eraser">橡皮擦</button>
        <button type="button" @click="clear">清空画布</button>
    </div>
</template>
<script setup lang="ts">
import { inject, Ref } from 'vue'
import FabricCanvas from '@/core'

const canvas = inject<Ref<FabricCanvas>>('canvas');

// 撤销
function undo() {
    if(!canvas?.value) return;
    canvas.value.undo();
}

// 重做
function redo() {
    if(!canvas?.value) return;
    canvas.value.redo();
}

// 选择模式
function chose() {
    canvas?.value.setDrawingTool("select")
}
// 自由模式
function draw() {
    canvas?.value.setDrawingTool("pencil")
}
// 添加文字
function addText() {
    canvas?.value.setDrawingTool("text")
}
// 添加图片
function addImg(e: any) {
    canvas?.value.insertImage('http://47.92.172.237/ppt.png')
}
// 画三角形
function addTriangle() {
    canvas?.value.setDrawingTool('triangle')
}
// 画圆
function addCircle() {
    canvas?.value.setDrawingTool("circle")
}
// 画椭圆
function addEllipse() {
    canvas?.value.setDrawingTool("ellipse")
}
// 画矩形
function addRect() {
    canvas?.value.setDrawingTool("rectangle")
}
// 画线
function drawingLine(isArrow: boolean) {
    if(isArrow) {
        canvas?.value.setDrawingTool("arrow")
    } else {
        canvas?.value.setDrawingTool("line")
    }
}
// 橡皮擦
function eraser() {
    canvas?.value.setDrawingTool("erase")
}
// 清空画布
function clear() {
    canvas?.value.clearCanvas()
}
</script>
<style lang="scss" scoped>
.tools-wrap {
    display: flex;
    flex-wrap: wrap;
    width: 800px;
    padding: 10px 0;

    button {
        margin-right: 10px;
        margin-bottom: 10px;
    }
}
</style>