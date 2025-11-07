import { Line } from 'fabric';

class Arrow extends Line {
  _render(ctx: CanvasRenderingContext2D) {
    super._render(ctx)

    ctx.save();
    // 乘或除对应的scaleX(Y)，抵消元素放缩造成的影响，使箭头不会变形
    ctx.scale(1 / this.scaleX, 1 / this.scaleY);
    const xDiff = (this.x2 - this.x1) * this.scaleX;
    const yDiff = (this.y2 - this.y1) * this.scaleY;
    const angle = Math.atan2(yDiff, xDiff);
    ctx.translate(((this.x2 - this.x1) / 2) * this.scaleX, ((this.y2 - this.y1) / 2) * this.scaleY);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-10, 5);
    ctx.lineTo(-10, -5);
    ctx.closePath();
    ctx.lineWidth = this.strokeWidth ;
    ctx.strokeStyle = this.stroke as string;
    ctx.fillStyle = this.fill as string;
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }
};

export default Arrow;
