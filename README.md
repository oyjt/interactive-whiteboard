# 互动白板

基于 Vue 3、TypeScript、Fabric 7 和 Tailwind CSS 4 的互动白板示例。包含画笔与图形、文字、橡皮擦、课件翻页和同步预览。

## 功能

- 画笔、线条、开放式箭头、矩形、圆形、三角形和文字；支持颜色、线宽或字号调整。
- 单击输入文字只显示光标，拖动时指定文字区域；橡皮擦拖动先使对象变灰，松开后删除，并显示短暂轨迹。
- 撤销/重做、对象复制粘贴、键盘移动、删除及 PNG 导出。
- 内置 JPEG 课件翻页，每页分别保存批注和撤销历史；课件并非 PPTX 解析。
- 页面下方的同步预览：通过 gzip、Base64 编码和解码模拟传输，再恢复到第二块画布。

## 启动

需要 Node.js 24+、pnpm 10.20.0。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

无需后端。打开 Vite 显示的页面即可编辑；白板内容只在当前会话内存中，刷新前请导出 PNG。

### 同步预览的模拟链路

主画布在内容提交、撤销或翻页后生成 Fabric JSON，模拟下列传输流程：

```text
主画布 JSON → gzip → Base64 字符串 → Base64 解码 → ungzip → 预览画布加载 JSON
```

模拟函数位于 `src/utils/previewSync.ts`，在发送与接收两处留有注释，可作为将来接入真实 WebSocket 的位置。目前没有 WebSocket 服务、连接或消息接收代码；预览仅在同一个页面中模拟数据编码与恢复，不模拟网络延迟、断线或多人协作。仅在内容变更时更新，指针移动和橡皮擦拖影不会触发全量同步。

样式入口位于 `src/styles/index.css`。页面和工具栏优先在 Vue 模板内使用 Tailwind 类；课件预览面板等具有特殊布局的区域保留局部原生 CSS。组件私有图标与组件就近存放，课件和画布通用素材放在 `src/assets/`。

## 操作

- 选择画笔、图形或文字工具后出现设置面板；再次点击当前工具可开关面板。橡皮擦没有设置面板。修改只影响新建对象。
- 文字单击直接输入，拖动可指定换行宽度；空文本退出会移除。
- 橡皮擦按住拖动时目标置灰，松手删除；删除可撤销，尚不支持局部像素擦除。
- `Ctrl/⌘+Z` 撤销，`Ctrl+Y` 或 `Ctrl/⌘+Shift+Z` 重做，`Ctrl/⌘+C/V` 复制粘贴；方向键移动选中对象，`Delete/Backspace` 删除。
- 清除批注保留当前课件背景并可撤销；删除课件页需要确认，不能撤销。PNG 导出需要图片源允许跨域访问。

## 开发与验证

```sh
pnpm test
pnpm build
pnpm exec playwright install chromium --only-shell
pnpm test:browser
```

`test` 覆盖历史、设置、箭头序列化和 gzip/Base64 模拟往返；`test:browser` 启动 Vite，验证实际绘制、预览同步、课件与导出。CI 在 Node 24 上运行这些检查。TypeScript 暂固定 5.9.3，因为当前 vue-tsc 版本尚不能加载 TypeScript 7 的内部入口。

代码入口见 [AGENT.md](AGENT.md)，历史调整记录见 [调整清单](docs/adjustment-plan.md)。
