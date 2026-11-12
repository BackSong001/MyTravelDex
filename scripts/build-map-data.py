# Shapely 2.1.2 개발 도구로만 실행한다. 런타임 의존성이 아니다.
import json,collections,hashlib
from pathlib import Path
from shapely.geometry import shape,mapping
from shapely.ops import unary_union
from shapely import coverage_is_valid
import argparse
parser=argparse.ArgumentParser();parser.add_argument('source',help='검증된 20260401 원본 GeoJSON 경로');src=Path(parser.parse_args().source)
assert hashlib.sha256(src.read_bytes()).hexdigest()=='90da81444f68b9a5b0bd5762f84bc6a8a9a702750c20223d52b1c5114cf7b0b1', 'Unexpected source checksum'
fs=json.loads(src.read_text())['features'];groups=collections.defaultdict(list);props={}
for f in fs:
 p=f['properties'];code=p['sgg'];groups[code].append(shape(f['geometry']));props[code]={'code':code,'parentCode':p['sido'],'name':p['sggnm'],'level':'district'}
codes=sorted(groups);geoms=[unary_union(groups[c]) for c in codes]
print('coverage',coverage_is_valid(geoms),'invalid',sum(not g.is_valid for g in geoms))
# 원자료의 작은 겹침은 보존하고 코드 우선순위로 판정한다. 단순화하지 않는다.
assert all(g.is_valid and not g.is_empty for g in geoms)
features=[{'type':'Feature','properties':props[c],'geometry':mapping(g)} for c,g in zip(codes,geoms)]
sido=collections.defaultdict(list);names={}
for f in fs:names[f['properties']['sido']]=f['properties']['sidonm']
for c,g in zip(codes,geoms):sido[props[c]['parentCode']].append(g)
parents=[{'type':'Feature','properties':{'code':c,'parentCode':None,'name':names[c],'level':'province'},'geometry':mapping(unary_union(gs))} for c,gs in sorted(sido.items())]
assert len(parents)==17
out=Path('frontend/src/data/maps');out.mkdir(parents=True,exist_ok=True)
for name,values in [('korea-sido',parents),('korea-sigungu',features)]:
 p=out/(name+'.json');p.write_text(json.dumps({'type':'FeatureCollection','features':values},ensure_ascii=False,separators=(',',':')));print(name,len(values),p.stat().st_size)
print('source hash',hashlib.sha256(src.read_bytes()).hexdigest())
