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
  Path,
  Point,
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
  FREE_DRAW = 'free_draw',
}

interface ShapeOptions {
  stroke?: string;
  strokeWidth?: number;
  fill?: string;
  opacity?: number;
}

interface MousePosition {
  x: number;
  y: number;
}

class FabricWrapper extends EventEmitter<FabricEvents> {
  private canvas: ICanvas;
  // private isDrawing = false;
  private isMouseDown = false;
  private undoStack: IObject[] = [];
  private redoStack: IObject[] = [];
  private currentShape: IObject | null = null;
  private startPosition: MousePosition = { x: 0, y: 0 };
  private endPosition: MousePosition = { x: 0, y: 0 };
  private shapeType: ShapeType = ShapeType.LINE;
  private options: ShapeOptions = {
    stroke: "#ff0000",
    strokeWidth: 2,
    fill: "transparent",
    opacity: 1,
  };
  private startX: number = 0;
  private startY: number = 0;

  constructor(canvasId: string) {
    super();

    this.canvas = new fabric.Canvas(canvasId);
    this.canvas.selection = false;
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

  private onMouseDownLine(event: IEvent) {
    this.isMouseDown = true;
    const pointer = this.canvas.getPointer(event.e);
    const options: ILineOptions = {
      x1: pointer.x,
      y1: pointer.y,
      x2: pointer.x,
      y2: pointer.y,
      stroke: 'black',
      strokeWidth: 2,
    };
    this.currentShape = new fabric.Line(options);
    this.currentShape&&this.canvas.add(this.currentShape);
  }

  private onMouseMoveLine(event: IEvent) {
    if (!this.isMouseDown) {
      return;
    }

    if(this.currentShape) {
      const pointer = this.canvas.getPointer(event.e);
      (this.currentShape as Line).set('x2', pointer.x);
      (this.currentShape as Line).set('y2', pointer.y);
      this.canvas.renderAll();
    }
  }

  private onMouseUpLine() {
    this.isMouseDown = false;
    this.currentShape = null;
  }


  private onMouseDownEllipse(event: IEvent) {
    this.isMouseDown = true;
    const pointer = this.canvas.getPointer(event.e);
    const options: IEllipseOptions = {
      left: pointer.x,
      top: pointer.y,
      rx: 0,
      ry: 0,
      fill: 'transparent',
      stroke: 'black',
      strokeWidth: 2,
    };
    this.currentShape = new fabric.Ellipse(options);
    this.currentShape&&this.canvas.add(this.currentShape);
  }

  private onMouseMoveEllipse(event: IEvent) {
    if (!this.isMouseDown) {
      return;
    }

    if(this.currentShape&&this.currentShape.left&&this.currentShape.top) {
      const pointer = this.canvas.getPointer(event.e);
      const rx = Math.abs(pointer.x - this.currentShape.left);
      const ry = Math.abs(pointer.y - this.currentShape.top);
      (this.currentShape as Ellipse).set('rx', rx);
      (this.currentShape as Ellipse).set('ry', ry);
      this.canvas.renderAll();
    }
  }

  private onMouseUpEllipse() {
    this.isMouseDown = false;
    this.currentShape = null;
  }

  private onMouseDownCircle(event: IEvent) {
    this.isMouseDown = true;
    const pointer = this.canvas.getPointer(event.e);
    const options: ICircleOptions = {
      left: pointer.x,
      top: pointer.y,
      radius: 0,
      fill: 'transparent',
      stroke: 'black',
      strokeWidth: 2,
    };
    this.currentShape = new fabric.Circle(options);
    this.currentShape&&this.canvas.add(this.currentShape);
  }

  private onMouseMoveCircle(event: IEvent) {
    if (!this.isMouseDown) {
      return;
    }

    if(this.currentShape&&this.currentShape.left) {
      const pointer = this.canvas.getPointer(event.e);
      const radius = Math.abs(pointer.x - this.currentShape.left);
      (this.currentShape as Circle).set('radius', radius);
      this.canvas.renderAll();
    }
  }

  private onMouseUpCircle() {
    this.isMouseDown = false;
    this.currentShape = null;
  }

  private onMouseDownTriangle(event: IEvent) {
    this.isMouseDown = true;
    const pointer = this.canvas.getPointer(event.e);
    const options: ITriangleOptions = {
      left: pointer.x,
      top: pointer.y,
      width: 0,
      height: 0,
      fill: 'transparent',
      stroke: 'black',
      strokeWidth: 2,
    };
    this.currentShape = new fabric.Triangle(options);
    this.currentShape&&this.canvas.add(this.currentShape);
  }

  private onMouseMoveTriangle(event: IEvent) {
    if (!this.isMouseDown) {
      return;
    }

    if(this.currentShape&&this.currentShape.left&&this.currentShape.top) {
      const pointer = this.canvas.getPointer(event.e);
      const width = pointer.x - this.currentShape.left;
      const height = pointer.y - this.currentShape.top;
      (this.currentShape as Triangle).set('width', width);
      (this.currentShape as Triangle).set('height', height);
      this.canvas.renderAll();
    }
  }

  private onMouseUpTriangle() {
    this.isMouseDown = false;
    this.currentShape = null;
  }

  private onMouseDownRectangle(event: IEvent) {
    this.isMouseDown = true;
    const pointer = this.canvas.getPointer(event.e);
    this.startX = pointer.x;
    this.startY = pointer.y;
  }

  private onMouseMoveRectangle(event: IEvent) {
    if (!this.isMouseDown) {
      return;
    }

    const pointer = this.canvas.getPointer(event.e);

    if (this.currentShape) {
      this.currentShape.set('width', pointer.x - this.startX);
      this.currentShape.set('height', pointer.y - this.startY);
      this.canvas.renderAll();
    } else {
      const options: IRectOptions = {
        left: this.startX,
        top: this.startY,
        width: pointer.x - this.startX,
        height: pointer.y - this.startY,
        fill: 'transparent',
        stroke: 'black',
        strokeWidth: 2,
      };
      this.currentShape = new fabric.Rect(options);
      this.currentShape&&this.canvas.add(this.currentShape);
    }
  }

  private onMouseUpRectangle() {
    this.isMouseDown = false;
    this.currentShape = null;
  }

  public setMode(mode: string) {
    this.canvas.off('mouse:down');
    this.canvas.off('mouse:move');
    this.canvas.off('mouse:up');
    this.canvas.isDrawingMode = false;
  
    switch (mode) {
      case 'rectangle':
        this.canvas.on('mouse:down', this.onMouseDownRectangle.bind(this));
        this.canvas.on('mouse:move', this.onMouseMoveRectangle.bind(this));
        this.canvas.on('mouse:up', this.onMouseUpRectangle.bind(this));
        break;
      case 'triangle':
        this.canvas.on('mouse:down', this.onMouseDownTriangle.bind(this));
        this.canvas.on('mouse:move', this.onMouseMoveTriangle.bind(this));
        this.canvas.on('mouse:up', this.onMouseUpTriangle.bind(this));
        break;
      case 'circle':
        this.canvas.on('mouse:down', this.onMouseDownCircle.bind(this));
        this.canvas.on('mouse:move', this.onMouseMoveCircle.bind(this));
        this.canvas.on('mouse:up', this.onMouseUpCircle.bind(this));
        break;
      case 'ellipse':
        this.canvas.on('mouse:down', this.onMouseDownEllipse.bind(this));
        this.canvas.on('mouse:move', this.onMouseMoveEllipse.bind(this));
        this.canvas.on('mouse:up', this.onMouseUpEllipse.bind(this));
        break;
      case 'line':
        this.canvas.on('mouse:down', this.onMouseDownLine.bind(this));
        this.canvas.on('mouse:move', this.onMouseMoveLine.bind(this));
        this.canvas.on('mouse:up', this.onMouseUpLine.bind(this));
        break;
      case 'free-draw':
        this.drawFreeDraw();
        break;
      default:
        break;
    }
  }

  public setShapeType = (type: ShapeType) => {
    this.shapeType = type;
  };

  public setOptions = (options: ShapeOptions) => {
    this.options = { ...this.options, ...options };
  };

  private createShape = (type: ShapeType, options: ShapeOptions) => {
    switch (type) {
      case ShapeType.RECTANGLE:
        return this.drawRect({
          ...options,
          width: this.endPosition.x - this.startPosition.x,
          height: this.endPosition.y - this.startPosition.y,
          left: this.startPosition.x,
          top: this.startPosition.y,
        });
      case ShapeType.TRIANGLE:
        return this.drawTriangle({
          ...options,
          left: this.startPosition.x,
          top: this.startPosition.y,
          width: this.endPosition.x - this.startPosition.x,
          height: this.endPosition.y - this.startPosition.y,
        });
      case ShapeType.CIRCLE:
        const radius = Math.sqrt(
          Math.pow(this.endPosition.x - this.startPosition.x, 2) +
            Math.pow(this.endPosition.y - this.startPosition.y, 2)
        );
        return this.drawCircle({
          ...options,
          radius,
          left: this.startPosition.x,
          top: this.startPosition.y,
        });
      case ShapeType.LINE:
        return this.drawLine(this.startPosition.x, this.startPosition.y, this.endPosition.x, this.endPosition.y, {
          ...options,
        });
      case ShapeType.ARROW:
        return this.drawArrow(this.startPosition.x, this.startPosition.y, this.endPosition.x, this.endPosition.y, {
          ...options,
        });
      case ShapeType.FREE_DRAW:
        return this.drawFreeDraw()
      default:
        return null;
    }
  };

  // 绘制矩形
  public drawRect(options: IRectOptions): Rect {
    const rect = new fabric.Rect(options);
    return rect
    // this.canvas.add(rect);
    // this.setActiveObject(rect);
  }

  // 绘制三角形
  public drawTriangle(options: ITriangleOptions): Triangle {
    const triangle = new fabric.Triangle(options);
    return triangle
    // this.canvas.add(triangle);
    // this.setActiveObject(triangle);
  }

  // 绘制圆形
  public drawCircle(options: ICircleOptions): Circle {
    const circle = new fabric.Circle(options);
    return circle
    // this.canvas.add(circle);
    // this.setActiveObject(circle);
  }

  // 绘制椭圆
  public drawEllipse(options: IEllipseOptions): Ellipse {
    const ellipse = new fabric.Ellipse(options);
    return ellipse
    // this.canvas.add(ellipse);
    // this.setActiveObject(ellipse);
  }

  // 绘制线条
  public drawLine(x1: number, y1: number, x2: number, y2: number, options?: ILineOptions): Line {
    const line = new fabric.Line([x1, y1, x2, y2], options);
    return line
    // this.canvas.add(line);
    // this.setActiveObject(line);
  }

  // 绘制箭头
  public drawArrow(x1: number, y1: number, x2: number, y2: number, options?: ILineOptions): Arrow {
    const arrow = new Arrow([x1, y1, x2, y2], options);
    return arrow
    // this.canvas.add(arrow);
    // this.setActiveObject(arrow);
  }

  // 自由绘制
  public drawFreeDraw(options?: any) {
    this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas, options);
    this.canvas.isDrawingMode = true;
  };

  // 绘制文本
  public drawText(text: string, options?: ITextOptions): void {
    const textObj = new fabric.Text(text, options);
    // return textObj
    this.canvas.add(textObj);
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

    // this.canvas.on("mouse:down", (event) => {
    //   this.isDrawing = true;
    //   this.startPosition = this.canvas.getPointer(event.e);
    //   this.currentShape = this.createShape(this.shapeType, this.options);
    //   if (this.currentShape) {
    //     this.canvas.add(this.currentShape);
    //   }

    //   this.emit("mouse:down", event);
    // });

    // this.canvas.on("mouse:move", (event) => {
    //   if (!this.isDrawing) return;
    //   if (this.currentShape) {
    //     this.endPosition = this.canvas.getPointer(event.e);
    //     this.currentShape.setCoords();
    //     this.currentShape.set(this.createShape(this.shapeType, this.options));
    //     this.canvas.renderAll();
    //   }
    //   this.emit("mouse:move", event);
    // });

    // this.canvas.on("mouse:up", (event) => {
    //   this.isDrawing = false;
    //   this.currentShape = null;
    //   this.startPosition = { x: 0, y: 0 };
    //   this.endPosition = { x: 0, y: 0 };
    //   this.emit("mouse:up", event);
    // });

    // 绑定按键事件，实现撤销和重做
    document.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "z") {
        this.undo();
      } else if (event.ctrlKey && event.key === "y") {
        this.redo();
      }
    });
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

  public zoom(ratio: number) {
    this.canvas.setZoom(ratio);
  }

  public zoomIn() {
    this.canvas.setZoom(this.canvas.getZoom() * 1.1);
  }

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

export default FabricWrapper;
