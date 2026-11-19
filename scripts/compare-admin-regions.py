"""이전 경계와 새 경계의 공간 후보표. 좌표 없는 기록의 자동 이관에는 사용하지 않는다."""
import json
import subprocess
from pathlib import Path
from shapely.geometry import shape
from shapely.strtree import STRtree

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'frontend/src/data/maps/manifest.json').read_text(encoding='utf8'))
target = json.loads((root / 'frontend/src/data/maps/korea-sigungu.json').read_text(encoding='utf8'))['features']
geometries = [shape(f['geometry']) for f in target]
tree = STRtree(geometries)
old = json.loads((root / 'frontend/src/data/korea-districts.json').read_text(encoding='utf8'))
rows = []
for row in old:
    geometry = shape(row['geometry'])
    candidates = []
    for i in tree.query(geometry, predicate='intersects'):
        overlap = geometry.intersection(geometries[int(i)]).area / geometry.area
        # 작은 해안/단순화 차이는 코드 alias로 오인하지 않는다.
        if overlap >= .01:
            p = target[int(i)]['properties']
            candidates.append({'code': p['code'], 'name': p['name'], 'oldAreaFraction': round(overlap, 6)})
    rows.append({'sourceCodeSystem': 'KOSTAT-2018', 'oldCode': row['id'], 'oldName': row['name'], 'candidates': sorted(candidates, key=lambda c: c['code']), 'rule': 'unique_gps_match_only', 'withoutGps': 'unresolved'})
output = root / 'frontend/src/data/maps/legacy-code-crosswalk.json'
output.write_text(json.dumps({'targetVersion': manifest['boundaryDate'], 'method': 'planar overlap >=1%; diagnostic candidates, not legal aliases', 'rows': rows}, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
print('crosswalk rows', len(rows), 'split candidates', sum(len(r['candidates']) > 1 for r in rows))
previous = json.loads(subprocess.check_output(['git', 'show', manifest['previousGitCommit']+':frontend/src/data/maps/korea-sigungu.json'], cwd=root))['features']
old_names = {f['properties']['code']: f['properties']['name'] for f in previous}
new_names = {f['properties']['code']: f['properties']['name'] for f in target}
changes = {'removed': [{'code': c, 'name': old_names[c]} for c in sorted(old_names.keys()-new_names.keys())], 'added': [{'code': c, 'name': new_names[c]} for c in sorted(new_names.keys()-old_names.keys())], 'renamed': [{'code': c, 'oldName': old_names[c], 'name': new_names[c]} for c in sorted(old_names.keys()&new_names.keys()) if old_names[c] != new_names[c]]}
(output.parent / ('changes-20260401-'+manifest['boundaryDate'].replace('-','')+'.json')).write_text(json.dumps(changes, ensure_ascii=False, indent=2)+'\n', encoding='utf8')
