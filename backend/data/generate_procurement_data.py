"""
ProcureGuard - Synthetic Demonstration Dataset Generator
Generates a realistic, deterministic public procurement dataset (~5,000 tenders)
with associated bids, vendors, departments, and execution signals.

Strictly deterministic with fixed random seed (20260917).
Demonstrates realistic Indian public procurement distributions across 10 categories,
36 States/UTs, realistic departments, and structured anomaly scenarios:
  - Case A: Price anomaly (high award value vs peer group)
  - Case B: Low bidder participation (unusually few bidders vs peers)
  - Case C: Repeated awards / vendor concentration in department
  - Case D: Highly similar bids (text and financial overlap)
  - Case E: Relationship cluster (co-bidding rings)
  - Case F: Contract / payment deviation (payments exceeding contract value)
"""

import math
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

SEED = 20260917
random.seed(SEED)
np.random.seed(SEED)

CATEGORIES = [
    "IT Equipment",
    "Medical Equipment",
    "Road & Infrastructure",
    "Electrical Equipment",
    "Office Supplies",
    "Vehicles",
    "Construction Materials",
    "Consulting Services",
    "Maintenance Services",
    "Laboratory Equipment",
]

CATEGORY_BASELINES = {
    "IT Equipment": {"median": 1850000, "iqr": 950000, "bidder_med": 5},
    "Medical Equipment": {"median": 3400000, "iqr": 1800000, "bidder_med": 4},
    "Road & Infrastructure": {"median": 8500000, "iqr": 4200000, "bidder_med": 6},
    "Electrical Equipment": {"median": 2100000, "iqr": 1100000, "bidder_med": 5},
    "Office Supplies": {"median": 450000, "iqr": 250000, "bidder_med": 6},
    "Vehicles": {"median": 4200000, "iqr": 2100000, "bidder_med": 4},
    "Construction Materials": {"median": 3100000, "iqr": 1500000, "bidder_med": 5},
    "Consulting Services": {"median": 1600000, "iqr": 800000, "bidder_med": 4},
    "Maintenance Services": {"median": 950000, "iqr": 500000, "bidder_med": 5},
    "Laboratory Equipment": {"median": 2750000, "iqr": 1400000, "bidder_med": 4},
}

DEPARTMENTS = [
    "Public Works Department",
    "Health & Family Welfare Directorate",
    "Department of School Education",
    "Rural Development Authority",
    "Urban Transport Corporation",
    "Power & Energy Transmission Board",
    "Water Resources & Irrigation Dept",
    "Information Technology & e-Gov Directorate",
    "Police Housing & Logistics Dept",
    "Municipal Administration Directorate",
]

DEPT_CATEGORY_MAP = {
    "Public Works Department": ["Road & Infrastructure", "Construction Materials", "Maintenance Services"],
    "Health & Family Welfare Directorate": ["Medical Equipment", "Laboratory Equipment", "Maintenance Services"],
    "Department of School Education": ["IT Equipment", "Office Supplies", "Construction Materials"],
    "Rural Development Authority": ["Road & Infrastructure", "Construction Materials", "Office Supplies"],
    "Urban Transport Corporation": ["Vehicles", "Maintenance Services", "Consulting Services"],
    "Power & Energy Transmission Board": ["Electrical Equipment", "Maintenance Services", "Consulting Services"],
    "Water Resources & Irrigation Dept": ["Road & Infrastructure", "Construction Materials", "Maintenance Services"],
    "Information Technology & e-Gov Directorate": ["IT Equipment", "Consulting Services", "Maintenance Services"],
    "Police Housing & Logistics Dept": ["Vehicles", "IT Equipment", "Construction Materials"],
    "Municipal Administration Directorate": ["Office Supplies", "Vehicles", "Maintenance Services"],
}

STATES = [
    {"code": "IN-UP", "name": "Uttar Pradesh", "weight": 14, "districts": ["Lucknow", "Kanpur Nagar", "Varanasi", "Prayagraj", "Gorakhpur", "Meerut"]},
    {"code": "IN-MH", "name": "Maharashtra", "weight": 12, "districts": ["Mumbai", "Pune", "Nagpur", "Nashik", "Aurangabad", "Thane"]},
    {"code": "IN-KA", "name": "Karnataka", "weight": 10, "districts": ["Bengaluru Urban", "Mysuru", "Belagavi", "Kalaburagi", "Tumakuru"]},
    {"code": "IN-TN", "name": "Tamil Nadu", "weight": 10, "districts": ["Chennai", "Coimbatore", "Madurai", "Salem", "Tiruchirappalli"]},
    {"code": "IN-WB", "name": "West Bengal", "weight": 9, "districts": ["Kolkata", "Howrah", "Darjeeling", "Murshidabad", "Bardhaman"]},
    {"code": "IN-BR", "name": "Bihar", "weight": 8, "districts": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga"]},
    {"code": "IN-RJ", "name": "Rajasthan", "weight": 7, "districts": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Bikaner"]},
    {"code": "IN-GJ", "name": "Gujarat", "weight": 7, "districts": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar"]},
    {"code": "IN-MP", "name": "Madhya Pradesh", "weight": 7, "districts": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain"]},
    {"code": "IN-TG", "name": "Telangana", "weight": 5, "districts": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar"]},
    {"code": "IN-AP", "name": "Andhra Pradesh", "weight": 5, "districts": ["Visakhapatnam", "Vijayawada", "Guntur", "Tirupati"]},
    {"code": "IN-KL", "name": "Kerala", "weight": 5, "districts": ["Thiruvananthapuram", "Ernakulam", "Kozhikode", "Thrissur"]},
    {"code": "IN-PB", "name": "Punjab", "weight": 4, "districts": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala"]},
    {"code": "IN-OR", "name": "Odisha", "weight": 4, "districts": ["Bhubaneswar", "Cuttack", "Rourkela", "Sambalpur"]},
    {"code": "IN-HR", "name": "Haryana", "weight": 4, "districts": ["Gurugram", "Faridabad", "Hisar", "Panipat"]},
    {"code": "IN-AS", "name": "Assam", "weight": 3, "districts": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat"]},
    {"code": "IN-JH", "name": "Jharkhand", "weight": 3, "districts": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro"]},
    {"code": "IN-CT", "name": "Chhattisgarh", "weight": 3, "districts": ["Raipur", "Bilaspur", "Durg", "Korba"]},
    {"code": "IN-UT", "name": "Uttarakhand", "weight": 2, "districts": ["Dehradun", "Haridwar", "Nainital"]},
    {"code": "IN-DL", "name": "Delhi", "weight": 2, "districts": ["New Delhi", "North Delhi", "South Delhi"]},
]

# 40 Clearly Synthetic Vendor Entities
VENDORS = [
    {"id": (
        "V-1042" if "V-1042" in name
        else "V-2187" if "V-2187" in name
        else "V-3091" if "V-3091" in name
        else f"V-{1000 + i:04d}"
    ), "name": name, "category_pref": pref}
    for i, (name, pref) in enumerate([
        ("Alpha Tech Solutions", "IT Equipment"),
        ("Apex Infra Build Ltd", "Road & Infrastructure"),
        ("Zenith Power Systems", "Electrical Equipment"),
        ("Bharat Instruments Corp", "Laboratory Equipment"),
        ("Pinnacle Medical Supplies", "Medical Equipment"),
        ("V-1042 Enterprise Logistics", "IT Equipment"),
        ("Kavach Security Solutions", "IT Equipment"),
        ("Garuda Fleet Dynamics", "Vehicles"),
        ("Setu Engineering Works", "Road & Infrastructure"),
        ("Drona Advisory Partners", "Consulting Services"),
        ("Nirman Materials Consortium", "Construction Materials"),
        ("Sankalp Facilities Management", "Maintenance Services"),
        ("Pragati Energy Grid Ltd", "Electrical Equipment"),
        ("Sanjeevani Diagnostic Equipment", "Medical Equipment"),
        ("Vanguard Highway Builders", "Road & Infrastructure"),
        ("CyberShield Systems", "IT Equipment"),
        ("Metro Transit Supplies", "Vehicles"),
        ("Kaveri Civil Infrastructure", "Road & Infrastructure"),
        ("Samarth Office Systems", "Office Supplies"),
        ("Chetna Lab Tech", "Laboratory Equipment"),
        ("Aarambh Infrastructure Group", "Construction Materials"),
        ("Vikas Power & Transformers", "Electrical Equipment"),
        ("Meridian Consultancy Services", "Consulting Services"),
        ("Unnati Medical Technologies", "Medical Equipment"),
        ("Kaushal Roadways Corp", "Road & Infrastructure"),
        ("Sujal Hydraulics & Water Tech", "Maintenance Services"),
        ("Prerna Facility Services", "Maintenance Services"),
        ("Utkarsh Scientific Apparatus", "Laboratory Equipment"),
        ("Nabh Telecom & Cabling", "Electrical Equipment"),
        ("Arth Strategic Solutions", "Consulting Services"),
        ("V-2187 Logistics & Transport", "Vehicles"),
        ("V-3091 Civil Consortium", "Road & Infrastructure"),
        ("Tricolor Paper & Stationery", "Office Supplies"),
        ("Gitanjali Civil Construction", "Construction Materials"),
        ("Suryodaya Clean Energy", "Electrical Equipment"),
        ("MedLife BioMedical Systems", "Medical Equipment"),
        ("Himalaya Road Network Corp", "Road & Infrastructure"),
        ("Paramount Data Networks", "IT Equipment"),
        ("Kalyan Heavy Machineries", "Vehicles"),
        ("Brahmaputra Engineering Works", "Construction Materials"),
    ])
]

TITLE_TEMPLATES = {
    "IT Equipment": [
        "Procurement of High-Performance Desktop Workstations and Peripherals",
        "Supply and Commissioning of Enterprise Server Racks and UPS Units",
        "Provisioning of Campus Wi-Fi Networking Switches and Access Points",
        "Procurement of Interactive Smart Classroom Digital Panels",
    ],
    "Medical Equipment": [
        "Procurement and Installation of Digital Radiography X-Ray Systems",
        "Supply of Intensive Care Ventilator Units and Patient Monitors",
        "Supply of Multipara Cardiac Monitoring Systems for District Hospitals",
        "Procurement of Portable Ultrasound Doppler Scanning Machines",
    ],
    "Road & Infrastructure": [
        "Construction of Bituminous Concrete Road with Drainage Culverts",
        "Widening and Strengthening of Major District Arterial Road",
        "Construction of High-Level RCC Bridge across River Drainage",
        "Pavement Quality Concrete (PQC) Laying and Junction Improvement",
    ],
    "Electrical Equipment": [
        "Supply and Erection of 33/11 KV Power Distribution Transformers",
        "Installation of High-Mast Solar LED Lighting Systems in Urban Sectors",
        "Underground HT Cable Laying and Ring Main Unit (RMU) Automation",
        "Supply of Energy Efficient Substation Switchgear and Breakers",
    ],
    "Office Supplies": [
        "Bulk Supply of Administrative Paper Reams, Toners, and Consumables",
        "Procurement of Ergonomic Modular Office Desks and Seating Systems",
        "Annual Rate Contract for Secretariat Stationery and Printing Items",
        "Supply of Heavy-Duty Document Scanners and Shredders",
    ],
    "Vehicles": [
        "Procurement of Advanced Life Support (ALS) Ambulance Vehicles",
        "Supply of Electric Waste Collection Tipper Vehicles for Municipal Body",
        "Procurement of Police Patrol Utility Vehicles with GPS Equipment",
        "Supply of Heavy Fire-Fighting Water Tender Trucks",
    ],
    "Construction Materials": [
        "Supply of Portland Pozzolana Cement (PPC) for Municipal Works",
        "Supply of High-Strength TMT Reinforcement Steel Bars (Fe-550D)",
        "Supply of Ready Mix Concrete (M-30 Grade) for Infrastructure",
        "Bulk Procurement of Structural Steel Sections and Tubular Poles",
    ],
    "Consulting Services": [
        "Consultancy Services for Environmental Impact and GIS Master Planning",
        "Third-Party Quality Assurance & Technical Audit Inspection Services",
        "Design Engineering and Detailed Project Report (DPR) Preparation",
        "Project Management Consultancy (PMC) for Smart City Infrastructure",
    ],
    "Maintenance Services": [
        "Comprehensive Annual Maintenance Contract (CAMC) for Hospital Chillers",
        "Annual Routine Maintenance of Municipal Asphalt Road Corridors",
        "Maintenance and Operation of Water Treatment and RO Filtration Plants",
        "Preventive Maintenance of HT Substations and Generator Sets",
    ],
    "Laboratory Equipment": [
        "Procurement of High-Resolution Gas Chromatography Mass Spectrometer",
        "Supply of Automated Hematology Cell Analyzers and Centrifuges",
        "Installation of Soil & Water Testing Spectrophotometers",
        "Procurement of Analytical Precision Balances and Fume Hoods",
    ],
}


def generate_dataset(num_records=5000) -> pd.DataFrame:
    records = []
    base_date = datetime(2025, 4, 1)

    state_pool = []
    for s in STATES:
        state_pool.extend([s] * s["weight"])

    num_critical = int(num_records * 0.025)
    num_high = int(num_records * 0.075)
    num_medium = int(num_records * 0.20)
    num_low = num_records - (num_critical + num_high + num_medium)

    tier_assignments = (
        ["CRITICAL"] * num_critical +
        ["HIGH"] * num_high +
        ["MEDIUM"] * num_medium +
        ["LOW"] * num_low
    )
    random.shuffle(tier_assignments)

    anchor_indices = {
        1841: "CASE_A_B",       # Tender TND-2026-01842
        411: "CASE_B",          # Tender TND-2026-00412
        890: "CASE_D_1",        # Tender TND-2026-00891
        891: "CASE_D_2",        # Tender TND-2026-00892
        1250: "CASE_F",         # Tender TND-2026-01251
        2400: "CASE_C",         # Tender TND-2026-02401
    }

    for i in range(num_records):
        tender_num = i + 1
        tender_id = f"TND-2026-{tender_num:05d}"
        tier = tier_assignments[i]
        scenario = anchor_indices.get(i, None)

        state_obj = random.choice(state_pool)
        state_name = state_obj["name"]
        state_code = state_obj["code"]
        district = random.choice(state_obj["districts"])

        dept = random.choice(DEPARTMENTS)
        cat_choices = DEPT_CATEGORY_MAP.get(dept, CATEGORIES)
        category = random.choice(cat_choices)

        base_info = CATEGORY_BASELINES[category]
        cat_median = base_info["median"]
        peer_bidder_med = base_info["bidder_med"]

        title_options = TITLE_TEMPLATES.get(category, ["Public Procurement Supply Contract"])
        tender_title = f"{random.choice(title_options)}, {district}"

        noise = np.random.normal(0, 0.22)
        estimated_val = int(round(cat_median * math.exp(noise)))
        estimated_val = max(150000, estimated_val)

        day_offset = random.randint(0, 300)
        t_date = base_date + timedelta(days=day_offset)
        closing_date = t_date + timedelta(days=random.randint(21, 45))
        award_date = closing_date + timedelta(days=random.randint(14, 30))
        contract_duration = random.randint(90, 365)
        exp_completion = award_date + timedelta(days=contract_duration)

        if scenario == "CASE_C" or (dept == "Information Technology & e-Gov Directorate" and random.random() < 0.35):
            win_vendor = VENDORS[5]  # V-1042 Enterprise Logistics
        else:
            cat_vendors = [v for v in VENDORS if v["category_pref"] == category]
            win_vendor = random.choice(cat_vendors) if cat_vendors and random.random() < 0.4 else random.choice(VENDORS)

        bidder_count = max(2, int(round(np.random.normal(peer_bidder_med, 1.2))))
        awarded_ratio = np.random.normal(0.98, 0.05)
        awarded_val = int(round(estimated_val * awarded_ratio))
        completion_delay = max(0, int(np.random.exponential(15))) if random.random() < 0.15 else 0
        payment_ratio = np.random.normal(0.94, 0.04)

        if scenario == "CASE_A_B" or tender_id == "TND-2026-01842":
            tier = "CRITICAL"
            category = "IT Equipment"
            dept = "Information Technology & e-Gov Directorate"
            tender_title = f"High-Capacity Server Infrastructure & Digital Storage Arrays, {district}"
            estimated_val = 2200000
            awarded_val = 3380000  # +53.6% over estimated, ~82% over category median
            bidder_count = 2       # Unusually low (peer med is 5)
            win_vendor = VENDORS[5] # V-1042
            completion_delay = 45
            payment_ratio = 1.08   # Payment exceeding contract

        elif scenario == "CASE_B":
            tier = "HIGH"
            category = "Road & Infrastructure"
            tender_title = f"Widening and Strengthening of Major Arterial Corridor, {district}"
            estimated_val = 8200000
            awarded_val = 9100000
            bidder_count = 2       # Peer median is 6
            completion_delay = 30

        elif scenario in ("CASE_D_1", "CASE_D_2"):
            tier = "HIGH"
            category = "Medical Equipment"
            tender_title = f"Procurement of Portable Ultrasound Doppler Scanning Machines, {district}"
            estimated_val = 2800000
            awarded_val = 2780000
            bidder_count = 3

        elif scenario == "CASE_F":
            tier = "HIGH"
            category = "Construction Materials"
            tender_title = f"Supply of Ready Mix Concrete (M-30 Grade) for Infrastructure, {district}"
            estimated_val = 3000000
            awarded_val = 3100000
            bidder_count = 4
            payment_ratio = 1.28   # 28% overrun on payment

        elif tier == "CRITICAL":
            awarded_val = int(round(cat_median * random.uniform(1.35, 1.65)))
            bidder_count = random.choice([2, 2, 3])
            completion_delay = random.randint(45, 120)
            payment_ratio = random.uniform(1.05, 1.25)
        elif tier == "HIGH":
            if random.random() < 0.5:
                awarded_val = int(round(cat_median * random.uniform(1.22, 1.40)))
            else:
                bidder_count = 2
                completion_delay = random.randint(30, 75)
        elif tier == "MEDIUM":
            awarded_val = int(round(cat_median * random.uniform(1.08, 1.22)))
            completion_delay = random.randint(10, 35) if random.random() < 0.4 else 0

        actual_completion = exp_completion + timedelta(days=completion_delay)
        status = "Completed" if completion_delay == 0 and random.random() < 0.3 else "In Progress"
        if completion_delay > 60:
            status = "Delayed"

        payment_amount = int(round(awarded_val * payment_ratio))
        contract_id = f"CNT-{tender_id[-5:]}"

        records.append({
            "tender_id": tender_id,
            "tender_title": tender_title,
            "department": dept,
            "procurement_authority": f"{state_name} {dept}",
            "category": category,
            "location": f"{district}, {state_name}",
            "state": state_name,
            "state_code": state_code,
            "district": district,
            "tender_date": t_date.strftime("%Y-%m-%dT00:00:00.000Z"),
            "closing_date": closing_date.strftime("%Y-%m-%dT00:00:00.000Z"),
            "award_date": award_date.strftime("%Y-%m-%dT00:00:00.000Z"),
            "estimated_value": estimated_val,
            "awarded_value": awarded_val,
            "bidder_count": bidder_count,
            "winning_vendor_id": win_vendor["id"],
            "winning_vendor_name": win_vendor["name"],
            "contract_id": contract_id,
            "contract_duration": contract_duration,
            "expected_completion": exp_completion.strftime("%Y-%m-%dT00:00:00.000Z"),
            "actual_completion": actual_completion.strftime("%Y-%m-%dT00:00:00.000Z") if status == "Completed" else "",
            "completion_delay_days": completion_delay,
            "payment_amount": payment_amount,
            "status": status,
            "intended_tier": tier,
        })

    df = pd.DataFrame(records)
    return df


if __name__ == "__main__":
    from pathlib import Path
    out_dir = Path(__file__).resolve().parent
    df = generate_dataset(5000)
    out_path = out_dir / "procurement_synthetic.csv"
    df.to_csv(out_path, index=False)
    print(f"[ProcureGuard] Successfully generated {len(df)} synthetic procurement records at {out_path}")
    print("Risk Distribution:")
    print(df["intended_tier"].value_counts())
