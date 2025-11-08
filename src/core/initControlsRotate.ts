/*
 * 旋转
 */

import {
  Control,
  controlsUtils,
  InteractiveFabricObject,
  TPointerEvent,
  Canvas,
} from 'fabric';

/**
 * 定义旋转光标样式，根据转动角度设定光标旋转
 * (这个辅助函数本身没有问题，予以保留)
 */
function rotateIcon(angle: number) {
  return `url("data:image/svg+xml,%3Csvg height='18' width='18' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'%3E%3Cg fill='none' transform='rotate(${angle} 16 16)'%3E%3Cpath d='M22.4484 0L32 9.57891L22.4484 19.1478V13.1032C17.6121 13.8563 13.7935 17.6618 13.0479 22.4914H19.2141L9.60201 32.01L0 22.4813H6.54912C7.36524 14.1073 14.0453 7.44023 22.4484 6.61688V0Z' fill='white'/%3E%3Cpath d='M24.0605 3.89587L29.7229 9.57896L24.0605 15.252V11.3562C17.0479 11.4365 11.3753 17.0895 11.3048 24.0879H15.3048L9.60201 29.7308L3.90932 24.0879H8.0806C8.14106 15.3223 15.2645 8.22345 24.0605 8.14313V3.89587Z' fill='black'/%3E%3C/g%3E%3C/svg%3E ") 12 12,crosshair`;
}

/**
 * 这是一个通用的 cursorStyleHandler 工厂函数
 * 它返回一个能处理对象角度的 handler
 * @param angleOffset 角度偏移量 (0, 90, 180, 270)
 */
function createRotationCursorHandler(angleOffset: number) {
  return (
    eventData: TPointerEvent,
    control: Control,
    fabricObject: InteractiveFabricObject,
  ): string => {
    // fabricObject.angle 是当前对象的角度
    // 我们返回动态计算的光标字符串
    return rotateIcon(fabricObject.angle + angleOffset);
  };
}

/**
 * 初始化
 */
function initControlsRotate(canvas: Canvas) {
  
  // ↖左上
  const mtrControl = new Control({
    x: -0.5,
    y: -0.5,
    offsetY: -10,
    offsetX: -10,
    actionName: 'rotate',
    actionHandler: controlsUtils.rotationWithSnapping,
    cursorStyleHandler: createRotationCursorHandler(0),
    render: () => false, // 明确表示不渲染此控件
  });

  // ↗右上
  const mtr2Control = new Control({
    x: 0.5,
    y: -0.5,
    offsetY: -10,
    offsetX: 10,
    actionName: 'rotate',
    actionHandler: controlsUtils.rotationWithSnapping,
    cursorStyleHandler: createRotationCursorHandler(90),
    render: () => false,
  });

  // ↘右下
  const mtr3Control = new Control({
    x: 0.5,
    y: 0.5,
    offsetY: 10,
    offsetX: 10,
    actionName: 'rotate',
    actionHandler: controlsUtils.rotationWithSnapping,
    cursorStyleHandler: createRotationCursorHandler(180),
    render: () => false,
  });

  // ↙左下
  const mtr4Control = new Control({
    x: -0.5,
    y: 0.5,
    offsetY: 10,
    offsetX: -10,
    actionName: 'rotate',
    actionHandler: controlsUtils.rotationWithSnapping,
    cursorStyleHandler: createRotationCursorHandler(270),
    render: () => false,
  });

  // 获取默认控制并 *一次性* 合并
  const controls = InteractiveFabricObject.ownDefaults.controls;
  InteractiveFabricObject.ownDefaults.controls = {
    ...controls,
    mtr: mtrControl,
    mtr2: mtr2Control,
    mtr3: mtr3Control,
    mtr4: mtr4Control,
  };

  canvas.on('object:rotating', (event) => {
    // 确保有 activeObject 和 transform
    const activeObject = event.target;
    const transform = event.transform;
    if (!activeObject || !transform || !transform.corner) {
      return;
    }

    // 关键：获取正确的上层画布 (交互层)
    const upperCanvas = canvas.upperCanvasEl;
    if (!upperCanvas) {
      return;
    }

    // 根据被拖动的角，更新上层画布的光标
    switch (transform.corner) {
      case 'mtr':
        upperCanvas.style.cursor = rotateIcon(activeObject.angle);
        break;
      case 'mtr2':
        upperCanvas.style.cursor = rotateIcon(activeObject.angle + 90);
        break;
      case 'mtr3':
        upperCanvas.style.cursor = rotateIcon(activeObject.angle + 180);
        break;
      case 'mtr4':
        upperCanvas.style.cursor = rotateIcon(activeObject.angle + 270);
        break;
      default:
        break;
    }
  });
}

export default initControlsRotate;