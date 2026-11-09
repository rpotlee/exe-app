"""High-value cross-screen behavior checks for the React app.

Run with a Vite server on port 5173. These checks exercise the same interaction
in List and Status, in both themes, so a fix cannot silently land in one path.
"""
import os
from datetime import datetime, timezone
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("APP_URL", "http://127.0.0.1:5173/?local=1")
NOW = datetime.now(timezone.utc).isoformat()


def workspace():
    return {
        "folders": [], "decisions": [], "decisionOptions": [], "decisionLog": [],
        "ideas": [], "relationships": [], "audit": [], "settings": None,
        "focus": [],
        "captures": [{
            "id": "capture-1", "owner_id": "local", "text": "List contract task",
            "edited_text": None, "source": "List", "folder_id": None,
            "batch_id": None, "batch_text": None, "completed_at": None,
            "archived_at": None, "status": "pending", "organized_as": None,
            "review_state": None, "review_at": None, "rejected_fingerprints": [],
            "task_id": None, "merged_into": None, "created_at": NOW,
            "updated_at": NOW, "revision": 0, "kind": "todo",
            "display_title": None, "user_priority": None, "remind_at": None,
            "remind_done_at": None,
        }],
        "outcomes": [{
            "id": "outcome-1", "owner_id": "local", "folder_id": None,
            "name": "Status contract", "description": "", "pinned": False,
            "deadline": None, "effort": None, "done_at": None,
            "last_worked_at": None, "created_at": NOW, "updated_at": NOW,
            "revision": 0, "sources": [],
        }],
        "tasks": [{
            "id": "task-1", "owner_id": "local", "outcome_id": "outcome-1",
            "name": "Status contract task", "notes": "", "done_at": None,
            "archived_at": None, "deadline": None, "effort": None,
            "position": 0, "sources": [], "created_at": NOW,
            "updated_at": NOW, "revision": 0, "folder_id": None,
        }],
    }


def seed(page):
    page.goto(BASE)
    page.evaluate("localStorage.clear()")
    page.evaluate("value => localStorage.setItem('exe-v2:local', JSON.stringify(value))", workspace())


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        for theme in ("light", "dark"):
            context = browser.new_context(viewport={"width": 390, "height": 844}, color_scheme=theme)
            page = context.new_page()
            seed(page)
            page.goto(f"{BASE}&theme={theme}#/list")
            row = page.locator(".raw-row", has_text="List contract task")
            checkbox = row.get_by_role("checkbox")
            expect(checkbox).not_to_be_checked()
            row.locator(".raw-text").click()
            expect(checkbox).not_to_be_checked()
            expect(row).to_be_visible()
            checkbox.check()
            expect(checkbox).to_be_checked()
            assert "is-complete" in (row.get_attribute("class") or "")
            expect(row).to_be_visible()

            page.goto(f"{BASE}&theme={theme}#/status")
            status_row = page.locator(".check-row", has_text="Status contract task")
            status_checkbox = status_row.get_by_role("checkbox")
            status_checkbox.check()
            expect(status_checkbox).to_be_checked()
            assert "is-complete" in (status_row.get_attribute("class") or "")
            expect(status_row).to_be_visible()
            page.reload()
            expect(page.get_by_role("checkbox", name="Reopen Status contract task")).to_have_count(0)
            print(f"PASS {theme}: List and Status completion contract")
            context.close()
        browser.close()


if __name__ == "__main__":
    run()
