# MiniMax H3 Prompt Studio

本地优先的 MiniMax H3 提示词工作台，通过本机或局域网 AI 后端生成 T2VA、I2VA、FL2VA、L2VA、Ref2VA 和 Hybrid 提示词。

当前版本：**v0.6.1**

## 主要功能

- 直接提示词与“创意 → 分段剧本 → 人工确认 → H3 提示词”两种工作流
- T2VA、I2VA、FL2VA、L2VA、Ref2VA、Hybrid 模式
- 最多 12 张参考图，支持 Picture 编号、用途说明、预览、复制、替换和拖拽排序
- 拖拽后同步更新创意、剧本及结果中的 Picture 引用
- 支持粘贴系统剪贴板图片和截图
- Hybrid 首尾关键帧、参考图、声音参考及多种音频模式
- Ollama 与 OpenAI 兼容 API 后端
- 生成后自动释放本地模型显存
- 自定义创意 Skill、模板、项目、历史记录和中英文界面
- ComfyUI 辅助插件

## 本地运行

要求：Python 3.10 或更高版本、一个已运行的 AI 后端；参考图模式需要支持视觉输入的多模态模型。

运行 python server.py，浏览器通常会自动打开 http://127.0.0.1:8765；也可以双击 start.bat。

软件默认连接 Ollama http://127.0.0.1:11434。其他本地或局域网服务可在设置中配置。

## 构建 Windows 便携版

先运行 python -m pip install -r requirements-build.txt，再运行 python -m PyInstaller --noconfirm --clean H3PromptStudio-v0.6.1.spec。

生成文件位于 dist/H3PromptStudio-v0.6.1.exe。模型和 Ollama 不包含在 EXE 中。

## ComfyUI 插件

将 comfyui_plugin/ComfyUI-H3-Prompt-Studio 复制到 ComfyUI 的 custom_nodes 目录，然后重启 ComfyUI。详细说明见插件目录中的 README。

## 隐私

- 项目、历史、模板、Skill 和参考媒体默认保存在浏览器本地存储中。
- 应用不会主动把素材上传到公共互联网。
- 生成请求会发送到你在设置中指定的 AI 后端；若填写局域网或远程地址，素材会发送到该地址。
- API Key 保存在当前浏览器的本地设置中，不应写入源码或提交到仓库。

## 发布文件

便携版 EXE 通过 GitHub Releases 提供，不提交到 Git 历史。每个发布文件建议同时提供 SHA-256 校验值。

## 许可

当前仓库未附带开源许可证。除非仓库所有者另行授权，否则源码默认保留全部权利。
