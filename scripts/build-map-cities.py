"""경기도의 구 경계만 병합한 표시 자산. 원본 판정/필터에는 사용하지 않는다."""
import hashlib
import json
from pathlib import Path
import shapely
from shapely.geometry import shape, mapping
from shapely.ops import unary_union

assert shapely.__version__ == '2.2.0'
root = Path(__file__).resolve().parents[1]
source = root / 'frontend/src/data/maps/korea-sigungu.json'
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
assert source_hash == 'e304d0868045f8e4d8f2703c80c539af6bbd8e8204e4c4798eb128d91e0e927f'
original = json.loads(source.read_text())['features']
by_code = {f['properties']['code']: f for f in original}
groups = {
    '41110': ['41111', '41113', '41115', '41117'],
    '41130': ['41131', '41133', '41135'],
    '41170': ['41171', '41173'],
    '41190': ['41192', '41194', '41196'],
    '41270': ['41271', '41273'],
    '41280': ['41281', '41285', '41287'],
    '41460': ['41461', '41463', '41465'],
    '41590': ['41591', '41593', '41595', '41597'],
}
features = []
for code, members in groups.items():
    children = [by_code[c] for c in members]
    names = {f['properties']['name'].split('시')[0] + '시' for f in children}
    assert len(names) == 1 and all(f['properties']['parentCode'] == '41' for f in children)
    geometry = unary_union([shape(f['geometry']) for f in children])
    assert geometry.is_valid and not geometry.is_empty
    assert all(geometry.covers(shape(f['geometry'])) for f in children)
    features.append({'type': 'Feature', 'properties': {'code': code, 'parentCode': '41', 'name': names.pop(), 'level': 'city', 'members': members}, 'geometry': mapping(geometry)})
result = {'type': 'FeatureCollection', 'sourceHash': source_hash, 'date': '2026-04-01', 'features': features}
out = source.with_name('gyeonggi-cities.json')
serialized = json.dumps(result, ensure_ascii=False, separators=(',', ':'))
# 8개 파생 외곽만 추가하며 원본을 다시 저장하거나 단순화하지 않는다.
assert len(serialized.encode()) < 2_000_000
out.write_text(serialized)
assert hashlib.sha256(source.read_bytes()).hexdigest() == source_hash
print('cities', len(features), 'bytes', out.stat().st_size)
