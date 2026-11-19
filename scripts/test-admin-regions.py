"""변환 실패 시 운영 후보를 생성하지 않는지 검증한다."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location('prepare', Path(__file__).with_name('prepare-admin-regions.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PreparationTests(unittest.TestCase):
    def run_case(self, *, name='종로구', ring=None, extra_code=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, codes, output = root/'source.json', root/'codes.txt', root/'output'
            feature = {'type': 'Feature', 'properties': {'sgg': '11110', 'sido': '11', 'sidonm': '서울특별시', 'sggnm': name}, 'geometry': {'type': 'Polygon', 'coordinates': [ring or [[126,37],[127,37],[127,38],[126,38],[126,37]]]}}
            source.write_text(json.dumps({'features': [feature]}), encoding='utf8')
            codes.write_text('header\n1111000000 서울특별시 종로구 19880423\n'+('1114000000 서울특별시 중구 19880423\n' if extra_code else ''), encoding='cp949')
            try:
                return module.prepare(source, codes, output)
            except ValueError:
                self.assertFalse(output.exists())
                raise

    def test_valid_input(self):
        self.assertEqual(self.run_case()['districtCount'], 1)

    def test_wrong_official_name(self):
        with self.assertRaisesRegex(ValueError, 'Unverified district name'):
            self.run_case(name='가상구')

    def test_missing_district(self):
        with self.assertRaisesRegex(ValueError, 'Missing legal districts'):
            self.run_case(extra_code=True)

    def test_invalid_polygon(self):
        with self.assertRaisesRegex(ValueError, 'Invalid geometry'):
            self.run_case(ring=[[126,37],[127,38],[127,37],[126,38],[126,37]])


if __name__ == '__main__':
    unittest.main()
