import { Line, classRegistry } from "fabric";

/** 可序列化的开放式箭头，继承 Fabric 直线并绘制两段箭头边。 */
class Arrow extends Line {
  static type = "Arrow";
  _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx);
    const { x1, y1, x2, y2 } = this.calcLinePoints();
    const length = Math.hypot(x2 - x1, y2 - y1);
    if (length < 1 || !this.stroke) return;
    const headLength = Math.min(14 + this.strokeWidth, length / 2);
    ctx.save();
    ctx.translate(x2, y2);
    ctx.rotate(Math.atan2(y2 - y1, x2 - x1));
    ctx.beginPath();
    ctx.moveTo(-headLength, -headLength * 0.55);
    ctx.lineTo(0, 0);
    ctx.lineTo(-headLength, headLength * 0.55);
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.stroke as string;
    ctx.stroke();
    ctx.restore();
  }
}

classRegistry.setClass(Arrow);

export default Arrow;
