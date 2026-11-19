"""공식 후보의 겹침·명칭 오류를 운영 경계 변경 없이 검출한다."""
import contextlib
import importlib.util
import io
import json
import tempfile
import unittest
from pathlib import Path
import shapefile
from pyproj import CRS, Transformer
from shapely.geometry import Polygon, mapping
from shapely.ops import transform

spec = importlib.util.spec_from_file_location('audit',Path(__file__).with_name('audit-official-boundaries.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class AuditTests(unittest.TestCase):
    def test_overlap_and_name_error_are_reported_without_changing_application(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, app, codes = root/'source.shp', root/'app.json', root/'codes.txt'
            polygons = [Polygon([(200000,500000),(200000,501000),(201000,501000),(201000,500000)]),Polygon([(200500,500000),(200500,501000),(201500,501000),(201500,500000)])]
            with shapefile.Writer(str(source),encoding='cp949') as w:
                w.field('A1','C',5);w.field('A2','C',60);w.field('A3','C',10)
                for code,name,g in zip(['11110','11140'],['서울특별시 종로구','오류 중구'],polygons):
                    w.poly([list(g.exterior.coords)]);w.record(code,name,'2026-11-09')
            source.with_suffix('.prj').write_text(CRS(5186).to_wkt(),encoding='utf8')
            source.with_suffix('.cpg').write_text('949')
            transformer = Transformer.from_crs(5186,4326,always_xy=True).transform
            app.write_text(json.dumps({'features':[{'properties':{'code':c},'geometry':mapping(transform(transformer,g))} for c,g in zip(['11110','11140'],polygons)]}),encoding='utf8')
            original = app.read_bytes()
            codes.write_text('header\n1111000000 서울특별시 종로구 19880423\n1114000000 서울특별시 중구 19880423\n',encoding='cp949')
            with contextlib.redirect_stdout(io.StringIO()): report=module.audit(source,app,root/'output',codes)
            self.assertEqual(report['status'],'audit-only-not-approved-for-app')
            self.assertEqual(report['overlapPairs'][0]['areaSqM'],500000)
            self.assertEqual([x['code'] for x in report['nameMismatches']],['11140'])
            self.assertEqual(report['missingFromOfficial'],[])
            self.assertEqual(app.read_bytes(),original)
            source.with_suffix('.prj').write_text(CRS(4326).to_wkt(),encoding='utf8')
            with self.assertRaisesRegex(ValueError,'EPSG:5186'):
                module.audit(source,app,root/'rejected',codes)
            self.assertFalse((root/'rejected').exists())


if __name__ == '__main__':
    unittest.main()
