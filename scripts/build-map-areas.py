"""표시용 본토/먼섬 인덱스와 보수적인 국내 라벨 필터를 생성한다."""
import hashlib
import json
import sys
from pathlib import Path
import shapely
import pyproj
from shapely.geometry import shape, mapping
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree
assert shapely.__version__ == '2.2.0' and pyproj.__version__ == '3.7.2'
root = Path(__file__).resolve().parents[1] / 'frontend/src/data/maps'
source = root / 'korea-sido.json'
digest = hashlib.sha256(source.read_bytes()).hexdigest()
assert digest == json.loads((source.parent / 'manifest.json').read_text(encoding='utf-8'))['files']['korea-sido.json']
forward = pyproj.Transformer.from_crs(4326, 5179, always_xy=True).transform
back = pyproj.Transformer.from_crs(5179, 4326, always_xy=True).transform
features = json.loads(source.read_text(encoding='utf-8'))['features']
districts = json.loads((root / 'korea-sigungu.json').read_text(encoding='utf-8'))['features']

def partition(polygons):
    # 최대육지와 직접거리만 사용한다. 가까운 섬을 통해 30km 범위를 연장하지 않는다.
    core = max(range(len(polygons)), key=lambda i: (polygons[i].area, -i))
    mainland = [i for i, p in enumerate(polygons) if p.distance(polygons[core]) <= 30000]
    mainland_set = set(mainland)
    remaining = [i for i in range(len(polygons)) if i not in mainland_set]
    tree = STRtree([polygons[i] for i in remaining])
    unseen = set(range(len(remaining)))
    groups = []
    while unseen:
        pending = [min(unseen)]; unseen.remove(pending[0]); group = []
        while pending:
            i = pending.pop(); group.append(remaining[i])
            for j in tree.query(polygons[remaining[i]], predicate='dwithin', distance=10000):
                j = int(j)
                if j in unseen: unseen.remove(j); pending.append(j)
        groups.append(sorted(group))
    return mainland, sorted(groups)

# 정확임계·직접거리·연결요소 경계는 미터좌표의 실제 polygon으로 검사한다.
from shapely.geometry import box
core = box(0,0,1000,1000)
assert partition([core,box(31000,0,31001,1),box(31000.01,20,31001.01,21)])[0] == [0,1]
assert partition([core,box(50000,0,50001,1),box(60001,0,60002,1)])[1] == [[1,2]]
assert partition([core,box(50000,0,50001,1),box(60001.01,0,60002.01,1)])[1] == [[1],[2]]
areas = []
for f in sorted(features, key=lambda f:f['properties']['code']):
    code = f['properties']['code']; geometry = f['geometry']
    coordinates = [geometry['coordinates']] if geometry['type']=='Polygon' else geometry['coordinates']
    original = [shape({'type':'Polygon','coordinates':p}) for p in coordinates]
    order = sorted(range(len(original)), key=lambda i:(original[i].bounds,hashlib.sha256(original[i].wkb).hexdigest()))
    metric = [transform(forward,original[i]) for i in order]
    main, groups = partition(metric)
    islands = []
    for group in groups:
        indices = sorted(order[i] for i in group)
        anchor = max((original[i] for i in indices),key=lambda p:p.area).representative_point()
        candidates = [d for d in districts if d['properties']['parentCode']==code and shape(d['geometry']).covers(anchor)]
        district = candidates[0] if len(candidates)==1 else f
        identifier = f"island:{code}:" + hashlib.sha256(','.join(map(str,group)).encode()).hexdigest()[:12]
        islands.append({'id':identifier,'indices':indices,'districtCode':district['properties']['code'],'name':district['properties']['name']+' 섬 지역 '+str(len(islands)+1)})
    all_indices = [order[i] for i in main]+[i for item in islands for i in item['indices']]
    assert sorted(all_indices)==list(range(len(original))) and len(set(all_indices))==len(original)
    areas.append({'code':code,'mainland':sorted(order[i] for i in main),'islands':islands})
land = unary_union([shape(f['geometry']) for f in features])
metric_land = transform(forward,land)
interior = metric_land.buffer(-250).simplify(100,preserve_topology=True).intersection(metric_land)
labels = transform(back,interior).intersection(land)
# 라벨 표시용 좌표만 약 0.1m 단위로 줄이고 원본 육지로 다시 잘라낸다. 판정 경계는 변경하지 않는다.
labels = shapely.set_precision(shapely.set_precision(labels,1e-6),0).intersection(land)
assert labels.is_valid and not labels.is_empty and labels.difference(land).area < 1e-12
assert labels.area/land.area > .9
outputs = {'home-map-areas.json':{'sourceHash':digest,'projection':'EPSG:5179','date':json.loads((source.parent / 'manifest.json').read_text(encoding='utf-8'))['boundaryDate'],'provinces':areas},'label-land.json':{'type':'Feature','properties':{'sourceHash':digest,'insetMeters':250,'simplifyMeters':100,'coordinatePrecisionDegrees':1e-6},'geometry':mapping(labels)}}
for name,value in outputs.items():
    data=json.dumps(value,ensure_ascii=False,separators=(',',':'))+'\n'
    if '--check' in sys.argv: assert (root/name).read_text(encoding='utf-8')==data
    else: (root/name).write_text(data, encoding='utf-8')
    print(name,len(data.encode()))
print('island groups',sum(len(p['islands']) for p in areas))
assert hashlib.sha256(source.read_bytes()).hexdigest()==digest
