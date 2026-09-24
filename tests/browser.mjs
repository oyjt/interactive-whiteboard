import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');

const server = await createServer({
  root: fileURLToPath(new URL('..', import.meta.url)),
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
});
await server.listen();
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_EXECUTABLE,
  args: JSON.parse(process.env.CHROMIUM_ARGS || '[]'),
});
const page = await browser.newPage({ viewport: { width: 1100, height: 1200 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('dialog', (d) => d.accept());
const board = async (fn, arg) =>
  page.evaluate(
    ({ fn, arg }) =>
      new Function('b', 'arg', `return (${fn})(b,arg)`)(
        document.querySelector('#app').__vue_app__._instance.setupState.canvas,
        arg,
      ),
    { fn: fn.toString(), arg },
  );
const count = async (n) =>
  page.waitForFunction(
    (n) =>
      document.querySelector('#app').__vue_app__._instance.setupState.canvas.getObjects().length ===
      n,
    n,
  );
const idle = () =>
  page.waitForFunction(
    () =>
      !document.querySelector('#app').__vue_app__._instance.setupState.canvas.getHistoryState()
        .busy,
  );
async function setSize(region, value) {
  const slider = page.getByRole('region', { name: region }).getByRole('slider');
  await slider.evaluate((input, size) => {
    input.value = String(size);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
  assert.equal(Number(await slider.inputValue()), value);
}
async function draw(x = 400, y = 120, dx = 140, dy = 40) {
  const box = await page.locator('.upper-canvas').boundingBox();
  await page.mouse.move(box.x + x, box.y + y);
  await page.mouse.down();
  await page.mouse.move(box.x + x + dx, box.y + y + dy, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(80);
}
try {
  await page.goto('http://127.0.0.1:5173/interactive-whiteboard/');
  await page.waitForSelector('.upper-canvas');
  assert.equal(
    await page.getByTestId('canvas-scroll').evaluate((el) => el.scrollWidth > el.clientWidth),
    false,
  );
  await page.getByText('gzip / Base64 本地模拟 · 内容变更后更新').waitFor();
  assert.equal(
    await page
      .getByRole('toolbar', { name: '绘图工具' })
      .evaluate((el) => getComputedStyle(el).flexDirection),
    'column',
  );
  assert.equal(await page.getByRole('button', { name: '切换工具设置' }).count(), 0);
  for (const name of ['笔', '文本', '三角形', '圆形', '矩形', '直线', '箭头']) {
    assert.equal(
      await page.getByRole('button', { name, exact: true }).getByTestId('settings-corner').count(),
      1,
    );
  }
  for (const name of ['选择', '橡皮擦', '清除批注']) {
    assert.equal(
      await page.getByRole('button', { name, exact: true }).getByTestId('settings-corner').count(),
      0,
    );
  }
  assert.notEqual(
    await page
      .getByRole('button', { name: '笔', exact: true })
      .locator('.tool-icon')
      .evaluate((el) => getComputedStyle(el).maskImage),
    'none',
  );
  assert.equal(
    await page
      .getByRole('button', { name: '笔', exact: true })
      .evaluate((el) => getComputedStyle(el).color),
    'rgb(37, 99, 235)',
  );
  assert.equal(
    await page
      .getByRole('button', { name: '笔', exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor),
    'rgba(0, 0, 0, 0)',
  );
  assert.deepEqual(
    await page
      .getByRole('button', { name: '笔', exact: true })
      .getByTestId('settings-corner')
      .evaluate((el) => ({
        width: getComputedStyle(el).borderBottomWidth,
        color: getComputedStyle(el).borderBottomColor,
      })),
    { width: '4px', color: 'rgb(37, 99, 235)' },
  );
  await page.getByRole('button', { name: '笔', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: '笔', exact: true }).getAttribute('aria-expanded'),
    'true',
  );
  const panelBounds = await page.getByRole('region', { name: '画笔设置' }).boundingBox();
  const pencilBounds = await page.getByRole('button', { name: '笔', exact: true }).boundingBox();
  assert.ok(panelBounds.height < 170 && panelBounds.x > pencilBounds.x + pencilBounds.width);
  assert.equal(
    await page
      .getByRole('region', { name: '画笔设置' })
      .getByRole('slider', { name: '画笔尺寸' })
      .count(),
    1,
  );
  assert.equal(
    await page
      .getByRole('region', { name: '画笔设置' })
      .getByRole('group', { name: '画笔颜色' })
      .count(),
    1,
  );
  await page.getByRole('button', { name: '笔', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: '笔', exact: true }).getAttribute('aria-expanded'),
    'false',
  );
  await page.getByRole('button', { name: '笔', exact: true }).click();
  await page.keyboard.press('Escape');
  assert.equal(
    await page.getByRole('button', { name: '笔', exact: true }).getAttribute('aria-expanded'),
    'false',
  );
  await page.getByRole('button', { name: '笔', exact: true }).click();
  await page.getByRole('heading', { name: '互动白板' }).click();
  assert.equal(
    await page.getByRole('button', { name: '笔', exact: true }).getAttribute('aria-expanded'),
    'false',
  );
  await board((b) => b.setDrawingTool('select'));
  await page.locator('.upper-canvas').click({ position: { x: 350, y: 120 } });
  assert.deepEqual(
    await page.locator('.upper-canvas').evaluate((el) => ({
      focused: document.activeElement === el,
      outline: getComputedStyle(el).outlineStyle,
    })),
    { focused: true, outline: 'none' },
  );
  await board((b) => b.setDrawingTool('pencil'));
  await board((b) => b.getCanvas().upperCanvasEl.focus());
  await page.keyboard.press('1');
  assert.equal(await board((b) => b.getDrawingTool()), 'select');
  await page.keyboard.press('2');
  assert.equal(await board((b) => b.getDrawingTool()), 'pencil');
  assert.equal(
    await page
      .getByRole('button', { name: '选择', exact: true })
      .evaluate((el) => getComputedStyle(el).color),
    'rgb(68, 78, 96)',
  );
  console.log('PASS toolbar toggles, dismissal, focused shortcuts and original layout');
  assert.equal(
    await page.getByRole('button', { name: '笔', exact: true }).getAttribute('aria-expanded'),
    'true',
  );
  await setSize('画笔设置', 10);
  await page.getByRole('button', { name: '选择颜色 #3b82f6', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: '撤销', exact: true }).isDisabled(), true);
  await draw();
  await count(1);
  assert.deepEqual(
    await board((b) => ({ color: b.getObjects()[0].stroke, width: b.getObjects()[0].strokeWidth })),
    { color: '#3b82f6', width: 10 },
  );
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await count(0);
  await idle();
  await page.getByRole('button', { name: '重做', exact: true }).click();
  await count(1);
  await idle();
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await count(0);
  await idle();
  await draw(420, 220);
  await count(1);
  assert.equal(await page.getByRole('button', { name: '重做', exact: true }).isDisabled(), true);
  console.log('PASS brush settings, initial undo, redo and history branching');
  await page.getByRole('button', { name: '橡皮擦', exact: true }).click();
  assert.equal(
    await page.getByRole('button', { name: '橡皮擦', exact: true }).getAttribute('aria-expanded'),
    null,
  );
  assert.equal(await page.getByRole('region', { name: '橡皮擦设置' }).count(), 0);
  await page.getByRole('button', { name: '橡皮擦', exact: true }).click();
  assert.equal(await page.getByRole('region', { name: /设置/ }).count(), 0);
  assert.equal(await board((b) => b.getCanvas().isDrawingMode), false);
  await page.getByRole('button', { name: '笔', exact: true }).click();
  assert.equal(await board((b) => b.getCanvas().freeDrawingBrush.width), 10);
  await page.reload();
  await page.waitForSelector('.upper-canvas');
  assert.deepEqual(await board((b) => b.getBrushSettings()), {
    color: '#3b82f6',
    width: 10,
    fontSize: 24,
  });
  console.log('PASS fixed eraser width and stroke settings persistence');
  for (const name of ['直线', '箭头', '矩形', '圆形', '三角形']) {
    await page.getByRole('button', { name, exact: true }).click();
    assert.equal(
      await page.getByRole('button', { name, exact: true }).getAttribute('aria-expanded'),
      'true',
    );
    if (name === '直线') {
      await page.getByRole('button', { name, exact: true }).click();
      assert.equal(
        await page.getByRole('button', { name, exact: true }).getAttribute('aria-expanded'),
        'false',
      );
      await page.getByRole('button', { name, exact: true }).click();
    }
    await setSize(`${name}设置`, 5);
    await page
      .getByRole('region', { name: `${name}设置` })
      .getByRole('button', { name: '选择颜色 #a855f7' })
      .click();
    await draw(400, 150);
    await count(1);
    assert.deepEqual(
      await board((b) => ({
        color: b.getObjects()[0].stroke,
        width: b.getObjects()[0].strokeWidth,
      })),
      { color: '#a855f7', width: 5 },
    );
    assert.deepEqual(
      await board((b) => ({
        origin: [b.getObjects()[0].originX, b.getObjects()[0].originY],
        left: Math.round(b.getObjects()[0].getBoundingRect().left),
      })),
      { origin: ['center', 'center'], left: 398 },
    );
    await page.getByRole('button', { name: '撤销', exact: true }).click();
    await count(0);
    await idle();
  }
  console.log('PASS line, arrow and shape color/width settings');
  await page.getByRole('button', { name: '文本', exact: true }).click();
  await setSize('文字设置', 32);
  await page
    .getByRole('region', { name: '文字设置' })
    .getByRole('button', { name: '选择颜色 #22c55e' })
    .click();
  await page.reload();
  await page.waitForSelector('.upper-canvas');
  assert.deepEqual(await board((b) => b.getBrushSettings()), {
    color: '#22c55e',
    width: 5,
    fontSize: 32,
  });
  await page.getByRole('button', { name: '文本', exact: true }).click();
  let canvasBox = await page.locator('.upper-canvas').boundingBox();
  await page.mouse.click(canvasBox.x + 400, canvasBox.y + 120);
  await count(1);
  assert.deepEqual(
    await board((b) => ({
      editing: b.getObjects()[0].isEditing,
      borders: b.getObjects()[0].hasBorders,
      controls: b.getObjects()[0].hasControls,
      color: b.getObjects()[0].fill,
      fontSize: b.getObjects()[0].fontSize,
      type: b.getObjects()[0].constructor.type,
    })),
    {
      editing: true,
      borders: false,
      controls: false,
      color: '#22c55e',
      fontSize: 32,
      type: 'IText',
    },
  );
  assert.equal(await page.locator('.text-drag-preview').count(), 0);
  await board((b) => b.setDrawingTool('select'));
  await count(0);
  await idle();
  assert.equal(await page.getByRole('button', { name: '撤销', exact: true }).isDisabled(), true);
  await page.getByRole('button', { name: '文本', exact: true }).click();
  await page.mouse.click(canvasBox.x + 400, canvasBox.y + 120);
  await page.keyboard.type('单击输入文字');
  await board((b) => b.setDrawingTool('select'));
  await count(1);
  await idle();
  assert.equal(await board((b) => b.getObjects()[0].text), '单击输入文字');
  assert.ok(Math.abs((await board((b) => b.getObjects()[0].getBoundingRect().left)) - 400) < 3);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await count(0);
  await idle();
  await page.getByRole('button', { name: '文本', exact: true }).click();
  canvasBox = await page.locator('.upper-canvas').boundingBox();
  await page.mouse.move(canvasBox.x + 350, canvasBox.y + 250);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 530, canvasBox.y + 315, { steps: 8 });
  assert.equal(await page.locator('.text-drag-preview').count(), 1);
  assert.equal(await board((b) => b.getObjects().length), 0);
  assert.ok((await page.locator('.text-drag-preview').boundingBox()).width >= 170);
  await page.mouse.up();
  await count(1);
  assert.deepEqual(
    await board((b) => ({
      type: b.getObjects()[0].constructor.type,
      editing: b.getObjects()[0].isEditing,
      width: Math.round(b.getObjects()[0].width),
      borders: b.getObjects()[0].hasBorders,
    })),
    { type: 'Textbox', editing: true, width: 180, borders: false },
  );
  assert.equal(await page.locator('.text-drag-preview').count(), 0);
  await page.keyboard.type('Wrap this text inside the dragged region.');
  assert.ok(await board((b) => b.getObjects()[0].textLines.length > 1));
  await board((b) => b.setDrawingTool('select'));
  await idle();
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await count(0);
  await idle();
  console.log('PASS borderless click text, drag-only dashed region, wrapping and empty cleanup');
  await page.getByRole('button', { name: '箭头', exact: true }).click();
  await draw(400, 150);
  await count(1);
  const arrowPixels = await board((b) =>
    [
      [523, 180],
      [524, 175],
    ].map(
      ([x, y]) => b.getCanvas().lowerCanvasEl.getContext('2d').getImageData(x, y, 1, 1).data[3],
    ),
  );
  assert.ok(arrowPixels[0] < 40 && arrowPixels[1] > 128, '箭头尖应是开放的两条线，不含三角形底边');
  assert.equal(await board((b) => b.getObjects()[0].constructor.type), 'Arrow');
  await page.waitForFunction(
    () =>
      document.querySelector('#canvas2').getContext('2d').getImageData(524, 175, 1, 1).data[3] >
      128,
  );
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await count(0);
  await idle();
  await page.waitForFunction(
    () =>
      document.querySelector('#canvas2').getContext('2d').getImageData(524, 175, 1, 1).data[3] ===
      0,
  );
  await page.getByRole('button', { name: '重做', exact: true }).click();
  await count(1);
  await idle();
  assert.equal(await board((b) => b.getObjects()[0].constructor.type), 'Arrow');
  assert.equal(await board((b) => b.getObjects()[0].erasable), true);
  console.log('PASS arrow and erasable serialization in history and encoded preview');
  await page.getByRole('button', { name: '橡皮擦', exact: true }).click();
  canvasBox = await page.locator('.upper-canvas').boundingBox();
  await page.mouse.move(canvasBox.x + 405, canvasBox.y + 185);
  await page.mouse.down();
  assert.equal(await page.locator('.eraser-trail').count(), 1);
  assert.equal(await board((b) => b.getObjects()[0].opacity), 1);
  await page.mouse.up();
  assert.equal(await page.locator('.eraser-trail').count(), 0);
  assert.equal(await board((b) => b.getObjects().length), 1);
  await page.mouse.move(canvasBox.x + 405, canvasBox.y + 152);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + 425, canvasBox.y + 158, { steps: 3 });
  await page.waitForFunction(() => {
    const trail = document.querySelector('.eraser-trail');
    if (!trail) return false;
    const { data } = trail.getContext('2d').getImageData(400, 145, 35, 25);
    return data.some((value, index) => index % 4 === 3 && value > 0);
  });
  await page.waitForFunction(
    () =>
      document.querySelector('#app').__vue_app__._instance.setupState.canvas.getObjects()[0]
        ?.opacity === 0.55,
  );
  assert.equal(await board((b) => b.getObjects().length), 1);
  assert.equal(await board((b) => b.getObjects()[0].stroke), '#6b7280');
  await page.mouse.up();
  assert.equal(await page.locator('.eraser-trail').count(), 0);
  await count(0);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await count(1);
  await idle();
  assert.equal(await board((b) => b.getObjects()[0].opacity), 1);
  assert.equal(await board((b) => b.getObjects()[0].stroke), '#22c55e');
  console.log('PASS restored objects remain erasable');
  await page.getByRole('button', { name: '选择', exact: true }).click();
  await board((b) => {
    b.getCanvas().setActiveObject(b.getObjects()[0]);
    b.getCanvas().upperCanvasEl.focus();
  });
  await page.keyboard.press('Control+c');
  await page.waitForTimeout(100);
  await page.keyboard.press('Control+v');
  await count(2);
  await page.keyboard.press('Control+v');
  await count(3);
  assert.equal(await board((b) => new Set(b.getObjects()).size), 3);
  await page.keyboard.press('Backspace');
  await count(2);
  await page.keyboard.press('Control+z');
  await count(3);
  await idle();
  console.log('PASS independent paste, keyboard delete and undo');
  await page.getByRole('button', { name: '打开示例课件', exact: true }).click();
  await idle();
  await count(0);
  assert.deepEqual(
    await board((b) => ({
      left: b.getCanvas().backgroundImage.left,
      top: b.getCanvas().backgroundImage.top,
    })),
    { left: 400, top: 225 },
  );
  await page.getByRole('button', { name: '笔', exact: true }).click();
  await draw(400, 180);
  await count(1);
  const page1 = await board((b) => JSON.stringify(b.toJSON()));
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await idle();
  await count(0);
  await draw(450, 260);
  await count(1);
  const page2 = await board((b) => JSON.stringify(b.toJSON()));
  assert.notEqual(page1, page2);
  await page.getByRole('button', { name: '上一页', exact: true }).click();
  await idle();
  await count(1);
  assert.equal(await board((b) => JSON.stringify(b.toJSON())), page1);
  await page.getByRole('button', { name: '清除批注', exact: true }).click();
  await count(0);
  assert.equal(await board((b) => !!b.getCanvas().backgroundImage), true);
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await idle();
  await count(1);
  assert.equal(await board((b) => JSON.stringify(b.toJSON())), page1);
  console.log('PASS page isolation, page history and clear preserving background');
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出 PNG', exact: true }).click();
  const file = await download;
  assert.match(file.suggestedFilename(), /\.png$/);
  assert.equal(await file.failure(), null);

  console.log('PASS PNG export');
  await page.getByRole('button', { name: '页面预览', exact: true }).click();
  await page.locator('.page-box').nth(1).click();
  await idle();
  assert.equal(await board((b) => JSON.stringify(b.toJSON())), page2);
  await page.locator('.page-box-under-right').nth(1).click();
  await idle();
  assert.equal(await board((b) => b.getScenes().length), 5);
  console.log('PASS thumbnail navigation and page deletion');
  await page.locator('.menu-head-btn').click();
  assert.deepEqual(errors, []);
  if (process.env.SCREENSHOT_PATH)
    await page.screenshot({ path: process.env.SCREENSHOT_PATH, fullPage: true });
  await page.setViewportSize({ width: 390, height: 900 });
  assert.deepEqual(
    await page.evaluate(() => ({
      pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      canvasScrolls:
        document.querySelector('[data-testid="canvas-scroll"]').scrollWidth >
        document.querySelector('[data-testid="canvas-scroll"]').clientWidth,
      frames: [document.querySelector('#canvas'), document.querySelector('#canvas2')].map(
        (canvas) => Math.round(canvas.getBoundingClientRect().width),
      ),
    })),
    { pageOverflows: false, canvasScrolls: false, frames: [366, 366] },
  );
  assert.equal(
    await page
      .getByRole('toolbar', { name: '绘图工具' })
      .evaluate((el) => getComputedStyle(el).flexDirection),
    'row',
  );
  const mobileCanvas = await page.locator('.upper-canvas').boundingBox();
  const originalCount = await board((b) => b.getObjects().length);
  await page.mouse.move(
    mobileCanvas.x + mobileCanvas.width * 0.5,
    mobileCanvas.y + mobileCanvas.height * 0.55,
  );
  await page.mouse.down();
  await page.mouse.move(
    mobileCanvas.x + mobileCanvas.width * 0.65,
    mobileCanvas.y + mobileCanvas.height * 0.65,
    { steps: 10 },
  );
  await page.mouse.up();
  await count(originalCount + 1);
  assert.ok(
    Math.abs((await board((b) => b.getObjects().at(-1).getBoundingRect().left)) - 400) < 12,
  );
  await page.getByRole('button', { name: '箭头', exact: true }).click();
  const mobilePanel = await page.getByRole('region', { name: '箭头设置' }).boundingBox();
  assert.ok(mobilePanel.x >= 0 && mobilePanel.x + mobilePanel.width <= 390);
  assert.ok(mobilePanel.y >= mobileCanvas.y);
  assert.equal(
    await page
      .getByRole('region', { name: '箭头设置' })
      .locator('input[type="color"]')
      .evaluate((input) => {
        const rect = input.getBoundingClientRect();
        return (
          document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === input
        );
      }),
    true,
  );
  console.log('PASS responsive canvases and horizontal mobile toolbar');
  await page.evaluate(() => document.querySelector('#app').__vue_app__.unmount());
  await page.waitForTimeout(100);
  assert.deepEqual(errors, []);
  console.log('PASS unmount cleanup');
  console.log('ALL BROWSER CHECKS PASSED');
} finally {
  await browser.close();
  await server.close();
}
