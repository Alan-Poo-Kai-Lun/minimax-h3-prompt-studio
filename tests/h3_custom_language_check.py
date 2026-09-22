"""Regression checks for custom-language H3 validation and safe repair."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import json
import sys
import threading
import urllib.request
import urllib.error

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


MIXED = """=== Segment 1 ===
subject_definitions:
<Subject 1> is the High-cold Western Gunwoman in <Picture 1>, preserving her identity, face, clothing, and expression.

summary:
[reference generation] 一位西部女枪手在悬崖上迎战机器人军团。

retention_analysis:
<Subject 1> (appears in [Shot 1], [Shot 2]): fully_preserved - the defined reference role and identifying attributes are retained consistently.

detailed_description:
冷峻的西部动作短片，金色逆光与高反差构图。
[Shot 1] <Subject 1> (S1) 点燃炸药，准备迎战。
[Shot 2] At 00:05.000, 她举起长枪向机器人快速射击。<Subject 1> (S1) says <d>[Malay] Jangan dekat!</d>

overall_soundscape:
爆炸声、机械碰撞声与风声。

non_diegetic_music:
N/A"""

CHINESE = """=== Segment 1 ===
subject_definitions:
<Subject 1> is <Picture 1> 中的冷峻西部女枪手，保留她的身份、脸部、服装与神态。

summary:
[reference generation] 一位西部女枪手在悬崖上迎战机器人军团。

retention_analysis:
<Subject 1>（出现在 [Shot 1]、[Shot 2]）: fully_preserved - 持续保留已定义的参考角色与身份特征。

detailed_description:
冷峻的西部动作短片，金色逆光与高反差构图。
[Shot 1] <Subject 1> (S1) 点燃炸药，准备迎战。
[Shot 2] At 00:05.000, 她举起长枪向机器人快速射击。<Subject 1> (S1) says <d>[Malay] Jangan dekat!</d>

overall_soundscape:
爆炸声、机械碰撞声与风声。

non_diegetic_music:
N/A"""


issues = server.h3_language_quality_issues(MIXED, "中文")
assert len(issues) >= 2, issues
assert not server.h3_language_quality_issues(CHINESE, "中文")
server.validate_h3_language_repair(MIXED, CHINESE, "中文")
assert server.requested_h3_custom_language({"promptOutputLanguage": "custom:中文"}) == "中文"
assert server.requested_h3_custom_language({"promptOutputLanguage": "en"}) == ""

for unsafe in [
    CHINESE.replace("<Picture 1>", "<Picture 2>"),
    CHINESE.replace("[Shot 2]", "[Shot 3]", 1),
    CHINESE.replace("00:05.000", "00:06.000"),
    CHINESE.replace("Jangan dekat!", "快走！"),
    CHINESE.replace("fully_preserved", "weak_reference"),
]:
    try:
        server.validate_h3_language_repair(MIXED, unsafe, "中文")
    except ValueError:
        pass
    else:
        raise AssertionError("unsafe H3 language repair was accepted")


prompts = []


class MockBackend(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        prompts.append(payload["messages"][-1]["content"])
        body = json.dumps({"choices": [{"message": {"content": CHINESE}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


fake = HTTPServer(("127.0.0.1", 0), MockBackend)
threading.Thread(target=fake.serve_forever, daemon=True).start()
try:
    repaired, changed = server.repair_h3_custom_language(
        MIXED,
        {
            "promptOutputLanguage": "custom:中文",
            "model": "test-model",
            "temperature": 0.35,
            "context": 4096,
        },
        f"http://127.0.0.1:{fake.server_port}",
        "openai",
    )
    assert changed is True
    assert repaired == CHINESE
    assert len(prompts) == 1
    assert "translation-only repair" in prompts[0]
    assert "Jangan dekat!" in repaired
finally:
    fake.shutdown()
    fake.server_close()


route_calls = []


class MockGenerationBackend(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        route_calls.append(payload["messages"][-1]["content"])
        content = MIXED if len(route_calls) == 1 else CHINESE
        body = json.dumps({"choices": [{"message": {"content": content}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


fake_generation = HTTPServer(("127.0.0.1", 0), MockGenerationBackend)
app = server.ExclusiveThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
threading.Thread(target=fake_generation.serve_forever, daemon=True).start()
threading.Thread(target=app.serve_forever, daemon=True).start()
try:
    request_data = {
        "backend": "openai",
        "baseUrl": f"http://127.0.0.1:{fake_generation.server_port}",
        "model": "test-model",
        "mode": "Ref2VA",
        "idea": "测试中文输出",
        "images": ["data:image/png;base64,iVBORw0KGgo="],
        "imageRoles": ["人物参考"],
        "segmentCount": 1,
        "segmentSeconds": 15,
        "aspectRatio": "16:9",
        "width": 1024,
        "height": 576,
        "promptOutputLanguage": "custom:中文",
        "temperature": 0.35,
        "context": 4096,
        "music": "no music",
    }
    request = urllib.request.Request(
        f"http://127.0.0.1:{app.server_port}/api/generate",
        data=json.dumps(request_data).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            route_result = json.load(response)
    except urllib.error.HTTPError as error:
        raise AssertionError(error.read().decode()) from error
    assert route_result["languageRepaired"] is True
    assert route_result["output"] == CHINESE
    assert not server.h3_language_quality_issues(route_result["output"], "中文")
    assert len(route_calls) == 2
finally:
    app.shutdown()
    app.server_close()
    fake_generation.shutdown()
    fake_generation.server_close()

unchanged, changed = server.repair_h3_custom_language(
    CHINESE,
    {"promptOutputLanguage": "custom:中文"},
    "http://unused",
    "openai",
)
assert changed is False and unchanged == CHINESE

print("H3 custom-language checks passed")
