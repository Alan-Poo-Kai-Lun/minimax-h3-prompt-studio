"""Browser check for Hybrid media previews, custom frame capture, and mode retention.

Usage: python tests/media_preview_check.py http://127.0.0.1:8769
Requires Playwright, Chromium, and ffmpeg on PATH.
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright


URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8769"
SHOT_PATH = Path(sys.argv[2]) if len(sys.argv) > 2 else None


with tempfile.TemporaryDirectory() as temp_dir:
    temp = Path(temp_dir)
    video_path = temp / "preview.webm"
    audio_path = temp / "preview.wav"
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "color=c=red:s=320x180:d=1:r=24",
            "-c:v", "libvpx-vp9", "-pix_fmt", "yuv420p", str(video_path),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y",
            "-f", "lavfi", "-i", "sine=frequency=440:duration=1",
            "-c:a", "pcm_s16le", str(audio_path),
        ],
        check=True,
    )

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1366, "height": 768})
        errors: list[str] = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.goto(URL, wait_until="networkidle")
        page.locator("[data-mode='Hybrid']").click()
        page.locator("#idea").fill("Use the reference motion and sound.")
        page.locator("#videoInput").set_input_files(str(video_path))
        page.locator("#audioInput").set_input_files(str(audio_path))
        page.locator("#videoList video").wait_for()
        page.locator("#audioList audio").wait_for()
        page.wait_for_function("document.querySelector('[data-video-preview=\"0\"]').readyState >= 2")
        page.wait_for_function("document.querySelector('[data-audio-preview=\"0\"]').readyState >= 1")

        assert "320×180" in page.locator("[data-video-meta='0']").inner_text()
        assert "KB" in page.locator("[data-video-meta='0']").inner_text()
        assert "KB" in page.locator("[data-audio-meta='0']").inner_text()
        assert page.locator("#validation").get_attribute("class") == "validation good"

        page.locator("[data-capture-time='0']").fill("0.40")
        page.locator("[data-capture-frame='0']").click()
        page.locator("#previews .reference-card").wait_for()
        assert page.locator("#previews .reference-type").input_value() == "首帧关键帧"
        assert "0.40" in page.locator("#previews .reference-description").input_value()
        assert page.evaluate("images[0].data.startsWith('data:image/png;base64,')")
        if SHOT_PATH:
            SHOT_PATH.parent.mkdir(parents=True, exist_ok=True)
            page.locator(".generation-column").evaluate("column => column.scrollTop = column.querySelector('#videoReferenceSection').offsetTop - 12")
            page.screenshot(path=str(SHOT_PATH), full_page=False)
            page.locator(".generation-column").evaluate("column => column.scrollTop = column.querySelector('#audioReferenceSection').offsetTop - 12")
            page.screenshot(path=str(SHOT_PATH.with_name("hybrid-audio-preview-1366.png")), full_page=False)

        page.locator("[data-mode='T2VA']").click()
        assert page.evaluate("JSON.stringify([images.length, videos.length, audios.length])") == "[1,1,1]"
        assert page.evaluate("JSON.stringify([payload().images.length, payload().videoNames.length, payload().audioNames.length])") == "[0,0,0]"
        assert page.locator("#validation").get_attribute("class") == "validation good"

        page.locator("[data-mode='Hybrid']").click()
        assert page.locator("#videoList .video-card").count() == 1
        assert page.locator("#audioList .audio-card").count() == 1
        assert page.locator("#previews .reference-card").count() == 1
        if errors:
            raise AssertionError(f"page errors: {errors}")
        browser.close()

print("Hybrid media preview and retention checks passed")
