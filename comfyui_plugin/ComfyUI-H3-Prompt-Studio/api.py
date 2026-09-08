from __future__ import annotations

import asyncio
import base64
import json
import urllib.error
import urllib.parse
import urllib.request

from aiohttp import web
from server import PromptServer


VERSION = "0.1.0-test"


def _ollama_url(base_url: str, path: str) -> str:
    value = (base_url or "http://127.0.0.1:11434").strip().rstrip("/")
    for suffix in ("/api/chat", "/api/generate", "/api/tags"):
        if value.endswith(suffix):
            value = value[: -len(suffix)]
            break
    return value + path


def _request_json(url: str, payload: dict | None = None, timeout: int = 300) -> dict:
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data)
    request.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


def _clean_image(value: str) -> str:
    if not value:
        return ""
    if "," in value and value.lstrip().lower().startswith("data:image/"):
        value = value.split(",", 1)[1]
    # Validate before forwarding malformed clipboard content to Ollama.
    base64.b64decode(value, validate=True)
    return value


def _system_prompt(mode: str, language: str, segments: int, seconds: int) -> str:
    total = segments * seconds
    return f"""You are MiniMax H3 Prompt Studio inside ComfyUI.
Convert the user's creative brief into a production-ready MiniMax H3 {mode} prompt.

Hard requirements:
- Output language: {language}. Keep spoken dialogue in the language explicitly requested by the user.
- Produce exactly {segments} segment block(s), exactly {seconds} seconds each, total {total} seconds.
- Preserve every Picture number exactly as supplied. Never exchange Picture identities.
- Use chronological, physically continuous actions and camera directions.
- Describe visible action, expression, environment, lighting, effects, dialogue and sound precisely.
- Do not invent extra reference images.

For every segment use exactly this field order:
=== Segment N ===
subject_definitions:
integrated_multimodal_description:
overall_soundscape:
non_diegetic_music:

Inside integrated_multimodal_description, use timestamped beats such as
[00:00.000 - 00:02.000] ...

Mode rules:
- T2VA: no Picture reference is required.
- I2VA: Picture 1 is the first frame and must align at 0 seconds.
- FL2VA: Picture 1 is first frame and Picture 2 is last frame.
- L2VA: Picture 1 is the final frame; motion must converge naturally to it.
- Ref2VA: define all referenced people, products, scenes and styles under subject_definitions.
- HYBRID: combine keyframes, references and audio roles explicitly.

If music is not requested, write exactly: non_diegetic_music: N/A
Return only the H3 prompt blocks, without commentary or Markdown fences."""


@PromptServer.instance.routes.get("/h3_prompt_studio/status")
async def status(_request):
    return web.json_response({"ok": True, "version": VERSION})


@PromptServer.instance.routes.get("/h3_prompt_studio/models")
async def models(request):
    base_url = request.query.get("base_url", "http://127.0.0.1:11434")
    try:
        result = await asyncio.to_thread(_request_json, _ollama_url(base_url, "/api/tags"), None, 10)
        items = [item.get("name", "") for item in result.get("models", []) if item.get("name")]
        return web.json_response({"ok": True, "models": items})
    except Exception as exc:
        return web.json_response({"ok": False, "error": str(exc), "models": []}, status=502)


@PromptServer.instance.routes.post("/h3_prompt_studio/generate")
async def generate(request):
    try:
        body = await request.json()
        brief = str(body.get("brief", "")).strip()
        if not brief:
            return web.json_response({"ok": False, "error": "请输入创意内容。"}, status=400)

        mode = str(body.get("mode", "T2VA"))
        language = str(body.get("language", "中文"))
        segments = max(1, min(12, int(body.get("segments", 1))))
        seconds = max(1, min(30, int(body.get("seconds", 5))))
        model = str(body.get("model", "")).strip()
        if not model:
            return web.json_response({"ok": False, "error": "请选择或填写 Ollama 模型。"}, status=400)

        references = body.get("references", [])[:12]
        reference_lines = []
        images = []
        for index, item in enumerate(references, start=1):
            description = str(item.get("description", "参考图")).strip() or "参考图"
            reference_lines.append(f"Picture {index}: {description}")
            data = str(item.get("data", ""))
            if data:
                images.append(_clean_image(data))

        user_text = brief
        if reference_lines:
            user_text += "\n\nReference manifest (order is binding):\n" + "\n".join(reference_lines)

        message = {"role": "user", "content": user_text}
        if images:
            message["images"] = images
        payload = {
            "model": model,
            "stream": False,
            "messages": [
                {"role": "system", "content": _system_prompt(mode, language, segments, seconds)},
                message,
            ],
            "options": {"temperature": 0.35},
        }
        result = await asyncio.to_thread(
            _request_json,
            _ollama_url(str(body.get("base_url", "")), "/api/chat"),
            payload,
            600,
        )
        output = str(result.get("message", {}).get("content", "")).strip()
        if not output:
            raise RuntimeError("Ollama 没有返回提示词内容。")
        return web.json_response({"ok": True, "prompt": output, "version": VERSION})
    except (ValueError, TypeError) as exc:
        return web.json_response({"ok": False, "error": f"参数错误：{exc}"}, status=400)
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        return web.json_response({"ok": False, "error": f"Ollama HTTP {exc.code}: {detail}"}, status=502)
    except Exception as exc:
        return web.json_response({"ok": False, "error": str(exc)}, status=502)
