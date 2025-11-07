import { Canvas,FabricImage, ImageProps, FabricObject, Rect, RectProps, Triangle, CircleProps, Circle, FabricObjectProps, Ellipse, EllipseProps, Line, PencilBrush, FabricText, TextProps, TOptions, TDataUrlOptions, Point, TEvent, TPointerEvent, Textbox, TextboxProps, ITextProps, IText } from "fabric";
import EventEmitter from "@/utils/emitter";
import Arrow from "./objects/Arrow";
import initHotKeys from "./initHotKeys";
import initControls from "./initControls";
import initControlsRotate from "./initControlsRotate";
import { ClippingGroup, EraserBrush } from "@erase2d/fabric";
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

interface IJson {
  version: string;
  objects: FabricObject[];
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
      isDrawingMode: true,
      selection: false,
      includeDefaultValues: false, // 转换成json对象，不包含默认值
    });
    this.setDrawingTool("pencil");

    initHotKeys(this.canvas);
    initControls(this.canvas);
    initControlsRotate(this.canvas);
    this.initEvent();
  }

  // 获取画布
  public getCanvas(): Canvas {
    return this.canvas;
  }

  // 清空画布
  public clearCanvas() {
    this.canvas.clear();
  }

  // 设置画布背景颜色
  public setBackgroundColor(color: string): void {
    this.canvas.backgroundColor = color;
    this.canvas.renderAll();
  }

  // 设置画布背景图片（居中显示）
  public async setBackgroundImage(imageUrl: string, options?: ImageProps): Promise<void> {
    const image = await FabricImage.fromURL(imageUrl);
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

    this.canvas.backgroundImage = image;
    this.canvas.renderAll();
  }

  public addObject(object: FabricObject): void {
    this.canvas.add(object);
  }

  public removeObject(object: FabricObject): void {
    this.canvas.remove(object);
  }

  // 移除所有对象
  public removeAllObject() {
    this.canvas.getObjects().forEach((obj: FabricObject) => {
      this.canvas.remove(obj);
    });
  }

  public getObjects(): FabricObject[] {
    return this.canvas.getObjects();
  }

  public getActiveObject(): FabricObject | undefined | null {
    return this.canvas.getActiveObject();
  }

  public setActiveObject(object: FabricObject): void {
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
  public drawRect(options: TOptions<RectProps>): void {
    const rect = new Rect({ ...this.options, ...options });
    this.canvas.add(rect);
    this.currentShape = rect;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(rect);
  }

  // 绘制三角形
  public drawTriangle(options: TOptions<FabricObjectProps>): void {
    const triangle = new Triangle({ ...this.options, ...options });
    this.canvas.add(triangle);
    this.currentShape = triangle;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(triangle);
  }

  // 绘制圆形
  public drawCircle(options: TOptions<CircleProps>): void {
    const circle = new Circle({ ...this.options, ...options });
    this.canvas.add(circle);
    this.currentShape = circle;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(circle);
  }

  // 绘制椭圆
  public drawEllipse(options: TOptions<EllipseProps>): void {
    const ellipse = new Ellipse({ ...this.options, ...options });
    this.canvas.add(ellipse);
    this.currentShape = ellipse;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(ellipse);
  }

  // 绘制线条
  public drawLine(x1: number, y1: number, x2: number, y2: number, options?: TOptions<FabricObjectProps>): void {
    const line = new Line([x1, y1, x2, y2], { ...this.options, ...options });
    this.canvas.add(line);
    this.currentShape = line;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(line);
  }

  // 绘制箭头
  public drawArrow(x1: number, y1: number, x2: number, y2: number, options?: TOptions<FabricObjectProps>): void {
    const arrow = new Arrow([x1, y1, x2, y2], { ...this.options, ...options });
    this.canvas.add(arrow);
    this.currentShape = arrow;
    this.canvas.defaultCursor = "crosshair";
    // this.setActiveObject(arrow);
  }

  // 自由绘制
  public drawFreeDraw() {
    this.canvas.freeDrawingBrush = new PencilBrush(this.canvas);
    this.canvas.freeDrawingBrush.color = "#ff0000";
    this.canvas.freeDrawingBrush.width = 5;
    this.canvas.freeDrawingCursor = "default";
    this.canvas.isDrawingMode = true;
  }

  // 绘制文本
  public drawText(text: string, options?: TOptions<ITextProps>): void {
    const textObj = new IText(text, {
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
    textObj.exitEditing();
    // 文本编辑框获取焦点
    textObj.hiddenTextarea?.focus();
    this.setActiveObject(textObj);
  }

  // 插入图片
  public insertImage(url: string, options?: TOptions<ImageProps>): void {
    FabricImage.fromURL(url).then((img) => {
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

  // 橡皮擦
  public eraser(options?: any): void {
    const eraser = new EraserBrush(this.canvas);
    eraser.width = 10;
    // 删除单个对象或者一组对象
    eraser.on('end', async (e) => {
      e.preventDefault();

      const targets = e.detail.targets;
      targets.forEach((obj: FabricObject) => obj.group?.remove(obj) || this.canvas.remove(obj));
    });
    this.canvas.freeDrawingBrush = eraser;
    this.canvas.freeDrawingCursor = "default";
    this.canvas.isDrawingMode = true;
    this.canvas.renderAll();
  }

  // 初始化事件
  private initEvent() {
    // 绑定添加对象事件，将当前画布状态保存到撤销栈中
    this.canvas.on("object:added", (e) => {
      this.emit("object:added", e);
    });

    this.canvas.on("object:modified", (e) => {
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
  private onMouseDown(event: any) {
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
  private onMouseMove(event: any) {
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

  public toDataURL(options?: TDataUrlOptions) {
    return this.canvas.toDataURL(options);
  }

  public toJSON() {
    return this.canvas.toJSON();
  }

  public loadFromJSON(json: any, callback: Function): void {
    this.canvas.loadFromJSON(json).then(() => callback);
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
    const point = new Point((this.canvas.width as number) / 2, (this.canvas.height as number) / 2);
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
