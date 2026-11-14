"""GroundEd API. Endpoints currently return MOCK data in the final response shape (see docs/api.md).
Backend owner: replace each TODO with the real pipeline without changing the response models."""
import uuid
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from . import config, db
from .mock import MOCK_SAMPLES, mock_analysis, mock_draft
from .models import Analysis, Draft, FeedbackIn, FeedbackOut, Sample

app = FastAPI(title="GroundEd API", version="0.1.0")
app.add_middleware(
    CORSMiddleware, allow_origins=config.CORS_ORIGINS, allow_methods=["*"], allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    db.init_db()


@app.get("/api/health")
def health() -> dict:
    return {"status": "ok", "gemini_configured": bool(config.GEMINI_API_KEY)}


@app.get("/api/samples", response_model=list[Sample])
def list_samples() -> list[Sample]:
    # TODO: list PDFs in data/samples with metadata
    return MOCK_SAMPLES


@app.post("/api/analyze", response_model=Analysis)
async def analyze(file: Optional[UploadFile] = File(None), sample_id: Optional[str] = Form(None)) -> Analysis:
    if not file and not sample_id:
        raise HTTPException(400, "Provide a PDF file or a sample_id.")
    if file and file.content_type != "application/pdf":
        raise HTTPException(415, "Only PDF files are supported.")
    # TODO pipeline:
    #   pages = pdf.extract_pages(path)                 -> page texts + word boxes
    #   mentions = detect.detect_technologies(pages)    -> Gemini, verbatim-snippet checked
    #   for each mention: eol.resolve(mention)           -> Lifecycle or None (unverified)
    #   score.compute(...)                               -> Score with breakdown
    #   db.save_analysis(analysis)
    analysis_id = sample_id or uuid.uuid4().hex[:12]
    sample = next((s for s in MOCK_SAMPLES if s.id == sample_id), None)
    if sample_id and not sample:
        raise HTTPException(404, "Unknown sample.")
    filename = file.filename if file else f"{sample.title.replace(' (sample)', '')}.pdf"
    analysis = mock_analysis(analysis_id, filename, "upload" if file else "sample")
    db.save_analysis(analysis)
    return analysis


@app.get("/api/analysis/{analysis_id}", response_model=Analysis)
def get_analysis(analysis_id: str) -> Analysis:
    analysis = db.get_analysis(analysis_id)
    if not analysis:
        raise HTTPException(404, "Analysis not found.")
    return analysis


@app.post("/api/analysis/{analysis_id}/findings/{finding_id}/draft", response_model=Draft)
def draft_update(analysis_id: str, finding_id: str) -> Draft:
    # TODO: detect.draft_section(finding, page_text) via Gemini
    return Draft(finding_id=finding_id, model="mock", text=mock_draft(finding_id))


@app.post("/api/feedback", response_model=FeedbackOut)
def submit_feedback(feedback: FeedbackIn) -> FeedbackOut:
    return FeedbackOut(id=db.save_feedback(feedback))
