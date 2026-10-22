"""Check generated PDF contents and page bounds; render local review previews."""
import json
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "research/reports/MediTrack-Matara-Model-Comparison-Sinhala.pdf"
REVIEW = ROOT / "research/.wheel-cache/pdf-review"
REVIEW.mkdir(exist_ok=True, parents=True)
document = fitz.open(PDF)
assert len(document) == 8, f"Unexpected page count: {len(document)}"
details, thumbnails = [], []
for i, page in enumerate(document):
    text = page.get_text()
    sinhala = sum(0x0D80 <= ord(c) <= 0x0DFF for c in text)
    assert sinhala > 100, f"Missing Sinhala text on page {i + 1}"
    spans = [span for block in page.get_text("dict")["blocks"] if "lines" in block
             for line in block["lines"] for span in line["spans"]]
    # Footer is 8 pt; larger body/table text must stay clear of its area.
    body_bottom = max(s["bbox"][3] for s in spans if s["size"] > 8.1)
    assert body_bottom < 790, f"Content near footer on page {i + 1}: {body_bottom}"
    assert all(span["bbox"][0] >= 0 and span["bbox"][2] <= page.rect.width + 1 for span in spans)
    sinhala_fonts = [f for f in page.get_fonts() if "Iskoola" in f[3]]
    assert sinhala_fonts and all(len(document.extract_font(font[0])[3]) > 0 for font in sinhala_fonts)
    page.get_pixmap(matrix=fitz.Matrix(1.3, 1.3), alpha=False).save(REVIEW / f"page-{i + 1}.png")
    image = Image.open(REVIEW / f"page-{i + 1}.png")
    image.thumbnail((300, 425))
    thumbnails.append(image.copy())
    details.append({"page": i + 1, "sinhala_characters": sinhala, "body_bottom_pt": round(body_bottom, 2)})
all_text = "\n".join(page.get_text() for page in document)
for token in ["79.4%", "78.9%", "23.7%", "Logistic Regression", "Random Forest", "CatBoost", "XGBoost", "8.057199"]:
    assert token in all_text, f"Missing result: {token}"
canvas = Image.new("RGB", (1200, 900), "#cbd5e1")
for i, image in enumerate(thumbnails):
    canvas.paste(image, ((i % 4) * 300, (i // 4) * 450))
canvas.save(REVIEW / "contact-sheet.png")
result = {"pages": len(document), "bytes": PDF.stat().st_size,
          "embedded_sinhala_fonts": True, "content_and_bounds_checks": "passed", "details": details}
(PDF.parent / "pdf-verification.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result, indent=2))
