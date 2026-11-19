"""국내 OSM 스냅숏에서 도로·건물·장소명 표시용 XYZ를 생성한다."""
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

import osmium
from shapely import from_wkb, make_valid, prepare, to_geojson, union_all
from shapely.geometry import Point, shape

source, regions = map(Path, sys.argv[1:])
frontend = Path(__file__).resolve().parents[1] / 'frontend'
maps = frontend / 'src/data/maps'
digest = hashlib.file_digest(source.open('rb'), 'sha256').hexdigest()
if digest != json.loads((maps / 'osm-audit.json').read_bytes())['sourceSha256']:
    raise ValueError('Expected the same OSM snapshot as the regional map')
land = union_all([shape(f['geometry']) for f in json.loads(regions.read_bytes())['features']
                  if f['properties']['level'] == 'province'])
prepare(land)
factory = osmium.geom.WKBFactory()
roads = {
    **dict.fromkeys(('trunk','primary','trunk_link','primary_link'), 'arterial'),
    **dict.fromkeys(('secondary','tertiary','secondary_link','tertiary_link'), 'collector'),
    **dict.fromkeys(('residential','living_street','unclassified','road'), 'street'),
    **dict.fromkeys(('service','pedestrian','footway','cycleway','steps','track','path','bridleway'), 'lane'),
}
min_zoom = {'arterial':10, 'collector':11, 'rail':11, 'street':12, 'lane':12, 'building':12, 'station':12, 'place':12}
keys = ('highway','building','railway','amenity','tourism','shop','public_transport')

def feature(obj):
    tags = obj.tags
    highway = tags.get('highway')
    if highway in ('motorway','motorway_link') or tags.get('area') == 'yes' and obj.is_way():
        return
    if obj.is_way():
        kind = roads.get(highway)
        if not kind and tags.get('railway') in ('rail','light_rail','tram','subway','narrow_gauge'):
            kind = 'rail'
        if kind and len(obj.nodes) > 1:
            return kind, from_wkb(factory.create_linestring(obj))
    elif obj.is_area() and tags.get('building') not in (None,'no','construction'):
        return 'building', from_wkb(factory.create_multipolygon(obj))
    elif obj.is_node() and tags.get('name'):
        if tags.get('railway') in ('station','halt','subway_entrance') or tags.get('public_transport') == 'station':
            return 'station', Point(obj.location.lon, obj.location.lat)
        if tags.get('amenity') or tags.get('tourism') or tags.get('shop'):
            return 'place', Point(obj.location.lon, obj.location.lat)

with tempfile.TemporaryDirectory() as temp:
    work = Path(temp)
    data = work / 'features.geojsonl'
    counts = dict.fromkeys(min_zoom, 0)
    invalid = 0
    stream = osmium.FileProcessor(source).with_locations().with_areas(osmium.filter.KeyFilter('building'))
    with data.open('w') as out:
        for obj in stream.with_filter(osmium.filter.KeyFilter(*keys)):
            try:
                item = feature(obj)
            except (RuntimeError, osmium.InvalidLocationError):
                # 노드가 없거나 면을 조립할 수 없는 원본 객체는 표시에서 제외한다.
                invalid += 1
                continue
            if not item:
                continue
            kind, geom = item
            if not land.covers(geom):
                if not land.intersects(geom):
                    continue
                geom = make_valid(geom).intersection(land)
                if geom.geom_type not in ('LineString','MultiLineString','Polygon','MultiPolygon','Point') or geom.is_empty:
                    continue
            props = {'kind':kind}
            name = obj.tags.get('name')
            if name and kind not in ('building', 'lane'):
                props['name'] = name
            attrs = json.dumps(props,ensure_ascii=False,separators=(',',':'))
            out.write('{"type":"Feature","tippecanoe":{"minzoom":%d},"properties":%s,"geometry":%s}\n'
                      % (min_zoom[kind], attrs, to_geojson(geom)))
            counts[kind] += 1
    assert all(counts.values()), counts
    print(counts, 'invalid OSM geometries:', invalid, flush=True)
    tiles = work / 'tiles'
    subprocess.run(['tippecanoe','-q','-Z10','-z12','-d13','-D13','-r1','-l','neighborhood',
                    '--no-feature-limit','--no-tile-size-limit','--no-tile-compression','-e',str(tiles),str(data)],
                   check=True, env={**os.environ,'TIPPECANOE_MAX_THREADS':'4'})
    # 과거 해시의 상세 타일과 섞이지 않도록 최종 파일 내용으로 버전을 결정한다.
    h = hashlib.sha256()
    for path in sorted(tiles.rglob('*.pbf')):
        h.update(str(path.relative_to(tiles)).encode())
        h.update(path.read_bytes())
    version = 'blocks-' + h.hexdigest()[:12]
    # 국내 사각 범위에서 바다 또는 무자료인 타일도 정상 빈 MVT로 응답한다.
    for z in range(10,13):
        n = 2**z
        tile_x = lambda lon: math.floor((lon+180)*n/360)
        tile_y = lambda lat: math.floor((1-math.asinh(math.tan(math.radians(lat)))/math.pi)*n/2)
        for x in range(tile_x(124),tile_x(132)+1):
            directory = tiles / str(z) / str(x)
            directory.mkdir(parents=True,exist_ok=True)
            for y in range(tile_y(39),tile_y(33)+1):
                path = directory / f'{y}.pbf'
                if not path.exists():
                    path.write_bytes(b'\x1a\x10\x0a\x0cneighborhood\x78\x02')
    (tiles/'metadata.json').unlink(missing_ok=True)
    dest = frontend / 'public/boundary-tiles' / version
    if not dest.exists():
        shutil.move(str(tiles),dest)
    (maps/'osm-neighborhood-version.json').write_text(json.dumps(version)+'\n')
    print(version, flush=True)
