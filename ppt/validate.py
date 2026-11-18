# -*- coding: utf-8 -*-
"""Geometry sanity checks for the generated deck."""
import os

import pymupdf
from pptx import Presentation
from pptx.enum.shapes import MSO_SHAPE_TYPE

P = r"E:\ORDRIX\ppt"
PPTX = os.path.join(P, "Campus-Online-Ordering-System.pptx")
PDF = r"C:\Users\Acer\AppData\Local\Temp\opencode\deck-qa.pdf"
IN = 914400.0
SW, SH = 13.333, 7.5

prs = Presentation(PPTX)
print("slides:", len(prs.slides))
issues = []

# ---- 1. shape bounds inside the canvas ----
for idx, slide in enumerate(prs.slides, 1):
    for sh in slide.shapes:
        x, y = sh.left / IN, sh.top / IN
        w, h = sh.width / IN, sh.height / IN
        txt = sh.text_frame.text.strip().replace("\n", " ")[:26] if sh.has_text_frame else ""
        bleed = sh.shape_type != MSO_SHAPE_TYPE.PICTURE and not txt
        if bleed:
            continue  # decorative bleed shapes are clipped by the slide edge
        if x < -0.01 or y < -0.01 or x + w > SW + 0.01 or y + h > SH + 0.01:
            issues.append(("OOB", idx, txt, round(x, 2), round(y, 2),
                           round(x + w, 2), round(y + h, 2)))

# ---- 2. text box vs picture (python-pptx geometry) ----
for idx, slide in enumerate(prs.slides, 1):
    pics = [sh for sh in slide.shapes if sh.shape_type == MSO_SHAPE_TYPE.PICTURE]
    texts = [sh for sh in slide.shapes if sh.has_text_frame and sh.text_frame.text.strip()]
    for t in texts:
        tx, ty = t.left / IN, t.top / IN
        tw, th = t.width / IN, t.height / IN
        for p in pics:
            px, py = p.left / IN, p.top / IN
            pw, ph = p.width / IN, p.height / IN
            ox = min(tx + tw, px + pw) - max(tx, px)
            oy = min(ty + th, py + ph) - max(ty, py)
            if ox > 0.02 and oy > 0.02:
                issues.append(("TXT/PIC", idx, t.text_frame.text.strip()[:24],
                               round(ox, 2), round(oy, 2)))

# ---- 3. rendered text block collisions (PDF) ----
doc = pymupdf.open(PDF)
scale = SW * 72.0 / doc[0].rect.width
for pno, page in enumerate(doc, 1):
    blocks = []
    for b in page.get_text("blocks"):
        if not b[4].strip():
            continue
        blocks.append(pymupdf.Rect(b[0], b[1], b[2], b[3]) * scale)
    for i in range(len(blocks)):
        for j in range(i + 1, len(blocks)):
            inter = blocks[i] & blocks[j]
            if inter.is_empty:
                continue
            if inter.get_area() > 0.004:
                issues.append(("TXT/TXT", pno, round(inter.get_area(), 3),
                               tuple(round(v, 1) for v in blocks[i]),
                               tuple(round(v, 1) for v in blocks[j])))
doc.close()

if not issues:
    print("clean: no out-of-bounds, no text/picture, no text/text collisions")
else:
    print("issues:", len(issues))
    for it in issues:
        print(it)
