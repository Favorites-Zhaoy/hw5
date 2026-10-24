"""Deterministic crops/downscales of cited, CC BY paper photographs.

No generative image processing. Originals remain in the selected source folder.
Runtime uses the prepared assets; Pillow is only an authoring dependency.
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
runtime = here / 'runtime'
output = runtime / 'paper-figures'
output.mkdir(exist_ok=True)

papers = {
    'cuttings': {
        'authors': 'Tolstaya, Shakirov, Mezghani & Safonov', 'year': 2023,
        'title': 'Fast Reservoir Characterization with AI-Based Lithology Prediction Using Drill Cuttings Images and Noisy Labels',
        'journal': 'Journal of Imaging', 'citation': '9(7), 126',
        'doi': '10.3390/jimaging9070126', 'figure': '4',
        'articleUrl': 'https://www.mdpi.com/2313-433X/9/7/126',
        'figureUrl': 'https://pub.mdpi-res.com/jimaging/jimaging-09-00126/article_deploy/html/images/jimaging-09-00126-g004.png',
    },
    'grains': {
        'authors': 'Yue Zhang, Yunmeng Zhang & Jizhong Huang', 'year': 2022,
        'title': 'Experimental study on capillary water absorption of sandstones from different grotto heritage sites in China',
        'journal': 'Heritage Science', 'citation': '10, 25',
        'doi': '10.1186/s40494-022-00656-y', 'figure': '4(a,b)',
        'articleUrl': 'https://www.nature.com/articles/s40494-022-00656-y',
        'figureUrl': 'https://media.springernature.com/lw685/springer-static/image/art%3A10.1186%2Fs40494-022-00656-y/MediaObjects/40494_2022_656_Fig4_HTML.png',
    },
    'cement': {
        'authors': 'Gbenga Olamide Adesola, Oswald Gwavava & Kuiwu Liu', 'year': 2023,
        'title': 'Petrographic Analysis of the Sandstones and Mudstones in Alice, Eastern Cape Province, South Africa: Implications for Groundwater Potential',
        'journal': 'Proceedings', 'citation': '87(1), 39 (IECG 2022)',
        'doi': '10.3390/iecg2022-14818', 'figure': '9',
        'articleUrl': 'https://www.mdpi.com/2504-3900/87/1/39',
        'figureUrl': 'https://pub.mdpi-res.com/proceedings/proceedings-87-00039/article_deploy/html/images/proceedings-87-00039-g009.png',
    },
    'structure': {
        'authors': 'Qingsong Tang, Lu Zhou, Lei Chen, Xiucheng Tan & Gaoxiang Wang', 'year': 2021,
        'title': 'Development Characteristics of Shale Lithofacies in the Longmaxi Formation and their Main Controlling Factors in the Changning Area, South Sichuan Basin, SW China',
        'journal': 'Frontiers in Earth Science', 'citation': '9, 775657',
        'doi': '10.3389/feart.2021.775657', 'figure': '3(A–C)',
        'articleUrl': 'https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.775657/full',
        'figureUrl': 'https://www.frontiersin.org/files/Articles/775657/xml-images/feart-09-775657-g003.webp',
    },
}

specs = [
    ('color', 'cuttings-color.png', 'cuttings', (0, 565, 660, 1090), 640, 'Figure 4: Dolomite tile; original label retained'),
    ('grain-coarse', 'grain-comparison.png', 'grains', (0, 0, 685, 510), 560, 'Figure 4(a), YG; 800 micrometre scale bar retained'),
    ('grain-fine', 'grain-comparison.png', 'grains', (0, 525, 685, 1027), 560, 'Figure 4(b), DZ; 300 micrometre scale bar retained'),
    ('cement', 'matrix-calcite.png', 'cement', None, 760, 'Complete Figure 9; original yellow arrows and 2000 micrometre scale retained'),
    ('structure', 'shale-structures.webp', 'structure', None, 1000, 'Complete Figure 3; A lamination, B graptolites, C quartz lamination'),
]
assets = []
for key, filename, paper, crop, max_width, note in specs:
    source = args.source_dir / filename
    raw = source.read_bytes()
    with Image.open(source) as original:
        original_size = list(original.size)
        image = original.convert('RGB')
        if crop:
            image = image.crop(crop)
        if image.width > max_width:
            image = image.resize((max_width, round(image.height * max_width / image.width)), Image.Resampling.LANCZOS)
        target = output / (key + '.webp')
        image.save(target, 'WEBP', quality=77, method=6)
        thumbnail = image.copy()
        thumbnail.thumbnail((210, 160), Image.Resampling.LANCZOS)
        thumb = output / (key + '-thumb.webp')
        thumbnail.save(thumb, 'WEBP', quality=65, method=6)
        assets.append({
            'id': key, 'paper': paper, 'file': target.name, 'thumbnail': thumb.name,
            'width': image.width, 'height': image.height, 'sourceSize': original_size,
            'sourceFilename': filename, 'sourceSha256': hashlib.sha256(raw).hexdigest(),
            'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
            'thumbnailSha256': hashlib.sha256(thumb.read_bytes()).hexdigest(),
            'cropPixels': list(crop) if crop else None,
            'processing': 'Crop where stated, aspect-preserving resize, WebP encoding; no recoloring, retouching or generative reconstruction',
            'note': note,
        })

# A lighter display copy of the existing decorative illustration leaves room for
# real teaching photographs in the original localStorage case-package protocol.
with Image.open(runtime / 'm1-dioramas.webp') as illustration:
    illustration.thumbnail((800, 800), Image.Resampling.LANCZOS)
    illustration.save(runtime / 'm1-dioramas-display.webp', 'WEBP', quality=60, method=6)

for paper in papers.values():
    paper['license'] = 'CC BY 4.0'
    paper['licenseUrl'] = 'https://creativecommons.org/licenses/by/4.0/'
manifest = {'retrieved': '2026-10-24', 'purpose': 'Background teaching examples only; excluded from the 66 classification samples', 'papers': papers, 'assets': assets}
(here / 'paper-figures.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'figure_bytes': sum((output / a['file']).stat().st_size for a in assets), 'thumbnail_bytes': sum((output / a['thumbnail']).stat().st_size for a in assets), 'decorative_display_bytes': (runtime / 'm1-dioramas-display.webp').stat().st_size}))
