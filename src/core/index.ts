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
import { SnapshotHistory } from "./history";
import { normalizeBrushSettings, readBrushSettings, saveBrushSettings, type BrushSettings } from "./brushSettings";
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

// Persist eraser eligibility across undo, cloning and page changes.
FabricObject.customProperties = [...new Set([...FabricObject.customProperties, "erasable"])];

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
  private settings = readBrushSettings();
  private history!: SnapshotHistory;
  private pageHistories: Array<SnapshotHistory | undefined> = [];
  private busy = false;
  private disposed = false;
  private abortController = new AbortController();
  private commitTimer?: ReturnType<typeof setTimeout>;
  private cleanupHotkeys: () => void = () => {};

  public getBrushSettings() { return { ...this.settings }; }
  public getDrawingTool() { return this.drawingTool; }
  public getScenes() { return [...this.images]; }
  public getCurrentScene() { return this.curImageIndex; }
  public getHistoryState() {
    return { canUndo: !this.busy && this.history.canUndo, canRedo: !this.busy && this.history.canRedo, busy: this.busy };
  }

  public setBrushSettings(settings: BrushSettings) {
    this.settings = normalizeBrushSettings(settings);
    this.options.stroke = this.settings.color;
    this.options.strokeWidth = this.settings.width;
    if (this.canvas.freeDrawingBrush) {
      if (this.drawingTool === "pencil") {
        this.canvas.freeDrawingBrush.color = this.settings.color;
        this.canvas.freeDrawingBrush.width = this.settings.width;
      } else if (this.drawingTool === "eraser") {
        this.canvas.freeDrawingBrush.width = this.settings.eraserWidth;
      }
    }
    saveBrushSettings(this.settings);
    this.emit("settings:changed", this.getBrushSettings());
  }

  private publishHistory() { this.emit("history:changed", this.getHistoryState()); }

  private setBusy(busy: boolean) {
    this.busy = busy;
    if (this.disposed) return;
    this.canvas.wrapperEl.style.pointerEvents = busy ? "none" : "";
    this.publishHistory();
  }

  private scheduleCommit() {
    if (this.busy || this.disposed) return;
    clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => this.commit(), 0);
  }

  public commit() {
    clearTimeout(this.commitTimer);
    if (this.busy || this.disposed || this.isDrawing) return;
    if (this.history.push(JSON.stringify(this.toJSON()))) {
      this.publishHistory();
      this.emit("content:changed", this.toJSON());
    }
  }

  public async undo() { await this.restoreHistory(-1); }
  public async redo() { await this.restoreHistory(1); }

  private async restoreHistory(direction: -1 | 1) {
    if (this.busy || this.disposed) return;
    this.finishEditing();
    this.commit();
    const state = this.history.peek(direction);
    if (state === undefined) return;
    this.setBusy(true);
    try {
      await this.canvas.loadFromJSON(state, undefined, { signal: this.abortController.signal });
      if (this.disposed) return;
      this.history.move(direction);
      this.canvas.requestRenderAll();
      this.emit("content:changed", this.toJSON());
    } catch {
      if (this.disposed) return;
      await this.canvas.loadFromJSON(this.history.current, undefined, { signal: this.abortController.signal }).catch(() => {});
      this.canvas.requestRenderAll();
      this.emit("error", "恢复画布失败，请重试。");
    } finally { this.setBusy(false); }
  }

  private finishEditing() {
    const active = this.canvas.getActiveObject();
    if (active instanceof IText && active.isEditing) active.exitEditing();
  }

  constructor(canvasId: string) {
    super();

    this.canvas = new Canvas(canvasId, {
      isDrawingMode: true,
      selection: false,
      includeDefaultValues: false, // 转换成json对象，不包含默认值
    });
    this.options.stroke = this.settings.color;
    this.options.strokeWidth = this.settings.width;
    this.setDrawingTool("pencil");
    this.history = new SnapshotHistory(JSON.stringify(this.toJSON()));

    // 初始化热键、控件扩展
    this.cleanupHotkeys = initHotKeys(this.canvas, {
      changed: () => this.commit(),
      undo: () => this.undo(), redo: () => this.redo(),
      isBusy: () => this.busy || this.disposed,
      error: () => this.emit("error", "复制或粘贴失败，请重试。"),
    });
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
    if (this.busy || this.disposed) return;
    this.finishEditing();
    this.canvas.discardActiveObject();
    this.canvas.remove(...this.canvas.getObjects());
    this.canvas.requestRenderAll();
    this.commit();
  }

  // 设置画布背景颜色
  public setBackgroundColor(color: string): void {
    if (this.busy || this.disposed) return;
    this.canvas.backgroundColor = color;
    this.canvas.requestRenderAll();
    this.scheduleCommit();
  }

  // 设置画布背景图片（居中显示）
  public async setBackgroundImage(imageUrl: string, options?: TOptions<ImageProps>): Promise<void> {
    const img = await FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous", signal: this.abortController.signal });
    if (this.disposed) return;
    {
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
      this.canvas.requestRenderAll();
      this.scheduleCommit();
    }
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
    if (this.busy || this.drawingTool === tool) return;
    this.finishEditing();
    this.canvas.discardActiveObject();

    // 关闭画布的 isDrawingMode，以及清理自由画笔 state
    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;
    this.canvas.defaultCursor = "default";

    this.drawingTool = tool;
    this.emit("tool:changed", tool);
    if (tool === "pencil") {
      this.drawFreeDraw();
    } else if (tool === "eraser") {
      this.eraser();
    } else if (tool === "select") {
      this.canvas.selection = true;
      this.canvas.defaultCursor = "auto";
    } else if(tool === "text") {
      // 退出文本编辑模式
      const activeObject = this.canvas.getActiveObject();
      if (activeObject instanceof IText && activeObject.isEditing) {
        activeObject.exitEditing();
      }
    } else {
      this.canvas.defaultCursor = "crosshair";
    }
  }

  public setOptions(options: ShapeOptions) {
    this.options = { ...this.options, ...options };
    this.setBrushSettings({ ...this.settings, color: options.stroke ?? this.settings.color, width: options.strokeWidth ?? this.settings.width });
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
    // this.setActiveObject(textObj);
    // textObj.enterEditing();
    // 记录当前正在编辑的对象
    this.currentShape = textObj;
  }

  // 插入图片
  public async insertImage(url: string, options?: TOptions<ImageProps>): Promise<void> {
    if (this.busy || this.disposed) return;
    this.setBusy(true);
    try {
      const img = await FabricImage.fromURL(url, { crossOrigin: "anonymous", signal: this.abortController.signal });
      if (this.disposed) return;
      const scale = Math.min(1, this.canvas.width / img.width, this.canvas.height / img.height);
      img.set({ scaleX: scale, scaleY: scale, left: (this.canvas.width - img.width * scale) / 2,
        top: (this.canvas.height - img.height * scale) / 2, erasable: true, ...options });
      this.canvas.add(img);
      this.canvas.requestRenderAll();
    } catch { this.emit("error", "图片加载失败，请检查地址及跨域设置。"); }
    finally { this.setBusy(false); }
    this.commit();
  }

  // A page owns its snapshot history; switching pages cannot mix annotations.
  public async insertPPT(urls: string[]): Promise<void> {
    if (this.busy || this.disposed || !urls.length) return;
    // Reopening the built-in deck must not erase annotations.
    if (this.images.length) return;
    this.images = [...urls];
    this.pageHistories = [];
    this.emit("insert:images", this.getScenes());
    await this.setCurrentScene(0);
  }

  public async setCurrentScene(index: number): Promise<void> {
    if (this.busy || this.disposed || index < 0 || index >= this.images.length) return;
    if (index === this.curImageIndex && this.pageHistories[index]) return;
    this.finishEditing();
    this.commit();
    this.setBusy(true);
    const previous = JSON.stringify(this.toJSON());
    try {
      const saved = this.pageHistories[index];
      if (saved) {
        await this.canvas.loadFromJSON(saved.current, undefined, { signal: this.abortController.signal });
      } else {
        // Load the background before replacing content so a failed image keeps the old page.
        const img = await FabricImage.fromURL(this.images[index], { crossOrigin: "anonymous", signal: this.abortController.signal });
        if (this.disposed) return;
        const scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height);
        img.set({ scaleX: scale, scaleY: scale, left: (this.canvas.width - img.width * scale) / 2,
          top: (this.canvas.height - img.height * scale) / 2, selectable: false, evented: false });
        this.canvas.clear();
        this.canvas.backgroundImage = img;
      }
      if (this.disposed) return;
      this.curImageIndex = index;
      this.history = saved ?? new SnapshotHistory(JSON.stringify(this.toJSON()));
      this.pageHistories[index] = this.history;
      this.canvas.requestRenderAll();
      this.emit("current:image", index);
      this.emit("content:changed", this.toJSON());
    } catch {
      if (this.disposed) return;
      await this.canvas.loadFromJSON(previous, undefined, { signal: this.abortController.signal }).catch(() => {});
      this.canvas.requestRenderAll();
      this.emit("error", "页面加载失败，已保留原页面。");
    } finally { this.setBusy(false); }
  }

  public async removeScene(index: number) {
    if (this.busy || this.disposed || index < 0 || index >= this.images.length) return;
    this.finishEditing();
    this.commit();
    if (index === this.curImageIndex && this.images.length > 1) {
      // Load the replacement first: a network failure must not delete the current page.
      await this.setCurrentScene(index === this.images.length - 1 ? index - 1 : index + 1);
      if (this.curImageIndex === index || this.disposed) return;
    }
    this.images.splice(index, 1);
    this.pageHistories.splice(index, 1);
    if (!this.images.length) {
      this.canvas.clear();
      this.curImageIndex = 0;
      this.history = new SnapshotHistory(JSON.stringify(this.toJSON()));
      this.publishHistory();
      this.emit("content:changed", this.toJSON());
    } else if (index < this.curImageIndex) this.curImageIndex--;
    this.emit("insert:images", this.getScenes());
    this.emit("current:image", this.curImageIndex);
  }

  /** 橡皮擦（使用 @erase2d/fabric EraserBrush） */
  public eraser(options?: { width?: number }): void {
    const eraser = new EraserBrush(this.canvas);
    if (options?.width) eraser.width = options.width;
    else eraser.width = this.settings.eraserWidth;

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
      this.canvas.requestRenderAll();
      this.scheduleCommit();
    });
  }

  // 初始化事件
  private initEvent() {
    this.canvas.on("object:added", () => this.scheduleCommit());
    this.canvas.on("object:removed", () => this.scheduleCommit());
    this.canvas.on("object:modified", () => this.scheduleCommit());
    this.canvas.on("path:created", () => this.scheduleCommit());
    this.canvas.on("text:editing:exited", () => this.scheduleCommit());
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
        this.drawRect({ left: x, top: y, width: 0, height: 0 });
        break;
      case "triangle":
        this.drawTriangle({ left: x, top: y, width: 0, height: 0 });
        break;
      case "circle":
        this.drawCircle({ left: x, top: y, radius: 0 });
        break;
      case "ellipse":
        this.drawEllipse({ left: x, top: y, rx: 0, ry: 0 });
        break;
      case "line":
        this.drawLine(x, y, x, y);
        break;
      case "arrow":
        this.drawArrow(x, y, x, y);
        break;
      case "text":
        this.drawText("", { left: x, top: y, width: 0, height: 0 });
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
        this.currentShape.set({ left, top, width, height });
        break;
      case "circle":
        const radius = Math.sqrt(width * width + height * height) / 2;
        this.currentShape.set({ left, top, radius });
        break;
      case "ellipse":
        this.currentShape.set({ left, top, rx: Math.abs(width / 2), ry: Math.abs(height / 2) });
        break;
      case "line":
      case "arrow":
        this.currentShape.set({ x2: x, y2: y });
        break;
      case "text":
        this.currentShape.set({ left, top, width, height });
        break;
      default:
        break;
    }
    // 更新边界信息
    this.currentShape.setCoords();
    // 重新渲染
    this.canvas.requestRenderAll();
  }

  // 鼠标抬起事件处理函数
  private onMouseUp() {
    // 文本工具拖拽结束处理
    if (this.currentShape && this.drawingTool === "text") {
      // 如果只是点击（拖拽很小）给一个默认大小
      if (this.currentShape.width < 10 && this.currentShape.height < 10) {
        this.currentShape.set({ width: 100, height: 28 }); // 默认大小
      }
      this.canvas.setActiveObject(this.currentShape);
      (this.currentShape as IText).enterEditing();
    }

    this.isDrawing = false;
    this.currentShape = null;
    this.emit("mouse:up", null);
    this.scheduleCommit();
  }

  public toDataURL(options?: TDataUrlOptions) {
    return this.canvas.toDataURL(options);
  }

  public toJSON() {
    return this.canvas.toJSON();
  }

  public async loadFromJSON(json: string | Record<string, unknown>): Promise<void> {
    if (this.busy || this.disposed) return;
    this.setBusy(true);
    try {
      await this.canvas.loadFromJSON(json, undefined, { signal: this.abortController.signal });
      this.canvas.requestRenderAll();
    } finally { this.setBusy(false); }
    this.commit();
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
    this.canvas.zoomToPoint(point, Math.min(4, Math.max(0.25, ratio)));
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
  public async destroy() {
    this.disposed = true;
    this.abortController.abort();
    clearTimeout(this.commitTimer);
    this.cleanupHotkeys();
    this.removeAllListeners();
    await this.canvas.dispose();
  }
}

export default FabricCanvas;
