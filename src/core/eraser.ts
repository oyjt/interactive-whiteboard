/** 橡皮擦手势：对象命中置灰、抬起删除及指针拖影。 */
import {
  type Canvas,
  FabricImage,
  FabricObject,
  Polyline,
  Point,
  type TPointerEvent,
} from 'fabric';

const TRAIL_MS = 420;

/** 管理一次橡皮擦手势的对象命中、置灰和指针拖影。 */
export class Eraser {
  private targets = new Map<FabricObject, Pick<FabricObject, 'opacity' | 'stroke' | 'fill'>>();
  private trail?: HTMLCanvasElement;
  private points: Array<{ point: Point; time: number }> = [];
  private frame?: number;
  active = false;

  /** 接收要擦除的 Fabric 画布。 */
  constructor(private canvas: Canvas) {}

  /** 开始手势，立即检查按下位置是否命中对象。 */
  start(point: Point, event: TPointerEvent) {
    this.active = true;
    this.move(point, event);
  }

  /** 记录拖影轨迹，并将新命中的对象临时置灰。 */
  move(point: Point, event: TPointerEvent) {
    if (!this.active) return;
    this.updateTrail(event);
    this.mark(point);
  }

  /** 结束手势；取消时恢复原样，完成时删除命中的对象。返回是否结束了有效手势。 */
  finish(remove: boolean): boolean {
    if (!this.active) return false;
    this.active = false;
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.points = [];
    this.trail?.remove();
    this.trail = undefined;
    for (const [object, appearance] of this.targets) {
      object.set(appearance);
      object.dirty = true;
      if (remove) {
        if (object.group) object.group.remove(object);
        else this.canvas.remove(object);
      }
    }
    this.targets.clear();
    this.canvas.requestRenderAll();
    return true;
  }

  /** 命中的对象先变灰，鼠标松开前仍保留在画布中。 */
  private mark(point: Point) {
    let changed = false;
    for (const object of this.canvas.getObjects()) {
      if (!(object as FabricObject & { erasable?: boolean }).erasable || this.targets.has(object))
        continue;
      const { left, top, width, height } = object.getBoundingRect();
      if (
        point.x < left - 10 ||
        point.x > left + width + 10 ||
        point.y < top - 10 ||
        point.y > top + height + 10
      )
        continue;
      if (object instanceof Polyline && object.points.length === 2) {
        const [startPoint, endPoint] = object.points;
        const [a, b, c, d, e, f] = object.calcTransformMatrix();
        const x1 = startPoint.x - object.pathOffset.x;
        const y1 = startPoint.y - object.pathOffset.y;
        const x2 = endPoint.x - object.pathOffset.x;
        const y2 = endPoint.y - object.pathOffset.y;
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
      this.targets.set(object, {
        opacity: object.opacity,
        stroke: object.stroke,
        fill: object.fill,
      });
      object.set({
        opacity: object instanceof FabricImage ? 0.35 : 0.55,
        stroke: object.stroke ? '#6b7280' : object.stroke,
        fill:
          object instanceof FabricImage || object.fill === 'transparent' || !object.fill
            ? object.fill
            : '#6b7280',
      });
      object.dirty = true;
      changed = true;
    }
    if (changed) this.canvas.requestRenderAll();
  }

  /** 在交互层上方创建或更新橡皮擦拖影。 */
  private updateTrail(event: TPointerEvent) {
    if (!this.trail) {
      const overlay = document.createElement('canvas');
      overlay.className = 'eraser-trail';
      const width = this.canvas.upperCanvasEl.clientWidth;
      const height = this.canvas.upperCanvasEl.clientHeight;
      const ratio = window.devicePixelRatio || 1;
      overlay.width = width * ratio;
      overlay.height = height * ratio;
      Object.assign(overlay.style, {
        position: 'absolute',
        left: '0',
        top: '0',
        width: `${width}px`,
        height: `${height}px`,
        pointerEvents: 'none',
        zIndex: '4',
      });
      this.canvas.wrapperEl.append(overlay);
      this.trail = overlay;
    }
    this.points.push({ point: this.canvas.getViewportPoint(event), time: performance.now() });
    this.points = this.points.slice(-24);
    if (this.frame === undefined) this.frame = requestAnimationFrame(this.renderTrail);
  }

  /** 逐帧绘制并淡出最近的指针轨迹。 */
  private renderTrail = () => {
    this.frame = undefined;
    const canvas = this.trail;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const now = performance.now();
    this.points = this.points.filter(({ time }) => now - time < TRAIL_MS);
    const ratio = window.devicePixelRatio || 1;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.strokeStyle = '#64748b';
    ctx.fillStyle = '#64748b';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    for (let i = 1; i < this.points.length; i++) {
      const previous = this.points[i - 1].point;
      const current = this.points[i];
      ctx.globalAlpha = 0.5 * (1 - (now - current.time) / TRAIL_MS);
      ctx.beginPath();
      ctx.moveTo(previous.x, previous.y);
      ctx.lineTo(current.point.x, current.point.y);
      ctx.stroke();
    }
    const tip = this.points.at(-1);
    if (tip) {
      ctx.globalAlpha = 0.5 * (1 - (now - tip.time) / TRAIL_MS);
      ctx.beginPath();
      ctx.arc(tip.point.x, tip.point.y, 4, 0, Math.PI * 2);
      ctx.fill();
      this.frame = requestAnimationFrame(this.renderTrail);
    }
    ctx.globalAlpha = 1;
  };
}
