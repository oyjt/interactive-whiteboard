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
  Textbox,
  TOptions,
  TDataUrlOptions,
  Point,
  FabricObjectProps,
  ModifiedEvent,
  TPointerEvent,
} from "fabric";
import { SnapshotHistory } from "./history";
import {
  normalizeBrushSettings,
  readBrushSettings,
  saveBrushSettings,
  type BrushSettings,
} from "./brushSettings";
import EventEmitter from "@/utils/emitter";
import Arrow from "./objects/Arrow";
import initHotKeys from "./initHotKeys";
import initControls from "./initControls";
import initControlsRotate from "./initControlsRotate";
const ERASER_TRAIL_MS = 420;
/** 管理 Fabric 画布的绘制、页面快照、历史记录及工具状态。 */

// Persist eraser eligibility across undo, cloning and page changes.
FabricObject.customProperties = [...new Set([...FabricObject.customProperties, "erasable"])];
// Fabric 7 centers objects by default; existing drawing coordinates and snapshots use top-left.
FabricObject.ownDefaults.originX = "left";
FabricObject.ownDefaults.originY = "top";

interface FabricEvents {
  "object:added": any;
  "object:modified": any;
  "object:removed": any;
  "path:created": any;
  "mouse:down": any;
  "mouse:move": any;
  "mouse:up": any;
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
  private textPreview?: HTMLDivElement;
  private textDrag = false;
  private pendingText: IText | Textbox | null = null;
  private erasing = false;
  private erasureTargets = new Map<
    FabricObject,
    Pick<FabricObject, "opacity" | "stroke" | "fill">
  >();
  private eraserTrail?: HTMLCanvasElement;
  private eraserTrailPoints: Array<{ point: Point; time: number }> = [];
  private eraserTrailFrame?: number;
  private options: ShapeOptions = {
    stroke: "#ff0000",
    strokeWidth: 5,
    fill: "transparent",
    opacity: 1,
    erasable: true,
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

  public getBrushSettings() {
    return { ...this.settings };
  }
  public getDrawingTool() {
    return this.drawingTool;
  }
  public getScenes() {
    return [...this.images];
  }
  public getCurrentScene() {
    return this.curImageIndex;
  }
  public getHistoryState() {
    return {
      canUndo: !this.busy && this.history.canUndo,
      canRedo: !this.busy && this.history.canRedo,
      busy: this.busy,
    };
  }

  public setBrushSettings(settings: BrushSettings) {
    this.settings = normalizeBrushSettings(settings);
    this.options.stroke = this.settings.color;
    this.options.strokeWidth = this.settings.width;
    if (this.drawingTool === "pencil" && this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = this.settings.color;
      this.canvas.freeDrawingBrush.width = this.settings.width;
    }
    saveBrushSettings(this.settings);
    this.emit("settings:changed", this.getBrushSettings());
  }

  private publishHistory() {
    this.emit("history:changed", this.getHistoryState());
  }

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

  /** 提交内容快照；仅在内容变化时通知预览与历史记录。 */
  public commit() {
    clearTimeout(this.commitTimer);
    if (this.busy || this.disposed || this.isDrawing || this.pendingText || this.erasing) return;
    if (this.history.push(JSON.stringify(this.toJSON()))) {
      this.publishHistory();
      this.emit("content:changed", this.toJSON());
    }
  }

  public async undo() {
    await this.restoreHistory(-1);
  }
  public async redo() {
    await this.restoreHistory(1);
  }

  /**
   * 按方向恢复当前页面快照，加载失败时回退并保持历史位置。
   * @param direction -1 为撤销，1 为重做。
   */
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
      await this.canvas
        .loadFromJSON(this.history.current, undefined, { signal: this.abortController.signal })
        .catch(() => {});
      this.canvas.requestRenderAll();
      this.emit("error", "恢复画布失败，请重试。");
    } finally {
      this.setBusy(false);
    }
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
      fireMiddleClick: false,
      fireRightClick: false,
    });
    this.options.stroke = this.settings.color;
    this.options.strokeWidth = this.settings.width;
    this.setDrawingTool("pencil");
    this.history = new SnapshotHistory(JSON.stringify(this.toJSON()));

    // 初始化热键、控件扩展
    this.cleanupHotkeys = initHotKeys(this.canvas, {
      changed: () => this.commit(),
      undo: () => this.undo(),
      redo: () => this.redo(),
      isBusy: () => this.busy || this.disposed,
      error: () => this.emit("error", "复制或粘贴失败，请重试。"),
    });
    initControls();
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
    const img = await FabricImage.fromURL(imageUrl, {
      crossOrigin: "anonymous",
      signal: this.abortController.signal,
    });
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

  // 切换绘制工具
  public setDrawingTool(tool: DrawingTool) {
    if (this.busy || this.drawingTool === tool) return;
    this.finishErasing(false);
    this.clearTextPreview();
    if (this.drawingTool === "text" && this.isDrawing) {
      this.isDrawing = false;
      this.textDrag = false;
    }
    this.finishEditing();
    this.canvas.discardActiveObject();

    // 关闭画布的 isDrawingMode，以及清理自由画笔 state
    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;
    this.canvas.skipTargetFind = tool === "eraser" || tool === "text";
    this.canvas.defaultCursor = "default";

    this.drawingTool = tool;
    this.emit("tool:changed", tool);
    if (tool === "pencil") {
      this.drawFreeDraw();
    } else if (tool === "eraser") {
      this.canvas.defaultCursor = "crosshair";
    } else if (tool === "select") {
      this.canvas.selection = true;
      this.canvas.defaultCursor = "auto";
    } else if (tool === "text") {
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
    this.setBrushSettings({
      ...this.settings,
      color: options.stroke ?? this.settings.color,
      width: options.strokeWidth ?? this.settings.width,
    });
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
  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: TOptions<FabricObjectProps>,
  ): void {
    const line = new Line([x1, y1, x2, y2], { ...this.options, ...options });
    this.canvas.add(line);
    this.currentShape = line;
  }

  // 绘制箭头
  public drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: TOptions<FabricObjectProps>,
  ): void {
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
      fontSize: this.settings.fontSize,
      ...options,
    });
    this.canvas.add(textObj);
    this.canvas.defaultCursor = "text";
    this.currentShape = textObj;
  }

  // 插入图片
  public async insertImage(url: string, options?: TOptions<ImageProps>): Promise<void> {
    if (this.busy || this.disposed) return;
    this.setBusy(true);
    try {
      const img = await FabricImage.fromURL(url, {
        crossOrigin: "anonymous",
        signal: this.abortController.signal,
      });
      if (this.disposed) return;
      const scale = Math.min(1, this.canvas.width / img.width, this.canvas.height / img.height);
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: (this.canvas.width - img.width * scale) / 2,
        top: (this.canvas.height - img.height * scale) / 2,
        erasable: true,
        ...options,
      });
      this.canvas.add(img);
      this.canvas.requestRenderAll();
    } catch {
      this.emit("error", "图片加载失败，请检查地址及跨域设置。");
    } finally {
      this.setBusy(false);
    }
    this.commit();
  }

  /** 载入课件；每个页面分别持有快照历史，重复打开时保留已有批注。 */
  public async insertPPT(urls: string[]): Promise<void> {
    if (this.busy || this.disposed || !urls.length) return;
    // Reopening the built-in deck must not erase annotations.
    if (this.images.length) return;
    this.images = [...urls];
    this.pageHistories = [];
    this.emit("insert:images", this.getScenes());
    await this.setCurrentScene(0);
  }

  /**
   * 恢复或初始化指定课件页；图片加载失败时保留原画布。
   * @param index 课件页在 images 中的下标。
   */
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
        await this.canvas.loadFromJSON(saved.current, undefined, {
          signal: this.abortController.signal,
        });
      } else {
        // Load the background before replacing content so a failed image keeps the old page.
        const img = await FabricImage.fromURL(this.images[index], {
          crossOrigin: "anonymous",
          signal: this.abortController.signal,
        });
        if (this.disposed) return;
        const scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height);
        img.set({
          scaleX: scale,
          scaleY: scale,
          left: (this.canvas.width - img.width * scale) / 2,
          top: (this.canvas.height - img.height * scale) / 2,
          selectable: false,
          evented: false,
        });
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
      await this.canvas
        .loadFromJSON(previous, undefined, { signal: this.abortController.signal })
        .catch(() => {});
      this.canvas.requestRenderAll();
      this.emit("error", "页面加载失败，已保留原页面。");
    } finally {
      this.setBusy(false);
    }
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

  /** 记录命中的可擦对象并临时置灰，抬起指针前不移除对象。 */
  private markErasure(point: Point) {
    let changed = false;
    for (const object of this.canvas.getObjects()) {
      if (
        !(object as FabricObject & { erasable?: boolean }).erasable ||
        this.erasureTargets.has(object)
      )
        continue;
      const { left, top, width, height } = object.getBoundingRect();
      if (
        point.x < left - 10 ||
        point.x > left + width + 10 ||
        point.y < top - 10 ||
        point.y > top + height + 10
      )
        continue;
      if (object instanceof Line) {
        const { x1, y1, x2, y2 } = object.calcLinePoints();
        const [a, b, c, d, e, f] = object.calcTransformMatrix();
        const start = new Point(a * x1 + c * y1 + e, b * x1 + d * y1 + f);
        const end = new Point(a * x2 + c * y2 + e, b * x2 + d * y2 + f);
        const dx = end.x - start.x;
        const dy = end.y - start.y;
        const ratio = Math.max(
          0,
          Math.min(
            1,
            ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1),
          ),
        );
        if (
          Math.hypot(point.x - start.x - ratio * dx, point.y - start.y - ratio * dy) >
          10 + object.strokeWidth / 2
        )
          continue;
      }
      this.erasureTargets.set(object, {
        opacity: object.opacity,
        stroke: object.stroke,
        fill: object.fill,
      });
      object.set({
        opacity: object instanceof FabricImage ? 0.35 : 0.55,
        stroke: object.stroke ? "#6b7280" : object.stroke,
        fill:
          object instanceof FabricImage || object.fill === "transparent" || !object.fill
            ? object.fill
            : "#6b7280",
      });
      object.dirty = true;
      changed = true;
    }
    if (changed) this.canvas.requestRenderAll();
  }

  private updateEraserTrail(event: TPointerEvent) {
    if (!this.eraserTrail) {
      const overlay = document.createElement("canvas");
      overlay.className = "eraser-trail";
      const width = this.canvas.upperCanvasEl.clientWidth;
      const height = this.canvas.upperCanvasEl.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      overlay.width = width * ratio;
      overlay.height = height * ratio;
      Object.assign(overlay.style, {
        position: "absolute",
        left: "0",
        top: "0",
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: "none",
        zIndex: "4",
      });
      this.canvas.wrapperEl.append(overlay);
      this.eraserTrail = overlay;
    }
    this.eraserTrailPoints.push({
      point: this.canvas.getViewportPoint(event),
      time: performance.now(),
    });
    this.eraserTrailPoints = this.eraserTrailPoints.slice(-24);
    if (this.eraserTrailFrame === undefined)
      this.eraserTrailFrame = requestAnimationFrame(this.renderEraserTrail);
  }

  private renderEraserTrail = () => {
    this.eraserTrailFrame = undefined;
    const canvas = this.eraserTrail;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const now = performance.now();
    this.eraserTrailPoints = this.eraserTrailPoints.filter(
      ({ time }) => now - time < ERASER_TRAIL_MS,
    );
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.strokeStyle = "#64748b";
    ctx.fillStyle = "#64748b";
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    for (let i = 1; i < this.eraserTrailPoints.length; i++) {
      const previous = this.eraserTrailPoints[i - 1].point;
      const current = this.eraserTrailPoints[i];
      ctx.globalAlpha = 0.5 * (1 - (now - current.time) / ERASER_TRAIL_MS);
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(current.point.x, current.point.y);
      ctx.stroke();
    }
    const tip = this.eraserTrailPoints.at(-1);
    if (tip) {
      ctx.globalAlpha = 0.5 * (1 - (now - tip.time) / ERASER_TRAIL_MS);
      ctx.beginPath();
      ctx.arc(tip.point.x, tip.point.y, 4, 0, Math.PI * 2);
      ctx.fill();
      this.eraserTrailFrame = requestAnimationFrame(this.renderEraserTrail);
    }
    ctx.globalAlpha = 1;
  };

  private finishErasing(remove: boolean) {
    if (!this.erasing) return;
    this.erasing = false;
    if (this.eraserTrailFrame !== undefined) cancelAnimationFrame(this.eraserTrailFrame);
    this.eraserTrailFrame = undefined;
    this.eraserTrailPoints = [];
    this.eraserTrail?.remove();
    this.eraserTrail = undefined;
    for (const [object, appearance] of this.erasureTargets) {
      object.set(appearance);
      object.dirty = true;
      if (remove) {
        if (object.group) object.group.remove(object);
        else this.canvas.remove(object);
      }
    }
    this.erasureTargets.clear();
    this.canvas.requestRenderAll();
    if (remove) this.scheduleCommit();
  }

  // 初始化事件
  private initEvent() {
    this.canvas.on("object:added", () => this.scheduleCommit());
    this.canvas.on("object:removed", () => this.scheduleCommit());
    this.canvas.on("object:modified", () => this.scheduleCommit());
    this.canvas.on("path:created", () => this.scheduleCommit());
    this.canvas.on("text:editing:exited", (event: { target: IText | Textbox }) => {
      event.target.set({ hasControls: true, hasBorders: true });
      if (event.target === this.pendingText) {
        this.pendingText = null;
        if (!event.target.text.trim()) this.canvas.remove(event.target);
      }
      this.scheduleCommit();
    });
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
    window.addEventListener(
      "pointerup",
      (event) => {
        this.finishErasing(true);
        if (this.isDrawing && this.drawingTool === "text") {
          this.onMouseUp({ scenePoint: this.canvas.getScenePoint(event) });
        }
      },
      { signal: this.abortController.signal },
    );
  }

  private clearTextPreview() {
    this.textPreview?.remove();
    this.textPreview = undefined;
  }

  private updateTextPreview(event: any) {
    const { x, y } = event.scenePoint;
    if (!this.textDrag && Math.hypot(x - this.startX, y - this.startY) < 6) return;
    this.textDrag = true;
    if (!this.textPreview) {
      this.textPreview = document.createElement("div");
      this.textPreview.className = "text-drag-preview";
      Object.assign(this.textPreview.style, {
        position: "absolute",
        border: "1px dashed #2563eb",
        background: "#2563eb0a",
        boxSizing: "border-box",
        pointerEvents: "none",
        zIndex: "4",
      });
      this.canvas.wrapperEl.append(this.textPreview);
    }
    const [a, b, c, d, e, f] = this.canvas.viewportTransform;
    const start = new Point(
      a * this.startX + c * this.startY + e,
      b * this.startX + d * this.startY + f,
    );
    const end = this.canvas.getViewportPoint(event.e);
    Object.assign(this.textPreview.style, {
      left: `${Math.min(start.x, end.x)}px`,
      top: `${Math.min(start.y, end.y)}px`,
      width: `${Math.abs(end.x - start.x)}px`,
      height: `${Math.abs(end.y - start.y)}px`,
    });
  }

  private startTextEditing(x: number, y: number, width?: number) {
    const options = {
      left: x,
      top: y,
      fill: this.settings.color,
      fontSize: this.settings.fontSize,
      erasable: true,
      hasBorders: false,
      hasControls: false,
      padding: 0,
      editingBorderColor: "transparent",
    };
    const text =
      width === undefined
        ? new IText("", options)
        : new Textbox("", { ...options, width, splitByGrapheme: true });
    this.pendingText = text;
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    text.enterEditing();
    this.canvas.requestRenderAll();
  }

  // 鼠标按下事件处理函数
  private onMouseDown(event: any) {
    if (!event.scenePoint) return;
    const { x, y } = event.scenePoint;
    if (this.drawingTool === "eraser") {
      this.erasing = true;
      this.updateEraserTrail(event.e);
      this.markErasure(new Point(x, y));
      return;
    }
    // 如果当前有活动的元素则不添加
    if (this.canvas.getActiveObject()) return;
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
        this.textDrag = false;
        break;
      default:
        break;
    }
  }

  // 鼠标移动事件处理函数
  private onMouseMove(event: any) {
    if (this.erasing && event.scenePoint) {
      this.updateEraserTrail(event.e);
      this.markErasure(new Point(event.scenePoint.x, event.scenePoint.y));
      return;
    }
    if (this.isDrawing && this.drawingTool === "text" && event.scenePoint) {
      this.updateTextPreview(event);
      return;
    }
    if (!this.isDrawing || !event.scenePoint || !this.currentShape) return;

    const { x, y } = event.scenePoint;
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
      default:
        break;
    }
    // 更新边界信息
    this.currentShape.setCoords();
    // 重新渲染
    this.canvas.requestRenderAll();
  }

  // 鼠标抬起事件处理函数
  private onMouseUp(event: any) {
    if (this.erasing) {
      this.finishErasing(true);
      return;
    }
    if (this.isDrawing && this.drawingTool === "text") {
      const x = event.scenePoint?.x ?? this.startX;
      const y = event.scenePoint?.y ?? this.startY;
      this.clearTextPreview();
      this.isDrawing = false;
      this.startTextEditing(
        this.textDrag ? Math.min(x, this.startX) : this.startX,
        this.textDrag ? Math.min(y, this.startY) : this.startY,
        this.textDrag ? Math.max(30, Math.abs(x - this.startX)) : undefined,
      );
      this.textDrag = false;
      return;
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
    } finally {
      this.setBusy(false);
    }
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
    this.clearTextPreview();
    this.finishErasing(false);
    this.disposed = true;
    this.abortController.abort();
    clearTimeout(this.commitTimer);
    this.cleanupHotkeys();
    this.removeAllListeners();
    await this.canvas.dispose();
  }
}

export default FabricCanvas;
