"""Prepare traceable, CC BY cuttings figures for the offline case page.

Original paper files are read from --source-dir and are not modified. Existing
older figure files are retained; the new manifest lists only displayed figures.
"""
from pathlib import Path
import argparse
import hashlib
import json
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path, required=True)
args = parser.parse_args()
here = Path(__file__).resolve().parent
output = here / 'runtime' / 'paper-figures'
output.mkdir(exist_ok=True)
papers = {
    'tolstaya': {
        'authors': 'Ekaterina Tolstaya, Anuar Shakirov, Mokhles Mezghani & Sergey Safonov',
        'year': 2023, 'title': 'Fast Reservoir Characterization with AI-Based Lithology Prediction Using Drill Cuttings Images and Noisy Labels',
        'journal': 'Journal of Imaging', 'citation': '9(7), 126', 'doi': '10.3390/jimaging9070126',
        'articleUrl': 'https://www.mdpi.com/2313-433X/9/7/126', 'license': 'CC BY 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/'
    },
    'caja': {
        'authors': 'Miguel Ángel Caja et al.', 'year': 2023,
        'title': 'Digital Rock Physics in Cuttings Using High-Resolution Thin Section Scan Images',
        'journal': 'Minerals', 'citation': '13(9), 1140', 'doi': '10.3390/min13091140',
        'articleUrl': 'https://www.mdpi.com/2075-163X/13/9/1140', 'license': 'CC BY 4.0', 'licenseUrl': 'https://creativecommons.org/licenses/by/4.0/'
    },
}
specs = [
    ('cuttings-types', 'tolstaya-figure-4.png', 'tolstaya', 4, 960, 'Full figure: nine labeled lithotype examples; Sand and Dolomite are the original labels.'),
    ('cuttings-variation', 'tolstaya-figure-6.png', 'tolstaya', 6, 1140, 'Full figure: siltstone examples from different depth intervals and formations.'),
    ('cuttings-contamination', 'tolstaya-figure-8.png', 'tolstaya', 8, 1140, 'Full figure: examples of drill-cutting images affected by mud contamination.'),
    ('cuttings-thinsection', 'caja-figure-9.png', 'caja', 9, 550, 'Full figure: real oil/gas well cuttings in thin-section scans, original 12 mm scale retained; no prior sieving.'),
]
assets = []
for key, filename, paper, figure, max_width, note in specs:
    source = args.source_dir / filename
    raw = source.read_bytes()
    with Image.open(source) as original:
        original_size = list(original.size)
        picture = original.convert('RGB')
        if picture.width > max_width:
            picture = picture.resize((max_width, round(picture.height * max_width / picture.width)), Image.Resampling.LANCZOS)
        target = output / (key + '.webp')
        picture.save(target, 'WEBP', quality=72, method=6)
        thumb_picture = picture.copy()
        thumb_picture.thumbnail((210, 160), Image.Resampling.LANCZOS)
        thumb = output / (key + '-thumb.webp')
        thumb_picture.save(thumb, 'WEBP', quality=65, method=6)
        paper_file = 'jimaging-09-00126' if paper == 'tolstaya' else 'minerals-13-01140'
        article_path = 'jimaging/jimaging-09-00126' if paper == 'tolstaya' else 'minerals/minerals-13-01140'
        figure_url = f'https://pub.mdpi-res.com/{article_path}/article_deploy/html/images/{paper_file}-g{figure:03d}.png'
        assets.append({
            'id': key, 'paper': paper, 'figure': str(figure), 'file': target.name, 'thumbnail': thumb.name,
            'width': picture.width, 'height': picture.height, 'sourceSize': original_size,
            'sourceFilename': filename, 'figureUrl': figure_url, 'sourceSha256': hashlib.sha256(raw).hexdigest(),
            'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'thumbnailSha256': hashlib.sha256(thumb.read_bytes()).hexdigest(),
            'cropPixels': None, 'processing': 'Full original figure, aspect-preserving resize and WebP encoding; original labels and scale retained; no retouching or generative reconstruction',
            'note': note,
        })
manifest = {'retrieved': '2026-10-28', 'purpose': 'Background teaching examples only; excluded from the 66 classification samples', 'papers': papers, 'assets': assets}
(here / 'paper-figures.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'figures': len(assets), 'figure_bytes': sum((output / a['file']).stat().st_size for a in assets), 'thumbnail_bytes': sum((output / a['thumbnail']).stat().st_size for a in assets)}))
