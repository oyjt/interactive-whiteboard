/** 四角旋转手势和随角度变化的指针图标。 */
import {
  Control,
  controlsUtils,
  InteractiveFabricObject,
  TPointerEvent,
  Canvas,
  BasicTransformEvent,
  FabricObject,
} from 'fabric';

/**
 * 根据对象角度生成旋转指针的 SVG 图标。
 */
function rotateIcon(angle: number) {
  return `url("data:image/svg+xml,%3Csvg height='18' width='18' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg' style='color: black;'%3E%3Cg fill='none' transform='rotate(${angle} 16 16)'%3E%3Cpath d='M22.4484 0L32 9.57891L22.4484 19.1478V13.1032C17.6121 13.8563 13.7935 17.6618 13.0479 22.4914H19.2141L9.60201 32.01L0 22.4813H6.54912C7.36524 14.1073 14.0453 7.44023 22.4484 6.61688V0Z' fill='white'/%3E%3Cpath d='M24.0605 3.89587L29.7229 9.57896L24.0605 15.252V11.3562C17.0479 11.4365 11.3753 17.0895 11.3048 24.0879H15.3048L9.60201 29.7308L3.90932 24.0879H8.0806C8.14106 15.3223 15.2645 8.22345 24.0605 8.14313V3.89587Z' fill='black'/%3E%3C/g%3E%3C/svg%3E ") 12 12,crosshair`;
}

/**
 * 创建跟随对象旋转的指针处理函数。
 * @param angleOffset 对应角点相对于对象角度的偏移。
 */
function createRotationCursorHandler(angleOffset: number) {
  return (
    eventData: TPointerEvent,
    control: Control,
    fabricObject: InteractiveFabricObject,
  ): string => {
    return rotateIcon(fabricObject.angle + angleOffset);
  };
}

/**
 * 为四个角点安装旋转热区，并更新拖动时的指针图标。
 */
function initControlsRotate(canvas: Canvas) {
  const corners = [
    { name: 'mtr1', x: -0.5, y: -0.5, angle: 0 },
    { name: 'mtr2', x: 0.5, y: -0.5, angle: 90 },
    { name: 'mtr3', x: 0.5, y: 0.5, angle: 180 },
    { name: 'mtr4', x: -0.5, y: 0.5, angle: 270 },
  ] as const;
  const rotationControls = Object.fromEntries(
    corners.map(({ name, x, y, angle }) => [
      name,
      new Control({
        x,
        y,
        offsetX: x * 20,
        offsetY: y * 20,
        actionName: 'rotate',
        actionHandler: controlsUtils.rotationWithSnapping,
        cursorStyleHandler: createRotationCursorHandler(angle),
        render: () => false,
      }),
    ]),
  );
  InteractiveFabricObject.ownDefaults.controls = {
    ...InteractiveFabricObject.ownDefaults.controls,
    ...rotationControls,
  };

  canvas.on(
    'object:rotating',
    (event: BasicTransformEvent<TPointerEvent> & { target: FabricObject }) => {
      const corner = corners.find(({ name }) => name === event.transform?.corner);
      if (corner) canvas.upperCanvasEl.style.cursor = rotateIcon(event.target.angle + corner.angle);
    },
  );
}

export default initControlsRotate;
