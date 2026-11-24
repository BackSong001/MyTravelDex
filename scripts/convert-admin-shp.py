"""공식 좌표계 증거가 있을 때만 SHP를 WGS84 후보로 변환한다."""
import argparse
import hashlib
import json
from pathlib import Path
import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import shape, mapping
from shapely.ops import transform

parser = argparse.ArgumentParser()
parser.add_argument('source', type=Path)
parser.add_argument('--source-crs', required=True)
parser.add_argument('--crs-evidence', required=True, help='제공자 PRJ/메타데이터 출처 URL')
parser.add_argument('--encoding', required=True)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args()
transformer = Transformer.from_crs(CRS(args.source_crs), 4326, always_xy=True)
features = []
with shapefile.Reader(str(args.source), encoding=args.encoding) as reader:
    for row in reader.iterShapeRecords():
        g = shape(row.shape.__geo_interface__)
        if g.geom_type not in ('Polygon', 'MultiPolygon') or not g.is_valid or g.is_empty:
            raise ValueError('Invalid source polygon; do not silently repair official boundaries')
        g = transform(transformer.transform, g)
        if not g.is_valid or not (120 < g.bounds[0] <= g.bounds[2] < 135 and 30 < g.bounds[1] <= g.bounds[3] < 40):
            raise ValueError('Invalid WGS84 Korean boundary')
        features.append({'type': 'Feature', 'properties': row.record.as_dict(), 'geometry': mapping(g)})
args.output.parent.mkdir(parents=True, exist_ok=True)
args.output.write_text(json.dumps({'type': 'FeatureCollection', 'metadata': {'status': 'unverified-candidate', 'sourceCrs': args.source_crs, 'crsEvidence': args.crs_evidence, 'encoding': args.encoding, 'sourceSha256': hashlib.sha256(args.source.read_bytes()).hexdigest(), 'simplification': 'none'}, 'features': features}, ensure_ascii=False, separators=(',', ':')), encoding='utf8')
print('Converted candidate features:', len(features), '(not approved for app use)')
