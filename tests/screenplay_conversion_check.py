"""Regression for timed Chinese speaker cues, VO, retention and duration conflicts."""
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from server import duration_conflicts, ensure_required_dialogue, normalize_h3_output

script = '''=== Segment 1 ===
duration: 15 秒
dialogue:
- 男主（0-3 秒）：“Wah, besar gila!”
- 男主（7-10 秒）：“Eh? Telefon aku…”
- 男主（10-15 秒）：“Tahu lah! 2ND iPHONE SHOP!”
sound: river
=== Segment 2 ===
duration: 15 秒
dialogue:
- 女销售（3-7 秒）：“iPhone kami semua harga borong, quality cantik, warranty kedai pun ada!”
- 男主（10-15 秒）：“Terbaiklah, macam baru!”
sound: shop
=== Segment 3 ===
duration: 15 秒
dialogue:
- 男主（0-6 秒）：“Hilang telefon tak apa, janji ada 2nd iPhone Shop!”
- 男主（6-10 秒）：“Murah, padu, puas hati! Korang wajib beli sini!”
- 品牌旁白（10-15 秒）：“Cari iPhone, cari 2nd iPhone Shop!”
sound: shop
'''
data = {"mode": "Hybrid", "segmentCount": 3, "segmentSeconds": 15, "scriptOutput": script, "language": "马来语对白（地道马来西亚口语）"}
blocks = []
for number, cuts in [(1, [0, 3, 5, 7, 10]), (2, [0, 3, 7, 10]), (3, [0, 6, 10])]:
    shots = []
    for index, seconds in enumerate(cuts, 1):
        timing = "" if index == 1 else f" At 00:{seconds:02d}.000,"
        shots.append(f"[Shot {index}]{timing} <Subject 1> acts; <Subject 2> remains nearby.")
    blocks.append(f'''=== Segment {number} ===
subject_definitions:
<Subject 1> is the Malay male customer in <Picture 1>.
<Subject 2> is the Malay female salesperson in <Picture 2>.
<Subject 3> is the shop logo in <Picture 3>.
summary:
[reference generation] Approved commercial.
retention_analysis:
<Subject 1> fully_preserved
<Subject 2> reference
<Subject 3> reference
detailed_description:
Bright commercial style.
{chr(10).join(shots)}
overall_soundscape:
Light upbeat commercial background music, shop ambience, crisp chimes.
non_diegetic_music:
Upbeat commercial background music.
''')
fixed, count = ensure_required_dialogue("\n\n".join(blocks), data)
fixed = normalize_h3_output(fixed, "Hybrid")
assert count == 8
assert set(re.findall(r"\(S(\d+)\)", fixed)) == {"1", "2", "3"}
assert '<Subject 1> (S1) says <d>[Malay] Terbaiklah, macam baru!</d>' in fixed
assert '<Subject 2> (S2) says <d>[Malay] iPhone kami' in fixed
assert 'off-screen brand narrator (S3)' in fixed
vo = re.search(r'off-screen brand narrator.*', fixed).group(0)
assert "voiceover" in vo and "lip movement" not in vo
first = fixed.split("=== Segment 2 ===")[0]
detail = first.split("detailed_description:", 1)[1]
assert detail.index("[Shot 4]") < detail.index("Eh? Telefon aku…") < detail.index("[Shot 5]")
assert detail.index("[Shot 5]") < detail.index("Tahu lah!") < detail.index("overall_soundscape:")
assert "Dialogue continuity" not in fixed
soundscapes = re.findall(r'overall_soundscape:\s*(.*?)(?=non_diegetic_music:)', fixed, re.S)
assert all("background music" not in sound.lower() and "shop ambience" in sound for sound in soundscapes)
assert "): reference -" not in fixed
assert '<Subject 3> (not visibly used in this segment): weak_reference' in fixed
assert duration_conflicts(data, "总时长约 30 秒")
assert not duration_conflicts({**data, "segmentSeconds": 10}, "总时长约 30 秒")
assert duration_conflicts({**data, "segmentSeconds": 10}, script)
again, _ = ensure_required_dialogue(fixed, data)
assert again.count('<d>[Malay] Eh? Telefon aku…</d>') == 1
print("Screenplay conversion regression passed")
