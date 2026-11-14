"""GroundEd API. Response shapes are the contract in models.py / docs/api.md."""
import asyncio
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Optional

import yaml
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from . import cache, config, db, llm
from .models import Analysis, Draft, FeedbackIn, FeedbackOut, Sample
from .pdf import PdfError
from .pipeline import analyze as run_pipeline

@asynccontextmanager
async def lifespan(_: FastAPI):
    db.init_db()
    cache.purge_expired()
    yield


app = FastAPI(title="GroundEd API", version="0.2.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"],
)

SAMPLES_META = config.SAMPLES_DIR / "samples.yaml"


def _samples() -> list[Sample]:
    if not SAMPLES_META.exists():
        return []
    items = yaml.safe_load(SAMPLES_META.read_text(encoding="utf-8")) or []
    return [Sample(**s) for s in items if (config.SAMPLES_DIR / f"{s['id']}.pdf").exists()]


@app.get("/api/health")
def health() -> dict:
    """Liveness + which knowledge versions this server runs (useful right after a deployment)."""
    from . import library, registry, signals
    from .pipeline import PIPELINE_VERSION
    return {"status": "ok", "gemini_configured": bool(config.GEMINI_API_KEY),
            "versions": {"pipeline": PIPELINE_VERSION, "registry": registry.get().version,
                         "library": library.version(), "rules": signals.rules_version()}}


@app.get("/api/samples", response_model=list[Sample])
def list_samples() -> list[Sample]:
    return _samples()


@app.get("/api/samples/{sample_id}/file")
def sample_file(sample_id: str) -> FileResponse:
    """The public sample PDF itself, so the results page can show the real document beside the findings.
    Only ids listed in samples.yaml are served (no path input reaches the filesystem)."""
    if sample_id not in {s.id for s in _samples()}:
        raise HTTPException(404, f"Sample '{sample_id}' not found.")
    return FileResponse(config.SAMPLES_DIR / f"{sample_id}.pdf", media_type="application/pdf",
                        headers={"Content-Disposition": f'inline; filename="{sample_id}.pdf"'})


async def _analyze_path(path: Path, filename: str, kind: str) -> Analysis:
    try:
        return await asyncio.wait_for(run_in_threadpool(run_pipeline, path, filename, kind),
                                      timeout=config.ANALYSIS_TIMEOUT_SECONDS)
    except PdfError as e:
        raise HTTPException(422, str(e)) from e
    except asyncio.TimeoutError as e:
        raise HTTPException(504, f"Analysis took longer than {config.ANALYSIS_TIMEOUT_SECONDS} seconds and was "
                                 "stopped. Try a shorter PDF.") from e


@app.post("/api/analyze", response_model=Analysis)
async def analyze(file: Optional[UploadFile] = File(None), sample_id: Optional[str] = Form(None)) -> Analysis:
    if not file and not sample_id:
        raise HTTPException(400, "Provide a PDF file or a sample_id.")
    await run_in_threadpool(cache.purge_expired)

    if sample_id:
        if sample_id not in {s.id for s in _samples()}:
            raise HTTPException(404, f"Sample '{sample_id}' not found.")
        return await _analyze_path(config.SAMPLES_DIR / f"{sample_id}.pdf", f"{sample_id}.pdf", "sample")

    # The declared type is only a hint (some clients send octet-stream); the file's first bytes decide below.
    if file.content_type not in ("application/pdf", "application/x-pdf", "application/octet-stream", None, ""):
        raise HTTPException(415, f"Only PDF files are supported (got {file.content_type}).")
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
    analysis = db.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found.")
    finding = next((f for f in analysis.findings if f.id == finding_id), None)
    if not finding:
        raise HTTPException(404, "Finding not found in this analysis.")
    inputs = llm.draft_inputs(finding)
    if inputs is None:
        raise HTTPException(409, "Drafts are only made for findings with a verified source.")
    fact, hint = inputs
    file_hash = analysis.provenance.file_sha256 if analysis.provenance else analysis.id
    # Everything the draft depends on is in the key: a corrected fact or replacement => a fresh draft.
    key = cache.key(file_hash, finding.id, fact, hint or "", config.GEMINI_MODEL, config.GEMINI_FALLBACK_MODEL,
                    llm.DRAFT_PROMPT_VERSION)
    if hit := cache.get_draft(key):
        text, model = hit
    else:
        try:
            text, model = llm.draft_section(finding.technology, [c.snippet for c in finding.citations], fact, hint)
        except llm.LlmError as e:
            status = e.status if e.status in (429, 503, 504) else 502
            raise HTTPException(status, f"AI draft failed: {e}") from e
        cache.put_draft(key, text, model)
    return Draft(finding_id=finding.id, text=text, model=model)


@app.post("/api/feedback", response_model=FeedbackOut)
def submit_feedback(feedback: FeedbackIn) -> FeedbackOut:
    return FeedbackOut(id=db.save_feedback(feedback))
