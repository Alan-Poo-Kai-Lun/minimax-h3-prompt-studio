"""Lightweight browser regression check for the English UI.

Usage: python tests/i18n_ui_check.py http://127.0.0.1:8769 [screenshot-dir]
Requires the development-only Playwright Python package and Chromium.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright


URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8769"
SHOT_DIR = Path(sys.argv[2]) if len(sys.argv) > 2 else None
HAN = re.compile(r"[\u3400-\u9fff]")
ALLOWED = {"中"}  # The language button shows the language users can switch to.


def visible_han(page) -> list[str]:
    values = page.evaluate(
        """() => {
          const found = [];
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const el = walker.currentNode.parentElement;
            if (!el || !walker.currentNode.nodeValue.trim()) continue;
            const style = getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || el.closest('.hidden')) continue;
            if (el.tagName === 'OPTION' && !el.selected) continue;
            found.push(walker.currentNode.nodeValue.trim());
          }
          return [...new Set(found)];
        }"""
    )
    return [value for value in values if HAN.search(value) and value not in ALLOWED]


def assert_english(page, state: str) -> None:
    page.wait_for_timeout(100)
    leftovers = visible_han(page)
    if leftovers:
        raise AssertionError(f"{state}: visible Chinese remains: {leftovers}")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1366, "height": 768})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL, wait_until="networkidle")
    page.evaluate("localStorage.setItem('h3.settings', JSON.stringify({...JSON.parse(localStorage.getItem('h3.settings') || '{}'), language:'en'}))")
    page.reload(wait_until="networkidle")
    page.wait_for_timeout(100)
    if errors:
        raise AssertionError(f"page errors after load: {errors}")

    assert_english(page, "direct workflow")
    assert page.locator("#directWorkflow").is_visible()
    assert not page.locator("#scriptWorkflow").is_visible()
    assert page.locator("#directWorkflow .section-title > span").inner_text() == "01"
    assert page.locator(".generation-column > .section-title").first.locator("> span").inner_text() == "02"
    assert page.locator(".generation-column > .section-title").nth(1).locator("> span").inner_text() == "03"
    page.locator("[data-workflow='script']").click()
    assert not page.locator("#directWorkflow").is_visible()
    assert page.locator("#generate").is_disabled()
    assert_english(page, "script workflow")
    page.locator("#scriptResult").fill("=== Segment 1 ===\nApproved test script")
    page.locator("#confirmScript").click()
    assert page.locator("#directWorkflow").is_visible()
    assert not page.locator("#generate").is_disabled()
    assert "Approved test script" in page.locator("#idea").input_value()
    assert_english(page, "approved script enters Direct prompt")
    page.locator("details.advanced summary").click()
    assert_english(page, "advanced settings")

    page.locator("[data-mode='Ref2VA']").click()
    page.locator("#imageInput").set_input_files({
        "name": "opening-frame.png",
        "mimeType": "image/png",
        "buffer": bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63606060f80f0001040100b51c0c020000000049454e44ae426082"),
    })
    page.locator("#previews .reference-card").wait_for()
    assert page.locator("#previews .reference-type").input_value() == "人物参考"
    page.locator("#manageRoles").click()
    assert_english(page, "reference manager")
    page.locator("[data-mode='Hybrid']").click()
    assert page.locator("#previews .reference-type").input_value() == "人物参考"
    assert page.locator("#videoReferenceSection").is_visible()
    page.locator("#videoInput").set_input_files({"name": "motion-reference.mp4", "mimeType": "video/mp4", "buffer": b"test-video-reference"})
    page.locator("#videoList .video-card").wait_for()
    page.evaluate(
        """() => {
          const transfer = new DataTransfer();
          transfer.items.add(new File(['drop-video'], 'camera-drop.mp4', {type: 'video/mp4'}));
          document.querySelector('#videoDropzone').dispatchEvent(new DragEvent('drop', {dataTransfer: transfer, bubbles: true, cancelable: true}));
        }"""
    )
    assert page.locator("#videoList .video-card").count() == 2
    page.evaluate(
        """() => {
          const transfer = new DataTransfer();
          transfer.items.add(new File(['drop-audio'], 'voice-drop.wav', {type: 'audio/wav'}));
          document.querySelector('#audioDropzone').dispatchEvent(new DragEvent('drop', {dataTransfer: transfer, bubbles: true, cancelable: true}));
        }"""
    )
    page.locator("#audioList .audio-card").wait_for()
    assert page.locator("#videoList video[controls]").count() == 2
    assert page.locator("#videoList [data-capture-frame]").count() == 2
    assert page.locator("#audioList audio[controls]").count() == 1
    page.locator("#idea").fill("Use @")
    assert page.locator("#ideaMentionMenu [data-mention-kind='Video']").count() == 2
    assert page.locator("#ideaMentionMenu [data-mention-kind='Audio']").count() == 1
    page.locator("#ideaMentionMenu [data-mention-kind='Video']").first.click()
    assert "<Video 1>" in page.locator("#idea").input_value()
    page.locator("[data-workflow='script']").click()
    page.locator("#scriptBrief").fill("Follow @")
    page.locator("#pictureMentionMenu [data-mention-kind='Audio']").click()
    assert "<Audio 1>" in page.locator("#scriptBrief").input_value()
    page.locator("[data-workflow='direct']").click()
    video_payload = page.evaluate("payload()")
    assert video_payload["videoNames"] == ["motion-reference.mp4", "camera-drop.mp4"]
    assert video_payload["audioNames"] == ["voice-drop.wav"]
    assert video_payload["videoRoleTypes"] == ["reference_motion", "reference_motion"]
    assert video_payload["videoRoles"][0].startswith("Action and camera reference")
    page.locator("[data-mode='I2VA']").click()
    assert page.evaluate("payload().videoNames") == []
    assert page.evaluate("videos.length") == 2
    assert page.evaluate("audios.length") == 1
    page.locator("[data-mode='Hybrid']").click()
    assert page.locator("#videoList .video-card").count() == 2
    assert_english(page, "hybrid references")

    if SHOT_DIR:
        page.locator(".generation-column").evaluate("column => column.scrollTop = column.querySelector('#videoReferenceSection').offsetTop - 12")
        page.screenshot(path=str(SHOT_DIR / "hybrid-video-reference-1366.png"), full_page=False)

    if SHOT_DIR:
        SHOT_DIR.mkdir(parents=True, exist_ok=True)
        page.locator("[data-workflow='direct']").click()
        page.locator("[data-mode='T2VA']").click()
        assert page.evaluate("JSON.stringify([images.length, videos.length, audios.length])") == "[1,2,1]"
        assert page.evaluate("JSON.stringify([payload().images.length, payload().videoNames.length, payload().audioNames.length])") == "[0,0,0]"
        page.locator(".workbench-column,.output-panel").evaluate_all("columns => columns.forEach(column => column.scrollTop = 0)")
        page.screenshot(path=str(SHOT_DIR / "english-three-column-1366.png"), full_page=False)

    page.locator("#saveProject").click()
    assert_english(page, "save project status")

    for button, state in (("#settingsBtn", "settings"), ("#templateBtn", "templates"), ("#skillBtn", "skills"), ("#historyBtn", "history")):
        if page.locator("dialog[open]").count():
            page.locator("dialog[open] header button").click()
        page.locator(button).click()
        assert_english(page, state)
        if button != "#settingsBtn":
            page.locator("#closeDrawer").click()

    if SHOT_DIR:
        page.locator("#templateBtn").click()
        page.locator("#templateList [data-edit]").first.click()
        assert_english(page, "template editing")
        page.locator("#cancelTemplateEdit").click()
        page.screenshot(path=str(SHOT_DIR / "english-template-manager-1366.png"), full_page=False)
        page.locator("#drawerSearch").fill("battle")
        page.wait_for_timeout(100)
        assert page.locator("#templateList .list-row:not(.is-filtered-out)").count() == 1
        assert page.locator("#drawerCount").inner_text() == "1 item"
        page.keyboard.press("Escape")
        assert page.locator("#workspaceDrawer").evaluate("el => el.classList.contains('hidden')")
        page.locator("#skillBtn").click()
        page.locator("#skillList [data-edit-skill]").first.click()
        assert_english(page, "Skill editing")
        page.locator("#cancelSkillEdit").click()
        page.locator("#closeDrawer").click()

    page.locator("#langBtn").click()
    page.wait_for_timeout(100)
    assert page.locator("html").get_attribute("lang") == "zh-CN"
    assert page.locator(".prompt-column .pane-toolbar > strong").inner_text() == "提示词与剧本"
    assert page.locator("#settingsBtn").inner_text() == "设置"
    page.locator("[data-mode='Hybrid']").click()
    page.locator("#videoInput").set_input_files({"name": "运镜参考.mp4", "mimeType": "video/mp4", "buffer": b"test-video-reference-zh"})
    page.locator("#videoList .video-card").last.wait_for()
    assert page.locator("#videoList .video-card").count() == 3
    assert page.locator("#videoReferenceSection .upload-head b").inner_text() == "视频参考"
    assert page.locator("#videoList select option").first.inner_text() == "动作与运镜参考"
    if SHOT_DIR:
        page.locator(".generation-column").evaluate("column => column.scrollTop = column.querySelector('#videoReferenceSection').offsetTop - 12")
        page.screenshot(path=str(SHOT_DIR / "hybrid-video-reference-zh-1366.png"), full_page=False)
    page.locator("#clearVideos").click()
    page.locator("#langBtn").click()
    assert_english(page, "language round trip")

    if errors:
        raise AssertionError(f"page errors: {errors}")
    browser.close()

print("English UI regression check passed")
