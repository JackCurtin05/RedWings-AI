import os
import math
import pathlib
import tempfile
from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from services.media_pipe_processing import analyze_video
from services.metrics import extract_metrics
from services.llm import generate_coaching_feedback

app = FastAPI()


def sanitize(obj):
    """Recursively replace NaN/Inf floats with None so the response is JSON-safe."""
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    return obj


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/hello")
async def hello():
    return {"message": "RedWings AI backend is running"}


@app.post("/analyze")
async def analyze(
    video: UploadFile = File(...),
    sport: str = Form(...),
    skill_level: str = Form(...),
    age: int = Form(...),
    height_in: float = Form(...),
    weight_lbs: float = Form(...),
    training_hours: int = Form(...),
    injury_history: str = Form("None"),
    video_info: str = Form("None"),
):
    # ── Validate file type ────────────────────────────────────────────────
    ALLOWED_EXTENSIONS = (".mp4", ".mov", ".webm", ".avi", ".m4v", ".mkv")
    filename_lower = (video.filename or "").lower()
    mime_ok = video.content_type and video.content_type.startswith("video/")
    ext_ok  = any(filename_lower.endswith(ext) for ext in ALLOWED_EXTENSIONS)
    if not mime_ok and not ext_ok:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{video.content_type}'. "
                "Upload a video file (.mp4, .mov, .webm, .avi, etc.)"
            ),
        )

    # ── Write to temp file (preserve original extension for OpenCV) ───────
    video_bytes     = await video.read()
    original_suffix = pathlib.Path(video.filename or "video.mp4").suffix or ".mp4"

    with tempfile.NamedTemporaryFile(suffix=original_suffix, delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        # Step 1: MediaPipe pose extraction (returns joint data + video metadata)
        video_result = analyze_video(tmp_path)
        joint_data   = video_result["joint_data"]
        video_meta   = {k: v for k, v in video_result.items() if k != "joint_data"}

        if joint_data is None or len(joint_data) == 0:
            raise HTTPException(
                status_code=422,
                detail=(
                    "No pose landmarks detected. Make sure the full body is clearly "
                    "visible and the video is well-lit."
                ),
            )

        # Step 2: Biomechanical metric extraction
        metrics = extract_metrics(joint_data)

        if not metrics:
            raise HTTPException(
                status_code=422,
                detail="Could not extract metrics from video.",
            )

        if "error" in metrics:
            raise HTTPException(status_code=422, detail=metrics["error"])

    finally:
        os.unlink(tmp_path)

    # ── Build profile ─────────────────────────────────────────────────────
    profile = {
        "sport":           sport,
        "skill_level":     skill_level,
        "age":             age,
        "height_in":       round(height_in, 1),
        "weight_lbs":      round(weight_lbs, 1),
        "training_hours":  training_hours,
        "injury_history":  injury_history,
        "video_info":      video_info,
    }

    # ── Prepare metrics for LLM (exclude large/visual-only fields) ────────
    EXCLUDE_FROM_LLM = {"frame_by_frame", "trick_phases",
                        "knee_angle_series", "hip_angle_series", "trunk_lean_series"}
    llm_metrics = sanitize({k: v for k, v in metrics.items() if k not in EXCLUDE_FROM_LLM})

    # ── Prepare metrics for frontend (exclude only raw frame data) ────────
    EXCLUDE_FROM_RESPONSE = {"frame_by_frame"}
    metrics_summary = sanitize({k: v for k, v in metrics.items() if k not in EXCLUDE_FROM_RESPONSE})

    # Step 4: LLM coaching feedback
    coaching = generate_coaching_feedback(profile, llm_metrics)

    return sanitize({
        "profile":    profile,
        "metrics":    metrics_summary,
        "video_meta": video_meta,
        "coaching":   coaching,
    })
