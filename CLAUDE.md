# 星星阁楼 (StarGarret) v2.0.0

## 项目简介

一个 AI 驱动的个人笔记 + 陪伴聊天 Web App。用 Gemini API 自动分类笔记，并提供名为"小叽"的 AI 聊天伴侣。

## 技术栈

- **框架**: React 19 + TypeScript + Vite 6
- **AI**: Google Gemini API（`@google/genai` v1.40+）
- **样式**: Tailwind CSS（CDN 引入）
- **数据持久化**: localStorage（无后端）

## 本地启动

```bash
npm install
# 在 .env.local 中设置 GEMINI_API_KEY
npm run dev
```

## 目录结构

```
├── App.tsx                  # 主组件，包含所有状态和交互逻辑
├── types.ts                 # Note、LinkMetadata 等类型定义，及分类颜色映射
├── index.tsx                # 应用入口
├── utils/
│   └── openUrl.ts           # 统一 URL 跳转：Tauri 环境用 plugin-shell open()，浏览器 fallback window.open
├── services/
│   └── geminiService.ts     # 所有 Gemini API 调用（5个函数）
├── components/
│   ├── Sidebar.tsx          # 左侧分类导航
│   ├── ChatMessage.tsx      # 对话流中的单条消息
│   ├── NoteCard.tsx         # 卡片视图（暂未使用）
│   ├── NoteListItem.tsx     # 分类详情页的列表项（含链接渲染逻辑）
│   ├── SearchOverlay.tsx    # 全局搜索浮层
│   ├── SettingsModal.tsx    # 设置弹窗（API key、数据管理）
│   └── PinView.tsx          # Pin 模式紧凑视图（Tauri 桌面专用）
└── src-tauri/
    ├── Cargo.toml           # 依赖：tauri-plugin-shell、objc（macOS）
    ├── tauri.conf.json      # 窗口配置、app 元数据
    ├── capabilities/
    │   └── default.json     # Tauri 权限声明
    └── src/
        ├── main.rs          # 程序入口（调用 lib::run）
        └── lib.rs           # Tauri 命令：set_pin_window_level（macOS objc 实现）
```

## 核心数据模型

`Note`（`types.ts`）是唯一的数据单元，同时承载"笔记"和"聊天消息"两种语义：
- `mode: 'work' | 'chat'` — 工作模式 vs 闲聊模式隔离
- `category: string` — AI 自动分类，特殊值 `'系统'` 用于 AI 回复消息
- `isParsing: boolean` — 链接正在异步解析时的临时状态
- 所有数据存在 `localStorage['smart_notes']`

其他 localStorage key：`gemini_api_key`、`saved_tags`、`command_usage`、`api_tip_dismissed`（无 API key 时底部引导 tip 的关闭状态）、`pin_always_on_top`（Pin 模式"始终在最前"偏好，boolean 字符串，默认 `true`）

`Note.pinned`（`boolean`）存在 `localStorage['smart_notes']` 的笔记数据里，随笔记一同持久化。

## 设置页（`components/SettingsModal.tsx`）

点击左上角 logo 打开，包含：
- **AI 配置**：运行时填入 Gemini API Key，存入 `localStorage['gemini_api_key']`
- **数据管理**：导出备份（JSON）、从备份恢复（带确认）、清空所有数据（两步确认）

**API Key 优先级**：`localStorage['gemini_api_key']` > `process.env.API_KEY`（编译时）。若两者均为空，AI 功能静默降级，仅保留基础记录能力，Sidebar 底部显示可关闭的引导 tip。

## AI 服务（`geminiService.ts`）

| 函数 | 用途 | 模型 |
|------|------|------|
| `parseNoteWithAI` | 笔记快速分类 | gemini-3-flash-preview |
| `generateChatResponse` | 闲聊对话（小叽） | gemini-3-flash-preview |
| `generateBondSummary` | 羁绊总结 | gemini-3-flash-preview |
| `fetchLinkMetadata` | 链接深度解析（含 Google Search） | gemini-3-flash-preview |
| `searchNotesWithAI` | 语义搜索 | gemini-3-flash-preview |

**注意**：`gemini-3-flash-preview` 是非稳定版本名，模型更新时可能静默失效。

## 笔记扩展字段（`types.ts`）

`Note` 新增：
- `priority?: string` — 优先级标签，PinView 预设值为 `'紧急' | '本周' | '下周' | '暂停'`，仅工作叽有效
- `tags?: string[]` — 自定义标签数组

全局可复用 tag 列表存在 `localStorage['saved_tags']`（`string[]`）。

## 闲聊叽人设

小叽人设硬编码在 `geminiService.ts` 的 `generateChatResponse` systemInstruction 中，无运行时自定义入口。不影响工作叽。

## 指令频次追踪

工作模式下，每次用 `/指令 内容` 格式提交时，计数存入 `localStorage['command_usage']`（`{ '/待办': 3, ... }`）。Sidebar 常用指令栏展示频次最高的 5 个，无预设。

## 应用模式

- **工作叽**：输入 → AI 分类 → 存储为笔记；支持 `/指令+内容` 格式强制分类
- **闲聊叽**：与小叽自由对话，数据隔离，只有 `/羁绊总结` 一个指令
- **Pin 模式**（`PinView.tsx`）：点击右上角"桌面便签"按钮进入，窗口缩小至 320×520，最小高度 280。仅展示工作叽笔记，支持分类切换、标注优先级、标记完成；无输入/搜索能力。提供"始终在最前"开关（钉子图标，调用 `set_pin_window_level` Tauri 命令）和"恢复全屏"按钮返回完整视图。macOS 通过 objc `NSFloatingWindowLevel(3)` + `NSWindowCollectionBehavior(257)` 实现真正置顶；Windows 用 `set_always_on_top`。Tauri 权限：`core:window:allow-set-always-on-top`、`core:window:allow-set-size`、`core:window:allow-set-min-size`、`shell:allow-open`。
  - **始终在最前记忆**：偏好存入 `localStorage['pin_always_on_top']`（boolean），进入 Pin 模式时自动读取并立即应用，默认值 `true`（初次使用即开启置顶）。切换时同步持久化。退出 Pin 模式时始终关闭置顶（不影响存储的偏好）。
  - **双击展开笔记详情**：Pin 模式下双击任意笔记行，在当前窗口内弹出全屏遮罩详情面板，展示笔记完整信息（内容、链接元数据、备注编辑、优先级选择、完成状态、时间戳、删除）。关闭方式：点击遮罩背景或右上角关闭按钮。详情面板复用 `NoteListItem` 逻辑，但以大号卡片样式呈现，适配小窗口宽度。为此 `PinView` 新增 props：`onUpdateRemark`、`onDelete`。
  - **置顶**：Pin 模式列表中每条笔记可单独置顶，置顶的笔记排在列表最前面。`Note` 新增 `pinned?: boolean` 字段，`PinView` 新增 `onTogglePinned` prop。入口为右键笔记行弹出 context menu，包含"置顶"/"取消置顶"选项；已置顶的笔记在内容前显示一个小图钉作为状态指示。

## 发布（GitHub Actions）

`.github/workflows/release.yml`，push tag `v*` 触发，产物：
- **Mac Silicon**：`_aarch64.dmg`（`macos-14` runner，`--target aarch64-apple-darwin`）
- **Windows**：`_x64-setup.exe`（`windows-2022` runner，`--bundles nsis`）
- **Mac Intel**：暂不支持

tag 打法：先把改动 push 到 main，再 `git tag vX.Y.Z && git push origin vX.Y.Z`。

## 交互约定

- **备注输入框**：`NoteListItem`（普通模式）和 `PinView` 详情面板均使用 `<textarea>`，固定最小高度、内容超出后区域内竖向滚动（`overflow-y-auto`），宽度适配容器，`resize-none`。
- **主输入框回车行为**：用 `isComposingRef`（`useRef(false)`）配合 `onCompositionStart`/`onCompositionEnd` 追踪输入法合成态（比 `e.nativeEvent.isComposing` 更可靠，可覆盖 macOS 系统候选词面板场景）。合成中 Enter 仅上屏候选词，不触发 `handleAction()`。

## 开发约束

- **不引入后端**：数据只走 localStorage，无服务器依赖
- **不引入 UI 组件库**：样式只用 Tailwind + Font Awesome（CDN）
- **密钥安全**：`GEMINI_API_KEY` 只在 `.env.local`，禁止进代码或 commit
- **改完验证**：`npm run build` 检查编译，有 TypeScript 报错必须修掉
- **规范先行**：新增模块或改架构，先更新本文件再动代码

## 常见操作

```bash
npm run dev      # 本地开发
npm run build    # 生产构建（也用于类型验证）
npm run preview  # 预览构建产物
npx tsc --noEmit # 纯类型检查（不输出文件）
```
