"""Encode delivery copies of the supplied artwork; preserve the original PNG."""
import base64
import hashlib
import io
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = ROOT / 'assets/images/mudlogging-process.png'
image = Image.open(source).convert('RGB')
assets = []
for width, filename in [(1448, 'mudlogging-process.webp'), (768, 'mudlogging-process-small.webp')]:
    copy = image if width == image.width else image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
    target = source.with_name(filename)
    copy.save(target, 'WEBP', quality=88, method=6)
    assets.append(dict(file=target.name, width=copy.width, height=copy.height, bytes=target.stat().st_size,
        sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
thumbnail = image.copy()
thumbnail.thumbnail((96, 72))
buffer = io.BytesIO()
thumbnail.save(buffer, 'WEBP', quality=35, method=6)
preview = base64.b64encode(buffer.getvalue()).decode('ascii')
css_file = ROOT / 'assets/core/mudlogging.css'
css = css_file.read_text(encoding='utf-8').split('/* MUDLOGGING_PREVIEW */')[0].rstrip()
css += '\n/* MUDLOGGING_PREVIEW */\n.ml-map{background-image:url("data:image/webp;base64,' + preview + '");background-size:100% 100%}\n'
css_file.write_text(css, encoding='utf-8')
manifest = dict(source=dict(file=source.name, bytes=source.stat().st_size,
    sha256=hashlib.sha256(source.read_bytes()).hexdigest()), assets=assets, previewBytes=len(buffer.getvalue()))
source.with_name('mudlogging-images.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps(manifest))
