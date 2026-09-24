/** 画布快捷键：删除、移动、撤销、重做及复制粘贴。 */
import { ActiveSelection, Canvas, FabricObject, IText } from 'fabric';
import hotkeys, { type HotkeysEvent } from 'hotkeys-js';

interface Actions {
  changed: () => void;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  isBusy: () => boolean;
  error: () => void;
}

/** 只在画布获得焦点且未输入文字时响应快捷键，返回解除绑定函数。 */
export default function initHotkeys(canvas: Canvas, actions: Actions) {
  let clipboard: FabricObject | undefined;
  let offset = 0;
  let disposed = false;
  const element = canvas.upperCanvasEl;
  element.tabIndex = 0;
  element.setAttribute('aria-label', '白板画布');
  const bindings: Array<() => void> = [];

  /** 包装快捷键与错误处理，并登记对应的解除绑定回调。 */
  function bind(
    keys: string,
    action: (event: KeyboardEvent, handler: HotkeysEvent) => void | Promise<void>,
  ) {
    const callback = (event: KeyboardEvent, handler: HotkeysEvent) => {
      const active = canvas.getActiveObject();
      if (
        disposed ||
        actions.isBusy() ||
        document.activeElement !== element ||
        (active instanceof IText && active.isEditing)
      )
        return;
      event.preventDefault();
      Promise.resolve(action(event, handler)).catch(actions.error);
    };
    hotkeys(keys, callback);
    bindings.push(() => hotkeys.unbind(keys, callback));
  }

  bind('backspace,delete', () => {
    canvas.remove(...canvas.getActiveObjects());
    canvas.discardActiveObject();
    canvas.requestRenderAll();
    actions.changed();
  });
  bind('left,right,up,down', (_, handler) => {
    const object = canvas.getActiveObject();
    if (!object) return;
    object.set({
      left: object.left + (handler.key === 'left' ? -1 : handler.key === 'right' ? 1 : 0),
      top: object.top + (handler.key === 'up' ? -1 : handler.key === 'down' ? 1 : 0),
    });
    object.setCoords();
    canvas.requestRenderAll();
    actions.changed();
  });
  bind('ctrl+z,command+z', actions.undo);
  bind('ctrl+y,ctrl+shift+z,command+shift+z', actions.redo);
  bind('ctrl+c,command+c', async () => {
    const object = canvas.getActiveObject();
    if (object) {
      clipboard = await object.clone();
      offset = 0;
    }
  });
  bind('ctrl+v,command+v', async () => {
    if (!clipboard) return;
    const clone = await clipboard.clone();
    if (disposed || actions.isBusy()) return;
    offset += 20;
    clone.set({ left: clone.left + offset, top: clone.top + offset, evented: true });
    canvas.discardActiveObject();
    if (clone instanceof ActiveSelection) {
      clone.canvas = canvas;
      clone.forEachObject((object) => canvas.add(object));
    } else canvas.add(clone);
    clone.setCoords();
    canvas.setActiveObject(clone);
    canvas.requestRenderAll();
    actions.changed();
  });

  return () => {
    disposed = true;
    bindings.forEach((unbind) => unbind());
    clipboard = undefined;
  };
}
