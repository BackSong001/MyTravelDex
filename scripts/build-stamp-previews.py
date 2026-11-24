"""등록된 스탬프 원본에서 108dp 칸에 사용할 투명 잉크 도안을 만든다."""
from pathlib import Path
import re

from PIL import Image, ImageChops

frontend = Path(__file__).resolve().parents[1] / "frontend"
assets = frontend / "assets/ui"
output = assets / "stamp-previews"
output.mkdir(exist_ok=True)

registry = (frontend / "src/uiAssets.ts").read_text()
for filename in sorted(set(re.findall(r"require\('\.\./assets/ui/([\w-]+-stamp[\w-]*\.png)'\)", registry))):
    with Image.open(assets / filename) as source:
        art = source.convert("RGBA")
    art.thumbnail((216, 216), Image.Resampling.LANCZOS)
    r, g, b, alpha = art.split()
    ink = ImageChops.darker(r, ImageChops.darker(g, b))
    # 종이색은 투명하게, 원본의 가는 선과 채색 무늬는 농담으로 남긴다.
    ink = ink.point(lambda value: max(0, min(255, (223 - value) * 1.65)))
    preview = Image.new("LA", art.size, (132, 0))
    preview.putalpha(ImageChops.multiply(ink, alpha))
    preview.save(output / filename, optimize=True)
