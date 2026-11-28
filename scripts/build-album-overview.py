"""번들 OSM 경계를 초기 화면용 작은 Mercator SVG로 만든다."""
import json
import math
from pathlib import Path

root = Path(__file__).resolve().parents[1]
features = json.loads((root / 'frontend/src/data/maps/osm-provinces.json').read_text())
paths = []
for feature in features:
    geometry = feature['geometry']
    polygons = geometry['coordinates']
    if geometry['type'] == 'Polygon':
        polygons = [polygons]
    rings = []
    for polygon in polygons:
        for ring in polygon:
            points = []
            for lon, lat in ring:
                x = round((lon - 124) * 50)
                y = round(-math.degrees(math.asinh(math.tan(math.radians(lat)))) * 50 + 2100)
                if not points or math.dist(points[-1], (x,y)) >= 2:
                    points.append((x,y))
            if len(points) >= 3:
                rings.append('M' + ' '.join(f'{x},{y}' for x,y in points) + 'Z')
    paths.append('<path d="' + ''.join(rings) + '"/>')
# 실제 첫 카메라가 사용하는 시도 표시 경계와 동일한 Mercator 영역이다.
data = root / 'frontend/src/data/maps'
display = json.loads((data/'display-metadata.json').read_text())['features']
provinces = json.loads((data/'light/provinces.json').read_text())
bounds = [display[f['properties']['code']]['bounds'] for f in provinces]
frame = [min(b[0][0] for b in bounds)/150, min(b[0][1] for b in bounds)/150,
         max(b[1][0] for b in bounds)/150, max(b[1][1] for b in bounds)/150]
(data/'national-frame.json').write_text(json.dumps(frame)+'\n')
left, top, right, bottom = [math.degrees(value)*50 for value in frame]
box = f'{left-124*50:.4f} {top+2100:.4f} {right-left:.4f} {bottom-top:.4f}'
(root / 'frontend/public/maps/korea-overview.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}"><g fill="#F2EFE7" stroke="#A3AEAE" stroke-width=".65" fill-rule="evenodd">'
    + ''.join(paths) + '</g></svg>\n')
