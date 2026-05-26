# 星星阁楼 StarGarret

一个跑在本地的 AI 笔记 + 陪伴 app。

## What

日常有两种碎片内容很难处理：**随手记的想法**和**想找人说说话的情绪**。

普通笔记 app 要手动分类，懒得用。聊天 app 没有记录沉淀。星星阁楼把这两件事合在一个对话框里：直接输入，AI 自动帮你分类存档；切换模式，AI 陪你聊几句。数据留在本地，不上云。

## Architecture

```
输入框
  │
  ├─ 工作叽模式
  │    ├─ 普通文本 → Gemini 自动分类 → 存入对应分类
  │    ├─ /指令 内容 → 跳过 AI，直接强制分类
  │    ├─ URL → Gemini + Google Search 解析标题摘要
  │    └─ 分类详情页输入 → Gemini 语义搜索
  │
  └─ 闲聊叽模式
       ├─ 普通消息 → Gemini 扮演「小叽」回复
       └─ /羁绊总结 → 总结近期聊天，存入「羁绊」分类

数据层：localStorage（纯本地，无后端）
打包层：Tauri v2（React → macOS .app）
```

**核心文件：**

| 文件 | 职责 |
|------|------|
| `App.tsx` | 全部状态和交互逻辑 |
| `services/geminiService.ts` | 所有 Gemini API 调用 |
| `types.ts` | 数据模型（Note 同时承载笔记和聊天消息） |
| `src-tauri/` | Tauri 桌面打包配置 |

## Setup

**依赖：** Node.js、Rust（通过 rustup 安装）

```bash
# 1. 安装依赖
npm install

# 2. 填入 Gemini API key（从 aistudio.google.com 获取）
echo "GEMINI_API_KEY=你的key" > .env.local

# 3. 开发模式（热更新）
npm run tauri:dev

# 4. 打包成 .app / .dmg
npm run tauri:build
# 产物在 src-tauri/target/release/bundle/macos/
```

**纯前端调试（不需要 Rust）：**
```bash
npm run dev   # 浏览器打开 localhost:3000
```

## TODO

- [ ] 数据导出：支持将笔记导出为 Markdown 或 CSV
- [ ] 本地数据备份/恢复：防止清缓存丢数据
- [ ] 模型名稳定化：当前使用 `gemini-3-flash-preview`，需跟进替换为稳定版本名
- [ ] 离线状态提示：网络不通时给出明确反馈，而不是静默失败
- [ ] 窗口记忆：记住上次的窗口大小和位置
