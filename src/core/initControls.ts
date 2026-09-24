/** 自定义 Fabric 对象控制点与删除按钮。 */
import {
  util,
  Control,
  FabricObject,
  controlsUtils,
  InteractiveFabricObject,
  TPointerEvent,
  Transform,
} from 'fabric';

import edgeImg from '../assets/editor/edgecontrol.svg';
// 资源预加载
// 将所有图像资源在模块顶层创建并赋值src，以便它们尽快开始加载。
import verticalImg from '../assets/editor/middlecontrol.svg';
import horizontalImg from '../assets/editor/middlecontrolhoz.svg';
import rotateImg from '../assets/editor/rotateicon.svg';

const verticalImgIcon = document.createElement('img');
verticalImgIcon.src = verticalImg;

const horizontalImgIcon = document.createElement('img');
horizontalImgIcon.src = horizontalImg;

const edgeImgIcon = document.createElement('img');
edgeImgIcon.src = edgeImg;

const rotateImgIcon = document.createElement('img');
rotateImgIcon.src = rotateImg;

const deleteIcon =
  "data:image/svg+xml,%3C%3Fxml version='1.0' encoding='utf-8'%3F%3E%3C!DOCTYPE svg PUBLIC '-//W3C//DTD SVG 1.1//EN' 'http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd'%3E%3Csvg version='1.1' id='Ebene_1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xml:space='preserve'%3E%3Ccircle style='fill:%23F44336;' cx='299.76' cy='439.067' r='218.516'/%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18'/%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179'/%3E%3C/g%3E%3C/svg%3E";

const delImgIcon = document.createElement('img');
delImgIcon.src = deleteIcon;

/** 生成跟随对象旋转的 Fabric 控制点图标绘制器。 */
function createIconRenderer(icon: HTMLImageElement, width: number, height: number) {
  return (
    ctx: CanvasRenderingContext2D,
    left: number,
    top: number,
    styleOverride: any,
    fabricObject: FabricObject,
  ) => {
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(util.degreesToRadians(fabricObject.angle));
    ctx.drawImage(icon, -width / 2, -height / 2, width, height);
    ctx.restore();
  };
}

/** 安装缩放、旋转与删除控制点的图标和行为。 */
function initControls() {
  // 中间横杠
  const mlControl = new Control({
    x: -0.5,
    y: 0,
    offsetX: -1,
    cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
    actionHandler: controlsUtils.scalingXOrSkewingY,
    getActionName: controlsUtils.scaleOrSkewActionName,
    render: createIconRenderer(verticalImgIcon, 20, 25),
  });

  const mrControl = new Control({
    x: 0.5,
    y: 0,
    offsetX: 1,
    cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
    actionHandler: controlsUtils.scalingXOrSkewingY,
    getActionName: controlsUtils.scaleOrSkewActionName,
    render: createIconRenderer(verticalImgIcon, 20, 25),
  });

  const mbControl = new Control({
    x: 0,
    y: 0.5,
    offsetY: 1,
    cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
    actionHandler: controlsUtils.scalingYOrSkewingX,
    getActionName: controlsUtils.scaleOrSkewActionName,
    render: createIconRenderer(horizontalImgIcon, 25, 20),
  });

  const mtControl = new Control({
    x: 0,
    y: -0.5,
    offsetY: -1,
    cursorStyleHandler: controlsUtils.scaleSkewCursorStyleHandler,
    actionHandler: controlsUtils.scalingYOrSkewingX,
    getActionName: controlsUtils.scaleOrSkewActionName,
    render: createIconRenderer(horizontalImgIcon, 25, 20),
  });

  // 顶点
  const tlControl = new Control({
    x: -0.5,
    y: -0.5,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    actionHandler: controlsUtils.scalingEqually,
    render: createIconRenderer(edgeImgIcon, 25, 25),
  });

  const blControl = new Control({
    x: -0.5,
    y: 0.5,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    actionHandler: controlsUtils.scalingEqually,
    render: createIconRenderer(edgeImgIcon, 25, 25),
  });

  const trControl = new Control({
    x: 0.5,
    y: -0.5,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    actionHandler: controlsUtils.scalingEqually,
    render: createIconRenderer(edgeImgIcon, 25, 25),
  });

  const brControl = new Control({
    x: 0.5,
    y: 0.5,
    cursorStyleHandler: controlsUtils.scaleCursorStyleHandler,
    actionHandler: controlsUtils.scalingEqually,
    render: createIconRenderer(edgeImgIcon, 25, 25),
  });

  // 旋转
  const mtrControl = new Control({
    x: 0,
    y: 0.5, // 旋转点在底部中间
    cursorStyle: 'pointer',
    actionHandler: controlsUtils.rotationWithSnapping,
    offsetY: 30, // 旋转手柄的偏移量
    actionName: 'rotate',
    render: createIconRenderer(rotateImgIcon, 40, 40),
  });

  // 删除
  // 删除操作的 handler
  /** 删除当前选中对象，Fabric 对象移除事件将触发历史提交。 */
  function deleteObjectHandler(
    _eventData: TPointerEvent,
    transform: Transform,
    _x: number,
    _y: number,
  ) {
    if (transform.action === 'rotate') return true;
    const owner = transform.target.canvas;
    if (!owner) return false;
    const activeObjects = owner.getActiveObjects();
    if (activeObjects.length > 0) {
      activeObjects.forEach((obj) => owner.remove(obj));
      owner.requestRenderAll();
      owner.discardActiveObject();
    }
    return true;
  }

  const deleteControlInstance = new Control({
    x: 0.5,
    y: -0.5,
    offsetY: -16,
    offsetX: 16,
    cursorStyle: 'pointer',
    mouseUpHandler: deleteObjectHandler,
    // 使用 control 定义的 24x24，而不是 fabricObject.cornerSize
    render: createIconRenderer(delImgIcon, 24, 24),
    sizeX: 24,
    sizeY: 24,
  });

  // 获取默认控件
  const ownDefaults = InteractiveFabricObject.ownDefaults;
  const controls = InteractiveFabricObject.ownDefaults.controls;

  // 设置全局样式
  InteractiveFabricObject.ownDefaults = {
    ...ownDefaults,
    transparentCorners: false,
    borderColor: '#51B9F9',
    cornerColor: '#FFF',
    borderScaleFactor: 2.5,
    cornerStyle: 'circle',
    cornerStrokeColor: '#0E98FC',
    borderOpacityWhenMoving: 1,
    controls: {
      ...controls,
      // 顶点
      tl: tlControl,
      bl: blControl,
      tr: trControl,
      br: brControl,
      // 中间
      ml: mlControl,
      mr: mrControl,
      mb: mbControl,
      mt: mtControl,
      // 旋转
      mtr: mtrControl,
      // 删除
      deleteControl: deleteControlInstance,
    },
  };
}

export default initControls;
