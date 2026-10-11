"""Check local doc links and limited integrity of the planning example.

Standard library only. Does not implement the future content schema/compiler.
"""
from pathlib import Path
import json
import re
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []
markdown = [p for p in ROOT.rglob('*.md') if '.git' not in p.parts and 'node_modules' not in p.parts]

for path in markdown:
    content = re.sub(r'```.*?```', '', path.read_text(), flags=re.S)
    for raw in re.findall(r'!?\[[^\]]*\]\(([^)]+)\)', content):
        target = raw.strip().strip('<>')
        parsed = urlsplit(target)
        if parsed.scheme or parsed.netloc or not parsed.path:
            continue
        resolved = (path.parent / unquote(parsed.path)).resolve()
        if not resolved.is_relative_to(ROOT) or not resolved.exists():
            errors.append(f'{path.relative_to(ROOT)}: missing/outside local target {target}')

for path in ROOT.rglob('*.json'):
    if any(part in {'.git', 'node_modules', 'build', 'dist'} for part in path.relative_to(ROOT).parts):
        continue
    try:
        json.loads(path.read_text())
    except (ValueError, UnicodeError) as exc:
        errors.append(f'{path.relative_to(ROOT)}: invalid JSON: {exc}')

try:
    data = json.loads((ROOT / 'docs/examples/vertical-slice.json').read_text())
    assert data['status'] == 'illustrative-not-runtime-content', 'example must retain its non-production status'
    tables = {}
    all_ids = set()
    for name in ['rigs', 'assets', 'animations', 'equipment', 'abilities', 'units']:
        tables[name] = {}
        for item in data[name]:
            assert item['id'] not in all_ids, f'duplicate ID {item["id"]}'
            all_ids.add(item['id'])
            tables[name][item['id']] = item
    for name in ['assets', 'animations', 'units']:
        for item in data[name]:
            assert item['rig'] in tables['rigs'], f'unknown rig on {item["id"]}'
    for equipment in data['equipment']:
        assert equipment['asset'] in tables['assets'], 'unknown equipment asset'
        for ability_id in equipment['abilities']:
            ability = tables['abilities'][ability_id]
            assert ability['requiresEquipmentTag'] in equipment['tags'], 'incompatible equipment ability'
            assert set(ability['requiredSockets']) <= set(tables['assets'][equipment['asset']]['sockets']), 'missing required socket'
    for ability in data['abilities']:
        assert ability['animation'] in tables['animations'], 'unknown animation'
        for key in ['windupTicks', 'activeTicks', 'recoveryTicks', 'maxTargets']:
            assert type(ability[key]) is int and ability[key] > 0, f'invalid {key}'
        assert type(ability['staminaCost']) is int and ability['staminaCost'] >= 0, 'invalid stamina cost'
    for unit in data['units']:
        equipment = [tables['equipment'][key] for key in unit['equipment']]
        slots = [item['slot'] for item in equipment]
        assert len(slots) == len(set(slots)), 'duplicate loadout slot'
        granted = {key for item in equipment for key in item['abilities']}
        assert set(unit['abilities']) <= granted, 'unit ability not granted by equipment'
        for item in equipment:
            assert tables['assets'][item['asset']]['rig'] == unit['rig'], 'equipment rig mismatch'
        for key in unit['abilities']:
            clip = tables['animations'][tables['abilities'][key]['animation']]
            assert clip['rig'] == unit['rig'], 'animation rig mismatch'
except (KeyError, TypeError, ValueError, AssertionError) as exc:
    errors.append(f'illustrative content integrity: {exc}')

if errors:
    print('\n'.join(errors), file=sys.stderr)
    raise SystemExit(1)
print(f'PASS: {len(markdown)} Markdown files; local file links, JSON syntax, and limited example integrity.')
print('Not checked: external URLs, anchor IDs, production schemas, assets, engine or performance.')
