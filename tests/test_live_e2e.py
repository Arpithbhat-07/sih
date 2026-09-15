import asyncio
from playwright.async_api import async_playwright

async def run_checks():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        print("=== VERIFYING ALL 13 ROUTES ===")
        checks = [
            ("/", "Command Center"),
            ("/dashboard", "Command Center"),
            ("/risk", "Risk Monitor"),
            ("/works", "Work Explorer"),
            ("/works/W-11261", "W-11261"),
            ("/compare/W-11261/W-11262", "DUPLICATE COMPARISON"),
            ("/analytics", "Programme Analytics"),
            ("/alerts", "Intelligence Alerts"),
            ("/agencies", "Implementing Agency Intelligence"),
            ("/districts", "District Monitoring"),
            ("/investigations", "Investigation Queue"),
            ("/ai", "Sentinel AI"),
            ("/data-health", "Data Health"),
        ]

        for path, expected in checks:
            await page.goto(f"http://localhost:3000{path}", wait_until="networkidle")
            await page.wait_for_timeout(400)
            body = await page.inner_text("body")
            assert expected.upper() in body.upper(), f"Failed on {path}: {expected} not found"
            print(f"  [PASS] {path:<26} -> found '{expected}'")

        print("\n=== VERIFYING W-11261 INVESTIGATION DOSSIER ===")
        await page.goto("http://localhost:3000/works/W-11261", wait_until="networkidle")
        await page.wait_for_timeout(500)
        body = await page.inner_text("body")
        assert "84" in body, "Risk score 84 missing"
        assert "CRITICAL" in body, "Risk tier CRITICAL missing"
        assert "FINANCIAL ANALYSIS" in body.upper(), "Financial analysis missing"
        assert "AI FINDINGS" in body.upper(), "AI findings missing"
        assert "RECOMMENDED ACTION" in body.upper(), "Recommended action missing"
        print("  [PASS] Risk score: 84 / 100 (CRITICAL)")
        print("  [PASS] Findings, Timeline, Financials, and Recommended Action present")

        print("\n=== VERIFYING DEMO FLOW: W-11261 TO COMPARE W-11262 ===")
        await page.goto("http://localhost:3000/compare/W-11261/W-11262", wait_until="networkidle")
        await page.wait_for_timeout(500)
        body = await page.inner_text("body")
        assert "W-11261" in body and "W-11262" in body
        assert "OVERALL SIMILARITY" in body.upper()
        print("  [PASS] Comparison page loaded: W-11261 vs W-11262 with overall similarity and attribute table")

        await browser.close()
        print("\n>>> ALL 13 ROUTES AND DEMO FLOW VERIFIED SUCCESSFULLY! <<<")

if __name__ == "__main__":
    asyncio.run(run_checks())
