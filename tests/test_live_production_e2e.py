"""
Live Production End-to-End Test Suite using Playwright (Synchronous)
Tests the live deployed environments:
- Domain 1: https://missionx.arpith.in
- Domain 2: https://missionx-jade.vercel.app
- Backend:  https://sih-63wt.onrender.com
"""

import pytest
from playwright.sync_api import sync_playwright

DOMAINS = [
    "https://missionx.arpith.in",
    "https://missionx-jade.vercel.app",
]

def test_live_production_login_success():
    """Verify that clicking Instant Login connects to live Render backend, issues JWT, and redirects to dashboard."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for domain in DOMAINS:
            page = browser.new_page()
            try:
                page.goto(f"{domain}/login", wait_until="networkidle", timeout=30000)
                instant_btn = page.locator("text=Instant Login →").first
                instant_btn.click()
                page.wait_for_timeout(4000)

                assert "/dashboard" in page.url, f"Failed to redirect to /dashboard on {domain}"
                storage = page.evaluate("() => ({ ...localStorage })")
                assert "sentinel_token" in storage, f"sentinel_token not found in localStorage on {domain}"
                assert "sentinel_user" in storage, f"sentinel_user not found in localStorage on {domain}"
                
                # Check for error banners
                error_banner = page.locator(".text-risk-critical")
                assert error_banner.count() == 0, f"Error banner found on {domain}"
            finally:
                page.close()
        browser.close()


def test_live_production_page_refresh():
    """Verify that refreshing /dashboard preserves the authenticated session without kicking to /login."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("https://missionx.arpith.in/login", wait_until="networkidle", timeout=30000)
            page.locator("text=Instant Login →").first.click()
            page.wait_for_timeout(4000)
            assert "/dashboard" in page.url

            # Reload
            page.reload(wait_until="networkidle")
            page.wait_for_timeout(2000)
            assert "/dashboard" in page.url, f"Session lost after reload; redirected to {page.url}"
            
            storage = page.evaluate("() => ({ ...localStorage })")
            assert "sentinel_token" in storage
        finally:
            page.close()
        browser.close()


def test_live_production_invalid_credentials():
    """Verify that invalid credentials on production render a safe 401 message rather than a generic network error."""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("https://missionx.arpith.in/login", wait_until="networkidle", timeout=30000)
            page.locator("input[type='text']").fill("ministry.demo")
            page.locator("input[type='password']").fill("wrongpassword")
            page.locator("button[type='submit']").click()
            page.wait_for_timeout(3000)

            error_el = page.locator(".text-risk-critical")
            assert error_el.count() > 0, "No error banner shown on invalid credentials"
            text = error_el.inner_text()
            assert "Invalid username or password" in text
        finally:
            page.close()
        browser.close()
