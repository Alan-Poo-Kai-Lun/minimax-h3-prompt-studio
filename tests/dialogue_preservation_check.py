"""Regression checks for approved screenplay dialogue in final H3 prompts."""

from __future__ import annotations

import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from server import (  # noqa: E402
    build_user_prompt,
    ensure_required_dialogue,
    extract_required_dialogue,
    infer_dialogue_language,
    normalize_h3_output,
)


SCRIPT = """=== Segment 1 ===
duration: 15s
visual_action: A fisherman loses his phone to a fish.
camera_intent: Fast comic cuts.
dialogue:
- <Picture 1>: "Wah, ikan ni besar gila!"
- <Picture 1>: "Aduh, telefon aku!"
sound: Splash and comic sting.
transition_to_next: Cut to the shop.

=== Segment 2 ===
duration: 15s
visual_action: He enters the phone shop.
camera_intent: Smooth tracking shot.
dialogue:
- <Picture 2>: "Saya perlukan telefon baru sekarang."
sound: Shop ambience.
transition_to_next: Cut to the product display.
"""

DATA = {
    "mode": "Hybrid",
    "segmentCount": 2,
    "segmentSeconds": 15,
    "scriptOutput": SCRIPT,
    "idea": "Convert the approved screenplay without changing dialogue.",
    "language": "自动识别",
    "promptOutputLanguage": "en",
    "imageRoles": ["fisherman", "salesperson"],
    "videoNames": [],
    "videoRoles": [],
    "audioRoles": [],
    "audioMode": "native",
    "aspectRatio": "9:16",
    "width": 576,
    "height": 1024,
    "music": "No music",
    "sound": "Synchronized effects",
    "style": "Comic commercial",
    "negative": "No subtitles",
    "selectedSkills": [],
}


dialogue = extract_required_dialogue(DATA)
assert [entry["text"] for entry in dialogue[1]] == ["Wah, ikan ni besar gila!", "Aduh, telefon aku!"]
assert dialogue[1][0]["language"] == "Malay"
assert dialogue[1][0]["speaker"] == "<Picture 1>"
assert dialogue[2][0]["language"] == "Malay"
assert infer_dialogue_language("Wah, besar gila!", "马来语对白（地道马来西亚口语）") == "Malay"

prompt = build_user_prompt(DATA)
assert "Mandatory dialogue manifest:" in prompt
assert '<d>[Malay] Wah, ikan ni besar gila!</d>' in prompt
assert '<d>[Malay] Aduh, telefon aku!</d>' in prompt

MODEL_OUTPUT = """=== Segment 1 ===
subject_definitions:
<Subject 1> is the fisherman in <Picture 1>, preserving identity and clothing.
<Subject 2> is the salesperson in <Picture 2>, preserving identity and clothing.

summary:
[reference generation] A comic fishing accident.

retention_analysis:
<Subject 1>: fully_preserved - identity retained.
<Subject 2>: fully_preserved - identity retained.

detailed_description:
Comic commercial style.
[Shot 1] The fisherman loses his phone to a fish.

overall_soundscape:
Splash and comic sting.

non_diegetic_music:
N/A

=== Segment 2 ===
subject_definitions:
<Subject 1> is the fisherman in <Picture 1>, preserving identity and clothing.
<Subject 2> is the salesperson in <Picture 2>, preserving identity and clothing.

summary:
[reference generation] The fisherman enters a phone shop.

retention_analysis:
<Subject 1>: fully_preserved - identity retained.
<Subject 2>: fully_preserved - identity retained.

detailed_description:
Comic commercial style.
[Shot 1] The fisherman asks the salesperson for help.

overall_soundscape:
Shop ambience.

non_diegetic_music:
N/A
"""

fixed, restored = ensure_required_dialogue(MODEL_OUTPUT, DATA)
assert restored == 3
assert '<Subject 1> (S1) says <d>[Malay] Wah, ikan ni besar gila!</d>' in fixed
assert '<Subject 1> (S1) says <d>[Malay] Aduh, telefon aku!</d>' in fixed
assert '<Subject 2> (S2) says <d>[Malay] Saya perlukan telefon baru sekarang.</d>' in fixed
assert "Dialogue continuity (mandatory):" not in fixed
assert fixed.index('<d>[Malay] Wah, ikan ni besar gila!</d>') < fixed.index("overall_soundscape:")
assert "clearly visible, synchronized lip movement" in fixed

fixed_again, restored_again = ensure_required_dialogue(fixed, DATA)
assert restored_again == 0
assert fixed_again.count("<d>[Malay] Wah, ikan ni besar gila!</d>") == 1
assert fixed_again.count("<d>[Malay] Aduh, telefon aku!</d>") == 1

malformed = MODEL_OUTPUT.replace(
    "<Subject 1>: fully_preserved - identity retained.",
    "<Subject 1> fully_preserved",
).replace(
    "<Subject 2>: fully_preserved - identity retained.",
    "<Subject 2> reference",
)
normalized = normalize_h3_output(malformed, "Hybrid")
assert "<Subject 1> (not visibly used in this segment): weak_reference -" in normalized
assert "): reference -" not in normalized

print("Dialogue preservation checks passed")
