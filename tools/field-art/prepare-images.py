"""Encode delivery variants of the generated artwork without changing source PNGs."""
from pathlib import Path
import base64, hashlib, io, json, sys
from PIL import Image

root = Path(__file__).resolve().parents[2]
assets = root / "assets" / "images"
themes = sys.argv[1:]
allowed = {"drilling", "welllog", "cementing", "completion", "perforation"}
if not themes or any(theme not in allowed for theme in themes):
    raise SystemExit("Pass one or more stage names: " + ", ".join(sorted(allowed)))
for theme in themes:
    source = assets / (theme + "-process-source.png")
    image = Image.open(source).convert("RGB")
    if image.width * 3 != image.height * 4:
        raise ValueError(str(source) + ": the approved stage artwork needs a 4:3 canvas")
    variants = []
    for suffix, width, quality in (("", 1448, 88), ("-small", 768, 83)):
        delivery = image.resize((width, width * 3 // 4), Image.Resampling.LANCZOS)
        target = assets / (theme + "-process" + suffix + ".webp")
        delivery.save(target, "WEBP", quality=quality, method=6)
        variants.append(dict(file=target.name, width=delivery.width, height=delivery.height,
                             bytes=target.stat().st_size, sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    thumbnail = image.resize((96, 72), Image.Resampling.LANCZOS)
    buffer = io.BytesIO()
    thumbnail.save(buffer, "WEBP", quality=40)
    manifest = dict(source=dict(file=source.name, sha256=hashlib.sha256(source.read_bytes()).hexdigest(),
                               width=image.width, height=image.height), assets=variants,
                    placeholder=base64.b64encode(buffer.getvalue()).decode(),
                    generator="built-in image_gen", reference="mudlogging-process-small.webp",
                    note="Generated professional illustration, not model experiment input.")
    (assets / (theme + "-images.json")).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    print(theme, sum(item["bytes"] for item in variants), "delivery bytes")
