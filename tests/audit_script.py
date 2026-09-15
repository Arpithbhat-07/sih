import pandas as pd
import numpy as np
from pathlib import Path
import json

csv_path = Path("backend/data/mplads_synthetic.csv")
df = pd.read_csv(csv_path)

print("=== 1. DATASET AUDIT ===")
print("Row count:", len(df))
print("Columns count:", len(df.columns))
print("Columns list:", list(df.columns))
nulls = {col: int(cnt) for col, cnt in df.isnull().sum().items() if cnt > 0}
print("Missing values per column:", nulls)
print("Status distribution:", df["status"].value_counts().to_dict())
print("Category count:", df["category"].nunique())
print("Categories:", sorted(df["category"].unique().tolist()))
print("States count:", df["state"].nunique())
print("States:", sorted(df["state"].unique().tolist()))
print("Districts count:", df["district"].nunique())
print("Agencies count:", df["agency"].nunique())
print("Has expenditure:", "expenditure" in df.columns)
print("Has constituency:", "constituency" in df.columns)
print("Has mp_name:", "mp_name" in df.columns)
print("Sanction date min/max:", df["sanction_date"].min(), "to", df["sanction_date"].max())
print("Expected completion min/max:", df["expected_completion"].dropna().min(), "to", df["expected_completion"].dropna().max())
print("Actual completion min/max:", df["actual_completion"].dropna().min(), "to", df["actual_completion"].dropna().max())
print("Actual completion null count:", int(df["actual_completion"].isnull().sum()))

# Check numerical stats
print("\nFinancials summary:")
print("Estimated cost min/mean/median/max:", df["estimated_cost"].min(), int(df["estimated_cost"].mean()), int(df["estimated_cost"].median()), df["estimated_cost"].max())
print("Sanctioned amount min/mean/median/max:", df["sanctioned_amount"].min(), int(df["sanctioned_amount"].mean()), int(df["sanctioned_amount"].median()), df["sanctioned_amount"].max())
print("Expenditure min/mean/median/max:", df["expenditure"].min(), int(df["expenditure"].mean()), int(df["expenditure"].median()), df["expenditure"].max())
print("Utilization min/mean/median/max:", df["utilization"].min(), round(df["utilization"].mean(), 2), round(df["utilization"].median(), 2), df["utilization"].max())

# Negative or illogical values check
print("\nLogical consistency checks:")
neg_sanc = (df["sanctioned_amount"] <= 0).sum()
neg_exp = (df["expenditure"] < 0).sum()
neg_days = (df["expected_days"] <= 0).sum()
sanc_dt = pd.to_datetime(df["sanction_date"])
exp_dt = pd.to_datetime(df["expected_completion"])
act_dt = pd.to_datetime(df["actual_completion"])
dur_neg = ((exp_dt - sanc_dt).dt.days < 0).sum()
act_before_sanc = ((act_dt - sanc_dt).dt.days < 0).sum()

print("Sanctioned amount <= 0 count:", int(neg_sanc))
print("Expenditure < 0 count:", int(neg_exp))
print("Expected days <= 0 count:", int(neg_days))
print("Expected completion before sanction count:", int(dur_neg))
print("Actual completion before sanction count:", int(act_before_sanc))
