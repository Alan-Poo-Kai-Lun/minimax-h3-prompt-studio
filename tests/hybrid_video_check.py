"""Regression checks for Hybrid video-reference metadata and validation."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from server import build_script_prompt, build_user_prompt, validate_request


hybrid = {
    "mode": "Hybrid",
    "idea": "Continue from the keyframe using the reference video's camera movement.",
    "images": ["data:image/png;base64,AA=="],
    "imageRoles": ["首帧关键帧"],
    "videoNames": ["camera-motion.mp4"],
    "videoRoles": ["Action and camera reference: follow the orbit and acceleration"],
    "audioRoles": [],
    "segmentCount": 1,
    "segmentSeconds": 5,
    "aspectRatio": "16:9",
    "width": 1280,
    "height": 720,
    "scriptBrief": "Continue the action smoothly.",
}

assert validate_request(hybrid) == []

last_frame_only = {**hybrid, "imageRoles": ["尾帧关键帧"]}
assert validate_request(last_frame_only) == []

audio_with_last_frame = {**hybrid, "videoNames": [], "videoRoles": [], "imageRoles": ["尾帧关键帧"], "audioRoles": ["Voice reference"]}
assert validate_request(audio_with_last_frame) == []

video_and_audio_without_images = {**hybrid, "images": [], "imageRoles": [], "audioRoles": ["Voice reference"]}
assert validate_request(video_and_audio_without_images) == []

ordinary_reference_without_keyframes = {**hybrid, "imageRoles": ["人物参考"]}
assert validate_request(ordinary_reference_without_keyframes) == []

prompt = build_user_prompt(hybrid)
assert "<Video 1> (source file: camera-motion.mp4)" in prompt
assert "Video numbering is also independently positional" in prompt
assert "without claiming to have inspected the raw files" in prompt

script_prompt = build_script_prompt(hybrid)
assert "<Video 1> (source file: camera-motion.mp4)" in script_prompt

without_reference = {**hybrid, "images": [], "imageRoles": [], "videoNames": [], "videoRoles": [], "audioRoles": []}
assert any("at least one reference" in error for error in validate_request(without_reference))

t2va_with_video = {**hybrid, "mode": "T2VA", "images": [], "imageRoles": []}
assert any("must not include reference media" in error for error in validate_request(t2va_with_video))

print("Hybrid video-reference checks passed")
