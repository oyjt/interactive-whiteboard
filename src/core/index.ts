import { fabric } from "fabric";
import {
  Canvas as ICanvas,
  Image as IImage,
  Object as IObject,
  ILineOptions,
  IImageOptions,
  IRectOptions,
  ICircleOptions,
  ITextOptions,
  IEllipseOptions,
  IEvent,
  ICanvasOptions,
  ITriangleOptions,
  Circle,
  Ellipse,
  Line,
} from "fabric/fabric-impl";
import EventEmitter from "@/utils/emitter";
import Arrow from "./objects/Arrow";
import initHotKeys from "./initHotKeys";
import initControls from "./initControls";
import initControlsRotate from "./initControlsRotate";
/**
 * fabri方法封装
 * 使用示例：
 * const canvas = new FabricCanvas('canvas');
 *
 * // 绘制线条
 * canvas.drawLine(10, 10, 100, 100, { stroke: 'red', strokeWidth: 2 });
 *
 * // 绘制箭头
 * canvas.drawArrow(10, 50, 100, 50, { stroke: 'blue', strokeWidth: 2 });
 *
 * // 绘制矩形
 * canvas.drawRect({ left: 50, top: 150, width: 100, height: 50, fill: 'green', stroke: 'black' });
 *
 * // 绘制圆形
 * canvas.drawCircle({ left: 200, top: 100, radius: 50, fill: 'yellow', stroke: 'black' });
 *
 * // 绘制文本
 * canvas.drawText('Hello World!', { left: 50, top: 250, fontSize: 24, fill: 'red' })
 *
 * // 插入图片
 * canvas.insertImage('https://picsum.photos/200', { left: 50, top: 150, scaleX: 0.5, scaleY: 0.5 });
 *
 * // 橡皮擦
 * canvas.erase({ width: 10 });
 *
 * // 画笔
 * canvas.drawFreeDraw();
 */

interface FabricEvents {
  "object:added": IEvent;
  "object:modified": IEvent;
  "object:removed": IEvent;
  "mouse:down": IEvent;
  "mouse:move": IEvent;
  "mouse:up": IEvent;
  "after:render": IEvent;
  [key: string | symbol]: IEvent | any | undefined;
}

// 定义绘图工具类型
export type DrawingTool =
  | "rectangle"
  | "triangle"
  | "circle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "pencil"
  | "select"
  | "eraser"
  | "";

interface ShapeOptions {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
}

interface IJson {
  version: string;
  objects: IObject[];
}

class FabricCanvas extends EventEmitter<FabricEvents> {
  private canvas: ICanvas;
  private currentShape: IObject | null = null;
  private drawingTool: DrawingTool = "";
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private options: ShapeOptions = {
    stroke: "#ff0000",
    strokeWidth: 5,
    fill: "transparent",
    opacity: 1,
  };
  private images: string[] = [];
  private curImageIndex = 0;

  constructor(canvasId: string) {
    super();

    this.canvas = new fabric.Canvas(canvasId, {
      isDrawingMode: true,
      selection: false,
      includeDefaultValues: false, // 转换成json对象，不包含默认值
    });
    this.setDrawingTool("pencil");

    initHotKeys(this.canvas, this);
    initControls(this.canvas);
    initControlsRotate(this.canvas);
    this.initEvent();
  }

  // 获取画布
  public getCanvas(): ICanvas {
    return this.canvas;
  }

  // 清空画布
  public clearCanvas() {
    this.canvas.clear();
  }

  // 设置画布背景颜色
  public setBackgroundColor(color: string): void {
    this.canvas.setBackgroundColor(color, () => {
      this.canvas.renderAll();
    });
  }

  // 设置画布背景图片（居中显示）
  public setBackgroundImage(imageUrl: string, options?: IImageOptions): void {
    fabric.Image.fromURL(imageUrl, (image: IImage) => {
      // 计算图片居中的位置
      const canvasWidth = this.canvas.getWidth();
      const canvasHeight = this.canvas.getHeight();
      // 图片高度充满画布，宽度等比缩放
      const scale = canvasHeight / (image.height as number);
      const imageWidth = (image.width as number) * scale;

      image.set({
        scaleX: scale,
        scaleY: scale,
        top: 0,
        left: (canvasWidth - imageWidth) / 2,
      });
      this.canvas.setBackgroundImage(
        image,
        () => {
          this.canvas.renderAll();
        },
        options
      );
    });
  }

  public addObject(object: IObject): void {
    this.canvas.add(object);
  }

  public removeObject(object: IObject): void {
    this.canvas.remove(object);
  }

  // 移除所有对象
  public removeAllObject() {
    this.canvas.getObjects().forEach((obj) => {
      this.canvas.remove(obj);
    });
  }

  public getObjects(): IObject[] {
    return this.canvas.getObjects();
  }

  public getActiveObject(): IObject | undefined | null {
    return this.canvas.getActiveObject();
  }

  public setActiveObject(object: IObject): void {
    this.canvas.setActiveObject(object);
  }

  public setWidth(value: number | string): void {
    this.canvas.setWidth(value);
  }

  public setHeight(value: number | string): void {
    this.canvas.setHeight(value);
  }

  // 设置绘图工具
  public setDrawingTool(tool: DrawingTool) {
    if (this.drawingTool === tool) return;
    // this.canvas.off('mouse:down');
    // this.canvas.off('mouse:move');
    // this.canvas.off('mouse:up');
    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;

    this.drawingTool = tool;
    if (tool === "pencil") {
      this.drawFreeDraw();
    } else if (tool === "eraser") {
      this.eraser();
    } else if (tool === "select") {
      this.canvas.selection = true;
      this.canvas.defaultCursor = "auto";
    }
  }

  public setOptions(options: ShapeOptions) {
    this.options = { ...this.options, ...options };
  }

  // 绘制矩形
  public drawRect(options: IRectOptions): void {
    const rect = new fabric.Rect({ ...this.options, ...options });
    this.canvas.add(rect);
    this.currentShape = rect;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(rect);
  }

  // 绘制三角形
  public drawTriangle(options: ITriangleOptions): void {
    const triangle = new fabric.Triangle({ ...this.options, ...options });
    this.canvas.add(triangle);
    this.currentShape = triangle;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(triangle);
  }

  // 绘制圆形
  public drawCircle(options: ICircleOptions): void {
    const circle = new fabric.Circle({ ...this.options, ...options });
    this.canvas.add(circle);
    this.currentShape = circle;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(circle);
  }

  // 绘制椭圆
  public drawEllipse(options: IEllipseOptions): void {
    const ellipse = new fabric.Ellipse({ ...this.options, ...options });
    this.canvas.add(ellipse);
    this.currentShape = ellipse;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(ellipse);
  }

  // 绘制线条
  public drawLine(x1: number, y1: number, x2: number, y2: number, options?: ILineOptions): void {
    const line = new fabric.Line([x1, y1, x2, y2], { ...this.options, ...options });
    this.canvas.add(line);
    this.currentShape = line;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(line);
  }

  // 绘制箭头
  public drawArrow(x1: number, y1: number, x2: number, y2: number, options?: ILineOptions): void {
    const arrow = new Arrow([x1, y1, x2, y2], { ...this.options, ...options });
    this.canvas.add(arrow);
    this.currentShape = arrow;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(arrow);
  }

  // 自由绘制
  public drawFreeDraw() {
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
    this.canvas.freeDrawingBrush.color = "#ff0000";
    this.canvas.freeDrawingBrush.width = 5;
    this.canvas.freeDrawingCursor = "default";
    this.canvas.isDrawingMode = true;
  }

  // 绘制文本
  public drawText(text: string, options?: ITextOptions): void {
    const textObj = new fabric.IText(text, {
      fontSize: 18,
      fill: "#ff0000",
      editingBorderColor: "#ff0000",
      padding: 5,
      ...options,
    });
    this.canvas.add(textObj);
    this.canvas.defaultCursor = "text";
    this.currentShape = textObj;
    // 文本打开编辑模式
    textObj.enterEditing();
    // textObj.exitEditing();
    // 文本编辑框获取焦点
    textObj.hiddenTextarea.focus();
    this.setActiveObject(textObj);
  }

  // 插入图片
  public insertImage(url: string, options?: IImageOptions): void {
    fabric.Image.fromURL(url, (img: IImage) => {
      if (options) {
        img.set(options);
      } else {
        // 计算图片居中的位置
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        const imageWidth = (img.width as number) * (img.scaleX as number);
        const imageHeight = (img.height as number) * (img.scaleY as number);
        const left = (canvasWidth - imageWidth) / 2;
        const top = (canvasHeight - imageHeight) / 2;
        img.set({ left, top });
      }
      this.canvas.add(img);
    });
  }

  // 插入ppt图片
  public insertPPT(urls: string[]): void {
    this.images = urls;
    this.setCurrentScense(0);
    this.emit("insert:images", urls);
  }

  // 设置当前显示ppt图片
  public setCurrentScense(index: number): void {
    this.curImageIndex = index;
    this.setBackgroundImage(this.images[this.curImageIndex]);
    this.emit("current:image", index);
  }

  // 橡皮擦(IEraserBrushOptions)
  public eraser(options?: any): void {
    this.canvas.freeDrawingBrush = new fabric.EraserBrush(this.canvas, options);
    this.canvas.freeDrawingBrush.width = 10;
    this.canvas.freeDrawingCursor = "default";
    this.canvas.isDrawingMode = true;
    // 删除单个对象或者一组对象
    this.canvas.on("erasing:end", (options: any) => {
      options.targets.forEach((obj: IObject) => obj.group?.removeWithUpdate(obj) || this.canvas.remove(obj));
    });
    this.canvas.renderAll();
  }

  // 初始化事件
  private initEvent() {
    // 绑定添加对象事件，将当前画布状态保存到撤销栈中
    this.canvas.on("object:added", (e: any) => {
      this.emit("object:added", e);
    });

    this.canvas.on("object:modified", (e: any) => {
      this.emit("object:modified", e);
    });

    this.canvas.on("object:removed", (e) => {
      this.emit("object:removed", e);
    });

    // 画布重绘后同步到远程
    this.canvas.on("after:render", (e) => {
      this.emit("after:render", e);
    });

    // 监听鼠标事件
    this.canvas.on("mouse:down", this.onMouseDown.bind(this));
    this.canvas.on("mouse:move", this.onMouseMove.bind(this));
    this.canvas.on("mouse:up", this.onMouseUp.bind(this));
  }

  // 鼠标按下事件处理函数
  private onMouseDown(event: IEvent) {
    // 如果当前有活动的元素则不添加
    const activeObject = this.canvas.getActiveObject();
    if (!event.pointer || activeObject) return;
    this.isDrawing = true;
    const { x, y } = event.pointer;
    this.startX = x;
    this.startY = y;

    switch (this.drawingTool) {
      case "rectangle":
        this.drawRect({
          left: x,
          top: y,
          width: 0,
          height: 0,
        });
        break;
      case "triangle":
        this.drawTriangle({
          left: x,
          top: y,
          width: 0,
          height: 0,
        });
        break;
      case "circle":
        this.drawCircle({
          left: x,
          top: y,
          radius: 0,
        });
        break;
      case "ellipse":
        this.drawEllipse({
          left: x,
          top: y,
          rx: 0,
          ry: 0,
        });
        break;
      case "line":
        this.drawLine(x, y, x, y);
        break;
      case "arrow":
        this.drawArrow(x, y, x, y);
        break;
      case "text":
        this.drawText("", { left: x, top: y });
        break;
      default:
        break;
    }
  }

  // 鼠标移动事件处理函数
  private onMouseMove(event: IEvent) {
    if (!this.isDrawing || !event.pointer || !this.currentShape) {
      return;
    }

    const { x, y } = event.pointer;
    const width = Math.abs(x - this.startX);
    const height = Math.abs(y - this.startY);

    switch (this.drawingTool) {
      case "rectangle":
        this.currentShape.set({
          width,
          height,
        });
        break;
      case "triangle":
        this.currentShape.set({
          width,
          height,
        });
        break;
      case "circle":
        const radius = Math.sqrt(width * width + height * height) / 2;
        (this.currentShape as Circle).set({
          radius,
        });
        break;
      case "ellipse":
        (this.currentShape as Ellipse).set({
          rx: Math.abs(width / 2),
          ry: Math.abs(height / 2),
        });
        break;
      case "line":
        (this.currentShape as Line).set({
          x2: x,
          y2: y,
        });
        break;
      case "arrow":
        (this.currentShape as Arrow).set({
          x2: x,
          y2: y,
        });
        break;
      default:
        break;
    }
    // 更新边界信息
    this.currentShape.setCoords();
    // 重新渲染
    this.canvas.renderAll();
  }

  // 鼠标抬起事件处理函数
  private onMouseUp() {
    this.isDrawing = false;
    this.currentShape = null;
    this.emit("mouse:up", null);
  }

  public toDataURL(options?: ICanvasOptions) {
    return this.canvas.toDataURL(options);
  }

  public toJSON() {
    return this.canvas.toJSON();
  }

  public loadFromJSON(json: any, callback: Function, reviver?: Function): ICanvas {
    return this.canvas.loadFromJSON(json, callback, reviver);
  }

  public renderAll(): ICanvas {
    return this.canvas.renderAll();
  }

  /**
   * 缩放（以画布中心点放大）
   * @param ratio 缩放比例（0~1）
   */
  public zoom(ratio: number = 1) {
    // 计算缩放中心
    const point = new fabric.Point((this.canvas.width as number) / 2, (this.canvas.height as number) / 2);
    this.canvas.zoomToPoint(point, ratio);
  }

  // 获取缩放比率
  public getZoom(): number {
    return this.canvas.getZoom();
  }

  // 放大（以画布中心点放大）
  public zoomIn() {
    this.zoom(this.canvas.getZoom() * 1.1);
  }

  // 缩小（以画布中心点缩小）
  public zoomOut() {
    this.zoom(this.canvas.getZoom() / 1.1);
  }

  // 销毁事件监听
  public destroy() {
    this.removeAllListeners();
    // 销毁画布
    // this.canvas.removeListeners();
    this.canvas.dispose();
  }
}

export default FabricCanvas;
