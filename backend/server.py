"""
ProcureGuard - FastAPI Analytics & Intelligence Server
Exposes high-performance REST APIs driven by the real modular procurement anomaly detection engine.
"""

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
for p in [str(PROJECT_ROOT), str(BASE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from fastapi import FastAPI, APIRouter, Query, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
import io
import pandas as pd
from typing import Optional

from backend.services.analytics import AnalyticsService
from backend.auth import (
    authenticate_user,
    create_access_token,
    get_current_user_optional,
    get_current_user,
    User,
    LoginRequest,
    LoginResponse,
)

# Locate dataset
ROOT_DIR = Path(__file__).parent
DATA_PATH = ROOT_DIR / "data" / "procurement_synthetic.csv"
if not DATA_PATH.exists():
    DATA_PATH = ROOT_DIR / "data" / "mplads_synthetic.csv"

app = FastAPI(
    title="ProcureGuard API",
    description=(
        "AI-Powered Public Procurement Anomaly & Investigation Intelligence Platform.\n\n"
        "Analytical signals do not constitute proof of fraud, corruption, misconduct, or wrongdoing. "
        "Final assessment requires authorized human investigation."
    ),
    version="2.0.0",
)

# CORS configuration
cors_origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allowed_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^(https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1)(:\d+)?)$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

analytics_service = AnalyticsService(str(DATA_PATH) if DATA_PATH.exists() else None)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
def root():
    return {
        "service": "ProcureGuard API",
        "version": "2.0.0",
        "status": "online",
        "total_tenders_indexed": analytics_service.summary.get("totalTenders", 0),
        "disclaimer": "Analytical signals do not constitute proof of fraud, corruption, misconduct, or wrongdoing. Final assessment requires authorized human investigation.",
    }


@api_router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "ProcureGuard API",
        "dataset": {
            "records": analytics_service.summary.get("totalTenders", 5000),
        },
    }


# ==================== AUTHENTICATION & RBAC ENDPOINTS ====================

@api_router.post("/auth/login", response_model=LoginResponse)
def login(req: LoginRequest):
    """Authenticate with username and password, returning signed session token."""
    user = authenticate_user(req.username, req.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Invalid username or password. Please verify your credentials.",
        )
    token = create_access_token({"sub": user.username, "role": user.role, "scope": user.scope})
    return LoginResponse(token=token, user=user)


@api_router.get("/auth/me", response_model=User)
def get_me(user: User = Depends(get_current_user)):
    """Retrieve current authenticated user context and authorized jurisdiction."""
    return user


@api_router.post("/auth/logout")
def logout():
    """Invalidate current session."""
    return {"status": "ok", "message": "Successfully logged out."}


# ==================== SCOPED ANALYTICAL ENDPOINTS ====================

@api_router.get("/summary")
def get_summary(user: Optional[User] = Depends(get_current_user_optional)):
    return analytics_service.get_scoped_summary(user)


@api_router.get("/states")
def get_states(user: Optional[User] = Depends(get_current_user_optional)):
    return analytics_service.get_scoped_states(user)


@api_router.get("/districts")
def get_districts(user: Optional[User] = Depends(get_current_user_optional)):
    return analytics_service.get_scoped_districts(user)


@api_router.get("/vendors")
@api_router.get("/agencies")
def get_vendors(user: Optional[User] = Depends(get_current_user_optional)):
    return analytics_service.get_scoped_agencies(user)


@api_router.get("/vendors/{vendor_id}")
@api_router.get("/agencies/{vendor_id}")
def get_vendor_detail(vendor_id: str):
    profile = analytics_service.get_vendor_detail(vendor_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found.")
    return profile


@api_router.get("/categories")
def get_categories(user: Optional[User] = Depends(get_current_user_optional)):
    return analytics_service.get_scoped_categories(user)


@api_router.get("/relationships")
def get_relationships():
    """Returns multi-entity relationship graph nodes and links."""
    return analytics_service.network_graph


@api_router.get("/alerts")
def get_alerts(user: Optional[User] = Depends(get_current_user_optional)):
    return analytics_service.get_scoped_alerts(user)


@api_router.get("/filters")
def get_filters(user: Optional[User] = Depends(get_current_user_optional)):
    return analytics_service.get_scoped_filters(user)


@api_router.get("/risk")
@api_router.get("/tenders")
@api_router.get("/works")
def query_tenders(
    search: str = Query("", description="Search by ID, title, vendor, department"),
    state: str = Query("ALL", description="State code or ALL"),
    district: str = Query("ALL", description="District name or ALL"),
    category: str = Query("ALL", description="Procurement category or ALL"),
    agency: str = Query("ALL", description="Vendor / Agency or ALL"),
    riskTier: Optional[str] = Query(None, description="CRITICAL, HIGH, MEDIUM, LOW, or ALL"),
    riskLevel: Optional[str] = Query(None, description="CRITICAL, HIGH, MEDIUM, LOW, or ALL"),
    minScore: int = Query(0, ge=0, le=100),
    maxScore: int = Query(100, ge=0, le=100),
    sortBy: str = Query("riskScore", description="Field to sort by"),
    sortDir: Optional[str] = Query(None, description="asc or desc"),
    sortOrder: Optional[str] = Query(None, description="asc or desc"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(12, ge=1, le=1000),
    user: Optional[User] = Depends(get_current_user_optional),
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
        user=user,
    )


@api_router.get("/tenders/{tender_id}")
@api_router.get("/works/{tender_id}")
def get_tender(tender_id: str, user: Optional[User] = Depends(get_current_user_optional)):
    try:
        detail = analytics_service.get_work_detail(tender_id, user=user)
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail=f"Access forbidden: Tender {tender_id} is outside your authorized jurisdiction.",
        )
    if not detail:
        raise HTTPException(status_code=404, detail=f"Tender {tender_id} not found.")
    return detail


@api_router.get("/compare/{id_a}/{id_b}")
def compare_tenders(id_a: str, id_b: str, user: Optional[User] = Depends(get_current_user_optional)):
    try:
        tender_a = analytics_service.get_work_detail(id_a, user=user)
        tender_b = analytics_service.get_work_detail(id_b, user=user)
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail="Access forbidden: One or both procurements are outside your authorized jurisdiction.",
        )

    if not tender_a or not tender_b:
        missing = []
        if not tender_a:
            missing.append(id_a)
        if not tender_b:
            missing.append(id_b)
        raise HTTPException(status_code=404, detail=f"Tender(s) not found: {', '.join(missing)}")

    import re
    stop_words = {"of", "at", "and", "the", "for", "with", "to", "a", "in", "on", "procurement", "supply", "works"}
    tokens_a = set(re.findall(r"\b[a-zA-Z0-9]{3,}\b", tender_a["description"].lower())) - stop_words
    tokens_b = set(re.findall(r"\b[a-zA-Z0-9]{3,}\b", tender_b["description"].lower())) - stop_words

    union = tokens_a | tokens_b
    intersection = tokens_a & tokens_b
    desc_overlap = int(round((len(intersection) / len(union) * 100.0))) if union else 0

    cost_a = tender_a["sanctionedAmount"]
    cost_b = tender_b["sanctionedAmount"]
    cost_delta = int(round(abs(cost_a - cost_b) / max(cost_a, cost_b, 1) * 100.0))
    cost_match = cost_delta <= 15

    same_state = tender_a["state"] == tender_b["state"]
    same_dist = tender_a["district"] == tender_b["district"]
    same_cat = tender_a["category"] == tender_b["category"]
    same_vendor = tender_a["vendorName"] == tender_b["vendorName"]
    same_dept = tender_a.get("department") == tender_b.get("department")

    attributes = [
        {"key": "Category", "a": tender_a["category"], "b": tender_b["category"], "match": same_cat},
        {"key": "Department", "a": tender_a.get("department", "General"), "b": tender_b.get("department", "General"), "match": same_dept},
        {"key": "State", "a": tender_a["state"], "b": tender_b["state"], "match": same_state},
        {"key": "District", "a": tender_a["district"], "b": tender_b["district"], "match": same_dist},
        {"key": "Winning Vendor", "a": tender_a["vendorName"], "b": tender_b["vendorName"], "match": same_vendor},
        {"key": "Awarded Value", "a": cost_a, "b": cost_b, "match": cost_match, "money": True, "note": f"{cost_delta}% delta"},
        {"key": "Payment Amount", "a": tender_a["expenditure"], "b": tender_b["expenditure"], "match": abs(tender_a["expenditure"] - tender_b["expenditure"]) / max(tender_a["expenditure"], tender_b["expenditure"], 1) <= 0.15, "money": True},
        {"key": "Title / Spec Overlap", "a": tender_a["description"], "b": tender_b["description"], "match": desc_overlap >= 40, "note": f"{desc_overlap}% token overlap", "desc": True},
    ]

    similarity = int(round(min(98.0,
        (22.0 if same_cat else 0.0) +
        (16.0 if same_state else 0.0) +
        (14.0 if same_dist else 0.0) +
        (10.0 if same_vendor else 0.0) +
        (8.0 if same_dept else 0.0) +
        (15.0 if cost_match else max(0.0, 15.0 - cost_delta / 4.0)) +
        desc_overlap * 0.15
    )))

    matches = [attr["key"] for attr in attributes if attr["match"]]
    return {
        "a": tender_a,
        "b": tender_b,
        "attributes": attributes,
        "similarity": similarity,
        "descOverlap": desc_overlap,
        "costDelta": cost_delta,
        "matches": matches,
    }


@api_router.get("/analytics")
def get_analytics(user: Optional[User] = Depends(get_current_user_optional)):
    return analytics_service.get_scoped_analytics(user)


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
    """Upload a new procurement CSV to re-run the complete analytical pipeline."""
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail="Invalid file format. Only .csv files are supported.",
        )

    if file.content_type and file.content_type.lower() not in ALLOWED_CSV_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported content type '{file.content_type}'. Must be a CSV document.",
        )

    chunk_size = 1024 * 1024
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

    try:
        df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid or corrupt CSV format: {str(e)}")

    if df.empty:
        raise HTTPException(status_code=400, detail="Uploaded CSV file contains no data rows.")

    try:
        result = analytics_service.analyze_dataset(df)
        return {
            "status": "success",
            "message": f"Successfully ingested and evaluated {result['total_tenders']} procurement records.",
            "metrics": result,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analytical pipeline execution failed: {str(e)}")


app.include_router(api_router)