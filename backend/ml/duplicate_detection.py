"""
MPLADS Sentinel - Duplicate Candidate & Similarity Engine
Identifies potential duplicate public work proposals/sanctions using
TF-IDF description embedding + multi-attribute structured similarity (location, cost, sector, agency).

NOTE: This is a duplicate CANDIDATE detector.
Analytical signals represent similarity indicators requiring human verification;
they do not constitute proof of duplication or fraudulent intent.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


class DuplicateCandidateDetector:
    def __init__(self, min_similarity_threshold: int = 70):
        self.min_similarity_threshold = min_similarity_threshold
        self.vectorizer = TfidfVectorizer(
            stop_words="english",
            ngram_range=(1, 2),
            min_df=1,
            max_features=5000,
        )
        self.candidate_pairs: List[Dict[str, Any]] = []
        self.work_duplicate_scores: Dict[str, Dict[str, Any]] = {}

    def fit_and_detect(self, df: pd.DataFrame) -> "DuplicateCandidateDetector":
        """
        Analyze the DataFrame to discover duplicate candidates.
        Optimized by sector blocking (comparing within same category).
        """
        self.candidate_pairs = []
        self.work_duplicate_scores = {}

        # Default duplicate score entry for every work
        for wid in df["work_id"]:
            self.work_duplicate_scores[wid] = {
                "max_similarity": 0,
                "candidate_match_id": None,
                "is_candidate": False,
                "score": 0,
                "max_score": 20,
            }

        # Block by category for sensible, efficient matching
        for cat, grp in df.groupby("category"):
            if len(grp) < 2:
                continue

            indices = grp.index.tolist()
            work_ids = grp["work_id"].tolist()
            descriptions = grp["description"].fillna("").tolist()
            costs = grp["sanctioned_amount"].values
            states = grp["state"].tolist()
            districts = grp["district"].tolist()
            agencies = grp["agency"].tolist()

            try:
                tfidf_matrix = self.vectorizer.fit_transform(descriptions)
                cosine_sim_matrix = cosine_similarity(tfidf_matrix)
            except Exception:
                continue

            n = len(indices)
            for i in range(n):
                for j in range(i + 1, n):
                    text_sim = float(cosine_sim_matrix[i, j]) * 100.0

                    # Cost proximity (0 to 100)
                    cost_a = float(costs[i])
                    cost_b = float(costs[j])
                    max_cost = max(cost_a, cost_b, 1.0)
                    cost_sim = max(0.0, (1.0 - abs(cost_a - cost_b) / max_cost)) * 100.0

                    # Location similarity
                    loc_sim = 100.0 if districts[i] == districts[j] else (60.0 if states[i] == states[j] else 0.0)
                    agency_sim = 100.0 if agencies[i] == agencies[j] else 0.0

                    # Weighted composite similarity score
                    composite_score = int(round(
                        0.35 * text_sim +
                        0.25 * cost_sim +
                        0.20 * 100.0 +   # Category match (same block)
                        0.15 * loc_sim +
                        0.05 * agency_sim
                    ))
                    composite_score = min(98, max(0, composite_score))

                    # High-confidence candidate criteria:
                    # Must share location proximity (same state/district), close budget (cost_sim >= 75),
                    # and strong description token overlap (text_sim >= 60).
                    same_dist = districts[i] == districts[j]
                    same_st = states[i] == states[j]
                    is_candidate_pair = (
                        (same_dist and composite_score >= 85 and text_sim >= 60.0 and cost_sim >= 70.0) or
                        (same_st and composite_score >= 90 and text_sim >= 70.0 and cost_sim >= 80.0)
                    )

                    if is_candidate_pair:
                        pair = {
                            "work_a": work_ids[i],
                            "work_b": work_ids[j],
                            "similarity_score": composite_score,
                            "signals": {
                                "description_similarity": round(text_sim, 1),
                                "location_match": loc_sim >= 60.0,
                                "same_district": same_dist,
                                "category_match": True,
                                "agency_match": agencies[i] == agencies[j],
                                "cost_similarity": round(cost_sim, 1),
                            },
                            "classification": "POTENTIAL_DUPLICATE",
                        }
                        self.candidate_pairs.append(pair)

                        # Update individual work candidate statuses
                        for w_cur, w_other in [(work_ids[i], work_ids[j]), (work_ids[j], work_ids[i])]:
                            if composite_score > self.work_duplicate_scores[w_cur]["max_similarity"]:
                                risk_comp_score = int(round(min(20, (composite_score / 100.0) * 20.0)))
                                self.work_duplicate_scores[w_cur] = {
                                    "max_similarity": composite_score,
                                    "candidate_match_id": w_other,
                                    "is_candidate": True,
                                    "score": risk_comp_score,
                                    "max_score": 20,
                                }

        # Sort candidate pairs by descending similarity
        self.candidate_pairs.sort(key=lambda p: p["similarity_score"], reverse=True)
        return self

    def get_work_result(self, work_id: str) -> Dict[str, Any]:
        """Get duplicate detection evaluation for an individual work."""
        res = self.work_duplicate_scores.get(
            work_id,
            {"max_similarity": 0, "candidate_match_id": None, "is_candidate": False, "score": 0, "max_score": 20}
        )
        if res["is_candidate"]:
            msg = f"Work shares high attribute similarity ({res['max_similarity']}%) with work {res['candidate_match_id']}; recommended for duplicate verification."
            confidence = min(0.95, round(0.70 + (res["max_similarity"] / 100.0) * 0.25, 2))
        else:
            msg = "No significant attribute duplication detected with existing works."
            confidence = 0.88

        return {
            "work_id": work_id,
            "is_anomaly": res["is_candidate"],
            "score": res["score"],
            "max_score": 20,
            "similarity_score": res["max_similarity"],
            "similar_work_id": res["candidate_match_id"],
            "message": msg,
            "confidence": confidence,
        }

    def get_candidates(self) -> List[Dict[str, Any]]:
        """Return all detected duplicate candidate pairs."""
        return self.candidate_pairs
