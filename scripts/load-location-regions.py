"""고정된 원본 경계를 psql 표준 입력용 트랜잭션으로 출력한다."""
import hashlib
import json
from pathlib import Path

maps = Path(__file__).resolve().parents[1] / 'frontend/src/data/maps'
manifest = json.loads((maps / 'manifest.json').read_bytes())
version = manifest['boundaryDate']
assert version == '2026-11-09'


def read(name, digest):
    raw = (maps / name).read_bytes()
    if hashlib.sha256(raw).hexdigest() != digest:
        raise ValueError(f'Unexpected source: {name}')
    return json.loads(raw)


districts = read('korea-sigungu.json', manifest['files']['korea-sigungu.json'])['features']
provinces = read('korea-sido.json', manifest['files']['korea-sido.json'])['features']
stamps = read('legacy-stamp-sido-20260401.json', '76b47436a96ee9837fb22d792d4c98260133cae747a446207647304873375535')['features']
areas = read('home-map-areas.json', 'b8448b4ba60c21e9a1b8d2f1168c2eaad7b0df7c64641abd92ea1f07036741da')['provinces']
rows = []
for kind, features in [('district', districts), ('stamp', stamps)]:
    for i, feature in enumerate(features):
        p = feature['properties']
        rows.append((kind, p['code'], p['parentCode'], p['name'], i, feature['geometry']))
for area in areas:
    g = next(f['geometry'] for f in provinces if f['properties']['code'] == area['code'])
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
    for i, island in enumerate(area['islands']):
        rows.append(('island', island['id'], area['code'], island['name'], i,
                     dict(type='MultiPolygon', coordinates=[polys[n] for n in island['indices']])))

assert len(districts) == 256 and len(stamps) == 17 and len(provinces) == 16 and len(rows) == 309
print(r"""\set ON_ERROR_STOP on
begin;
create temporary table incoming(kind text,code text,parent_code text,name text,ordinal integer,geometry text) on commit drop;
copy incoming from stdin;""")
for kind, code, parent, name, ordinal, geometry in rows:
    print(kind, code, parent or r'\N', name, ordinal, json.dumps(geometry, separators=(',', ':')), sep='\t')
print(r'\.')
print(f"""
lock table travel_geo.active in exclusive mode;
insert into travel_geo.boundaries
select '{version}',kind,code,parent_code,name,ordinal,extensions.st_multi(extensions.st_geomfromgeojson(geometry))
from incoming on conflict do nothing;
do $$ begin
  if (select count(*) from travel_geo.boundaries where version='{version}') <> {len(rows)}
     or exists (select from travel_geo.boundaries where version='{version}' and
                 (extensions.st_isempty(geom) or not extensions.st_isvalid(geom)))
     or exists (select from travel_geo.active where version>'{version}') then
    raise exception 'Boundary dataset cannot be activated';
  end if;
end $$;
analyze travel_geo.boundaries;
lock table public.locations in share row exclusive mode;
insert into travel_geo.active values(true,'{version}') on conflict(singleton) do update set version=excluded.version;
update public.locations set boundary_date='{version}' where boundary_date is distinct from '{version}';
commit;
""")
