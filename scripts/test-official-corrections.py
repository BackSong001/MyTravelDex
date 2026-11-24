"""불일치 영역을 임의 배정하지 않고 일치 근거만 반영하는지 검증한다."""
import importlib.util
from pathlib import Path
import unittest
from shapely.geometry import box, Polygon, MultiPolygon

spec=importlib.util.spec_from_file_location('official',Path(__file__).with_name('prepare-official-regions.py'))
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


class CorrectionTests(unittest.TestCase):
    def test_nested_polygon_members_remain_union_not_an_invented_hole(self):
        raw=MultiPolygon([box(0,0,10,10),box(2,2,3,3)])
        fixed=module.valid_polygon(raw)
        self.assertEqual(fixed.area,100)
        self.assertTrue(fixed.covers(box(2,2,3,3)))

    def test_disagreement_keeps_the_overlap(self):
        a,b=module.agreed_removals(box(0,0,10,10),box(0,0,10,10),box(20,0,30,10),box(20,0,30,10),box(0,0,10,10))
        self.assertEqual(a.area+b.area,0)

    def test_partial_agreement_preserves_unresolved_land(self):
        overlap=box(0,0,10,10)
        a,b=module.agreed_removals(overlap,box(0,0,6,10),box(4,0,10,10),box(0,0,7,10),box(5,0,10,10))
        self.assertEqual(a.area,30)
        self.assertEqual(b.area,40)
        self.assertEqual(overlap.difference(a.union(b)).area,30)
        self.assertEqual(overlap.difference(a).union(overlap.difference(b)).symmetric_difference(overlap).area,0)

    def test_zero_width_invalid_component_does_not_expand_land(self):
        raw=Polygon([(0,0),(0,2),(2,2),(2,0),(1,0),(1,-1),(1,0),(0,0)])
        fixed=module.valid_polygon(raw)
        self.assertTrue(fixed.is_valid)
        self.assertEqual(fixed.area,4)
        self.assertEqual(fixed.bounds,(0,0,2,2))


if __name__=='__main__':unittest.main()
