# Agent 开发指南

本文件供维护本项目的 AI agent 和开发者阅读。面向使用者的运行说明在 [README.md](README.md)。

## 项目边界

- Vue 3 + TypeScript + Vite 8，画布使用 Fabric 7，样式使用 Tailwind CSS 4；Node 24、pnpm 10.20.0。
- 保持现有页面的上下两块画布；桌面为纵向工具栏，手机为横向工具栏。不要为预览嵌套第二个 Vue 应用或 iframe。
- 同步预览只做 gzip/Base64 本地模拟，不连接 WebSocket、不维护服务端与协作状态。

## 目录及职责

| 路径 | 职责 |
| --- | --- |
| `src/App.vue` | 唯一的页面入口：画布生命周期、工具栏布局、课件与 PNG 操作。 |
| `src/core/index.ts` | Fabric 绘图工具、事件、场景与画布操作；内容提交通过 `content:changed` 通知外部。 |
| `src/core/preview.ts` | 接收内容快照、模拟传输、串行加载下方预览并释放资源。 |
| `src/core/history.ts`、`brushSettings.ts`、`objects/Arrow.ts`、`eraser.ts` | 历史、配置、基于 Polyline 的可序列化箭头与橡皮擦手势。 |
| `src/utils/previewSync.ts` | gzip、Base64 编解码的本地模拟；注释标明未来可能的发送与接收位置。 |
| `src/components/` | 工具栏、设置、翻页、课件预览及撤销控制。 |
| `src/assets/ppt/`、`src/assets/editor/` | 示例课件和画布控件图像；组件专用图标留在对应组件的 `image/` 下，共用图标放 `src/assets/`。 |
| `src/types/` | Vite 环境与 Vue 模块声明。 |
| `src/styles/index.css` | Tailwind 入口与少量全局规则；模板直接使用 Tailwind 类，复杂特殊样式可保留局部 CSS。 |
| `tests/` | Node 核心与模拟传输测试、Playwright 端到端回归。 |

不要为统一路径而批量移动组件私有 SVG；只在实际复用时移动。删除资源前检查静态引用及 `import.meta.glob`，课件文件依赖该 glob 的路径与排序。

## 同步与 Fabric 约束

1. `after:render` 可能由指针、选框和拖影触发，不能作为同步触发条件。内容提交、撤销和页面切换才处理快照。
2. 将 Fabric JSON 做 gzip 和 Base64 编码，再立即解码、解压，串行调用预览的 `loadFromJSON`，保留最新待处理快照。注释里的 WebSocket 只是将来替换模拟步骤的标记，项目中没有连接或消息事件。
3. Fabric 7 默认对象原点为中心；用中心坐标绘制图形与居中图片，左上角输入坐标通过 `setPositionByOrigin` 转换，不要修改全局 `originX` / `originY` 默认值。调整绘制/序列化时覆盖箭头、文字、橡皮擦及撤销回归。
4. 注册的 `Arrow` 类型和 `erasable` 自定义属性必须在加载快照前就绪；课件图片与页面历史相互独立。
   普通直线和箭头共用 Fabric `Polyline` 两点结构；修改端点时同时重算对象尺寸和中心位置，橡皮擦通过 `pathOffset` 换算命中位置。
5. 此处仅验证序列化、压缩和预览恢复。真正的网络同步还需单独设计协议、鉴权、重连和并发编辑处理。

## 样式与质量门槛

- 新布局和常用 UI 样式直接写在 Vue 模板的 Tailwind v4 `class` 中，不使用 `@apply`；课件面板与 Fabric 覆盖层的特殊几何样式可使用普通 CSS。全局入口放 `src/styles/index.css`，不要新增 Sass、Tailwind v3 配置或不必要的 UI 依赖。
- 画布保持 800×450 的逻辑尺寸，通过 Fabric 的 `cssOnly` 设置让两块画布按容器宽度等比例显示。窄屏不应出现页面横向滚动，触点要按逻辑坐标正确映射。
- 保留工具栏行为和可访问名称、选中态及现有页面结构。更新图标资源时检查 mask 与颜色继承。
- 提交前运行 `pnpm lint`、`pnpm format:check`、`pnpm test`、`pnpm build` 和 `pnpm test:browser`；浏览器检查会验证编码往返后的预览。无法运行某项时明确说明原因，不能将未运行写成通过。
- 使用 Oxlint 检查 TS、JS 与 Vue 脚本，使用 Oxfmt 格式化代码；关键接口与特殊时序用中文 JSDoc 描述，不给每一行添加注释。
- TypeScript 固定为 5.9.3：vue-tsc 3.3.11 无法解析 TS 7 的 `typescript/lib/tsc` 导出；只有相容版本发布且构建、浏览器回归通过后再升级。
- `tsconfig.json` 同时检查 `src/` 与 `vite.config.ts`，使用与 Vite 相符的 Bundler 模块解析；无需额外的 `tsconfig.node.json`。
- 优先对已有模块做小幅提取；橡皮擦手势位于 `src/core/eraser.ts`，页面、历史与绘图入口仍在 `src/core/index.ts`，后续按需求逐步拆分。
- 组件目录沿用 PascalCase；Vue 同时支持 PascalCase 与 kebab-case，保持现有命名一致即可。
