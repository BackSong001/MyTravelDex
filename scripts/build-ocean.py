"""기존 경계에서 장식용 바다 색상층만 생성한다. 실제 수심 자료가 아니다."""
import hashlib
import json
import math
from pathlib import Path
import shapely
from PIL import Image, ImageDraw, ImageFilter, __version__ as pillow_version
from shapely.geometry import shape
from shapely.ops import transform, unary_union

assert shapely.__version__ == '2.2.0', 'Use Shapely 2.2.0 for reproducible decoration'
assert pillow_version == '10.2.0', 'Use Pillow 10.2.0 for reproducible decoration'
root = Path(__file__).resolve().parents[1]
source = root / 'frontend/src/data/maps/korea-sido.json'
source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
assert source_hash == '76b47436a96ee9837fb22d792d4c98260133cae747a446207647304873375535'
features = json.loads(source.read_text())['features']
assert len(features) == 17
land = unary_union([shape(f['geometry']) for f in features])
assert land.is_valid
# d3 geoMercator().scale(1000).translate([0,0])와 같은 화면 좌표다.
land = transform(lambda xs, ys: (
    [math.radians(x) * 1000 for x in xs],
    [-math.asinh(math.tan(math.radians(y))) * 1000 for y in ys]), land)
decoration = land.simplify(.06, preserve_topology=True)

layers = []
band, previous = decoration, 0
for i in range(128):
    progress = i / 127
    distance = .08 + 80 * progress ** 2
    band = band.buffer(distance - previous, quad_segs=4).simplify(.01, preserve_topology=True)
    assert band.is_valid and band.covers(decoration)
    display = band.simplify(max(.01, distance * .002), preserve_topology=True)
    layers.append((progress, display))
    previous = distance
layers.reverse()
palette = ['#DCE9E7', '#C7DCDE', '#ADC9D1', '#8EAFBF', '#7294AA']
x0, y0, x1, y1 = band.bounds
x0, y0, x1, y1 = x0 - 2, y0 - 2, x1 + 2, y1 + 2
width, height = x1 - x0, y1 - y0
size = 2048
image = Image.new('RGB', (size, size), palette[-1])
def points(ring):
    return [((x - x0) / width * size, (y - y0) / height * size) for x, y in ring.coords]
for progress, geometry in layers:
    at = progress * 4
    index = min(3, int(at))
    mix = at - index
    rgb = tuple(round(int(palette[index][i:i+2], 16) * (1 - mix) +
                      int(palette[index+1][i:i+2], 16) * mix) for i in (1, 3, 5))
    mask = Image.new('1', (size, size))
    draw = ImageDraw.Draw(mask)
    polygons = [geometry] if geometry.geom_type == 'Polygon' else geometry.geoms
    for polygon in polygons:
        draw.polygon(points(polygon.exterior), fill=1)
        for ring in polygon.interiors:
            draw.polygon(points(ring), fill=0)
    image.paste(rgb, mask=mask)
asset = root / 'frontend/assets/maps/ocean-depth.png'
asset.parent.mkdir(parents=True, exist_ok=True)
image.filter(ImageFilter.GaussianBlur(1)).save(asset, optimize=True)
output = root / 'frontend/src/data/maps/korea-ocean.json'
output.write_text(json.dumps({'sourceSha256': source_hash, 'date': '2026-04-01',
    'scale': 1000, 'simplifyTolerance': .06, 'layerCount': len(layers),
    'palette': palette, 'x': x0, 'y': y0, 'width': width, 'height': height,
    'pixelWidth': size, 'pixelHeight': size,
    'assetSha256': hashlib.sha256(asset.read_bytes()).hexdigest()}, separators=(',', ':')))
assert source_hash == hashlib.sha256(source.read_bytes()).hexdigest()
print(json.dumps({'layers': len(layers), 'bytes': asset.stat().st_size,
                  'decodedBytes': size * size * 4, 'sourceUnchanged': True}))
