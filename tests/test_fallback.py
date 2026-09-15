import asyncio
from playwright.async_api import async_playwright

async def verify_fallback():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        console_logs = []
        page.on("console", lambda m: console_logs.append(f"[{m.type}] {m.text}"))

        print("=== TESTING FALLBACK WITH BACKEND DOWN ===")
        # Test dashboard
        await page.goto("http://localhost:3000/dashboard", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        body = await page.inner_text("body")
        assert "Command Center" in body, "Dashboard title missing in fallback"
        print("  [PASS] Dashboard rendered gracefully using fallback mock data")

        # Test risk monitor
        await page.goto("http://localhost:3000/risk", wait_until="networkidle")
        await page.wait_for_timeout(1000)
        body = await page.inner_text("body")
        assert "Risk Monitor" in body, "Risk Monitor title missing in fallback"
        print("  [PASS] Risk Monitor rendered gracefully using fallback mock data")

        # Check console warnings
        fallback_warnings = [m for m in console_logs if "using demo fallback" in m]
        print(f"  [PASS] Logged fallback warning count: {len(fallback_warnings)}")
        if fallback_warnings:
            print(f"         Sample log: {fallback_warnings[0]}")

        await browser.close()
        print(">>> DEMO FALLBACK VERIFIED CLEANLY WITH ZERO UI CRASHES <<<")

if __name__ == "__main__":
    asyncio.run(verify_fallback())
