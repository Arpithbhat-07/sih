"""
MPLADS Sentinel - Data Preprocessing & Validation Module
Handles loading, schema validation, type coercions, and baseline calculations.
"""

import pandas as pd
import numpy as np
from datetime import datetime
from dateutil import parser as date_parser
from typing import Tuple, Dict, Any, List

REQUIRED_COLUMNS = [
    'work_id',
    'sanctioned_amount',
    'expenditure',
]

RECOMMENDED_COLUMNS = [
    'description',
    'state',
    'district',
    'agency',
    'category',
    'estimated_cost',
    'expected_days',
    'actual_days',
    'sanction_date',
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
    Validate that required and recommended columns exist.
    Returns: (is_valid, missing_required, missing_recommended)
    """
    cols = [c.lower() for c in df.columns]
    missing_req = [c for c in REQUIRED_COLUMNS if c not in cols]
    missing_rec = [c for c in RECOMMENDED_COLUMNS if c not in cols]
    is_valid = len(missing_req) == 0 and len(df) > 0
    return is_valid, missing_req, missing_rec


def preprocess_dataframe(df_input: pd.DataFrame) -> pd.DataFrame:
    """
    Clean and standardize MPLADS data without silently discarding rows.
    Guarantees consistent column names and clean data types.
    """
    df = df_input.copy()
    # Standardize column headers: lowercase and underscores
    df.columns = [c.strip().lower().replace(' ', '_') for c in df.columns]

    # Ensure work_id exists
    if 'work_id' not in df.columns:
        df['work_id'] = [f'WORK-{i+1}' for i in range(len(df))]
    else:
        df['work_id'] = df['work_id'].astype(str).str.strip()

    # Text fields with clean defaults
    text_defaults = {
        'description': 'Description not specified',
        'state': 'Unspecified State',
        'state_code': 'IN-XX',
        'district': 'Unspecified District',
        'constituency': 'Unspecified Constituency',
        'mp_name': 'Hon\'ble MP',
        'agency': 'Unassigned Agency',
        'category': 'Other',
        'status': 'In Progress',
    }
    for col, default in text_defaults.items():
        if col in df.columns:
            df[col] = df[col].fillna(default).astype(str).str.strip()
        else:
            df[col] = default

    # Financial fields
    df['sanctioned_amount'] = clean_numeric(df.get('sanctioned_amount', pd.Series([0]*len(df))), default=0.0)
    df['expenditure'] = clean_numeric(df.get('expenditure', pd.Series([0]*len(df))), default=0.0)
    
    if 'estimated_cost' in df.columns:
        df['estimated_cost'] = clean_numeric(df['estimated_cost'], default=0.0)
    else:
        # Fallback estimation
        df['estimated_cost'] = (df['sanctioned_amount'] * 0.95).round()

    # Derived utilization %: (expenditure / sanctioned) * 100
    df['utilization'] = np.where(
        df['sanctioned_amount'] > 0,
        (df['expenditure'] / df['sanctioned_amount'] * 100).round(1),
        0.0
    )

    # Duration fields
    if 'expected_days' in df.columns:
        df['expected_days'] = clean_numeric(df['expected_days'], default=270).astype(int)
    else:
        df['expected_days'] = 270

    if 'actual_days' in df.columns:
        df['actual_days'] = clean_numeric(df['actual_days'], default=0).astype(int)
    else:
        df['actual_days'] = df['expected_days']

    # Dates
    for d_col in ['sanction_date', 'expected_completion', 'actual_completion']:
        if d_col in df.columns:
            df[d_col] = df[d_col].apply(parse_date_safe)
        else:
            df[d_col] = None

    # Calculate actual_days from dates if dates are available and actual_days is 0
    mask_dates = df['sanction_date'].notna() & df['actual_completion'].notna()
    if mask_dates.any():
        for idx in df[mask_dates].index:
            try:
                s_dt = date_parser.parse(df.loc[idx, 'sanction_date'])
                e_dt = date_parser.parse(df.loc[idx, 'actual_completion'])
                diff_days = (e_dt - s_dt).days
                if diff_days > 0 and (df.loc[idx, 'actual_days'] == 0 or df.loc[idx, 'actual_days'] == df.loc[idx, 'expected_days']):
                    df.loc[idx, 'actual_days'] = diff_days
            except Exception:
                pass

    # Delay days
    df['delay_days'] = np.maximum(0, df['actual_days'] - df['expected_days'])
    df['delayed'] = df['delay_days'] > 0

    return df


def load_dataset(filepath: str) -> pd.DataFrame:
    """Load and preprocess a CSV dataset."""
    df = pd.read_csv(filepath)
    return preprocess_dataframe(df)
