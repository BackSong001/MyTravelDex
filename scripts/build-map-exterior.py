"""표시 전용 국내 외부 차폐. 위치 판정 원본은 변경하지 않는다."""
import hashlib
import json
from pathlib import Path
import shapely
from shapely.geometry import shape, mapping, box
from shapely.ops import unary_union
assert shapely.__version__ == '2.2.0'
root = Path(__file__).resolve().parents[1]
source = root / 'frontend/src/data/maps/korea-sido.json'
digest = hashlib.sha256(source.read_bytes()).hexdigest()
assert digest == '76b47436a96ee9837fb22d792d4c98260133cae747a446207647304873375535'
features = json.loads(source.read_text())['features']
assert len(features) == 17
land = unary_union([shape(f['geometry']) for f in features])
assert land.is_valid
exterior = box(-180, -85.051128, 180, 85.051128).difference(land)
assert exterior.is_valid and exterior.intersection(land).area < 1e-10
assert abs(exterior.area + land.area - 360 * 170.102256) < 1e-8
result = {'type':'Feature','properties':{'sourceHash':digest,'date':'2026-04-01'},'geometry':mapping(exterior)}
(source.parent / 'korea-exterior.json').write_text(json.dumps(result,separators=(',',':')))
assert hashlib.sha256(source.read_bytes()).hexdigest() == digest
print('valid exterior bytes', (source.parent / 'korea-exterior.json').stat().st_size)
