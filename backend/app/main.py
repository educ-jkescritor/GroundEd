"""GroundEd API. Response shapes are the contract in models.py / docs/api.md."""
import uuid
from pathlib import Path
from typing import Optional

import yaml
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware

from . import config, db
from .models import Analysis, Draft, FeedbackIn, FeedbackOut, Sample
from .pdf import PdfError
from .pipeline import analyze as run_pipeline

app = FastAPI(title="GroundEd API", version="0.2.0")
app.add_middleware(
    CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"],
)

SAMPLES_META = config.SAMPLES_DIR / "samples.yaml"


def _samples() -> list[Sample]:
    if not SAMPLES_META.exists():
        return []
    items = yaml.safe_load(SAMPLES_META.read_text()) or []
    return [Sample(**s) for s in items if (config.SAMPLES_DIR / f"{s['id']}.pdf").exists()]


@app.on_event("startup")
def startup() -> None:
    db.init_db()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "gemini_configured": bool(config.GEMINI_API_KEY)}


@app.get("/api/samples", response_model=list[Sample])
def list_samples() -> list[Sample]:
    return _samples()


async def _analyze_path(path: Path, filename: str, kind: str) -> Analysis:
    try:
        return await run_in_threadpool(run_pipeline, path, filename, kind)
    except PdfError as e:
        raise HTTPException(422, str(e)) from e


@app.post("/api/analyze", response_model=Analysis)
async def analyze(file: Optional[UploadFile] = File(None), sample_id: Optional[str] = Form(None)) -> Analysis:
    if not file and not sample_id:
        raise HTTPException(400, "Provide a PDF file or a sample_id.")

    if sample_id:
        if sample_id not in {s.id for s in _samples()}:
            raise HTTPException(404, f"Sample '{sample_id}' not found.")
        return await _analyze_path(config.SAMPLES_DIR / f"{sample_id}.pdf", f"{sample_id}.pdf", "sample")

    if file.content_type != "application/pdf":
        raise HTTPException(415, f"Only PDF files are supported (got {file.content_type or 'unknown type'}).")
    limit = config.MAX_UPLOAD_MB * 1024 * 1024
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise HTTPException(413, f"File is larger than {config.MAX_UPLOAD_MB} MB.")
    if not data.startswith(b"%PDF"):
        raise HTTPException(415, "The file does not look like a PDF.")
    config.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    path = config.UPLOAD_DIR / f"{uuid.uuid4().hex}.pdf"
    path.write_bytes(data)
    try:
        return await _analyze_path(path, file.filename or "upload.pdf", "upload")
    finally:
        path.unlink(missing_ok=True)  # uploads are not kept after analysis


@app.get("/api/analysis/{analysis_id}", response_model=Analysis)
def get_analysis(analysis_id: str) -> Analysis:
    analysis = db.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found.")
    return analysis


@app.post("/api/analysis/{analysis_id}/findings/{finding_id}/draft", response_model=Draft)
def draft_update(analysis_id: str, finding_id: str) -> Draft:
    # TODO: detect.draft_section(finding, page_text) via the LLM, once a key is configured.
    raise HTTPException(503, "AI drafts are not available yet: no LLM provider is configured on the server.")


@app.post("/api/feedback", response_model=FeedbackOut)
def submit_feedback(feedback: FeedbackIn) -> FeedbackOut:
    return FeedbackOut(id=db.save_feedback(feedback))
