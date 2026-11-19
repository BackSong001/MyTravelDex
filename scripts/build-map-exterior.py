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
assert digest == json.loads((source.parent / 'manifest.json').read_text(encoding='utf-8'))['files']['korea-sido.json']
features = json.loads(source.read_text(encoding='utf-8'))['features']
print('Unioning official province boundaries',flush=True)
assert len(features) == json.loads((source.parent / 'manifest.json').read_text(encoding='utf-8'))['provinceCount']
land = unary_union([shape(f['geometry']) for f in features])
assert land.is_valid
print('Validating full exterior',flush=True)
exterior = box(-180, -85.051128, 180, 85.051128).difference(land)
assert exterior.is_valid and exterior.intersection(land).area < 1e-10
assert abs(exterior.area + land.area - 360 * 170.102256) < 1e-8
# 거대한 외곽 링과 수천 개의 홀을 그대로 타일 클리핑하면 일부 배율에서
# 육지 홀이 채워진다. 표시 도형만 0.25도 셀로 분할해 복잡한 홀을 작게 유지한다.
# 외부 네 사각형도 포함해 전 세계 차폐 범위는 보존한다.
import math
x0,y0,x1,y1=land.bounds
x0,y0,x1,y1=math.floor(x0),math.floor(y0),math.ceil(x1),math.ceil(y1)
cells=[box(-180,-85.051128,x0,85.051128),box(x1,-85.051128,180,85.051128),
       box(x0,-85.051128,x1,y0),box(x0,y1,x1,85.051128)]
divisions=4
cells += [box(x/divisions,y/divisions,(x+1)/divisions,(y+1)/divisions) for x in range(x0*divisions,x1*divisions) for y in range(y0*divisions,y1*divisions)]
parts=[]
shapely.prepare(land)
def partition(piece,cell,depth=0):
    if piece.is_empty: return
    if piece.geom_type=='GeometryCollection':
        piece=unary_union([g for g in piece.geoms if g.geom_type in ('Polygon','MultiPolygon')])
    if piece.is_empty or piece.geom_type not in ('Polygon','MultiPolygon'): return
    polygons=[piece] if piece.geom_type=='Polygon' else list(piece.geoms)
    holes=max(len(p.interiors) for p in polygons)
    # 바다만 있는 셀은 유지하고 해안 셀은 작게 만든다. 홀 제한은 렌더러의
    # 타일 링 제한보다 여유 있게 두어 작은 섬도 차폐 아래 사라지지 않게 한다.
    if (depth>=2 and holes<=128) or piece.equals(cell):
        parts.append(piece);return
    assert depth<10,'Exterior partition did not converge'
    a,b,c,d=cell.bounds;mx,my=(a+c)/2,(b+d)/2
    for child in [box(a,b,mx,my),box(mx,b,c,my),box(a,my,mx,d),box(mx,my,c,d)]:
        partition(piece.intersection(child),child,depth+1)
print('Partitioning exterior cells',len(cells),flush=True)
for cell in cells:
    if land.contains(cell): continue
    piece=cell.difference(land) if land.intersects(cell) else cell
    if piece.is_empty: continue
    partition(piece,cell)
assert all(p.geom_type in ('Polygon','MultiPolygon') and p.is_valid for p in parts)
print('Checking partition equivalence',len(parts),flush=True)
joined=unary_union(parts)
assert joined.symmetric_difference(exterior).area < 1e-10
assert joined.intersection(land).area < 1e-10
# 공유 변을 갖는 셀은 유효한 개별 Feature로 저장한다.
result = {'type':'FeatureCollection','properties':{'sourceHash':digest,'date':json.loads((source.parent / 'manifest.json').read_text(encoding='utf-8'))['boundaryDate']},'features':[{'type':'Feature','properties':{'cell':i},'geometry':mapping(p)} for i,p in enumerate(parts)]}
(source.parent / 'korea-exterior.json').write_text(json.dumps(result,separators=(',',':')), encoding='utf-8')
assert hashlib.sha256(source.read_bytes()).hexdigest() == digest
print('valid exterior bytes', (source.parent / 'korea-exterior.json').stat().st_size)
