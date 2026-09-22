"""Unit checks for deterministic screenplay review and response parsing."""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server import build_script_review_prompt, parse_script_review, script_rule_checks  # noqa: E402


DATA = {
    "segmentCount": 2,
    "segmentSeconds": 5,
    "scriptOutputLanguage": "en",
    "scriptBrief": "A customer discovers a faster checkout method.",
    "scriptGenre": "Product ad",
    "scriptAudience": "Busy shoppers",
    "scriptTone": "Clear and energetic",
    "mode": "Hybrid",
    "aspectRatio": "16:9",
    "images": ["data:image/png;base64,AA=="],
    "imageRoles": ["customer identity"],
    "videoNames": ["checkout-motion.mp4"],
    "videoRoles": ["checkout action reference"],
    "audioNames": ["voice.wav"],
    "audioRoles": ["cashier voice"],
}


GOOD_SCRIPT = """=== Segment 1 ===
duration: 5 seconds
visual_action: The customer enters, notices the queue, and checks the time while retaining <Picture 1> identity.
camera_intent: Wide establishing shot, then a gentle push toward the phone.
dialogue: \"I cannot wait this long.\"
sound: Store ambience.
transition_to_next: Match cut from the phone screen to the self-checkout scanner.

=== Segment 2 ===
duration: 5 seconds
visual_action: Following <Video 1>, the customer scans, pays, and exits with relief.
camera_intent: Medium tracking shot ending on the completed payment.
dialogue: \"Done already.\"
sound: Use the <Audio 1> cashier voice for the confirmation.
transition_to_next: End on the completed payment and product call to action.
"""


assert not script_rule_checks({**DATA, "scriptOutput": GOOD_SCRIPT}, GOOD_SCRIPT)

missing_segment = GOOD_SCRIPT.split("=== Segment 2 ===")[0]
issues = script_rule_checks(DATA, missing_segment)
assert any(item["code"] == "segment_count" and item["severity"] == "critical" for item in issues)

bad_reference = GOOD_SCRIPT.replace("<Picture 1>", "<Picture 2>")
issues = script_rule_checks(DATA, bad_reference)
assert any(item["code"] == "missing_picture_2" for item in issues)

long_dialogue = GOOD_SCRIPT.replace(
    '\"I cannot wait this long.\"',
    '\"This queue is far too long and I urgently need to leave right now because I have many appointments waiting for me across town.\"',
)
issues = script_rule_checks(DATA, long_dialogue)
assert any(item["code"] == "dialogue_density" for item in issues)

prompt = build_script_review_prompt({**DATA, "scriptOutput": GOOD_SCRIPT}, [])
assert "Screenplay to review:" in prompt
assert "<Picture 1>: customer identity" in prompt
assert "<Video 1>: checkout action reference" in prompt
assert "<Audio 1>: cashier voice" in prompt

raw = """=== STORY REVIEW ===
overall_score: 84
verdict: PASS
summary:
The cause-and-effect chain is clear.
critical_issues:
- None
warnings:
- None
strengths:
- Clear setup and payoff.
revision_plan:
- Tighten the final action.
=== REVISED SCRIPT ===
=== Segment 1 ===
duration: 5 seconds
visual_action: Revised action.
"""
review, revised, score, verdict = parse_script_review(raw)
assert "overall_score: 84" in review
assert revised.startswith("=== Segment 1 ===")
assert score == 84
assert verdict == "PASS"

print("Story review checks passed")
