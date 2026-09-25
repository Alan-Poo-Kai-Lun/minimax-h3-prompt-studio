# MiniMax H3 Prompt Studio

[English](README.md) | [简体中文](README.zh-CN.md)

A local-first desktop prompt workbench for MiniMax H3. Build T2VA, I2VA, FL2VA, L2VA, Ref2VA, and Hybrid prompts with visual references, video and audio guidance, script planning, reusable skills, and local or LAN AI backends.

**Current source version:** v0.8.18 · **Latest published portable release:** v0.8.18 · **Platform:** Windows · **UI:** English / 简体中文

[Download the v0.8.18 EXE](https://github.com/Alan-Poo-Kai-Lun/minimax-h3-prompt-studio/releases/download/v0.8.18/H3PromptStudio-v0.8.18.exe) · [Release notes](https://github.com/Alan-Poo-Kai-Lun/minimax-h3-prompt-studio/releases/tag/v0.8.18) · [Changelog](CHANGELOG.md)

The portable EXE matches the current source release. You can also run from source or build the EXE using the instructions below.

![MiniMax H3 Prompt Studio three-column workspace](docs/screenshots/workspace-en.png)

## Highlights

- Resizable three-column desktop workspace: prompt and script, generation setup and references, and result
- Reverse-engineer image prompts or reconstruct H3/general video prompts from locally sampled video frames
- Focus mode for each column, remembered layout, and responsive behavior for 1366-pixel-wide displays
- Direct Prompt and guided `Creative brief → Segmented script → Review → H3 prompt` workflows
- T2VA, I2VA, FL2VA, L2VA, Ref2VA, and flexible Hybrid generation modes
- Up to 12 Picture references with roles, preview, clipboard paste, copy, replacement, and drag sorting
- Automatic `<Picture N>` remapping after reference reordering
- Independent `<Picture N>`, `<Video N>`, and `<Audio N>` mentions through the `@` menu
- Drag-and-drop Video and Audio references with native preview controls and media information
- Custom Video timestamp capture to create or replace a first-frame Picture
- Media is retained when switching modes and excluded only from incompatible requests
- Ollama, LM Studio, llama.cpp Server, and OpenAI-compatible backends
- Searchable floating managers for history, templates, and creative enhancement Skills
- Optional model unload after generation to release VRAM
- Companion ComfyUI helper plugin

## Generation modes

| Mode | Best for | Reference behavior |
| --- | --- | --- |
| T2VA | Text-to-video | Text only; saved media stays in the project but is excluded from the request |
| I2VA | First-frame animation | Picture 1 is the exact first frame |
| FL2VA | First-to-last-frame transition | Picture 1 is the first frame and Picture 2 is the final frame |
| L2VA | Ending-frame generation | Picture 1 is the exact final frame |
| Ref2VA | Full visual reference | Pictures define reusable subjects, environments, products, or style |
| Hybrid | Mixed reference workflows | Freely combine Pictures, Videos, and Audio; first and last frames are optional |

## Quick start

### Windows portable build

1. Download [H3PromptStudio-v0.8.18.exe](https://github.com/Alan-Poo-Kai-Lun/minimax-h3-prompt-studio/releases/download/v0.8.18/H3PromptStudio-v0.8.18.exe).
2. Start Ollama or another supported AI backend.
3. Run the EXE. The workspace normally opens at `http://127.0.0.1:8765`.
4. Open **Settings**, select the backend, enter its address, and test the connection.
5. Choose a model, enter a creative brief, select a generation mode, and generate the H3 prompt.

The EXE does not include Ollama or any AI model. A vision-capable model is required when using Picture references. The portable build is currently unsigned, so Windows may identify it as an unrecognized application.

SHA-256 for v0.8.18:

```text
3DFE433E09DC2F0C7C7CDFE510F71517582A9BCEEE444F7C0E3E7BE30DCC1BC6
```

### Run from source

Python 3.10 or newer is required. The runtime server uses only the Python standard library.

```powershell
git clone https://github.com/Alan-Poo-Kai-Lun/minimax-h3-prompt-studio.git
cd minimax-h3-prompt-studio
python server.py
```

You can also run `start.bat`. The default backend is Ollama at `http://127.0.0.1:11434`. Configure another local, LAN, or OpenAI-compatible endpoint in Settings.

## Hybrid media workflow

Hybrid accepts any useful combination of reference Pictures, Videos, and Audio. A first-frame or last-frame keyframe is optional.

- Drop a Video into the Video reference area, describe its motion/editing purpose, and reference it as `<Video N>`.
- Preview the Video with sound or capture a custom timestamp as the first-frame Picture.
- Drop an Audio file into the Audio reference area, preview it, describe its role, and reference it as `<Audio N>`.
- Switch modes without losing uploaded media or reference descriptions.

![Hybrid video preview and custom first-frame capture](docs/screenshots/hybrid-video-frame-zh.png)

![Hybrid audio preview](docs/screenshots/hybrid-audio-zh.png)

## Projects, templates, and Skills

Projects can be created, saved, exported, and imported locally. Templates, generation history, layout preferences, backend settings, and custom creative enhancement Skills are stored in the current browser profile. Imported `SKILL.md` content enhances creative direction while the built-in H3 format rules remain authoritative.

## ComfyUI helper plugin

Copy `comfyui_plugin/ComfyUI-H3-Prompt-Studio` into the ComfyUI `custom_nodes` directory, restart ComfyUI, and refresh the frontend. See the [plugin README](comfyui_plugin/ComfyUI-H3-Prompt-Studio/README.md) for current installation and usage details.

The plugin is a companion integration and remains a test build. It is not yet feature-complete, and known issues remain.

## Privacy and data flow

- Projects, history, templates, Skills, settings, and media previews are stored in the current browser profile by default.
- Generation requests are sent only to the AI backend configured in Settings.
- Picture data may be included in a generation request when the selected mode and model use visual references.
- Original Video and Audio binaries are not uploaded to the AI backend; the current generation request uses their filenames, roles, descriptions, and reference labels.
- If you configure a LAN or remote backend, applicable prompt data and Picture references are sent to that endpoint.
- API keys are stored in the current browser's local settings. Do not add keys to source files or commits.

## Build the portable EXE

```powershell
python -m pip install -r requirements-build.txt
python -m PyInstaller --noconfirm --clean H3PromptStudio-v0.8.18.spec
```

The output is written to `dist/H3PromptStudio-v0.8.18.exe`. Build artifacts and release executables are intentionally excluded from Git history.

## Troubleshooting

- **No models appear:** confirm that the selected backend is running, verify its URL in Settings, and test the connection.
- **Picture mode fails:** use a multimodal model that supports image input.
- **The browser opens an older build:** close older Prompt Studio processes. The app uses port `8765` first and falls back to `8766–8784` when necessary.
- **Video or Audio is not sent as a binary file:** this is intentional; these media files act as local preview and structured reference metadata.

## License

No open-source license has been added yet. Unless the repository owner grants separate permission, all rights are reserved.
