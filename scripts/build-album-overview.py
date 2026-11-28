"""번들 OSM 경계를 초기 화면용 작은 Mercator SVG로 만든다."""
import json
import math
from pathlib import Path

root = Path(__file__).resolve().parents[1]
features = json.loads((root / 'frontend/src/data/maps/osm-provinces.json').read_text())
paths, extent = [], []
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
            extent.extend(points)
            if len(points) >= 3:
                rings.append('M' + ' '.join(f'{x},{y}' for x,y in points) + 'Z')
    paths.append('<path d="' + ''.join(rings) + '"/>')
xs, ys = zip(*extent)
box = f'{min(xs)} {min(ys)} {max(xs)-min(xs)} {max(ys)-min(ys)}'
(root / 'frontend/public/maps/korea-overview.svg').write_text(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}"><g fill="#F2EFE7" stroke="#A3AEAE" stroke-width=".65" fill-rule="evenodd">'
    + ''.join(paths) + '</g></svg>\n')
