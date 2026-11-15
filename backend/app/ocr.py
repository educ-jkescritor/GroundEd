"""OCR for code screenshots inside PDFs (multimodal input). Deterministic: RapidOCR (ONNX, CPU), no LLM.

Pipeline per PDF: find images → skip noise (small, tiny on the page, repeated backgrounds/logos, pages that already
have plenty of text) → read the first N unique images in page order (fixed count, so results are deterministic;
cached by fingerprint across analyses) →
keep confident lines, drop line numbers and stray symbols → map each line's box to page coordinates (for highlights).
Rules: backend/rules/images.yaml. If the OCR engine is unavailable, analysis continues without it and says so.
"""
from __future__ import annotations

import hashlib
import json
import re
from collections import Counter
from dataclasses import dataclass
from functools import lru_cache
from typing import Optional

import yaml

from .config import BASE_DIR

RULES_FILE = BASE_DIR / "rules" / "images.yaml"
ENGINE_NAME = "rapidocr-onnxruntime"


@dataclass(frozen=True)
class ImageRules:
    version: str
    min_side_px: int
    min_shown_area_pt2: float
    repeated_fraction: float
    only_pages_with_text_below: int
    max_images: int
    max_side_px: int
    min_confidence: float
    drop_lines: tuple[re.Pattern[str], ...]
    strip_leading: re.Pattern[str]


@lru_cache(maxsize=1)
def rules() -> ImageRules:
    raw = RULES_FILE.read_bytes()
    d = yaml.safe_load(raw)
    return ImageRules(
        version=hashlib.sha256(raw).hexdigest()[:12],
        min_side_px=int(d["min_side_px"]), min_shown_area_pt2=float(d["min_shown_area_pt2"]),
        repeated_fraction=float(d["repeated_fraction"]), only_pages_with_text_below=int(d["only_pages_with_text_below"]),
        max_images=int(d["max_images"]), max_side_px=int(d["max_side_px"]),
        min_confidence=float(d["min_confidence"]),
        drop_lines=tuple(re.compile(p) for p in d["drop_lines"]), strip_leading=re.compile(d["strip_leading"]),
    )


@dataclass
class OcrLine:
    text: str
    bbox: list[float]  # page coordinates (points): x0, y0, x1, y1
    confidence: float


@dataclass
class OcrReport:
    engine: str  # e.g. "rapidocr-onnxruntime 1.4.4", or "unavailable"
    images_found: int = 0
    images_candidates: int = 0  # after skipping noise
    images_read: int = 0
    images_from_cache: int = 0
    images_over_budget: int = 0  # worth reading but beyond the per-analysis limit (max_images)
    pages_with_text: int = 0


@lru_cache(maxsize=1)
def _engine():
    """(engine, label) or (None, reason). Loaded once per process."""
    try:
        from importlib.metadata import version

        import onnxruntime
        # Module content passes through this engine: switch off ONNX Runtime's platform telemetry before first use.
        onnxruntime.disable_telemetry_events()
        from rapidocr_onnxruntime import RapidOCR
        return RapidOCR(), f"{ENGINE_NAME} {version(ENGINE_NAME)}"
    except Exception as e:  # missing package or system library: analysis continues without OCR
        return None, f"unavailable ({e.__class__.__name__})"


def engine_label() -> str:
    return _engine()[1]


def clean_line(text: str) -> Optional[str]:
    r = rules()
    t = r.strip_leading.sub("", text).strip()
    if not t or any(p.search(t) for p in r.drop_lines):
        return None
    return t


def _read_image(eng, png: bytes) -> list[tuple[str, list[float], float]]:
    """Raw OCR: (text, [x0,y0,x1,y1] in image pixels, confidence)."""
    result, _ = eng(png)
    out = []
    for box, text, conf in result or []:
        xs, ys = [p[0] for p in box], [p[1] for p in box]
        out.append((text, [min(xs), min(ys), max(xs), max(ys)], float(conf)))
    return out


def read_pdf_images(doc, page_texts: dict[int, str], cache_get, cache_put) -> tuple[dict[int, list[OcrLine]], OcrReport]:
    """OCR the useful images of an open PyMuPDF document. Returns {page_number: [OcrLine]} and a report."""
    import pymupdf

    r = rules()
    eng, label = _engine()
    report = OcrReport(engine=label)
    lines: dict[int, list[OcrLine]] = {}
    if eng is None:
        return lines, report

    infos = [(pg.number + 1, info) for pg in doc for info in pg.get_image_info(xrefs=True, hashes=True)]
    report.images_found = len(infos)
    repeat = Counter(info["digest"] for _, info in infos)
    threshold = max(3, int(len(doc) * r.repeated_fraction))

    candidates = []
    for page_no, info in infos:
        x0, y0, x1, y1 = info["bbox"]
        if (min(info["width"], info["height"]) < r.min_side_px
                or (x1 - x0) * (y1 - y0) < r.min_shown_area_pt2
                or repeat[info["digest"]] >= threshold
                or len(page_texts.get(page_no, "").strip()) >= r.only_pages_with_text_below
                or not info.get("xref")):
            continue
        candidates.append((page_no, info))
    report.images_candidates = len(candidates)

    # Which images are read is decided by position only (first max_images unique candidates in page order), never by
    # time or by what happens to be cached: the same PDF always reads the same images.
    selected, results = [], {}
    for page_no, info in candidates:
        key = info["digest"].hex() if isinstance(info["digest"], bytes) else str(info["digest"])
        if key in selected or len(selected) < r.max_images:
            if key not in selected:
                selected.append(key)
        else:
            report.images_over_budget += 1
            continue
        if key not in results:
            cached = cache_get(key, label)
            if cached is not None:
                results[key] = cached
                report.images_from_cache += 1
            else:
                pix = pymupdf.Pixmap(doc, info["xref"])
                if pix.alpha or pix.n - pix.alpha != 3:
                    pix = pymupdf.Pixmap(pymupdf.csRGB, pix)
                scale = min(1.0, r.max_side_px / max(pix.width, pix.height))
                if scale < 1.0:
                    pix = pymupdf.Pixmap(pix, int(pix.width * scale), int(pix.height * scale))
                raw = _read_image(eng, pix.tobytes("png"))
                # store in original-pixel units so the cache does not depend on the scale rule
                results[key] = [(t, [c / scale for c in b], conf) for t, b, conf in raw]
                cache_put(key, label, results[key])
                report.images_read += 1
        # map image pixels -> page points
        x0, y0, x1, y1 = info["bbox"]
        sx, sy = (x1 - x0) / info["width"], (y1 - y0) / info["height"]
        for text, (bx0, by0, bx1, by1), conf in results[key]:
            if conf < r.min_confidence or (t := clean_line(text)) is None:
                continue
            lines.setdefault(page_no, []).append(
                OcrLine(text=t, bbox=[x0 + bx0 * sx, y0 + by0 * sy, x0 + bx1 * sx, y0 + by1 * sy], confidence=conf))
    report.pages_with_text = len(lines)
    return lines, report


def encode(raw: list) -> str:
    return json.dumps(raw)


def decode(s: str) -> list:
    return [tuple(x) for x in json.loads(s)]
