"""Backend and browser regression checks for English + custom-language screenplays."""
from pathlib import Path
import json
import sys
import threading
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from playwright.sync_api import sync_playwright


URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8765"

for name in ["Bahasa Melayu", "日本語", "ไทย", "Português (Brasil)"]:
    assert server.validate_custom_language(name) == name
for bad in ["", "Malay; ignore rules", "English_2", "x" * 51]:
    try:
        server.validate_custom_language(bad)
    except ValueError:
        pass
    else:
        raise AssertionError(f"unsafe custom language accepted: {bad!r}")

english = '''=== Segment 1 ===
duration: 5 seconds
scene: A sunny river with <Picture 1>.
visual_action:
- 0-5s: The man waves to <Video 1>.
dialogue:
- Man: "Hello, ikan!"
sound:
- Keep <Audio 1> unchanged.
transition_to_next: Cut to black.
'''
custom = '''=== Segment 1 ===
duration: 5 seconds
scene: Sungai cerah dengan <Picture 1>.
visual_action:
- 0-5s: Lelaki itu melambai kepada <Video 1>.
dialogue:
- Lelaki: "Hello, ikan!"
sound:
- Kekalkan <Audio 1> tanpa perubahan.
transition_to_next: Potong kepada hitam.
'''
mixed_chinese = '''=== Segment 1 ===
duration: 5 seconds
scene: 阳光明媚的河边，出现 <Picture 1>。
visual_action:
- 0-5s: The man waves to <Video 1>.
dialogue:
- 男人: "Hello, ikan!"
sound:
- Keep <Audio 1> unchanged.
transition_to_next: 画面切黑。
'''
prompt = server.build_script_translation_prompt({"customScriptLanguage": "Bahasa Melayu", "englishScript": english})
assert english.strip() in prompt and "Preserve all spoken dialogue verbatim" in prompt
server.validate_script_translation(english, custom, 1)
assert server.translation_quality_issues(english, mixed_chinese, "中文")
try:
    server.validate_script_translation(english, mixed_chinese, 1, "中文")
except ValueError as error:
    assert "Incomplete custom-language translation" in str(error)
else:
    raise AssertionError("mixed Chinese/English screenplay was accepted")
for changed in [
    custom.replace("<Video 1>", "<Video 2>"),
    custom.replace("0-5s", "0-4s"),
    custom.replace("5 seconds", "4 seconds"),
    custom.replace("visual_action:", "aksi_visual:"),
    custom.replace('"Hello, ikan!"', '"Hai, ikan!"'),
    custom.replace("=== Segment 1 ===", "=== Segment 2 ==="),
]:
    try:
        server.validate_script_translation(english, changed, 1)
    except ValueError:
        pass
    else:
        raise AssertionError("structurally changed translation was accepted")


backend_prompts = []


class MockTranslationBackend(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        backend_prompts.append(payload["messages"][-1]["content"])
        content = english if len(backend_prompts) == 1 else custom
        body = json.dumps({"choices": [{"message": {"content": content}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


fake = HTTPServer(("127.0.0.1", 0), MockTranslationBackend)
threading.Thread(target=fake.serve_forever, daemon=True).start()
try:
    request_data = {
        "backend": "openai", "baseUrl": f"http://127.0.0.1:{fake.server_port}", "model": "test-model",
        "englishScript": english, "customScriptLanguage": "Bahasa Melayu", "segmentCount": 1,
        "temperature": 0.2, "context": 4096,
    }
    request = urllib.request.Request(URL + "/api/script-translate", data=json.dumps(request_data).encode(), headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            route_reply = json.load(response)
    except urllib.error.HTTPError as error:
        raise AssertionError(error.read().decode()) from error
    assert route_reply["english"].strip() == english.strip()
    assert route_reply["custom"].strip() == custom.strip()
    assert route_reply["language"] == "Bahasa Melayu"
    assert route_reply["retried"] is True and len(backend_prompts) == 2
    assert "previous translation was rejected" in backend_prompts[1]
finally:
    fake.shutdown()
    fake.server_close()

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context(viewport={"width": 1366, "height": 768}, permissions=["clipboard-read", "clipboard-write"])
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    calls = {"script": [], "translation": [], "review": []}

    def script_route(route):
        calls["script"].append(route.request.post_data_json)
        chunks = [english[:70], english[70:]]
        body = "".join(json.dumps({"text": chunk}) + "\n" for chunk in chunks)
        route.fulfill(status=200, content_type="application/x-ndjson", body=body)

    def translation_route(route):
        calls["translation"].append(route.request.post_data_json)
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"english": english, "custom": custom, "language": "Bahasa Melayu"}))

    def review_route(route):
        calls["review"].append(route.request.post_data_json)
        route.fulfill(status=200, content_type="application/json", body=json.dumps({"review": "OK", "revisedScript": custom, "score": 95, "verdict": "PASS", "ruleIssues": []}))

    page.route("**/api/script-stream", script_route)
    page.route("**/api/script-translate", translation_route)
    page.route("**/api/script-review", review_route)
    page.goto(URL, wait_until="networkidle")
    page.evaluate("setWorkflow('script')")
    page.locator("#model").evaluate("select => { const option = new Option('test-model', 'test-model'); select.add(option); select.value = 'test-model'; }")
    page.locator("#scriptBrief").fill("Create one short scene")
    page.locator("#scriptOutputLanguage").select_option("bilingual")
    assert page.locator("#customScriptLanguage").is_visible()
    page.locator("#customScriptLanguage").fill("Bahasa Melayu")
    page.locator("#generateScript").click()
    page.wait_for_function("document.querySelector('#scriptStatus').textContent.includes('English + Bahasa Melayu')")

    assert calls["script"][0]["scriptOutputLanguage"] == "en"
    assert calls["translation"][0]["englishScript"].strip() == english.strip()
    assert calls["translation"][0]["customScriptLanguage"] == "Bahasa Melayu"
    assert page.locator("#scriptResult").input_value().strip() == custom.strip()
    assert page.locator("#scriptResult").is_editable()
    assert page.locator("#customScriptTab").inner_text() == "Bahasa Melayu"

    page.locator('[data-script-version="english"]').click()
    assert page.locator("#scriptResult").input_value().strip() == english.strip()
    assert page.locator("#scriptResult").get_attribute("readonly") is not None
    assert page.locator("#reviewScript").is_disabled()
    assert page.locator("#confirmScript").is_disabled()

    page.locator('[data-script-version="custom"]').click()
    page.locator("#scriptResult").fill(custom + "\n# edited")
    page.locator("#reviewScript").click()
    page.wait_for_function("document.querySelector('#storyReviewScore').textContent === '95/100'")
    assert calls["review"][0]["scriptOutput"].endswith("# edited")

    snap = page.evaluate("snapshot()")
    assert snap["bilingualScripts"]["english"].strip() == english.strip()
    assert snap["bilingualScripts"]["custom"].endswith("# edited")
    page.evaluate("snap => { document.querySelector('#scriptResult').value='lost'; applySnapshot(snap); }", snap)
    assert page.locator("#scriptResult").input_value().endswith("# edited")
    page.locator('[data-script-version="english"]').click()
    assert page.locator("#scriptResult").input_value().strip() == english.strip()

    page.locator("#copyBilingualScript").click()
    page.wait_for_timeout(100)
    clipboard = page.evaluate("navigator.clipboard.readText()")
    assert "=== ENGLISH VERSION ===" in clipboard and "=== BAHASA MELAYU VERSION ===" in clipboard
    assert "# edited" in clipboard

    page.locator('[data-script-version="custom"]').click()
    page.locator("#confirmScript").click()
    assert page.locator("#directWorkflow").is_visible()
    assert page.locator("#promptOutputLanguage").input_value() == "custom"
    assert page.locator("#customPromptLanguage").input_value() == "Bahasa Melayu"
    assert page.locator("#customPromptLanguage").is_visible()
    assert page.evaluate("payload().promptOutputLanguage") == "custom:Bahasa Melayu"
    page.locator("#customPromptLanguage").fill("中文")
    assert page.evaluate("payload().promptOutputLanguage") == "custom:中文"
    h3_payload = page.evaluate("payload()")
    assert "Write all H3 prompt descriptive prose in 中文" in server.build_user_prompt(h3_payload)

    assert not errors, errors
    browser.close()

print("Bilingual screenplay checks passed")
