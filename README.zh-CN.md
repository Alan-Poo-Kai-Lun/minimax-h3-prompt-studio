# MiniMax H3 Prompt Studio

[English](README.md) | [简体中文](README.zh-CN.md)

本地优先的 MiniMax H3 桌面提示词工作台。通过本机或局域网 AI 后端生成 T2VA、I2VA、FL2VA、L2VA、Ref2VA 和 Hybrid 提示词，并集中管理图片、视频、声音参考、剧本策划与可复用 Skill。

**当前源码版本：** v0.8.16 · **最新已发布便携版：** v0.8.4 · **平台：** Windows · **界面语言：** English / 简体中文

[下载 H3PromptStudio-v0.8.4.exe](https://github.com/Alan-Poo-Kai-Lun/minimax-h3-prompt-studio/releases/download/v0.8.4/H3PromptStudio-v0.8.4.exe) · [发布说明](https://github.com/Alan-Poo-Kai-Lun/minimax-h3-prompt-studio/releases/tag/v0.8.4) · [完整更新日志](CHANGELOG.md)

已发布的 EXE 版本早于当前源码；要使用最新修复，请从源码运行，或按下文自行构建便携版。

![MiniMax H3 Prompt Studio 三栏工作区](docs/screenshots/workspace-en.png)

## 主要功能

- 桌面三栏工作区：左侧提示词与剧本，中间生成设置与参考素材，右侧生成结果
- 支持拖动分隔线调整栏宽、单栏专注、自动恢复上次布局，并优化 1366 像素宽度显示
- 直接提示词与“创意内容 → 分段剧本 → 人工确认 → H3 提示词”两种工作流
- T2VA、I2VA、FL2VA、L2VA、Ref2VA 和灵活的 Hybrid 模式
- 最多 12 张 Picture 参考图，支持用途说明、预览、粘贴、复制、替换和拖拽排序
- 参考图排序后自动同步创意、剧本和结果中的 `<Picture N>` 编号
- 通过 `@` 菜单独立插入 `<Picture N>`、`<Video N>` 和 `<Audio N>`
- Video 与 Audio 支持选择或拖入、原生播放器和媒体信息
- Video 支持从自定义时间截取画面，新增或替换首帧 Picture
- 切换模式不会丢失素材，不适用于当前模式的素材只会从本次请求中排除
- 支持 Ollama、LM Studio、llama.cpp Server 和 OpenAI 兼容接口
- 历史、模板和创意增强 Skill 使用可搜索浮层管理
- 支持生成结束后自动卸载模型并释放显存
- 提供 ComfyUI 辅助插件

## 生成模式

| 模式 | 适用场景 | 参考素材规则 |
| --- | --- | --- |
| T2VA | 纯文字生成视频 | 仅使用文字；项目内素材会保留，但不加入本次请求 |
| I2VA | 首帧生成视频 | Picture 1 是 0.00 秒的准确首帧 |
| FL2VA | 首尾帧过渡 | Picture 1 是首帧，Picture 2 是尾帧 |
| L2VA | 指定结尾画面 | Picture 1 是准确尾帧 |
| Ref2VA | 完整视觉参考 | 使用图片定义可复用人物、环境、产品或风格 |
| Hybrid | 混合素材参考 | 自由组合 Picture、Video 和 Audio；首尾帧均为可选 |

## 快速开始

### Windows 便携版

1. 下载 [H3PromptStudio-v0.8.4.exe](https://github.com/Alan-Poo-Kai-Lun/minimax-h3-prompt-studio/releases/download/v0.8.4/H3PromptStudio-v0.8.4.exe)。
2. 启动 Ollama 或其他受支持的 AI 后端。
3. 运行 EXE，工作区通常会在 `http://127.0.0.1:8765` 自动打开。
4. 打开“设置”，选择后端、填写服务地址并测试连接。
5. 选择模型、填写创意内容、设置生成模式，然后生成 H3 提示词。

EXE 不包含 Ollama 或任何 AI 模型。使用 Picture 参考时，需要选择支持图片输入的多模态模型。当前便携版未进行代码签名，因此 Windows 可能会把它识别为未知应用。

v0.8.4 SHA-256：

```text
93EF96F73BE64288925E2989BAE523EADD5B65D3B09C94F36E25B083279C117D
```

### 从源码运行

需要 Python 3.10 或更高版本。运行时服务器只使用 Python 标准库。

```powershell
git clone https://github.com/Alan-Poo-Kai-Lun/minimax-h3-prompt-studio.git
cd minimax-h3-prompt-studio
python server.py
```

也可以双击 `start.bat`。软件默认连接 `http://127.0.0.1:11434` 的 Ollama；其他本地、局域网或 OpenAI 兼容后端可在设置中配置。

## Hybrid 素材工作流

Hybrid 可以使用任意有效的 Picture、Video、Audio 组合，不再强制要求首帧或尾帧。

- 把视频拖入“视频参考”，填写动作、剪辑或运镜用途，并使用 `<Video N>` 引用。
- 直接播放 Video，或者输入指定时间并截取为首帧 Picture。
- 把声音拖入“声音参考”，试听后填写用途，并使用 `<Audio N>` 引用。
- 在不同生成模式之间切换时，上传的素材和用途说明都会保留。

![Hybrid 视频预览和自定义首帧截取](docs/screenshots/hybrid-video-frame-zh.png)

![Hybrid 声音预览](docs/screenshots/hybrid-audio-zh.png)

## 项目、模板与 Skill

项目支持本地新建、保存、导出和导入。模板、生成历史、布局偏好、后端设置和自定义创意增强 Skill 默认保存在当前浏览器配置中。导入的 `SKILL.md` 用于增强创意方向，内置 H3 格式规则仍保持最高优先级。

## ComfyUI 辅助插件

将 `comfyui_plugin/ComfyUI-H3-Prompt-Studio` 复制到 ComfyUI 的 `custom_nodes` 目录，然后重启 ComfyUI 并刷新前端。当前安装和使用方法见[插件说明](comfyui_plugin/ComfyUI-H3-Prompt-Studio/README.md)。

该插件属于辅助集成，目前仍是测试版本，功能尚未完整，仍有已知问题需要修复。

## 隐私与数据流

- 项目、历史、模板、Skill、设置和媒体预览默认保存在当前浏览器配置中。
- 生成请求只发送到“设置”中配置的 AI 后端。
- 当前模式和模型需要视觉参考时，Picture 图片数据可能包含在生成请求中。
- Video 和 Audio 原始文件不会上传到 AI 后端；当前生成请求只使用它们的文件名、用途、说明和引用标签。
- 如果配置局域网或远程后端，适用的提示词数据和 Picture 参考图会发送到该地址。
- API Key 保存在当前浏览器的本地设置中，不应写入源码或提交到仓库。

## 构建 Windows 便携版

```powershell
python -m pip install -r requirements-build.txt
python -m PyInstaller --noconfirm --clean H3PromptStudio-v0.8.16.spec
```

生成文件位于 `dist/H3PromptStudio-v0.8.16.exe`。构建目录和发布 EXE 不进入 Git 历史。

## 常见问题

- **没有显示模型：** 确认所选 AI 后端正在运行，检查设置中的地址并测试连接。
- **参考图模式生成失败：** 请使用支持图片输入的多模态模型。
- **浏览器打开了旧版本：** 关闭旧的 Prompt Studio 进程。程序优先使用端口 `8765`，被占用时会依次尝试 `8766–8784`。
- **Video 或 Audio 没有作为文件发送：** 这是当前设计；这些媒体用于本地预览和结构化参考元数据。

## 许可

当前仓库尚未附带开源许可证。除非仓库所有者另行授权，否则保留全部权利。
