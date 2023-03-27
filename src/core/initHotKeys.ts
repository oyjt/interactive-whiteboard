/**
 * 快捷键功能
 */

import { Canvas, Object } from 'fabric/fabric-impl';
import hotkeys from 'hotkeys-js';

const keyNames = {
  lrdu: 'left,right,down,up', // 左右上下
  backspace: 'backspace', // backspace键盘
  ctrlz: 'ctrl+z', // 撤销
  ctrly: 'ctrl+y', // 恢复
  ctrlc: 'ctrl+c', // 复制
  ctrlv: 'ctrl+v', // 粘贴
};

function copyElement(canvas:Canvas) {
  let copyEl: Object | null = null;

  // 复制
  hotkeys(keyNames.ctrlc, () => {
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    activeObject.clone((_copyEl: Object) => {
      canvas.discardActiveObject();
      _copyEl.set({
        left: (_copyEl.left as number) + 20,
        top: (_copyEl.top as number) + 20,
        evented: true,
      });
      copyEl = _copyEl;
    });
  });
  // 粘贴
  hotkeys(keyNames.ctrlv, () => {
    if (!copyEl) return;
    canvas.add(copyEl);
    canvas.setActiveObject(copyEl);
  });
}

function initHotkeys(canvas: Canvas) {
  // 删除快捷键
  hotkeys(keyNames.backspace, () => {
    const activeObject = canvas.getActiveObjects();
    if (activeObject) {
      activeObject.map((item) => canvas.remove(item));
      canvas.requestRenderAll();
      canvas.discardActiveObject();
    }
  });

  // 移动快捷键
  hotkeys(keyNames.lrdu, (event, handler) => {
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      switch (handler.key) {
        case 'left':
          activeObject.set('left', (activeObject.left as number) - 1);
          break;
        case 'right':
          activeObject.set('left', (activeObject.left as number) + 1);
          break;
        case 'down':
          activeObject.set('top', (activeObject.top as number) + 1);
          break;
        case 'up':
          activeObject.set('top', (activeObject.top as number) - 1);
          break;
        default:
      }
      canvas.renderAll();
    }
  });

  // 复制粘贴
  copyElement(canvas);
}

export default initHotkeys;
export { keyNames, hotkeys };
