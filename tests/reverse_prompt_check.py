from pathlib import Path
import importlib.util


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("h3_server", ROOT / "server.py")
SERVER = importlib.util.module_from_spec(SPEC)
assert SPEC.loader
SPEC.loader.exec_module(SERVER)


image_prompt = SERVER.build_reverse_prompt({
    "kind": "image",
    "language": "zh",
    "filename": "reference.webp",
    "instruction": "保留服装材质",
    "images": ["unused"],
})
assert "Simplified Chinese" in image_prompt
assert "Positive prompt" in image_prompt and "Negative prompt" in image_prompt
assert "保留服装材质" in image_prompt

video_prompt = SERVER.build_reverse_prompt({
    "kind": "video",
    "language": "en",
    "target": "h3",
    "filename": "clip.mp4",
    "duration": 12.4,
    "images": ["unused"] * 6,
})
assert "6 chronological keyframes" in video_prompt
assert "12.40 seconds" in video_prompt
assert "MiniMax H3-ready" in video_prompt
assert "do not claim" in video_prompt.lower() and "original audio" in video_prompt.lower()

try:
    SERVER.build_reverse_prompt({"kind": "audio", "language": "zh"})
except ValueError:
    pass
else:
    raise AssertionError("Unsupported reverse mode must be rejected")

html = (ROOT / "web" / "index.html").read_text(encoding="utf-8")
script = (ROOT / "web" / "reverse.js").read_text(encoding="utf-8")
assert 'id="reverseBtn"' in html and 'id="reverseDialog"' in html
assert "/api/reverse-prompt" in script
assert "sampleVideo" in script and "toDataURL" in script
assert "最多 8 张关键帧" in html

print("reverse prompt checks passed")
