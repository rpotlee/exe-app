"""High-value cross-screen behavior checks for the React app.

Run with a Vite server on port 5173. These checks create tasks through the real
UI, then exercise the same completion contract in List and Status, in both
themes.
"""
import os
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("APP_URL", "http://127.0.0.1:5173/?local=1")


def add_task(page, text):
    box = page.get_by_label("Add a task")
    box.fill(text)
    box.press("Enter")
    row = page.locator(".raw-row", has_text=text)
    expect(row).to_be_visible()
    return row


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        for theme in ("light", "dark"):
            context = browser.new_context(viewport={"width": 390, "height": 844}, color_scheme=theme)
            page = context.new_page()
            list_url = f"{BASE}&theme={theme}#/list"
            page.goto(list_url)
            page.evaluate("localStorage.clear()")
            page.reload()
            page.get_by_label("Add a task").wait_for()
            page.wait_for_timeout(500)

            list_row = add_task(page, "List contract task")
            status_setup_row = add_task(page, "Status contract task")
            list_checkbox = list_row.get_by_role("checkbox")
            status_setup_row.get_by_role("checkbox").set_checked(False)

            # Clicking content is not completion.
            before_label = list_checkbox.get_attribute("aria-label")
            list_row.locator(".raw-text").click()
            expect(list_row).to_be_visible()
            assert list_checkbox.get_attribute("aria-label") == before_label

            # The checkbox completes in place and strikes the row through.
            list_checkbox.set_checked(True)
            expect(list_checkbox).to_be_checked()
            assert "is-complete" in (list_row.get_attribute("class") or "")
            expect(list_row).to_be_visible()

            # Status has the same contract, including deferred regrouping.
            page.goto(f"{BASE}&theme={theme}#/status")
            status_row = page.locator(".check-row", has_text="Status contract task")
            status_checkbox = status_row.get_by_role("checkbox")
            status_checkbox.set_checked(False)
            status_checkbox.set_checked(True)
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
