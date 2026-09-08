# ComfyUI H3 Prompt Studio — test build

Version: `0.1.0-test`

## Install

Copy this folder to `ComfyUI/custom_nodes/ComfyUI-H3-Prompt-Studio`, then restart ComfyUI and refresh its page.

## Use

1. Add node: `MiniMax H3 / Prompt Studio / H3 Prompt Studio · Prompt`.
2. Click `打开 H3 Prompt Studio` on the node. On current ComfyUI frontends it is also available as a bottom-panel tab.
3. Set the mode, language, segments, duration, Ollama URL and multimodal model.
4. Add and reorder reference images, then generate.
5. Click `写入选中节点`. The node emits the prompt as `STRING`.

The Apply action can also write to a selected node whose text widget is named `prompt`, `positive_prompt`, `text`, or `positive`.

## Remove

Close ComfyUI and remove the `ComfyUI-H3-Prompt-Studio` folder from `custom_nodes`.
