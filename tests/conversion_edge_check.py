"""Regression cases discovered during the v0.8.8 source audit."""
from pathlib import Path
import re
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import server
from tests import screenplay_conversion_check as fixture

def request(dialogue):
    return {**fixture.data, "scriptOutput": "=== Segment 1 ===\ndialogue:\n" + dialogue + "\nsound: river"}

for line in ["- 男主：'Hello!'", '- 男主：Hello!', '- 男主：“Hello!”', "- 男主：'I'm happy!'", '- 男主：‘Hello!’']:
    assert server.extract_required_dialogue(request(line))[1][0]["text"] in {"Hello!", "I'm happy!"}
try:
    server.extract_required_dialogue(request('- broken <d>'))
except ValueError:
    pass
else:
    raise AssertionError('Malformed dialogue must not be ignored')

invented = fixture.blocks[0].replace('<Subject 1> acts;', '<Subject 1> says <d>[Malay] Invented!</d>;')
silent, _ = server.ensure_required_dialogue(invented, request('无'))
assert '<d>' not in silent
mixed = request('- 男主：Hello!')
mixed['scriptOutput'] += '\n=== Segment 2 ===\ndialogue: 无\nsound: river'
out, _ = server.ensure_required_dialogue(fixture.blocks[0] + '\n' + invented.replace('Segment 1', 'Segment 2'), mixed)
assert '<d>' not in out.split('=== Segment 2 ===')[1]

aliases = request('- 男主：Hello!\n- <Picture 1>：Hi!\n- 顾客：Welcome!')
out, _ = server.ensure_required_dialogue(fixture.blocks[0], aliases)
assert set(re.findall(r'\((S\d+)\) says', out)) == {'S1'}
custom = fixture.blocks[0].replace('male customer', 'lead performer')
out, _ = server.ensure_required_dialogue(custom, request('- 客人甲：Hello!'))
again, _ = server.ensure_required_dialogue(out, request('- 客人甲：Hello!'))
assert out == again, 'Custom role processing must be idempotent'

sound = server.normalize_soundscape('River ambience and background music with a loud splash.')
assert 'River ambience' in sound and 'splash' in sound and 'music' not in sound
ambiguous = server.normalize_soundscape('Background music under river ambience.')
assert 'river ambience' in ambiguous
assert server.validate_output('overall_soundscape:\n' + ambiguous + '\nnon_diegetic_music:\nN/A', 'T2VA', 1)
for source in ['总时长 1 分钟', 'Total duration: 1 minute', '总时长：00:30', '时间：0:00 - 0:30', '=== Segment 1 ===\nduration: 1 minute']:
    assert server.duration_conflicts(fixture.data, source), source
assert not server.duration_conflicts(fixture.data, '总时长 0.75 分钟')
print('Conversion edge-case checks passed')
