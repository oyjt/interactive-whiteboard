/** 白板核心入口：管理绘图工具、课件页面、历史记录与 Fabric 事件。 */
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
  Polyline,
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
} from 'fabric';

import EventEmitter from '@/utils/emitter';

import {
  normalizeBrushSettings,
  readBrushSettings,
  saveBrushSettings,
  type BrushSettings,
} from './brushSettings';
import { Eraser } from './eraser';
import { SnapshotHistory } from './history';
import initControls from './initControls';
import initControlsRotate from './initControlsRotate';
import initHotKeys from './initHotKeys';
import Arrow from './objects/Arrow';

/** 克隆和历史快照需保留对象的橡皮擦标记。 */
FabricObject.customProperties = [...new Set([...FabricObject.customProperties, 'erasable'])];

interface FabricEvents {
  'object:added': any;
  'object:modified': any;
  'object:removed': any;
  'path:created': any;
  'mouse:down': any;
  'mouse:move': any;
  'mouse:up': any;
  [key: string | symbol]: any;
}

/** 工具栏及鼠标手势使用的绘图模式。 */
export type DrawingTool =
  | 'rectangle'
  | 'triangle'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text'
  | 'pencil'
  | 'select'
  | 'eraser'
  | '';

interface ShapeOptions {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
  erasable?: boolean;
}

/** 管理 Fabric 画布的绘制、页面快照、历史记录及工具状态。 */
class FabricCanvas extends EventEmitter<FabricEvents> {
  private canvas: Canvas;
  private currentShape: FabricObject | null = null;
  private drawingTool: DrawingTool = '';
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private textPreview?: HTMLDivElement;
  private textDrag = false;
  private pendingText: IText | Textbox | null = null;
  private eraser!: Eraser;
  private options: ShapeOptions = {
    stroke: '#ff0000',
    strokeWidth: 5,
    fill: 'transparent',
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
  /** 画布销毁时解除当前快捷键绑定。 */
  private cleanupHotkeys: () => void = () => {};

  /** 返回当前画笔、线条和文字的设置副本。 */
  public getBrushSettings() {
    return { ...this.settings };
  }
  /** 返回当前绘图工具。 */
  public getDrawingTool() {
    return this.drawingTool;
  }
  /** 返回课件图片列表副本。 */
  public getScenes() {
    return [...this.images];
  }
  /** 返回当前课件页下标。 */
  public getCurrentScene() {
    return this.curImageIndex;
  }
  /** 返回当前页面可撤销、可重做与加载状态。 */
  public getHistoryState() {
    return {
      canUndo: !this.busy && this.history.canUndo,
      canRedo: !this.busy && this.history.canRedo,
      busy: this.busy,
    };
  }

  /** 校验并保存工具设置，同步更新当前自由画笔。 */
  public setBrushSettings(settings: BrushSettings) {
    this.settings = normalizeBrushSettings(settings);
    this.options.stroke = this.settings.color;
    this.options.strokeWidth = this.settings.width;
    if (this.drawingTool === 'pencil' && this.canvas.freeDrawingBrush) {
      this.canvas.freeDrawingBrush.color = this.settings.color;
      this.canvas.freeDrawingBrush.width = this.settings.width;
    }
    saveBrushSettings(this.settings);
    this.emit('settings:changed', this.getBrushSettings());
  }

  /** 广播当前页面的历史状态。 */
  private publishHistory() {
    this.emit('history:changed', this.getHistoryState());
  }

  /** 加载快照期间暂停画布交互并更新按钮状态。 */
  private setBusy(busy: boolean) {
    this.busy = busy;
    if (this.disposed) return;
    this.canvas.wrapperEl.style.pointerEvents = busy ? 'none' : '';
    this.publishHistory();
  }

  /** 合并一次操作期间的多个 Fabric 事件，延后提交快照。 */
  private scheduleCommit() {
    if (this.busy || this.disposed) return;
    clearTimeout(this.commitTimer);
    this.commitTimer = setTimeout(() => this.commit(), 0);
  }

  /** 提交内容快照；仅在内容变化时通知预览与历史记录。 */
  public commit() {
    clearTimeout(this.commitTimer);
    if (this.busy || this.disposed || this.isDrawing || this.pendingText || this.eraser.active)
      return;
    if (this.history.push(JSON.stringify(this.toJSON()))) {
      this.publishHistory();
      this.emit('content:changed', this.toJSON());
    }
  }

  /** 恢复当前页面的上一个快照。 */
  public async undo() {
    await this.restoreHistory(-1);
  }
  /** 恢复当前页面的下一个快照。 */
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
      this.emit('content:changed', this.toJSON());
    } catch {
      if (this.disposed) return;
      await this.canvas
        .loadFromJSON(this.history.current, undefined, { signal: this.abortController.signal })
        .catch(() => {});
      this.canvas.requestRenderAll();
      this.emit('error', '恢复画布失败，请重试。');
    } finally {
      this.setBusy(false);
    }
  }

  /** 结束正在编辑的文字，确保快照记录最终内容。 */
  private finishEditing() {
    const active = this.canvas.getActiveObject();
    if (active instanceof IText && active.isEditing) active.exitEditing();
  }

  /** 初始化画布、工具、页面历史与事件订阅。 */
  constructor(canvasId: string) {
    super();

    this.canvas = new Canvas(canvasId, {
      isDrawingMode: true,
      selection: false,
      includeDefaultValues: false,
      fireMiddleClick: false,
      fireRightClick: false,
    });
    // 只缩放显示尺寸，保持 800×450 的对象坐标、课件背景和历史快照不变。
    this.canvas.setDimensions({ width: '100%', height: '100%' }, { cssOnly: true });
    this.eraser = new Eraser(this.canvas);
    this.options.stroke = this.settings.color;
    this.options.strokeWidth = this.settings.width;
    this.setDrawingTool('pencil');
    this.history = new SnapshotHistory(JSON.stringify(this.toJSON()));

    this.cleanupHotkeys = initHotKeys(this.canvas, {
      changed: () => this.commit(),
      undo: () => this.undo(),
      redo: () => this.redo(),
      isBusy: () => this.busy || this.disposed,
      error: () => this.emit('error', '复制或粘贴失败，请重试。'),
    });
    initControls();
    initControlsRotate(this.canvas);

    this.initEvent();
  }

  /** 返回底层 Fabric 画布，供高级交互和预览使用。 */
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

  /** 设置并提交画布背景色。 */
  public setBackgroundColor(color: string): void {
    if (this.busy || this.disposed) return;
    this.canvas.backgroundColor = color;
    this.canvas.requestRenderAll();
    this.scheduleCommit();
  }

  /** 以画布中心为基准、按高度缩放背景图片。 */
  public async setBackgroundImage(imageUrl: string, options?: TOptions<ImageProps>): Promise<void> {
    const img = await FabricImage.fromURL(imageUrl, {
      crossOrigin: 'anonymous',
      signal: this.abortController.signal,
    });
    if (this.disposed) return;
    const scale = this.canvas.height / img.height;
    img.set({
      scaleX: scale,
      scaleY: scale,
      left: this.canvas.width / 2,
      top: this.canvas.height / 2,
      selectable: false,
      evented: false,
      ...options,
    });
    this.canvas.backgroundImage = img;
    this.canvas.requestRenderAll();
    this.scheduleCommit();
  }

  /** 向画布添加对象，内容事件会安排历史提交。 */
  public addObject(object: FabricObject): void {
    this.canvas.add(object);
  }

  /** 从画布移除对象，内容事件会安排历史提交。 */
  public removeObject(object: FabricObject): void {
    this.canvas.remove(object);
  }

  /** 移除画布的全部前景对象，保留背景。 */
  public removeAllObject(): void {
    const objs = this.canvas.getObjects();
    objs.forEach((o) => this.canvas.remove(o));
  }

  /** 获取当前页面的前景对象。 */
  public getObjects(): FabricObject[] {
    return this.canvas.getObjects();
  }

  /** 获取选中的对象，未选中时返回 null。 */
  public getActiveObject(): FabricObject | null {
    return this.canvas.getActiveObject() ?? null;
  }

  /** 设置或取消画布选中对象。 */
  public setActiveObject(object: FabricObject | null): void {
    if (!object) {
      this.canvas.discardActiveObject();
    } else {
      this.canvas.setActiveObject(object);
    }
  }

  /** 切换工具并取消上一个工具的橡皮擦或文本预览状态。 */
  public setDrawingTool(tool: DrawingTool) {
    if (this.busy || this.drawingTool === tool) return;
    this.finishErasing(false);
    this.clearTextPreview();
    if (this.drawingTool === 'text' && this.isDrawing) {
      this.isDrawing = false;
      this.textDrag = false;
    }
    this.finishEditing();
    this.canvas.discardActiveObject();

    // 关闭画布的 isDrawingMode，以及清理自由画笔 state
    this.canvas.isDrawingMode = false;
    this.canvas.selection = false;
    this.canvas.skipTargetFind = tool === 'eraser' || tool === 'text';
    this.canvas.defaultCursor = 'default';

    this.drawingTool = tool;
    this.emit('tool:changed', tool);
    if (tool === 'pencil') {
      this.drawFreeDraw();
    } else if (tool === 'eraser') {
      this.canvas.defaultCursor = 'crosshair';
    } else if (tool === 'select') {
      this.canvas.selection = true;
      this.canvas.defaultCursor = 'auto';
    } else if (tool !== 'text') {
      this.canvas.defaultCursor = 'crosshair';
    }
  }

  /** 更新图形样式，并同步保存颜色和线宽。 */
  public setOptions(options: ShapeOptions) {
    this.options = { ...this.options, ...options };
    this.setBrushSettings({
      ...this.settings,
      color: options.stroke ?? this.settings.color,
      width: options.strokeWidth ?? this.settings.width,
    });
  }

  /** 对外绘图参数沿用左上角坐标，内部让 Fabric 对象使用默认的中心原点。 */
  private positionShape(shape: FabricObject, options?: { left?: number; top?: number }) {
    if (options?.left === undefined && options?.top === undefined) return;
    shape.setPositionByOrigin(new Point(options.left ?? 0, options.top ?? 0), 'left', 'top');
  }

  /** 创建矩形，并记录为当前拖拽对象。 */
  public drawRect(options: TOptions<RectProps>): void {
    const rect = new Rect({ ...this.options, ...options });
    this.positionShape(rect, options);
    this.canvas.add(rect);
    this.currentShape = rect;
  }

  /** 创建三角形，并记录为当前拖拽对象。 */
  public drawTriangle(options: TOptions<FabricObjectProps>): void {
    const triangle = new Triangle({ ...this.options, ...options });
    this.positionShape(triangle, options);
    this.canvas.add(triangle);
    this.currentShape = triangle;
  }

  /** 创建圆形，并记录为当前拖拽对象。 */
  public drawCircle(options: TOptions<CircleProps>): void {
    const circle = new Circle({ ...this.options, ...options });
    this.positionShape(circle, options);
    this.canvas.add(circle);
    this.currentShape = circle;
  }

  /** 创建椭圆，并记录为当前拖拽对象。 */
  public drawEllipse(options: TOptions<EllipseProps>): void {
    const ellipse = new Ellipse({ ...this.options, ...options });
    this.positionShape(ellipse, options);
    this.canvas.add(ellipse);
    this.currentShape = ellipse;
  }

  /** 创建连接两点的直线。 */
  public drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: TOptions<FabricObjectProps>,
  ): void {
    const line = new Polyline(
      [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ],
      {
        ...this.options,
        ...options,
      },
    );
    this.canvas.add(line);
    this.currentShape = line;
  }

  /** 创建可序列化的开放式箭头。 */
  public drawArrow(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    options?: TOptions<FabricObjectProps>,
  ): void {
    const arrow = new Arrow(
      [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
      ],
      {
        ...this.options,
        ...options,
      },
    );
    this.canvas.add(arrow);
    this.currentShape = arrow;
  }

  /** 按当前设置启用 Fabric 自由画笔。 */
  public drawFreeDraw() {
    const brush = new PencilBrush(this.canvas);
    brush.width = this.options.strokeWidth ?? 5;
    brush.color = this.options.stroke ?? '#ff0000';
    this.canvas.freeDrawingBrush = brush;
    this.canvas.freeDrawingCursor = 'default';
    this.canvas.isDrawingMode = true;
  }

  /** 创建可直接编辑的文字对象。 */
  public drawText(text: string, options?: TOptions<ITextProps>): void {
    const textObj = new IText(text, {
      fill: this.options.stroke,
      editingBorderColor: this.options.stroke,
      erasable: this.options.erasable,
      fontSize: this.settings.fontSize,
      ...options,
    });
    this.positionShape(textObj, options);
    this.canvas.add(textObj);
    this.canvas.defaultCursor = 'text';
    this.currentShape = textObj;
  }

  /** 异步载入图片，按画布尺寸缩小并放在中心。 */
  public async insertImage(url: string, options?: TOptions<ImageProps>): Promise<void> {
    if (this.busy || this.disposed) return;
    this.setBusy(true);
    try {
      const img = await FabricImage.fromURL(url, {
        crossOrigin: 'anonymous',
        signal: this.abortController.signal,
      });
      if (this.disposed) return;
      const scale = Math.min(1, this.canvas.width / img.width, this.canvas.height / img.height);
      img.set({
        scaleX: scale,
        scaleY: scale,
        left: this.canvas.width / 2,
        top: this.canvas.height / 2,
        erasable: true,
        ...options,
      });
      this.canvas.add(img);
      this.canvas.requestRenderAll();
    } catch {
      this.emit('error', '图片加载失败，请检查地址及跨域设置。');
    } finally {
      this.setBusy(false);
    }
    this.commit();
  }

  /** 载入课件；每个页面分别持有快照历史，重复打开时保留已有批注。 */
  public async insertPPT(urls: string[]): Promise<void> {
    if (this.busy || this.disposed || !urls.length) return;
    // 重复打开课件时保留每一页已有的批注。
    if (this.images.length) return;
    this.images = [...urls];
    this.pageHistories = [];
    this.emit('insert:images', this.getScenes());
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
        // 加载图片成功后才替换原页面，失败时保留当前内容。
        const img = await FabricImage.fromURL(this.images[index], {
          crossOrigin: 'anonymous',
          signal: this.abortController.signal,
        });
        if (this.disposed) return;
        const scale = Math.min(this.canvas.width / img.width, this.canvas.height / img.height);
        img.set({
          scaleX: scale,
          scaleY: scale,
          left: this.canvas.width / 2,
          top: this.canvas.height / 2,
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
      this.emit('current:image', index);
      this.emit('content:changed', this.toJSON());
    } catch {
      if (this.disposed) return;
      await this.canvas
        .loadFromJSON(previous, undefined, { signal: this.abortController.signal })
        .catch(() => {});
      this.canvas.requestRenderAll();
      this.emit('error', '页面加载失败，已保留原页面。');
    } finally {
      this.setBusy(false);
    }
  }

  /** 删除课件页；若删除当前页，先加载替代页。 */
  public async removeScene(index: number) {
    if (this.busy || this.disposed || index < 0 || index >= this.images.length) return;
    this.finishEditing();
    this.commit();
    if (index === this.curImageIndex && this.images.length > 1) {
      // 先加载替代页；加载失败则不删除当前页。
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
      this.emit('content:changed', this.toJSON());
    } else if (index < this.curImageIndex) this.curImageIndex--;
    this.emit('insert:images', this.getScenes());
    this.emit('current:image', this.curImageIndex);
  }

  /** 完成或取消橡皮擦手势；完成后安排历史提交。 */
  private finishErasing(remove: boolean) {
    if (this.eraser.finish(remove) && remove) this.scheduleCommit();
  }

  /** 将 Fabric 内容事件合并为历史提交，并桥接给页面组件。 */
  private initEvent() {
    for (const name of [
      'object:added',
      'object:removed',
      'object:modified',
      'path:created',
    ] as const) {
      this.canvas.on(name, () => this.scheduleCommit());
    }
    this.canvas.on('text:editing:exited', (event: { target: IText | Textbox }) => {
      event.target.set({ hasControls: true, hasBorders: true });
      if (event.target === this.pendingText) {
        this.pendingText = null;
        if (!event.target.text.trim()) this.canvas.remove(event.target);
      }
      this.scheduleCommit();
    });
    this.canvas.on('object:added', (e: { target: FabricObject }) => {
      this.emit('object:added', e);
    });

    this.canvas.on('object:modified', (e: ModifiedEvent<TPointerEvent>) => {
      this.emit('object:modified', e);
    });

    this.canvas.on('object:removed', (e: { target: FabricObject }) => {
      this.emit('object:removed', e);
    });

    this.canvas.on('path:created', (e: { path: FabricObject }) => {
      e.path.set('erasable', this.options.erasable);
      this.emit('path:created', e);
    });

    this.canvas.on('mouse:down', this.onMouseDown.bind(this));
    this.canvas.on('mouse:move', this.onMouseMove.bind(this));
    this.canvas.on('mouse:up', this.onMouseUp.bind(this));
    window.addEventListener(
      'pointerup',
      (event) => {
        this.finishErasing(true);
        if (this.isDrawing && this.drawingTool === 'text') {
          this.onMouseUp({ scenePoint: this.canvas.getScenePoint(event) });
        }
      },
      { signal: this.abortController.signal },
    );
  }

  /** 移除拖拽文字时的临时虚线框。 */
  private clearTextPreview() {
    this.textPreview?.remove();
    this.textPreview = undefined;
  }

  /** 根据指针位置更新文字输入区域的虚线框。 */
  private updateTextPreview(event: any) {
    const { x, y } = event.scenePoint;
    if (!this.textDrag && Math.hypot(x - this.startX, y - this.startY) < 6) return;
    this.textDrag = true;
    if (!this.textPreview) {
      this.textPreview = document.createElement('div');
      this.textPreview.className = 'text-drag-preview';
      Object.assign(this.textPreview.style, {
        position: 'absolute',
        border: '1px dashed #2563eb',
        background: '#2563eb0a',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        zIndex: '4',
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

  /** 在指定左上角创建光标或限定宽度的文本框。 */
  private startTextEditing(x: number, y: number, width?: number) {
    const options = {
      fill: this.settings.color,
      fontSize: this.settings.fontSize,
      erasable: true,
      hasBorders: false,
      hasControls: false,
      padding: 0,
      editingBorderColor: 'transparent',
    };
    const text =
      width === undefined
        ? new IText('', options)
        : new Textbox('', { ...options, width, splitByGrapheme: true });
    text.setPositionByOrigin(new Point(x, y), 'left', 'top');
    this.pendingText = text;
    this.canvas.add(text);
    this.canvas.setActiveObject(text);
    text.enterEditing();
    this.canvas.requestRenderAll();
  }

  /** 根据当前工具开始绘制、擦除或文字拖拽。 */
  private onMouseDown(event: any) {
    if (!event.scenePoint) return;
    const { x, y } = event.scenePoint;
    if (this.drawingTool === 'eraser') {
      this.eraser.start(new Point(x, y), event.e);
      return;
    }
    // 如果当前有活动的元素则不添加
    if (this.canvas.getActiveObject()) return;
    this.isDrawing = true;
    this.startX = x;
    this.startY = y;

    switch (this.drawingTool) {
      case 'rectangle':
        this.drawRect({ left: x, top: y, width: 0, height: 0 });
        break;
      case 'triangle':
        this.drawTriangle({ left: x, top: y, width: 0, height: 0 });
        break;
      case 'circle':
        this.drawCircle({ left: x, top: y, radius: 0 });
        break;
      case 'ellipse':
        this.drawEllipse({ left: x, top: y, rx: 0, ry: 0 });
        break;
      case 'line':
        this.drawLine(x, y, x, y);
        break;
      case 'arrow':
        this.drawArrow(x, y, x, y);
        break;
      case 'text':
        this.textDrag = false;
        break;
      default:
        break;
    }
  }

  /** 更新橡皮擦命中、文字预览或图形几何。 */
  private onMouseMove(event: any) {
    if (this.eraser.active && event.scenePoint) {
      this.eraser.move(new Point(event.scenePoint.x, event.scenePoint.y), event.e);
      return;
    }
    if (this.isDrawing && this.drawingTool === 'text' && event.scenePoint) {
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
      case 'rectangle':
      case 'triangle':
        this.currentShape.set({ left: left + width / 2, top: top + height / 2, width, height });
        break;
      case 'circle':
        const radius = Math.sqrt(width * width + height * height) / 2;
        this.currentShape.set({ left: left + radius, top: top + radius, radius });
        break;
      case 'ellipse':
        this.currentShape.set({
          left: left + width / 2,
          top: top + height / 2,
          rx: width / 2,
          ry: height / 2,
        });
        break;
      case 'line':
      case 'arrow':
        if (this.currentShape instanceof Polyline) {
          this.currentShape.set('points', [
            { x: this.startX, y: this.startY },
            { x, y },
          ]);
          this.currentShape.setDimensions();
          this.currentShape.set({
            left: (this.startX + x) / 2,
            top: (this.startY + y) / 2,
          });
        }
        break;
      default:
        break;
    }
    this.currentShape.setCoords();
    this.canvas.requestRenderAll();
  }

  /** 结束当前手势，并按需开始文本输入或提交快照。 */
  private onMouseUp(event: any) {
    if (this.eraser.active) {
      this.finishErasing(true);
      return;
    }
    if (this.isDrawing && this.drawingTool === 'text') {
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
    this.emit('mouse:up', null);
    this.scheduleCommit();
  }

  /** 导出当前画布的图片数据。 */
  public toDataURL(options?: TDataUrlOptions) {
    return this.canvas.toDataURL(options);
  }

  /** 获取当前页面的 Fabric 序列化数据。 */
  public toJSON() {
    return this.canvas.toJSON();
  }

  /** 加载外部快照并提交至当前页面历史。 */
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

  /** 立即重绘当前画布。 */
  public renderAll(): void {
    this.canvas.renderAll();
  }

  /**
   * 以画布逻辑中心缩放，并限制在 25% 至 400%。
   * @param ratio 目标缩放比例。
   */
  public zoom(ratio: number = 1) {
    const point = new Point(this.canvas.width / 2, this.canvas.height / 2);
    this.canvas.zoomToPoint(point, Math.min(4, Math.max(0.25, ratio)));
  }

  /** 获取画布逻辑缩放比例。 */
  public getZoom(): number {
    return this.canvas.getZoom();
  }

  /** 将画布缩放比例增加 10%。 */
  public zoomIn() {
    this.zoom(this.canvas.getZoom() * 1.1);
  }

  /** 将画布缩放比例减少约 9%。 */
  public zoomOut() {
    this.zoom(this.canvas.getZoom() / 1.1);
  }

  /** 取消异步加载、快捷键、擦除拖影与 Fabric 画布资源。 */
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
