"""Regression checks for incomplete multi-segment H3 output recovery."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import json
import sys
import threading
import urllib.request

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server


SCRIPT = """=== Segment 1 ===
duration: 15
visual_action: 男客人的手机从口袋掉落并摔碎。
dialogue:
男客人（3-6 秒）：\"Aduh! Telefon aku pecah!\"
transition_to_next: 硬切至店内。

=== Segment 2 ===
duration: 15
visual_action: 女销售递出手机，男客人购买并推荐店铺。
dialogue:
女销售（3-6 秒）：\"Selamat datang! Boleh saya bantu?\"
男客人（6-9 秒）：\"Berapa harga? Ada jaminan?\"
transition_to_next: 无。
"""

DATA = {
    "mode": "Ref2VA",
    "model": "test-model",
    "segmentCount": 2,
    "segmentSeconds": 15,
    "scriptOutput": SCRIPT,
    "idea": SCRIPT,
    "promptOutputLanguage": "en",
    "language": "马来文",
    "imageRoles": ["人物参考：马来男客人", "人物参考：马来女销售", "场景参考：店内", "产品参考：logo"],
    "videoNames": [],
    "audioRoles": [],
    "temperature": 0.35,
    "context": 32768,
    "music": "light comedy music",
}

BLOCK_1 = """subject_definitions:
<Subject 1> is the male customer in <Picture 1>.
<Subject 2> is the salesperson in <Picture 2>.

summary:
[reference generation] The customer's phone breaks.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - identity retained.
<Subject 2> (not visibly used in this segment): weak_reference - defined for continuity.

detailed_description:
Fast comic commercial style.
[Shot 1] <Subject 1> reacts to his broken phone.

overall_soundscape:
Road ambience and a phone impact.

non_diegetic_music:
Light comic music."""

BLOCK_2 = """subject_definitions:
<Subject 1> is the male customer in <Picture 1>.
<Subject 2> is the salesperson in <Picture 2>.
<Subject 3> is the shop interior in <Picture 3>.

summary:
[reference generation] The customer buys a replacement phone.

retention_analysis:
<Subject 1> (appears in [Shot 1]): fully_preserved - identity retained.
<Subject 2> (appears in [Shot 1]): fully_preserved - identity retained.
<Subject 3> (appears in [Shot 1]): fully_preserved - shop layout retained.

detailed_description:
Bright retail commercial style.
[Shot 1] <Subject 1> enters <Subject 3> and <Subject 2> offers a phone.

overall_soundscape:
Shop ambience and phone handling.

non_diegetic_music:
Light comic music."""

COMPLETE = f"=== Segment 1 ===\n{BLOCK_1}\n\n=== Segment 2 ===\n{BLOCK_2}"
INCOMPLETE = f"=== Segment 1 ===\n{BLOCK_1}\n\n=== Segment 2 ===\nsummary:\n[reference generation] Truncated output."

issues = server.h3_completion_issues(INCOMPLETE, DATA)
assert any("Segment 2 is missing fields" in issue for issue in issues), issues
assert not server.h3_completion_issues(COMPLETE, DATA)
duplicate_field = COMPLETE.replace("summary:\n", "subject_definitions:\nDuplicate definition.\n\nsummary:\n", 1)
empty_field = COMPLETE.replace("overall_soundscape:\nRoad ambience and a phone impact.", "overall_soundscape:\n")
for malformed in (duplicate_field, empty_field):
    assert server.h3_completion_issues(malformed, DATA)
    assert server.normalize_h3_output(malformed, "Ref2VA")


calls = []


class MockBackend(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        calls.append(payload["messages"][-1]["content"])
        body = json.dumps({"choices": [{"message": {"content": COMPLETE}}]}).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *_):
        pass


fake = HTTPServer(("127.0.0.1", 0), MockBackend)
threading.Thread(target=fake.serve_forever, daemon=True).start()
try:
    repaired, changed = server.repair_incomplete_h3_output(
        INCOMPLETE, DATA, f"http://127.0.0.1:{fake.server_port}", "openai"
    )
finally:
    fake.shutdown()
    fake.server_close()

assert changed is True
assert not server.h3_completion_issues(repaired, DATA)
assert len(calls) == 1
assert "Segment 2 is missing fields" in calls[0]
fixed, restored = server.ensure_required_dialogue(repaired, DATA)
assert restored == 3
assert '<d>[Malay] Aduh! Telefon aku pecah!</d>' in fixed
assert '<d>[Malay] Selamat datang! Boleh saya bantu?</d>' in fixed
assert '<d>[Malay] Berapa harga? Ada jaminan?</d>' in fixed


stream_calls = []


class MockStreamingBackend(BaseHTTPRequestHandler):
    def do_POST(self):
        payload = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        stream_calls.append(payload)
        if payload.get("stream"):
            item = json.dumps({"choices": [{"delta": {"content": INCOMPLETE}}]})
            body = f"data: {item}\n\ndata: [DONE]\n\n".encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.end_headers()
            self.wfile.write(body)
        else:
            body = json.dumps({"choices": [{"message": {"content": COMPLETE}}]}).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(body)

    def log_message(self, *_):
        pass


fake_stream = HTTPServer(("127.0.0.1", 0), MockStreamingBackend)
app = server.ExclusiveThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
threading.Thread(target=fake_stream.serve_forever, daemon=True).start()
threading.Thread(target=app.serve_forever, daemon=True).start()
try:
    route_data = {
        **DATA,
        "backend": "openai",
        "baseUrl": f"http://127.0.0.1:{fake_stream.server_port}",
        "images": ["data:image/png;base64,iVBORw0KGgo="] * 4,
        "aspectRatio": "16:9",
        "width": 1024,
        "height": 576,
        "sound": "",
        "style": "comic commercial",
        "negative": "",
        "selectedSkills": [],
    }
    request = urllib.request.Request(
        f"http://127.0.0.1:{app.server_port}/api/generate-stream",
        data=json.dumps(route_data).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        events = [json.loads(line) for line in response.read().decode().splitlines() if line.strip()]
finally:
    app.shutdown()
    app.server_close()
    fake_stream.shutdown()
    fake_stream.server_close()

assert any(event.get("type") == "status" and "字段不完整" in event.get("messageZh", "") for event in events)
done = next(event for event in events if event.get("type") == "done")
assert done["structureRepaired"] is True
assert '<d>[Malay] Aduh! Telefon aku pecah!</d>' in done["final"]
assert '<d>[Malay] Berapa harga? Ada jaminan?</d>' in done["final"]
assert not server.h3_completion_issues(done["final"], DATA)
assert len(stream_calls) == 2 and stream_calls[0]["stream"] is True and stream_calls[1]["stream"] is False

print("H3 structure repair checks passed")
