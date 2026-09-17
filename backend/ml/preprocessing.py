"""
ProcureGuard - Data Preprocessing & Validation Module
Handles loading, schema validation, type coercions, and baseline calculations for
public procurement data (tenders, bids, vendors, contracts, payments).
Seamlessly supports both procurement schema and legacy fields for backward compatibility.
"""

import pandas as pd
import numpy as np
from datetime import datetime
from dateutil import parser as date_parser
from typing import Tuple, Dict, Any, List

REQUIRED_PROCUREMENT_COLUMNS = [
    'tender_id',
    'awarded_value',
]

LEGACY_REQUIRED_COLUMNS = [
    'work_id',
    'sanctioned_amount',
]

RECOMMENDED_COLUMNS = [
    'tender_title',
    'department',
    'category',
    'state',
    'district',
    'winning_vendor_name',
    'estimated_value',
    'bidder_count',
    'payment_amount',
    'status',
]


def parse_date_safe(val: Any) -> Any:
    """Safely parse a date string or timestamp, returning ISO string or None."""
    if pd.isna(val) or val is None or val == '' or str(val).strip() == '':
        return None
    if isinstance(val, (pd.Timestamp, datetime)):
        return val.isoformat()
    try:
        dt = date_parser.parse(str(val))
        return dt.isoformat()
    except Exception:
        return None


def clean_numeric(series: pd.Series, default: float = 0.0) -> pd.Series:
    """Clean string currency/number representations into floats."""
    if series.dtype in [np.float64, np.int64, float, int]:
        return series.fillna(default)
    return pd.to_numeric(
        series.astype(str).str.replace(r'[^0-9.-]', '', regex=True),
        errors='coerce'
    ).fillna(default)


def validate_schema(df: pd.DataFrame) -> Tuple[bool, List[str], List[str]]:
    """
    Validate that required procurement or legacy columns exist.
    Returns: (is_valid, missing_required, missing_recommended)
    """
    cols = [c.lower() for c in df.columns]
    proc_missing = [c for c in REQUIRED_PROCUREMENT_COLUMNS if c not in cols]
    leg_missing = [c for c in LEGACY_REQUIRED_COLUMNS if c not in cols]

    if len(proc_missing) == 0:
        missing_req = []
    elif len(leg_missing) == 0:
        missing_req = []
    else:
        missing_req = proc_missing

    missing_rec = [c for c in RECOMMENDED_COLUMNS if c not in cols]
    is_valid = (len(missing_req) == 0) and (len(df) > 0)
    return is_valid, missing_req, missing_rec


def preprocess_dataframe(df_input: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and standardize procurement data without discarding rows.
    Guarantees dual-mapped keys (tender_id/work_id, awarded_value/sanctioned_amount,
    winning_vendor_name/agency) for 100% interoperability.
    """
    df = df_input.copy()
    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]

    # Normalize Primary Identifier
    if 'tender_id' in df.columns:
        df['tender_id'] = df['tender_id'].astype(str).str.strip()
        df['work_id'] = df['tender_id']
    elif 'work_id' in df.columns:
        df['work_id'] = df['work_id'].astype(str).str.strip()
        df['tender_id'] = df['work_id']
    else:
        df['tender_id'] = [f'TND-2026-{i+1:05d}' for i in range(len(df))]
        df['work_id'] = df['tender_id']

    # Normalize Title / Description
    if 'tender_title' in df.columns:
        df['tender_title'] = df['tender_title'].fillna('Procurement Contract').astype(str).str.strip()
        df['description'] = df['tender_title']
    elif 'description' in df.columns:
        df['description'] = df['description'].fillna('Procurement Contract').astype(str).str.strip()
        df['tender_title'] = df['description']
    else:
        df['tender_title'] = 'Procurement Contract'
        df['description'] = df['tender_title']

    # Normalize Financials
    if 'awarded_value' in df.columns:
        df['awarded_value'] = clean_numeric(df['awarded_value'], default=0.0)
        df['sanctioned_amount'] = df['awarded_value']
    elif 'sanctioned_amount' in df.columns:
        df['sanctioned_amount'] = clean_numeric(df['sanctioned_amount'], default=0.0)
        df['awarded_value'] = df['sanctioned_amount']
    else:
        df['awarded_value'] = 0.0
        df['sanctioned_amount'] = 0.0

    if 'payment_amount' in df.columns:
        df['payment_amount'] = clean_numeric(df['payment_amount'], default=0.0)
        df['expenditure'] = df['payment_amount']
    elif 'expenditure' in df.columns:
        df['expenditure'] = clean_numeric(df['expenditure'], default=0.0)
        df['payment_amount'] = df['expenditure']
    else:
        df['payment_amount'] = (df['awarded_value'] * 0.95).round()
        df['expenditure'] = df['payment_amount']

    if 'estimated_value' in df.columns:
        df['estimated_value'] = clean_numeric(df['estimated_value'], default=0.0)
        df['estimated_cost'] = df['estimated_value']
    elif 'estimated_cost' in df.columns:
        df['estimated_cost'] = clean_numeric(df['estimated_cost'], default=0.0)
        df['estimated_value'] = df['estimated_cost']
    else:
        df['estimated_value'] = df['awarded_value']
        df['estimated_cost'] = df['estimated_value']

    # Derived utilization %: (payment / awarded) * 100
    df['utilization'] = np.where(
        df['awarded_value'] > 0,
        (df['payment_amount'] / df['awarded_value'] * 100).round(1),
        0.0
    )

    # Vendor / Agency
    if 'winning_vendor_name' in df.columns:
        df['winning_vendor_name'] = df['winning_vendor_name'].fillna('Unassigned Vendor').astype(str).str.strip()
        df['agency'] = df['winning_vendor_name']
    elif 'agency' in df.columns:
        df['agency'] = df['agency'].fillna('Unassigned Vendor').astype(str).str.strip()
        df['winning_vendor_name'] = df['agency']
    else:
        df['winning_vendor_name'] = 'General Vendor'
        df['agency'] = df['winning_vendor_name']

    if 'winning_vendor_id' not in df.columns:
        df['winning_vendor_id'] = [f"V-{1000 + (hash(name) % 100):04d}" for name in df['winning_vendor_name']]

    # Department
    if 'department' not in df.columns:
        df['department'] = 'Public Procurement Authority'

    # Geography & Category
    defaults = {
        'state': 'National Jurisdiction',
        'state_code': 'IN-XX',
        'district': 'General District',
        'category': 'General Supplies',
        'status': 'In Progress',
        'bidder_count': 5,
        'completion_delay_days': 0,
    }
    for col, dflt in defaults.items():
        if col in df.columns:
            if col in ['bidder_count', 'completion_delay_days']:
                df[col] = clean_numeric(df[col], default=dflt).astype(int)
            else:
                df[col] = df[col].fillna(dflt).astype(str).str.strip()
        else:
            df[col] = dflt

    # Expected and actual days
    if 'contract_duration' in df.columns:
        df['expected_days'] = clean_numeric(df['contract_duration'], default=180).astype(int)
    elif 'expected_days' in df.columns:
        df['expected_days'] = clean_numeric(df['expected_days'], default=180).astype(int)
    else:
        df['expected_days'] = 180

    df['delay_days'] = df['completion_delay_days']
    df['actual_days'] = df['expected_days'] + df['delay_days']
    df['delayed'] = df['delay_days'] > 0

    # Dates
    for d_col in ['tender_date', 'award_date', 'expected_completion', 'actual_completion', 'sanction_date']:
        if d_col in df.columns:
            df[d_col] = df[d_col].apply(parse_date_safe)
        else:
            df[d_col] = None

    if df['sanction_date'].isna().all() and 'tender_date' in df.columns:
        df['sanction_date'] = df['tender_date']

    return df


def load_dataset(filepath: str) -> pd.DataFrame:
    """Load and preprocess procurement CSV dataset."""
    df = pd.read_csv(filepath)
    return preprocess_dataframe(df)
