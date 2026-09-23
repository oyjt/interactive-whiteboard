# 互动白板

基于 Vue 3、TypeScript、Fabric 7 和 Tailwind CSS 4 的互动白板示例。包含画笔与图形、文字、橡皮擦、课件翻页和同步预览。

## 功能

- 画笔、线条、开放式箭头、矩形、圆形、三角形和文字；支持颜色、线宽或字号调整。
- 单击输入文字只显示光标，拖动时指定文字区域；橡皮擦拖动先使对象变灰，松开后删除，并显示短暂轨迹。
- 撤销/重做、对象复制粘贴、键盘移动、删除及 PNG 导出。
- 内置 JPEG 课件翻页，每页分别保存批注和撤销历史；课件并非 PPTX 解析。
- 页面下方的同步预览：默认同页本地预览，配置 WebSocket 后由独立连接接收服务端转发的压缩快照。

## 启动

需要 Node.js 24+、pnpm 10.20.0。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

默认运行方式无需后端。打开 Vite 显示的页面即可编辑；白板内容只在当前会话内存中，刷新前请导出 PNG。

### WebSocket 同步预览

分别打开两个终端运行：

```sh
pnpm sync:server
VITE_WHITEBOARD_WS_URL=ws://127.0.0.1:8787/sync pnpm dev
```

Windows PowerShell 第二条命令可写为：

```powershell
$env:VITE_WHITEBOARD_WS_URL='ws://127.0.0.1:8787/sync'; pnpm dev
```

页面下方显示 `WebSocket 已连接` 后再绘制。主画布和预览画布分别建立发布连接与接收连接，接收端**只加载服务端发回的数据**，无需 iframe。首次连接、绘制完成、文字提交、撤销或课件切换时发送完整 Fabric JSON 快照：先 gzip 压缩，再用 WebSocket 二进制帧传输，无需 Base64。画笔移动过程中的临时轨迹不会发送。预览按顺序加载最新快照；断线后自动重连并重新发送当前内容。

URL 增加 `?room=lesson1` 可以区分演示房间；同一房间只允许一个主画布发布，新发布者会替换前一位。服务默认绑定本机 `127.0.0.1:8787`，单条消息最大 2 MiB，最多创建 20 个房间，最新快照仅存在服务内存里。跨设备访问需把中继服务部署到可访问的地址，并在构建页面时配置 `VITE_WHITEBOARD_WS_URL`；HTTPS 页面必须使用 `wss://`。GitHub Pages 只托管静态文件，默认构建走本地预览，并不运行 WebSocket 中继。

当前页面同时充当发布端与本页预览端，第二个编辑页面进入相同房间会替换原发布者；独立学生端还需实现只读的 `preview` 客户端。中继没有账户权限、持久化或并发编辑合并。公开服务需要先加入鉴权、房间权限和持久化；多人同时编辑需要另行设计对象操作协议和冲突处理。

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

`test` 覆盖历史、设置、箭头序列化和 WebSocket 中继；`test:browser` 会启动 Vite 和临时中继，验证真实浏览器绘制、压缩同步、断线重连、课件与导出。CI 在 Node 24 上运行这些检查。TypeScript 暂固定 5.9.3，因为当前 vue-tsc 版本尚不能加载 TypeScript 7 的内部入口。

代码入口见 [AGENT.md](AGENT.md)，历史调整记录见 [调整清单](docs/adjustment-plan.md)。
