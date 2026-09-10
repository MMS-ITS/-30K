#!/usr/bin/env python3
"""
Render index.html to A4 PDF using a real browser engine, so the output is exactly
what the browser's own Print dialog produces from the print stylesheet.

    pip install playwright && python3 -m playwright install chromium
    python3 tools/build-pdf.py [preset]

preset: report | escrow | full   (default: escrow — the corrected scenario)
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "index.html"
PRESET = sys.argv[1] if len(sys.argv) > 1 else "escrow"
OUT = ROOT / f"30k-decision-{PRESET}.pdf"

with sync_playwright() as pw:
    browser = pw.chromium.launch()
    page = browser.new_page(viewport={"width": 1180, "height": 1400})
    page.goto(SRC.as_uri(), wait_until="load")

    # apply the requested scenario, then let the model recompute
    page.evaluate(f"preset({PRESET!r})")
    page.wait_for_timeout(300)

    # sanity: the document must have actually rendered its computed sections
    for sel in ("#opt_body tr", "#se_body tr", "#v_body .box", "#ver_body tr", "#e_body tr"):
        n = page.eval_on_selector_all(sel, "els => els.length")
        if n == 0:
            raise SystemExit(f"refusing to emit PDF: '{sel}' rendered zero rows")

    page.emulate_media(media="print")
    page.pdf(
        path=str(OUT),
        format="A4",
        print_background=True,
        prefer_css_page_size=True,
        margin={"top": "0", "bottom": "0", "left": "0", "right": "0"},
    )
    browser.close()

print(f"wrote {OUT.relative_to(ROOT)}  ({OUT.stat().st_size / 1024:.0f} KB)")
