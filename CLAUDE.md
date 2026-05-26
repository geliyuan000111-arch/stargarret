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
├── services/
│   └── geminiService.ts     # 所有 Gemini API 调用（5个函数）
└── components/
    ├── Sidebar.tsx          # 左侧分类导航
    ├── ChatMessage.tsx      # 对话流中的单条消息
    ├── NoteCard.tsx         # 卡片视图（暂未使用）
    ├── NoteListItem.tsx     # 分类详情页的列表项
    ├── SearchOverlay.tsx    # 全局搜索浮层
    └── PinView.tsx          # Pin 模式紧凑视图（Tauri 桌面专用）
```

## 核心数据模型

`Note`（`types.ts`）是唯一的数据单元，同时承载"笔记"和"聊天消息"两种语义：
- `mode: 'work' | 'chat'` — 工作模式 vs 闲聊模式隔离
- `category: string` — AI 自动分类，特殊值 `'系统'` 用于 AI 回复消息
- `isParsing: boolean` — 链接正在异步解析时的临时状态
- 所有数据存在 `localStorage['smart_notes']`

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
- `priority?: '紧急' | '暂停' | '本周' | '下周'` — 优先级标签，仅工作叽有效
- `tags?: string[]` — 自定义标签数组

全局可复用 tag 列表存在 `localStorage['saved_tags']`（`string[]`）。

## 闲聊叽人设（`localStorage['chat_persona']`）

结构：`{ nickname: string, setting: string, understanding: string }`，每字段上限 100 字。
若有值，`generateChatResponse` 将其注入 systemInstruction 替换默认人设；
若为空，沿用默认"小叽"人设。不影响工作叽。

## 指令频次追踪

工作模式下，每次用 `/指令 内容` 格式提交时，计数存入 `localStorage['command_usage']`（`{ '/待办': 3, ... }`）。Sidebar 常用指令栏展示频次最高的 5 个，无预设。

## 应用模式

- **工作叽**：输入 → AI 分类 → 存储为笔记；支持 `/指令+内容` 格式强制分类
- **闲聊叽**：与小叽自由对话，数据隔离，只有 `/羁绊总结` 一个指令
- **Pin 模式**（`PinView.tsx`）：点击右上角 Pin 按钮进入，窗口缩小至 320×520，最小高度 280。仅展示工作叽笔记，支持分类切换、标注优先级、标记完成；无输入/备注/搜索能力。提供"始终最前"开关（钉子图标）和"展开"按钮返回完整视图。Tauri 权限：`core:window:allow-set-always-on-top`、`core:window:allow-set-size`、`core:window:allow-set-min-size`。

## 开发约束

- **不引入后端**：数据只走 localStorage，无服务器依赖
- **不引入 UI 组件库**：样式只用 Tailwind + Font Awesome（CDN）
- **密钥安全**：`GEMINI_API_KEY` 只在 `.env.local`，禁止进代码或 commit
- **改完验证**：`npm run build` 检查编译，有 TypeScript 报错必须修掉

## 常见操作

```bash
npm run dev      # 本地开发
npm run build    # 生产构建（也用于类型验证）
npm run preview  # 预览构建产物
npx tsc --noEmit # 纯类型检查（不输出文件）
```
