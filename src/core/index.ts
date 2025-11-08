import {
  Canvas,
  FabricImage,
  ImageProps,
  FabricObject,
  Rect,
  RectProps,
  Triangle,
  Circle,
  CircleProps,
  Ellipse,
  EllipseProps,
  Line,
  PencilBrush,
  IText,
  ITextProps,
  TOptions,
  TDataUrlOptions,
  Point,
  FabricObjectProps,
  ModifiedEvent,
  TPointerEvent,
} from "fabric";
import EventEmitter from "@/utils/emitter";
import Arrow from "./objects/Arrow";
import initHotKeys from "./initHotKeys";
import initControls from "./initControls";
import initControlsRotate from "./initControlsRotate";
import { EraserBrush } from "@erase2d/fabric";
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
  "object:added": any;
  "object:modified": any;
  "object:removed": any;
  "path:created": any;
  "mouse:down": any;
  "mouse:move": any;
  "mouse:up": any;
  "after:render": any;
  [key: string | symbol]: any;
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
  erasable?: boolean;
}

class FabricCanvas extends EventEmitter<FabricEvents> {
  private canvas: Canvas;
  private currentShape: FabricObject | null = null;
  private drawingTool: DrawingTool = "";
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private options: ShapeOptions = {
    stroke: "#ff0000",
    strokeWidth: 5,
    fill: "transparent",
    opacity: 1,
    erasable: true
  };
  private images: string[] = [];
  private curImageIndex = 0;

  constructor(canvasId: string) {
    super();

    this.canvas = new Canvas(canvasId, {
      isDrawingMode: false,
      selection: false,
      includeDefaultValues: false, // 转换成json对象，不包含默认值
    });
    this.setDrawingTool("pencil");

    // 初始化热键、控件扩展
    initHotKeys(this.canvas);
    initControls(this.canvas);
    initControlsRotate(this.canvas);

    // 初始化事件
    this.initEvent();
  }

  // 获取画布
  public getCanvas(): Canvas {
    return this.canvas;
  }

   /** 清空画布 */
  public clearCanvas(): void {
    this.canvas.clear();
  }

  // 设置画布背景颜色
  public setBackgroundColor(color: string): void {
    this.canvas.backgroundColor = color;
    this.canvas.renderAll();
  }

  // 设置画布背景图片（居中显示）
  public setBackgroundImage(imageUrl: string, options?: TOptions<ImageProps>): void {
    FabricImage.fromURL(imageUrl).then((img) => {
      if (!img) return;

      // 计算图片居中的位置
      const canvasWidth = this.canvas.getWidth();
      const canvasHeight = this.canvas.getHeight();
      // 图片高度充满画布，宽度等比缩放
      const scale = canvasHeight / (img.height as number);
      const imageWidth = (img.width as number) * scale;
  
      img.set({
        scaleX: scale,
        scaleY: scale,
        top: 0,
        left: (canvasWidth - imageWidth) / 2,
        originX: "left",
        originY: "top",
        selectable: false,
        evented: false,
        ...options,
      });
  
      this.canvas.backgroundImage = img;
      this.canvas.renderAll();
    })
  }

  public addObject(object: FabricObject): void {
    this.canvas.add(object);
  }

  public removeObject(object: FabricObject): void {
    this.canvas.remove(object);
  }

  // 移除所有对象
  public removeAllObject(): void {
    const objs = this.canvas.getObjects();
    objs.forEach((o) => this.canvas.remove(o));
  }

  public getObjects(): FabricObject[] {
    return this.canvas.getObjects();
  }

  public getActiveObject(): FabricObject | null {
    return this.canvas.getActiveObject() ?? null;
  }

  public setActiveObject(object: FabricObject | null): void {
    if (!object) {
      this.canvas.discardActiveObject();
    } else {
      this.canvas.setActiveObject(object);
    }
  }

  public setWidth(value: number | string): void {
    this.canvas.setWidth(value);
  }

  public setHeight(value: number | string): void {
    this.canvas.setHeight(value);
  }

  // 切换绘制工具
  public setDrawingTool(tool: DrawingTool) {
    if (this.drawingTool === tool) return;
    
    // 关闭画布的 isDrawingMode，以及清理自由画笔 state
    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;
    this.canvas.defaultCursor = "default";

    this.drawingTool = tool;
    if (tool === "pencil") {
      this.drawFreeDraw();
    } else if (tool === "eraser") {
      this.eraser();
    } else if (tool === "select") {
      this.canvas.selection = true;
      this.canvas.defaultCursor = "auto";
    } else {
      this.canvas.defaultCursor = "crosshair";
    }
  }

  public setOptions(options: ShapeOptions) {
    this.options = { ...this.options, ...options };
  }

  // 绘制矩形
  public drawRect(options: TOptions<RectProps>): void {
    const rect = new Rect({ ...this.options, ...options });
    this.canvas.add(rect);
    this.currentShape = rect;
  }

  // 绘制三角形
  public drawTriangle(options: TOptions<FabricObjectProps>): void {
    const triangle = new Triangle({ ...this.options, ...options });
    this.canvas.add(triangle);
    this.currentShape = triangle;
  }

  // 绘制圆形
  public drawCircle(options: TOptions<CircleProps>): void {
    const circle = new Circle({ ...this.options, ...options });
    this.canvas.add(circle);
    this.currentShape = circle;
  }

  // 绘制椭圆
  public drawEllipse(options: TOptions<EllipseProps>): void {
    const ellipse = new Ellipse({ ...this.options, ...options });
    this.canvas.add(ellipse);
    this.currentShape = ellipse;
  }

  // 绘制线条
  public drawLine(x1: number, y1: number, x2: number, y2: number, options?: TOptions<FabricObjectProps>): void {
    const line = new Line([x1, y1, x2, y2], { ...this.options, ...options });
    this.canvas.add(line);
    this.currentShape = line;
  }

  // 绘制箭头
  public drawArrow(x1: number, y1: number, x2: number, y2: number, options?: TOptions<FabricObjectProps>): void {
    const arrow = new Arrow([x1, y1, x2, y2], { ...this.options, ...options });
    this.canvas.add(arrow);
    this.currentShape = arrow;
  }

  // 自由绘制
  public drawFreeDraw() {
    const brush = new PencilBrush(this.canvas);
    brush.width = this.options.strokeWidth ?? 5;
    brush.color = this.options.stroke ?? "#ff0000";
    this.canvas.freeDrawingBrush = brush;
    this.canvas.freeDrawingCursor = "default";
    this.canvas.isDrawingMode = true;
  }

  // 绘制文本
  public drawText(text: string, options?: TOptions<ITextProps>): void {
    const textObj = new IText(text, {
      fill: this.options.stroke,
      editingBorderColor: this.options.stroke,
      erasable: this.options.erasable,
      fontSize: 18,
      padding: 5,
      ...options,
    });
    this.canvas.add(textObj);
    this.canvas.defaultCursor = "text";
    // 激活对象并直接进入编辑模式
    this.setActiveObject(textObj);
    textObj.enterEditing();
    // 记录当前正在编辑的对象
    this.currentShape = textObj;
  }

  // 插入图片
  public insertImage(url: string, options?: TOptions<ImageProps>): void {
    FabricImage.fromURL(url).then((img) => {
      if (!img) return;
      if (options) {
        img.set(options);
      } else {
        // 计算图片居中的位置
        const canvasWidth = this.canvas.getWidth();
        const canvasHeight = this.canvas.getHeight();
        const imageWidth = img.width * img.scaleX;
        const imageHeight = img.height * img.scaleY;
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
    this.setCurrentScene(0);
    this.emit("insert:images", urls);
  }

  // 设置当前显示ppt图片
  public setCurrentScene(index: number): void {
    if (index < 0 || index >= this.images.length) return;
    this.curImageIndex = index;
    this.setBackgroundImage(this.images[this.curImageIndex]);
    this.emit("current:image", index);
  }

  /** 橡皮擦（使用 @erase2d/fabric EraserBrush） */
  public eraser(options?: { width?: number }): void {
    const eraser = new EraserBrush(this.canvas);
    if (options?.width) eraser.width = options.width;
    else eraser.width = 10;
   
    this.canvas.freeDrawingBrush = eraser;
    this.canvas.freeDrawingCursor = "default";
    this.canvas.isDrawingMode = true;
    
     eraser.on('end', async (e) => {
      e.preventDefault();
      // 删除
      // eraser.commit(e.detail);
      // 删除单个对象或者一组对象
      const targets = e.detail.targets;
      targets.forEach((obj: FabricObject) => obj.group?.remove(obj) || this.canvas.remove(obj));
    });
  }

  // 初始化事件
  private initEvent() {
    // 绑定添加对象事件，将当前画布状态保存到撤销栈中
    this.canvas.on("object:added", (e: { target: FabricObject }) => {
      this.emit("object:added", e);
    });

    this.canvas.on("object:modified", (e: ModifiedEvent<TPointerEvent>) => {
      this.emit("object:modified", e);
    });

    this.canvas.on("object:removed", (e: { target: FabricObject }) => {
      this.emit("object:removed", e);
    });

    // 画布重绘后同步到远程
    this.canvas.on("after:render", (e: { ctx: CanvasRenderingContext2D }) => {
      this.emit("after:render", e);
    });

    // 监听路径事件
    this.canvas.on("path:created", (e: { path: FabricObject }) => {
      // 设置路径为可擦除
      e.path.set("erasable", this.options.erasable);
      this.emit("path:created", e);
    });

    // 监听鼠标事件
    this.canvas.on("mouse:down", this.onMouseDown.bind(this));
    this.canvas.on("mouse:move", this.onMouseMove.bind(this));
    this.canvas.on("mouse:up", this.onMouseUp.bind(this));
  }

  // 鼠标按下事件处理函数
  private onMouseDown(event: any) {
    // 如果当前有活动的元素则不添加
    const activeObject = this.canvas.getActiveObject();
    if (!event.pointer || activeObject) return;

    const { x, y } = event.pointer;
    this.isDrawing = true;
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
  private onMouseMove(event: any) {
    if (!this.isDrawing || !event.pointer || !this.currentShape) return;

    const { x, y } = event.pointer;
    const left = Math.min(x, this.startX);
    const top = Math.min(y, this.startY);
    const width = Math.abs(x - this.startX);
    const height = Math.abs(y - this.startY);

    // 更新 shape 属性
    switch (this.drawingTool) {
      case "rectangle":
      case "triangle":
        this.currentShape.set({
          left,
          top,
          width,
          height,
        });
        break;
      case "circle":
        const radius = Math.sqrt(width * width + height * height) / 2;
        (this.currentShape as Circle).set({
          left,
          top,
          radius,
        });
        break;
      case "ellipse":
        (this.currentShape as Ellipse).set({
          left,
          top,
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

  public toDataURL(options?: TDataUrlOptions) {
    return this.canvas.toDataURL(options);
  }

  public toJSON() {
    return this.canvas.toJSON();
  }

  public loadFromJSON(json: any, callback?: () => void): void {
    this.canvas.loadFromJSON(json).then(() => {
      this.canvas.requestRenderAll();
      if (typeof callback === "function") callback();
    });
  }

  public renderAll(): void {
    this.canvas.renderAll();
  }

  /**
   * 缩放（以画布中心点放大）
   * @param ratio 缩放比例（0~1）
   */
  public zoom(ratio: number = 1) {
    // 计算缩放中心
    const point = new Point(this.canvas.width / 2, this.canvas.height / 2);
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
    this.canvas.destroy();
  }
}

export default FabricCanvas;
