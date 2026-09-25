"""Browser regression check for long prompt typing responsiveness."""
from __future__ import annotations

import sys
from playwright.sync_api import sync_playwright


URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8768"

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1366, "height": 768})
    errors: list[str] = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(URL, wait_until="networkidle")
    result = page.evaluate(
        """async () => {
          const input = document.querySelector('#idea');
          input.value = 'A'.repeat(50000);
          const start = performance.now();
          for (let i = 0; i < 100; i++) {
            input.value += 'x';
            input.selectionStart = input.selectionEnd = input.value.length;
            input.dispatchEvent(new Event('input', {bubbles: true}));
          }
          const synchronousMs = performance.now() - start;
          await new Promise(resolve => setTimeout(resolve, 180));
          return {synchronousMs, length: input.value.length};
        }"""
    )
    assert result["length"] == 50100
    assert result["synchronousMs"] < 500, result
    assert not errors, errors
    browser.close()

print("Long prompt input responsiveness check passed")
