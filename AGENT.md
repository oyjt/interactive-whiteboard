# Agent 开发指南

本文件供维护本项目的 AI agent 和开发者阅读。面向使用者的运行说明在 [README.md](README.md)。

## 项目边界

- Vue 3 + TypeScript + Vite 8，画布使用 Fabric 7，样式使用 Tailwind CSS 4；Node 24、pnpm 10.20.0。
- 保持现有页面的上下两块画布与纵向工具栏，不要为预览嵌套第二个 Vue 应用或 iframe。
- 预览有两种明确模式：没有配置 `VITE_WHITEBOARD_WS_URL` 时直接加载本地快照；配置后预览只消费独立 WebSocket 接收连接，不能悄悄回退为本地数据。
- 单主画布发布快照是演示范围，勿将中继描述为安全的多人协作服务。

## 目录及职责

| 路径 | 职责 |
| --- | --- |
| `src/App.vue` | 页面布局、画布创建和销毁、业务入口；不放 WebSocket 状态机。 |
| `src/core/index.ts` | Fabric 绘图工具、事件、场景与画布操作；内容提交通过 `content:changed` 通知外部。 |
| `src/core/history.ts`、`brushSettings.ts`、`objects/Arrow.ts` | 独立的历史、配置、可序列化箭头模型。 |
| `src/services/boardSync.ts` | 浏览器发布/预览双连接、gzip 编解码、断线重连及资源释放。 |
| `server/sync.mjs` | 本地 WebSocket 中继：按房间保存最近二进制快照，转发给预览连接。 |
| `src/components/` | 工具栏、设置、翻页、课件预览及撤销控制。 |
| `src/assets/ppt/`、`src/assets/editor/` | 示例课件和画布控件图像；组件私有图标留在对应组件的 `image/` 下，共用图标放 `src/assets/`。 |
| `src/style.css` | Tailwind 入口与少量全局样式；局部特殊样式留在组件内。 |
| `tests/` | Node 核心与中继测试、Playwright 端到端回归。 |

不要为统一路径而批量移动组件私有 SVG；只在实际复用时移动。删除资源前检查静态引用及 `import.meta.glob`，课件文件依赖该 glob 的路径与排序。

## 同步与 Fabric 约束

1. `after:render` 可能由指针、选框和拖影触发，不能作为网络发送条件。内容提交、撤销和页面切换才发送快照。
2. 发布端对 Fabric JSON 做 gzip，直接发送二进制 WebSocket 帧；接收端解压后串行调用 `loadFromJSON`，保留最新待处理快照。不要再引入 Base64 往返。
3. Fabric 7 默认对象原点改为中心；本项目在 `src/core/index.ts` 显式设置左上角原点以兼容既有绘制坐标。调整绘制/序列化时覆盖箭头、文字、橡皮擦及撤销回归。
4. 注册的 `Arrow` 类型和 `erasable` 自定义属性必须在加载快照前就绪；课件图片与页面历史相互独立。
5. WebSocket 中继内存缓存不是持久化；服务端没有鉴权或并发编辑合并。增加公开访问前需设计权限及协议。

## 样式与质量门槛

- 新布局和常用 UI 样式优先 Tailwind v4 实用类或 `@apply`；组件中使用 `@apply` 时添加 `@reference "tailwindcss"`。课件面板与 Fabric 覆盖层的特殊几何样式可使用普通 CSS。不要新增 Sass、Tailwind v3 配置或不必要的 UI 依赖。
- 保留工具栏行为和可访问名称、选中态及现有页面结构。更新图标资源时检查 mask 与颜色继承。
- 提交前运行 `pnpm test`、`pnpm build` 和 `pnpm test:browser`；浏览器检查会自动启用临时 WebSocket 中继。无法运行某项时明确说明原因，不能将未运行写成通过。
- TypeScript 固定为 5.9.3：vue-tsc 3.3.11 无法解析 TS 7 的 `typescript/lib/tsc` 导出；只有相容版本发布且构建、浏览器回归通过后再升级。
- 优先对已有模块做小幅提取；`src/core/index.ts` 目前较大，新增绘图工具时可按工具拆分，但不要进行无需求的全量重写。
