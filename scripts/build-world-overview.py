"""Build the display-only atlas from a directory of pinned Natural Earth GeoJSON."""
import json
import sys
from pathlib import Path
from collections import defaultdict
from shapely import coverage_simplify, make_valid, orient_polygons
from shapely.geometry import shape, mapping, MultiLineString, MultiPolygon
from shapely.ops import linemerge

source = Path(sys.argv[1])
dest = Path(__file__).resolve().parents[1] / 'frontend/src/data/maps/world-overview.json'


def features(name):
    return json.loads((source / (name + '.geojson')).read_text())['features']


def rounded(points):
    if isinstance(points[0], (int, float)):
        return [round(n, 4) for n in points]
    return [rounded(part) for part in points]


names = {'PRK': '북한', 'CHN': '중국', 'JPN': '일본'}
borders = defaultdict(list)
for f in features('ne_10m_admin_1_states_provinces_lines'):
    code = f['properties']['ADM0_A3']
    if not f['geometry'] or code not in names:
        continue
    geom = shape(f['geometry'])
    borders[code].extend(geom.geoms if geom.geom_type == 'MultiLineString' else [geom])

land, labels = [], []
countries = [f for f in features('ne_10m_admin_0_countries') if f['properties']['ADM0_A3'] in names]
polygons = []
for f in countries:
    poly = make_valid(shape(f['geometry']))
    if poly.geom_type == 'GeometryCollection':
        poly = MultiPolygon([part for part in poly.geoms if part.geom_type == 'Polygon'])
    polygons.append(poly)
# 인접 국가가 같은 선을 공유하도록 함께 단순화한다.
for f, country in zip(countries, coverage_simplify(polygons, .002)):
    p = f['properties']
    code = p['ADM0_A3']
    name = names[code]
    geom = mapping(orient_polygons(country, exterior_cw=True))
    item = dict(type='Feature', properties=dict(name=name, code=code),
                bbox=country.bounds, geometry=dict(type=geom['type'], coordinates=rounded(geom['coordinates'])))
    if borders[code]:
        merged = linemerge(MultiLineString(borders[code])).simplify(.002)
        clipped = merged.intersection(make_valid(shape(item['geometry'])))
        lines = getattr(clipped, 'geoms', [clipped])
        item['divisions'] = [rounded(line.coords) for line in lines if line.geom_type == 'LineString' and line.length > .015]
    land.append(item)
    labels.append([name, p['LABEL_X'], p['LABEL_Y'], p['LABELRANK']])

for f in features('ne_110m_populated_places'):
    p = f['properties']
    if p['ADM0_A3'] in names and (p['POP_MAX'] >= 1500000 or p['SCALERANK'] <= 1):
        labels.append([p['NAME_KO'] or p['NAME'], *rounded(f['geometry']['coordinates']), 7])

dest.write_text(json.dumps(dict(land=land, labels=sorted(labels, key=lambda row: row[3])),
                           ensure_ascii=False, separators=(',', ':')) + '\n')
