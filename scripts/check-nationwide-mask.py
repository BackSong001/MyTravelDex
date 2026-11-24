"""실제 렌더 픽셀을 표시 차폐가 아닌 공식 sido 원본으로 독립 검증한다."""
import json,math,hashlib
from pathlib import Path
import numpy as np
import shapely
from shapely.geometry import shape
from pyproj import Transformer
from PIL import Image

root=Path(__file__).resolve().parents[1]
directory=root/'artifacts/admin-boundaries/nationwide-mask'
manifest=json.loads((directory/'captures.json').read_text(encoding='utf-8'))
for name,digest in manifest['hashes'].items():
    assert hashlib.sha256((root/f'frontend/src/data/maps/{name}.json').read_bytes()).hexdigest()==digest
polygons=[shape(f['geometry']) for f in json.loads((root/'frontend/src/data/maps/korea-sido.json').read_text(encoding='utf-8'))['features']]
for p in polygons: shapely.prepare(p)
mercator=Transformer.from_crs(4326,3857,always_xy=True)
boundaries=[shapely.transform(p.boundary,mercator.transform,interleaved=False) for p in polygons]
reports=[]
for capture in manifest['captures']:
    width,height=capture['width'],capture['height']
    x,y=np.meshgrid(np.arange(8,width-8,16),np.arange(8,height-8,16))
    x,y=x.ravel(),y.ravel()
    offsets=[(0,0),(-3,-3),(0,-3),(3,-3),(-3,0),(3,0),(-3,3),(0,3),(3,3)]
    xs=np.stack([x+.5+dx for dx,dy in offsets]);ys=np.stack([y+.5+dy for dx,dy in offsets])
    lng,lat=capture['center'];scale=512*2**capture['zoom']/(2*math.pi)
    lons=lng+(xs-width/2)/scale*180/math.pi
    lats=(2*np.arctan(np.exp(math.log(math.tan(math.pi/4+lat*math.pi/360))-(ys-height/2)/scale))-math.pi/2)*180/math.pi
    points=shapely.points(lons,lats)
    inside=np.zeros(xs.shape,dtype=bool)
    for p in polygons: inside |= shapely.contains(p,points)
    stable=np.all(inside==inside[0],axis=0)
    pixels=np.asarray(Image.open(directory/capture['file']).convert('RGB'))[y,x]
    expected=np.where(inside[0,:,None],[245,243,237],[169,215,238])
    failed=stable & np.any(pixels!=expected,axis=1)
    # 9점 사이를 지나는 아주 얇은 해안/수로는 불일치 지점의 실제 경계 거리로 확인한다.
    # 허용 범위는 사전에 정한 3px이며 큰 육지 침범에는 적용하지 않는다.
    edge_rechecks=0
    for i in np.where(failed)[0]:
        point=shapely.Point(*mercator.transform(lons[0,i],lats[0,i]))
        distance=min(b.distance(point) for b in boundaries)*scale/6378137
        if distance<=3:
            stable[i]=False;failed[i]=False;edge_rechecks+=1
    reports.append({**capture,'checked':int(stable.sum()),'land':int((stable & inside[0]).sum()),'water':int((stable & ~inside[0]).sum()),'edgeSkipped':int((~stable).sum()),'exactEdgeRechecks':edge_rechecks,'failures':[{'pixel':[int(x[i]),int(y[i])],'coordinate':[float(lons[0,i]),float(lats[0,i])],'actual':pixels[i].tolist(),'expected':expected[i].tolist()} for i in np.where(failed)[0]]})
summary={'captures':len(reports),'checked':sum(r['checked'] for r in reports),'land':sum(r['land'] for r in reports),'water':sum(r['water'] for r in reports),'edgeSkipped':sum(r['edgeSkipped'] for r in reports),'failures':sum(len(r['failures']) for r in reports),'hashes':manifest['hashes'],'reports':reports}
(directory/'validation.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in summary.items() if k not in ('reports','hashes')}))
assert summary['failures']==0,'Official land/water pixel mismatch: inspect validation.json'
