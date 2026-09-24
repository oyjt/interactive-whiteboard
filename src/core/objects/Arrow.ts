/** 开放式箭头 Fabric 对象及其 JSON 类注册。 */
import { Polyline, classRegistry } from 'fabric';

/** 两点折线上的开放式箭头；继承 Polyline 保持 Fabric JSON 克隆和恢复能力。 */
class Arrow extends Polyline {
  static type = 'Arrow';
  /** 先绘制直线，再用两段笔画绘制无底边的箭头。 */
  _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    const [start, end] = this.points;
    if (!start || !end) return;
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    if (length < 1 || !this.stroke) return;
    const headLength = Math.min(14 + this.strokeWidth, length / 2);
    ctx.save();
    ctx.translate(end.x - this.pathOffset.x, end.y - this.pathOffset.y);
    ctx.rotate(Math.atan2(end.y - start.y, end.x - start.x));
    ctx.beginPath();
    ctx.moveTo(-headLength, -headLength * 0.55);
    ctx.lineTo(0, 0);
    ctx.lineTo(-headLength, headLength * 0.55);
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this.stroke as string;
    ctx.stroke();
    ctx.restore();
  }
}

classRegistry.setClass(Arrow);

export default Arrow;
