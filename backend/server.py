"""
MPLADS Sentinel - FastAPI Analytics Server
Exposes high-performance REST APIs driven by the real analytical & ML engine.
"""

from fastapi import FastAPI, APIRouter, Query, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import io
import pandas as pd
from typing import Optional

from backend.services.analytics import AnalyticsService

# Locate default dataset
ROOT_DIR = Path(__file__).parent
DATA_PATH = ROOT_DIR / "data" / "mplads_synthetic.csv"

app = FastAPI(
    title="MPLADS Sentinel API",
    description=(
        "Analytical decision-support system for prioritizing MPLADS public works for human review.\n\n"
        "Analytical signals do not constitute proof of fraud or misconduct. "
        "Final assessment requires authorized human investigation."
    ),
    version="1.0.0",
)

# CORS configuration
cors_origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize analytical engine with synthetic dataset
analytics_service = AnalyticsService(str(DATA_PATH) if DATA_PATH.exists() else None)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
def root():
    return {
        "service": "MPLADS Sentinel API",
        "version": "1.0.0",
        "status": "online",
        "total_works_indexed": analytics_service.summary.get("totalWorks", 0),
        "disclaimer": "Analytical signals do not constitute proof of fraud or misconduct. Final assessment requires authorized human investigation.",
    }


@api_router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "MPLADS Sentinel API",
        "dataset": {
            "records": analytics_service.summary.get("totalWorks", 3000),
        },
    }


@api_router.get("/summary")
def get_summary():
    return analytics_service.summary


@api_router.get("/states")
def get_states():
    return analytics_service.state_aggregates


@api_router.get("/districts")
def get_districts():
    return analytics_service.district_aggregates


@api_router.get("/agencies")
def get_agencies():
    return analytics_service.agency_aggregates


@api_router.get("/categories")
def get_categories():
    return analytics_service.category_aggregates


@api_router.get("/duplicates")
def get_duplicate_candidates(limit: int = 50):
    return analytics_service.duplicate_candidates[:limit]


@api_router.get("/alerts")
def get_alerts():
    return analytics_service.alerts


@api_router.get("/filters")
def get_filters():
    states = [{"code": s["code"], "name": s["name"]} for s in analytics_service.state_aggregates]
    districts = sorted(list({d["district"] for d in analytics_service.district_aggregates}))
    categories = sorted(list({c["category"] for c in analytics_service.category_aggregates}))
    agencies = sorted(list({a["agency"] for a in analytics_service.agency_aggregates}))
    return {
        "states": states,
        "districts": districts,
        "categories": categories,
        "agencies": agencies,
        "riskTiers": ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
    }


@api_router.get("/risk")
def get_risk_works(
    page: int = Query(1, ge=1, description="Page number"),
    pageSize: int = Query(12, ge=1, le=1000, description="Items per page"),
    riskTier: str = Query("ALL", description="Risk tier: CRITICAL, HIGH, MEDIUM, LOW, or ALL"),
    state: str = Query("ALL", description="State code or ALL"),
    district: str = Query("ALL", description="District name or ALL"),
    category: str = Query("ALL", description="Category or ALL"),
    agency: str = Query("ALL", description="Agency or ALL"),
    search: str = Query("", description="Search term"),
    sortBy: str = Query("riskScore", description="Field to sort by"),
    sortOrder: str = Query("desc", description="asc or desc"),
):
    return analytics_service.query_works(
        search=search,
        state=state,
        district=district,
        category=category,
        agency=agency,
        riskTier=riskTier,
        sortBy=sortBy,
        sortOrder=sortOrder,
        page=page,
        pageSize=pageSize,
    )


@api_router.get("/works")
def query_works(
    search: str = Query("", description="Search term for ID, description, location"),
    state: str = Query("ALL", description="State code or ALL"),
    district: str = Query("ALL", description="District name or ALL"),
    category: str = Query("ALL", description="Sector category or ALL"),
    agency: str = Query("ALL", description="Implementing agency or ALL"),
    riskLevel: Optional[str] = Query(None, description="CRITICAL, HIGH, MEDIUM, LOW, or ALL"),
    riskTier: Optional[str] = Query(None, description="CRITICAL, HIGH, MEDIUM, LOW, or ALL"),
    minScore: int = Query(0, ge=0, le=100),
    maxScore: int = Query(100, ge=0, le=100),
    sortBy: str = Query("riskScore", description="Field to sort by"),
    sortDir: Optional[str] = Query(None, description="asc or desc"),
    sortOrder: Optional[str] = Query(None, description="asc or desc"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(12, ge=1, le=1000),
):
    tier = riskTier or riskLevel or "ALL"
    direction = sortOrder or sortDir or "desc"
    return analytics_service.query_works(
        search=search,
        state=state,
        district=district,
        category=category,
        agency=agency,
        risk_level=tier,
        min_score=minScore,
        max_score=maxScore,
        sort_by=sortBy,
        sort_dir=direction,
        page=page,
        page_size=pageSize,
    )


@api_router.get("/analytics")
def get_analytics():
    return analytics_service.get_analytics()


@api_router.get("/works/{work_id}")
def get_work(work_id: str):
    detail = analytics_service.get_work_detail(work_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Work {work_id} not found.")
    return detail


@api_router.get("/compare/{id_a}/{id_b}")
def compare_works(id_a: str, id_b: str):
    work_a = analytics_service.get_work_detail(id_a)
    work_b = analytics_service.get_work_detail(id_b)

    if not work_a or not work_b:
        missing = []
        if not work_a:
            missing.append(id_a)
        if not work_b:
            missing.append(id_b)
        raise HTTPException(status_code=404, detail=f"Work(s) not found: {', '.join(missing)}")

    # Calculate token overlap
    import re
    stop_words = {"of", "at", "and", "the", "for", "with", "to", "a", "in", "on", "construction", "works", "work"}
    tokens_a = set(re.findall(r"\b[a-zA-Z0-9]{3,}\b", work_a["description"].lower())) - stop_words
    tokens_b = set(re.findall(r"\b[a-zA-Z0-9]{3,}\b", work_b["description"].lower())) - stop_words

    union = tokens_a | tokens_b
    intersection = tokens_a & tokens_b
    desc_overlap = int(round((len(intersection) / len(union) * 100.0))) if union else 0

    cost_a = work_a["sanctionedAmount"]
    cost_b = work_b["sanctionedAmount"]
    cost_delta = int(round(abs(cost_a - cost_b) / max(cost_a, cost_b, 1) * 100.0))
    cost_match = cost_delta <= 15

    same_state = work_a["state"] == work_b["state"]
    same_dist = work_a["district"] == work_b["district"]
    same_cat = work_a["category"] == work_b["category"]
    same_agency = work_a["agency"] == work_b["agency"]

    attributes = [
        {"key": "Category", "a": work_a["category"], "b": work_b["category"], "match": same_cat},
        {"key": "State", "a": work_a["state"], "b": work_b["state"], "match": same_state},
        {"key": "District", "a": work_a["district"], "b": work_b["district"], "match": same_dist},
        {"key": "Implementing Agency", "a": work_a["agency"], "b": work_b["agency"], "match": same_agency},
        {"key": "Sanctioned Amount", "a": cost_a, "b": cost_b, "match": cost_match, "money": True, "note": f"{cost_delta}% apart"},
        {"key": "Expenditure", "a": work_a["expenditure"], "b": work_b["expenditure"], "match": abs(work_a["expenditure"] - work_b["expenditure"]) / max(work_a["expenditure"], work_b["expenditure"], 1) <= 0.15, "money": True},
        {"key": "Description overlap", "a": work_a["description"], "b": work_b["description"], "match": desc_overlap >= 40, "note": f"{desc_overlap}% token overlap", "desc": True},
    ]

    similarity = int(round(min(98.0,
        (22.0 if same_cat else 0.0) +
        (16.0 if same_state else 0.0) +
        (14.0 if same_dist else 0.0) +
        (10.0 if same_agency else 0.0) +
        (18.0 if cost_match else max(0.0, 18.0 - cost_delta / 4.0)) +
        desc_overlap * 0.25
    )))

    matches = [attr["key"] for attr in attributes if attr["match"]]
    return {
        "a": work_a,
        "b": work_b,
        "attributes": attributes,
        "similarity": similarity,
        "descOverlap": desc_overlap,
        "costDelta": cost_delta,
        "matches": matches,
    }


MAX_UPLOAD_SIZE = 25 * 1024 * 1024  # 25 MB
ALLOWED_CSV_CONTENT_TYPES = {
    "text/csv",
    "application/csv",
    "text/plain",
    "application/vnd.ms-excel",
    "application/octet-stream",
}


@api_router.post("/analyze")
async def analyze_uploaded_csv(file: UploadFile = File(...)):
    """
    Upload a new MPLADS CSV to re-run the complete analytical pipeline.
    Enforces a strict 25 MB file size limit and validates CSV file format.
    """
    # 1. Filename validation
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only .csv files are supported.",
        )

    # 2. Content-type check if provided
    if file.content_type and file.content_type.lower() not in ALLOWED_CSV_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type '{file.content_type}'. Must be a CSV document.",
        )

    # 3. Stream in chunks to prevent unbounded memory allocation
    chunk_size = 1024 * 1024  # 1 MB chunk
    total_bytes = 0
    chunks = []

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_bytes += len(chunk)
        if total_bytes > MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File exceeds maximum allowed upload size of {MAX_UPLOAD_SIZE // (1024 * 1024)} MB.",
            )
        chunks.append(chunk)

    if total_bytes == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    content = b"".join(chunks)

    # 4. Parse CSV format
    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid or corrupt CSV format: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV file contains no data rows.")

    # 5. Ingest and re-run pipeline
    try:
        result = analytics_service.analyze_dataset(df)
        return {
            "status": "success",
            "message": f"Successfully ingested and scored {result['total_works']} works.",
            "metrics": result,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analytical pipeline execution failed: {str(e)}")


app.include_router(api_router)