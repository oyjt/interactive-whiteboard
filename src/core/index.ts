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
  Triangle,
  Rect,
  Circle,
  Ellipse,
  Line,
} from "fabric/fabric-impl";
import EventEmitter from "@/utils/emitter";
import Arrow from "./objects/Arrow";
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
 * canvas.drawRect(50, 150, 100, 50, { fill: 'green', stroke: 'black' });
 *
 * // 绘制圆形
 * canvas.drawCircle(200, 100, 50, { fill: 'yellow', stroke: 'black' });
 *
 * / 绘制文本
 * canvas.drawText('Hello World!', 50, 250, { fontSize: 24, fill: 'red' });
 *
 * // 插入图片
 * canvas.insertImage('https://picsum.photos/200', { left: 50, top: 150, scaleX: 0.5, scaleY: 0.5 });
 *
 * // 橡皮擦
 * canvas.erase({ width: 10, color: 'white' });
 *
 * // 画笔
 * canvas.draw({ width: 5, color: 'green' });
 *
 * // 撤销
 * canvas.undo();
 *
 * // 重做
 * canvas.redo();
 */

interface FabricEvents {
  "object:added": IEvent;
  "object:modified": IEvent;
  "object:removed": IEvent;
  "mouse:down": IEvent;
  "mouse:move": IEvent;
  "mouse:up": IEvent;
  "after:render": IEvent;
  [key: string | symbol]: IEvent | undefined;
}

export enum ShapeType {
  RECTANGLE = "rectangle",
  TRIANGLE = "triangle",
  CIRCLE = "circle",
  ELLIPSE = "ellipse",
  LINE = "line",
  ARROW = "arrow",
  FREE_DRAW = "free_draw",
}

// 定义绘图工具类型
type DrawingTool =
  | "rectangle"
  | "triangle"
  | "circle"
  | "ellipse"
  | "line"
  | "arrow"
  | "text"
  | "pencil"
  | "select"
  | "erase"
  | "";

interface ShapeOptions {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
}

class FabricCanvas extends EventEmitter<FabricEvents> {
  private canvas: ICanvas;
  private undoStack: IObject[] = [];
  private redoStack: IObject[] = [];
  private currentShape: IObject | null = null;
  private drawingTool: DrawingTool = "";
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private options: ShapeOptions = {
    stroke: "#ff0000",
    strokeWidth: 2,
    fill: "transparent",
    opacity: 1,
  };

  constructor(canvasId: string) {
    super();

    this.canvas = new fabric.Canvas(canvasId, {
      isDrawingMode: true,
      selection: false,
    });
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

  // 设置画布背景图片
  public setBackgroundImage(imageUrl: string, options?: IImageOptions): void {
    fabric.Image.fromURL(imageUrl, (image: IImage) => {
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

  public getObjects(): IObject[] {
    return this.canvas.getObjects();
  }

  public getActiveObject(): IObject | undefined | null {
    return this.canvas.getActiveObject();
  }

  public setActiveObject(object: IObject): void {
    this.canvas.setActiveObject(object);
  }

  // 设置绘图工具
  public setDrawingTool(tool: DrawingTool) {
    // this.canvas.off('mouse:down');
    // this.canvas.off('mouse:move');
    // this.canvas.off('mouse:up');
    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;
    this.drawingTool = tool;
    if (tool === "pencil") {
      this.drawFreeDraw();
    } else if (tool === "erase") {
      this.erase();
    } else if (tool === "select") {
      this.canvas.selection = true;
    }
  }

  // public setShapeType = (type: ShapeType) => {
  //   this.shapeType = type;
  // };

  public setOptions = (options: ShapeOptions) => {
    this.options = { ...this.options, ...options };
  };

  // 绘制矩形
  public drawRect(options: IRectOptions): void {
    const rect = new fabric.Rect({ ...this.options, ...options });
    this.canvas.add(rect);
    this.currentShape = rect;
    // this.setActiveObject(rect);
  }

  // 绘制三角形
  public drawTriangle(options: ITriangleOptions): void {
    const triangle = new fabric.Triangle({ ...this.options, ...options });
    this.canvas.add(triangle);
    this.currentShape = triangle;
    // this.setActiveObject(triangle);
  }

  // 绘制圆形
  public drawCircle(options: ICircleOptions): void {
    const circle = new fabric.Circle({ ...this.options, ...options });
    this.canvas.add(circle);
    // this.setActiveObject(circle);
  }

  // 绘制椭圆
  public drawEllipse(options: IEllipseOptions): void {
    const ellipse = new fabric.Ellipse({ ...this.options, ...options });
    this.canvas.add(ellipse);
    // this.setActiveObject(ellipse);
  }

  // 绘制线条
  public drawLine(x1: number, y1: number, x2: number, y2: number, options?: ILineOptions): void {
    const line = new fabric.Line([x1, y1, x2, y2], { ...this.options, ...options });
    this.canvas.add(line);
    // this.setActiveObject(line);
  }

  // 绘制箭头
  public drawArrow(x1: number, y1: number, x2: number, y2: number, options?: ILineOptions): void {
    const arrow = new Arrow([x1, y1, x2, y2], { ...this.options, ...options });
    this.canvas.add(arrow);
    // this.setActiveObject(arrow);
  }

  // 自由绘制
  public drawFreeDraw(options?: any) {
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas, { ...this.options, ...options });
    this.canvas.isDrawingMode = true;
  }

  // 绘制文本
  public drawText(text: string, options?: ITextOptions): void {
    const textObj = new fabric.IText(text, {fontSize: 14, fill:'black', ...this.options, ...options });
    this.canvas.add(textObj);
    // this.setActiveObject(textObj)
    textObj.enterEditing();
    textObj.selectAll();
  }

  // 插入图片
  public insertImage(url: string, options?: IImageOptions): void {
    fabric.Image.fromURL(url, (img: IImage) => {
      options && img.set(options);
      this.canvas.add(img);
    });
  }

  // 橡皮擦(IEraserBrushOptions)
  public erase(options?: any): void {
    this.canvas.freeDrawingBrush = new fabric.EraserBrush(this.canvas, options);
    this.canvas.isDrawingMode = true;
  }

  // 撤销
  public undo(): void {
    const object = this.undoStack.pop();
    if (object) {
      this.redoStack.push(object);
      this.canvas.remove(object);
      // this.emit('undo', object);
    }
  }

  // 重做
  public redo(): void {
    const object = this.redoStack.pop();
    if (object) {
      this.undoStack.push(object);
      this.canvas.add(object);
      // this.emitter.emit('redo', object);
    }
  }

  // 初始化事件
  private initEvent() {
    // 绑定添加对象事件，将当前画布状态保存到撤销栈中
    this.canvas.on("object:added", (e: any) => {
      this.undoStack.push(e.target);
      // this.redoStack = [];
      this.emit("object:added", e);
    });

    this.canvas.on("object:modified", (e: any) => {
      // undoStack.push(this.canvas.toJSON());
      this.undoStack.push(e.target);
      // this.redoStack = [];
      this.emit("object:modified", e);
    });

    this.canvas.on("object:removed", (e) => {
      // undoStack.push(this.canvas.toJSON());
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

    // 绑定按键事件，实现撤销和重做
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "z") {
        this.undo();
      } else if (event.ctrlKey && event.key === "y") {
        this.redo();
      }
    });
  }

  // 鼠标按下事件处理函数
  private onMouseDown(event: IEvent) {
    if (!event.pointer) return;
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
        this.drawText('Hello World !', {left: x, top: y})
        break;
      default:
        break;
    }
  }

  // 鼠标移动事件处理函数
  private onMouseMove(event: IEvent) {
    if (!this.isDrawing || !event.pointer) {
      return;
    }

    const { x, y } = event.pointer;
    const width = x - this.startX;
    const height = y - this.startY;

    switch (this.drawingTool) {
      case "rectangle":
        if (this.currentShape) {
          this.currentShape.set({
            width,
            height,
          });
        }
        break;
      case "triangle":
        if (this.currentShape) {
          this.currentShape.set({
            width,
            height,
          });
        }
        break;
      case "circle":
        if (this.currentShape) {
          const radius = Math.sqrt(width * width + height * height) / 2;
          console.log("半径", radius);
          (this.currentShape as Circle).set({
            radius,
          });
        }
        break;
      case "ellipse":
        if (this.currentShape) {
          (this.currentShape as Ellipse).set({
            rx: Math.abs(width / 2),
            ry: Math.abs(height / 2),
          });
        }
        break;
      case "line":
        if (this.currentShape) {
          (this.currentShape as Line).set({
            x2: x,
            y2: y,
          });
        }
        break;
      default:
        break;
    }

    this.canvas.renderAll();
  }

  // 鼠标抬起事件处理函数
  private onMouseUp() {
    this.isDrawing = false;
    this.currentShape = null;
  }

  public toDataURL(options?: ICanvasOptions) {
    return this.canvas.toDataURL(options);
  }

  public toJSON() {
    return this.canvas.toJSON();
  }

  public set isDrawingMode(value: boolean | undefined) {
    this.canvas.isDrawingMode = value;
  }

  public get isDrawingMode(): boolean | undefined {
    return this.canvas.isDrawingMode;
  }

  public get selection() {
    return this.canvas.getActiveObject();
  }

  public set selection(object: IObject | null) {
    if (object) {
      this.setActiveObject(object);
    } else {
      this.canvas.discardActiveObject();
    }
  }

  /**
   * 缩放
   * @param ratio 缩放比例（0~1）
   */
  public zoom(ratio: number) {
    this.canvas.setZoom(ratio);
  }

  // 放大
  public zoomIn() {
    this.canvas.setZoom(this.canvas.getZoom() * 1.1);
  }

  // 缩小
  public zoomOut() {
    this.canvas.setZoom(this.canvas.getZoom() / 1.1);
  }

  // 销毁事件监听
  public destroy() {
    this.canvas.removeListeners();
    document.removeEventListener("keydown", this.undo);
    this.removeAllListeners();
  }
}

export default FabricCanvas;
