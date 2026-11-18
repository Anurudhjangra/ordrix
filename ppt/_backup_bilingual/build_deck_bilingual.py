# -*- coding: utf-8 -*-
"""
Builds 'Campus Online Ordering System' presentation for Team ORDRIX.
Design mirrors the ORDRIX brand used on the live site.
Run: python build_deck.py
"""
import math
import os
import sys

from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR, MSO_AUTO_SIZE
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.dml import MSO_LINE_DASH_STYLE
from pptx.oxml.ns import qn
from lxml import etree
from PIL import Image

BASE = os.path.dirname(os.path.abspath(__file__))
SHOTS = os.path.join(BASE, "shots")
OUT = os.path.join(BASE, "Campus-Online-Ordering-System.pptx")

# ---------------- brand palette ----------------
INK = "1C0D08"
ESPRESSO = "2E1409"
DEEP = "1A0B06"
COFFEE = "4A2618"
CREAM = "FAF6EF"
SAND = "F1E9DC"
BORDER = "E8DACA"
MUTED = "9C8276"
MUTED_2 = "7A6157"
FAINT = "B6A397"
YELLOW = "FFC700"
RED = "FF7A2F"
GREEN = "2E7D32"
WHITE = "FFFFFF"

HEAD = "Georgia"
BODY = "Segoe UI"

SW, SH = 13.333, 7.5
ML = 0.75
MR = 0.75
CW = SW - ML - MR  # 11.833

prs = Presentation()
prs.slide_width = Inches(SW)
prs.slide_height = Inches(SH)
BLANK = prs.slide_layouts[6]

CHECKS = []
PAGE = {"n": 0}


# ---------------- low level helpers ----------------
def _alpha(color_el, alpha_pct):
    a = etree.SubElement(color_el, qn("a:alpha"))
    a.set("val", str(int(alpha_pct * 1000)))


def solid(shape, color, alpha=None):
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor.from_string(color)
    if alpha is not None:
        spPr = shape._element.spPr
        sf = spPr.find(qn("a:solidFill"))
        clr = sf.find(qn("a:srgbClr"))
        _alpha(clr, alpha)
    return shape


def no_line(shape):
    shape.line.fill.background()
    return shape


def line(shape, color=BORDER, width=0.75, dash=None, alpha=None):
    shape.line.color.rgb = RGBColor.from_string(color)
    shape.line.width = Pt(width)
    if dash:
        shape.line.dash_style = dash
    if alpha is not None:
        ln = shape._element.spPr.find(qn("a:ln"))
        sf = ln.find(qn("a:solidFill"))
        if sf is not None:
            _alpha(sf.find(qn("a:srgbClr")), alpha)
    return shape


def shadow(shape, blur=16, dist=4, alpha=12):
    spPr = shape._element.spPr
    eff = spPr.find(qn("a:effectLst"))
    if eff is None:
        eff = etree.SubElement(spPr, qn("a:effectLst"))
    shd = etree.SubElement(eff, qn("a:outerShdw"))
    shd.set("blurRad", str(int(blur * 12700)))
    shd.set("dist", str(int(dist * 12700)))
    shd.set("dir", "5400000")
    shd.set("rotWithShape", "0")
    clr = etree.SubElement(shd, qn("a:srgbClr"))
    clr.set("val", "000000")
    _alpha(clr, alpha)


def shape(slide, kind, x, y, w, h, fill=None, radius=None, ln=None, lw=0.75,
          shdw=False, alpha=None):
    s = slide.shapes.add_shape(kind, Inches(x), Inches(y), Inches(w), Inches(h))
    if radius is not None:
        try:
            s.adjustments[0] = radius
        except Exception:
            pass
    if fill:
        solid(s, fill, alpha)
    else:
        s.fill.background()
    if ln:
        line(s, ln, lw)
    else:
        no_line(s)
    if shdw:
        shadow(s)
    s.text_frame.text = ""
    return s


def rect(slide, x, y, w, h, fill=None, radius=None, ln=None, lw=0.75, shdw=False,
         alpha=None):
    return shape(slide, MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE,
                 x, y, w, h, fill, radius, ln, lw, shdw, alpha)


def circle(slide, x, y, d, fill=None, ln=None, lw=1.0, alpha=None, shdw=False):
    return shape(slide, MSO_SHAPE.OVAL, x, y, d, d, fill, None, ln, lw, shdw, alpha)


def _est_height(text, width, size, font, bold, line_mult):
    factor = 0.585 if font == HEAD else 0.515
    if bold:
        factor += 0.022
    avail = max(1, width * 72 - 2)
    cpl = max(6.0, avail / (size * factor))
    lines = 0
    for para in str(text).split("\n"):
        lines += max(1, math.ceil(len(para) / cpl))
    return (lines * size * 1.21 * line_mult) / 72.0


def tb(slide, x, y, w, h, text=None, size=11, font=BODY, bold=False, color=INK,
       align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_mult=1.12, after=0, before=0,
       spacing=None, italic=False, runs=None, paras=None, label="", check=True):
    shp = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = shp.text_frame
    tf.word_wrap = True
    tf.auto_size = MSO_AUTO_SIZE.NONE
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = anchor

    base = dict(size=size, font=font, bold=bold, color=color, align=align,
                line_mult=line_mult, after=after, before=before, spacing=spacing,
                italic=italic)
    if paras is None:
        paragraphs = [dict(base)]
        if runs:
            paragraphs[0]["runs"] = runs
        else:
            paragraphs[0]["text"] = text or ""
    else:
        paragraphs = []
        for p in paras:
            merged = dict(base)
            merged.update(p)
            paragraphs.append(merged)

    measured = []
    for i, p in enumerate(paragraphs):
        para = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        para.alignment = p["align"]
        para.line_spacing = p["line_mult"]
        para.space_after = Pt(p["after"])
        para.space_before = Pt(p["before"])
        pr_runs = p.get("runs")
        if pr_runs:
            for rtext, over in pr_runs:
                r = para.add_run()
                r.text = rtext
                r.font.name = over.get("font", p["font"])
                r.font.size = Pt(over.get("size", p["size"]))
                r.font.bold = over.get("bold", p["bold"])
                r.font.italic = over.get("italic", p["italic"])
                r.font.color.rgb = RGBColor.from_string(over.get("color", p["color"]))
                sp = over.get("spacing", p["spacing"])
                if sp:
                    r.font._rPr.set("spc", str(int(sp)))
                measured.append((rtext, r.font.size.pt, over.get("font", p["font"]),
                                 over.get("bold", p["bold"])))
        else:
            r = para.add_run()
            r.text = p.get("text", "")
            r.font.name = p["font"]
            r.font.size = Pt(p["size"])
            r.font.bold = p["bold"]
            r.font.italic = p["italic"]
            r.font.color.rgb = RGBColor.from_string(p["color"])
            if p["spacing"]:
                r.font._rPr.set("spc", str(int(p["spacing"])))
            measured.append((p.get("text", ""), p["size"], p["font"], p["bold"]))

    if check:
        est = 0.0
        for (t, sz, ft, bd) in measured:
            est += _est_height(t, w, sz, ft, bd, line_mult)
        est += sum(p["after"] + p["before"] for p in paragraphs) / 72.0
        if est > h * 1.02:
            CHECKS.append((PAGE["n"], label or (text or "")[:28], round(est, 2), h))
    return shp


def add_pic(slide, filename, x, y, w, h=None, border=False):
    path = filename if os.path.isabs(filename) else os.path.join(SHOTS, filename)
    iw, ih = Image.open(path).size
    if h is None:
        h = w * ih / iw
    pic = slide.shapes.add_picture(path, Inches(x), Inches(y), Inches(w), Inches(h))
    if border:
        line(pic, "D9C9B6", 0.75)
    return pic


def image_card(slide, filename, x, y, w, caption, dark=False, caption_lines=2,
               img_h=None, pad=0.08, radius=0.06, label=""):
    inner = w - 2 * pad
    if img_h is None:
        iw, ih = Image.open(os.path.join(SHOTS, filename)).size
        img_h = inner * ih / iw
    cap_h = 0.20 + caption_lines * 0.155
    total = pad + img_h + cap_h + 0.04
    rect(slide, x, y, w, total, WHITE if not dark else ESPRESSO, radius,
         BORDER if not dark else "3A2216", 0.75, shdw=not dark)
    add_pic(slide, filename, x + pad, y + pad, inner, img_h)
    cy = y + pad + img_h + 0.10
    tb(slide, x + 0.20, cy, w - 0.40, cap_h, caption, size=8.3,
       color=MUTED_2 if not dark else FAINT, line_mult=1.12, label=label or caption[:20])
    return total


def footer(slide, dark=False, speaker=""):
    PAGE["n"] += 1
    n = PAGE["n"]
    c = "3A2216" if dark else BORDER
    tcol = FAINT if dark else MUTED
    rect(slide, ML, 6.93, CW, 0.012, c)
    tb(slide, ML, 7.06, 6.0, 0.22, "CAMPUS ONLINE ORDERING SYSTEM", size=7.5,
       color=tcol, bold=True, spacing=70, check=False)
    tb(slide, 4.75, 7.06, 4.0, 0.22, "ORDRIX · ORDRIX · MDU ROHTAK", size=7.5,
       color=tcol, align=PP_ALIGN.CENTER, check=False)
    right = (speaker.upper() + "   |   " if speaker else "") + f"{n:02d} / 17"
    tb(slide, 9.8, 7.06, 2.78, 0.22, right, size=7.5, color=tcol, bold=True,
       align=PP_ALIGN.RIGHT, spacing=60, check=False)


def eyebrow(slide, text, color=RED, y=0.58):
    tb(slide, ML, y, 9.0, 0.24, text, size=9.5, color=color, bold=True, spacing=120,
       check=False)


def title(slide, text, size=30, color=INK, y=0.86, w=CW, h=None, line_mult=0.98):
    if h is None:
        lines = text.count("\n") + 1
        h = lines * (size * 1.25) / 72 + 0.12
    tb(slide, ML - 0.02, y, w, h, text, size=size, font=HEAD, bold=True, color=color,
       line_mult=line_mult, label="title")


def bg(slide, color=CREAM):
    rect(slide, 0, 0, SW, SH, color)


def decor_dark(slide):
    circle(slide, 10.05, -1.55, 4.6, YELLOW, alpha=7)
    circle(slide, -1.75, 5.15, 3.7, RED, alpha=10)
    circle(slide, 8.55, 3.62, 1.15, None, YELLOW, 1.0, alpha=22)


def notes(slide, speaker, secs, en, cue=None):
    parts = [f"{speaker.upper()}  ·  approx. {secs}", "", en.strip()]
    if cue:
        parts += ["", "CUE: " + cue]
    slide.notes_slide.notes_text_frame.text = "\n".join(parts)


def bullet(slide, x, y, w, text, sub=None, size=11, color=INK, dot=RED, label="",
           sub_color=None, gap=0.24):
    rect(slide, x, y + 0.075, 0.09, 0.09, dot, radius=0.25)
    tb(slide, x + gap, y - 0.015, w - gap, 0.28, text, size=size, bold=True, color=color,
       label=label or text[:18])
    if sub:
        tb(slide, x + gap, y + 0.25, w - gap, 0.62, sub, size=size - 1.1,
           color=sub_color or MUTED_2, line_mult=1.1, label=(label or text[:18]) + " sub")
        return 0.98
    return 0.45


def chip(slide, x, y, w, h, text, fill=SAND, color=INK, size=10, bold=True, radius=0.5,
         ln=None):
    s = rect(slide, x, y, w, h, fill, radius, ln, 0.75)
    tf = s.text_frame
    tf.margin_left = Inches(0.10)
    tf.margin_right = Inches(0.10)
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    r = p.add_run()
    r.text = text
    r.font.name = BODY
    r.font.size = Pt(size)
    r.font.bold = bold
    r.font.color.rgb = RGBColor.from_string(color)
    return s


# =========================================================
# 01 — TITLE
# =========================================================
s = prs.slides.add_slide(BLANK)
rect(s, 0, 0, SW, SH, DEEP)
decor_dark(s)
rect(s, 0, 0, 0.16, SH, RED)

tb(s, 0.95, 1.05, 7.6, 0.24, "TEAM ORDRIX  ·  MDU ROHTAK", size=9.5, color=YELLOW,
   bold=True, spacing=200, check=False)

tb(s, 0.90, 1.45, 7.7, 2.0, "Campus Online\nOrdering System", size=55, font=HEAD,
   bold=True, color=CREAM, line_mult=0.94, label="hero title")
rect(s, 0.95, 3.52, 2.25, 0.055, YELLOW)

tb(s, 0.95, 3.78, 7.5, 0.45, "Order in class. Collect between classes.", size=22,
   font=HEAD, bold=True, color=CREAM)
tb(s, 0.95, 4.40, 7.25, 0.85,
   "A pickup-first food ordering platform for college cafeterias — live menu, "
   "online payment, crowd-controlled pickup windows and one pickup code.",
   size=11.5, color=FAINT, line_mult=1.25, label="hero desc")

for i, t in enumerate(["5-minute ordering", "One pickup code", "Zero queue"]):
    chip(s, 0.95 + i * 2.12, 5.42, 2.0, 0.34, t, ESPRESSO, YELLOW, 9)

tb(s, 0.95, 6.28, 7.6, 0.30, "Presented by  Sagar  ·  Anirudh  ·  Tushar", size=11.5,
   bold=True, color=CREAM)
tb(s, 0.95, 6.62, 7.6, 0.26, "ORDRIX  ·  Maharshi Dayanand University, Rohtak",
   size=9, color=FAINT)

# phone
rect(s, 9.08, 1.36, 2.34, 4.78, "351A0E", 0.10, "452A1A", 1.0, shdw=True)
add_pic(s, "15-mobile-home.png", 9.20, 1.49, 2.11, 4.52)
tb(s, 8.85, 6.24, 3.75, 0.22, "STUDENT APP · MOBILE FIRST", size=7.5, color=FAINT,
   bold=True, align=PP_ALIGN.CENTER, spacing=100, check=False)

footer(s, dark=True, speaker="Sagar")
notes(
    s, "Sagar", "45 sec",
    "Good morning, respected judges. We are Team ORDRIX — Sagar, Anirudh and Tushar — "
    "and our project is the Campus Online Ordering System. Let me start with a question: "
    "how many of us have skipped lunch just because the canteen line was too long? "
    "[pause] That is exactly the problem we are solving. A student gets a ten or fifteen "
    "minute break. In that time they walk to the cafeteria, stand in a queue, order, wait "
    "for the food, and rush back to class. Our platform moves the ordering part into the "
    "classroom: browse the live menu, pay online, choose a pickup window, and collect the "
    "order with one pickup code. No queue, no guessing, no wasted break.",
    "Good morning respected judges! Hum Team ORDRIX hain — Sagar, Anirudh aur Tushar — "
    "aur hamara project hai Campus Online Ordering System. Sabse pehle ek chhota sawaal: "
    "hum mein se kitne log sirf canteen ki lambi line ki wajah se lunch skip kar dete hain? "
    "[pause] Yahi problem hum solve kar rahe hain. College mein break sirf 10–15 minute ka "
    "hota hai. Utne mein canteen tak jao, line mein lago, order do, khaana banne ka wait "
    "karo, aur wapas class bhi pahuncho. Hamara platform ordering ko classroom mein le aata "
    "hai — live menu browse karo, online pay karo, pickup window chuno, aur ek pickup code "
    "se order collect karo. Na line, na confusion, na break ka waste.",
    cue="Smile, hold the phone visual, then move to the problem slide.")

# =========================================================
# 02 — PROBLEM
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, DEEP)
decor_dark(s)
eyebrow(s, "01  ·  THE PROBLEM", YELLOW)
title(s, "A 10-minute break.\nA 15-minute queue.", size=40, color=CREAM, y=0.92, w=7.4)

stats = [
    ("10 min", "class break — canteen tak pahunchne aur wapas aane ka time"),
    ("60–70", "students ek hi break mein canteen ki taraf chal padte hain"),
    ("1", "counter, ek hi samay par sabko serve karne ke liye"),
]
for i, (num, lab) in enumerate(stats):
    yy = 3.42 + i * 0.78
    tb(s, 0.75, yy, 1.85, 0.64, num, size=30, font=HEAD, bold=True, color=YELLOW,
       label=num)
    tb(s, 2.60, yy + 0.10, 4.35, 0.50, lab, size=10.5, color=FAINT, line_mult=1.15,
       label=lab)

rect(s, 7.02, 2.62, 0.012, 3.75, "4A2618")
blocks = [
    ("Bell bajti hai —", "60–70 students ek saath canteen pahunchte hain."),
    ("Line lambi ho jaati hai —", "break khatam, order abhi bhi pending."),
    ("Student bhookha class mein —", "ya order kiye bina hi wapas chala jaata hai."),
]
for i, (h, b) in enumerate(blocks):
    yy = 2.72 + i * 1.12
    tb(s, 7.42, yy, 5.0, 0.26, h, size=12, bold=True, color=CREAM, label=h)
    tb(s, 7.42, yy + 0.30, 5.0, 0.58, b, size=10.5, color=FAINT, line_mult=1.16, label=b)

tb(s, 0.75, 6.38, 11.8, 0.36,
   "Result: break ka maza nahi, class mein bhookh — aur canteen ka business bhi loss.",
   size=11.5, bold=True, color=YELLOW, label="result line")

footer(s, dark=True, speaker="Sagar")
notes(
    s, "Sagar", "55 sec",
    "Let us look at the numbers. A typical break is about ten minutes. In that same ten "
    "minutes, sixty to seventy students walk into the cafeteria — and there is one counter "
    "serving everyone. So the queue is not a bug, it is arithmetic. [pause] The result is "
    "predictable: the break ends before the order is ready, the student sits through the "
    "next class hungry, or simply walks away without ordering. For the cafeteria this is "
    "lost business too — students look at the line and leave. Nobody is lazy here and "
    "nobody is at fault; the process is the problem.",
    "Ab numbers dekhiye. Break hai sirf 10 minute ka. Usi 10 minute mein 60–70 students "
    "canteen pahunch jaate hain — aur counter sirf ek hai. To line lag jaana koi bug nahi, "
    "simple arithmetic hai. [pause] Result predictable hai: break khatam ho jaata hai aur "
    "order abhi bhi pending, student aglee class mein bhookha baithta hai, ya order kiye "
    "bina hi wapas chala jaata hai. Canteen ke liye bhi yeh loss hai — students line dekh "
    "kar laut jaate hain. Yahan koi aalsi nahi hai, koi galti nahi kar raha; problem "
    "process ki hai.",
    cue="Point at the three numbers, then the right-hand pain points.")

# =========================================================
# 03 — WHO IT HURTS
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "01  ·  THE PROBLEM")
title(s, "Ek problem. Do nuksaan.", size=32)

panels = [
    (0.75, "THE STUDENT", "Time aur meal — dono jaate hain", [
        "Break poora queue mein nikal jaata hai",
        "Class mein bhookha baithna padta hai",
        "Ya order hi nahi karta — khaana chhod deta hai",
    ]),
    (6.82, "THE CAFÉ", "Sales aur staff — dono pressure mein", [
        "Counter pe line = slow service",
        "Dekh kar chale jaane wale = lost sales",
        "Peak time pe staff overwhelmed",
    ]),
]
for x, head, sub, items in panels:
    rect(s, x, 2.32, 5.77, 3.52, WHITE, 0.05, BORDER, 0.75, shdw=True)
    rect(s, x, 2.32, 5.77, 0.06, RED)
    tb(s, x + 0.40, 2.64, 4.9, 0.26, head, size=9.5, color=RED, bold=True, spacing=160,
       check=False)
    tb(s, x + 0.40, 2.96, 4.9, 0.34, sub, size=15, font=HEAD, bold=True, color=INK,
       label=sub)
    for i, it in enumerate(items):
        yy = 3.62 + i * 0.72
        rect(s, x + 0.42, yy + 0.08, 0.09, 0.09, RED, radius=0.25)
        tb(s, x + 0.70, yy, 4.62, 0.55, it, size=10.5, color=MUTED_2, line_mult=1.15,
           label=it)

tb(s, 0.75, 6.14, 11.83, 0.42,
   "Student ka time waste, café ka revenue loss — aur dono ke paas koi solution nahi.",
   size=12, bold=True, color=INK, label="result")

footer(s, speaker="Sagar")
notes(
    s, "Sagar", "45 sec",
    "Two sides lose here. The student loses time, and sometimes the meal itself — they sit "
    "in the next class hungry. The cafeteria loses sales: students see the line and walk "
    "away, and at peak hours the staff is completely overwhelmed. Notice that neither side "
    "is doing anything wrong. The counter is working as fast as it can; the student is just "
    "hungry. The process is broken. That is why we did not build a faster queue — we "
    "removed the queue.",
    "Yahan dono sides ka nuksaan hai. Student ka time jaata hai, aur kabhi kabhi khaana "
    "bhi — aglee class mein bhookha baithna padta hai. Canteen ki sales jaati hai: students "
    "line dekh kar laut jaate hain, aur peak time pe staff completely overwhelmed ho jaata "
    "hai. Dhyan dijiye — koi bhi galti nahi kar raha. Counter apni poori speed se kaam kar "
    "raha hai, student bas bhookha hai. Process toota hua hai. Isliye humne tez line nahi "
    "banayi — humne line hata di.",
    cue="Pause on the last line. Next line: 'You might ask — why not Zomato or Swiggy?'")

# =========================================================
# 04 — WHY EXISTING APPS FAIL
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "01  ·  THE PROBLEM")
title(s, "Zomato / Swiggy yahan kaam nahi karta.", size=30)
tb(s, 0.75, 1.72, 11.6, 0.30,
   "Delivery-first apps are built for homes — not for a 10-minute campus break.",
   size=11, color=MUTED_2, label="subtitle")

cards = [
    ("01", "Delivery-first,\nnot pickup-first",
     "Unka model ghar tak pahunchane ka hai. Campus counter se 15 second mein "
     "collect karne ke liye bana hi nahi."),
    ("02", "No class\ntimetable",
     "Unhe pata hi nahi aapka break kab hai. Har order unke liye 'ASAP' hota hai — "
     "exactly the wrong promise."),
    ("03", "Delivery fee kills\na ₹200 order",
     "₹30 fee + waiting time par student chala jaata hai. Campus order ka ticket size "
     "chhota hota hai."),
]
for i, (num, head, body) in enumerate(cards):
    x = 0.75 + i * 4.0
    rect(s, x, 2.32, 3.82, 2.95, WHITE, 0.05, BORDER, 0.75, shdw=True)
    tb(s, x + 0.32, 2.54, 1.2, 0.34, num, size=11, bold=True, color=RED, spacing=80,
       check=False)
    tb(s, x + 0.32, 2.95, 3.18, 0.72, head, size=15.5, font=HEAD, bold=True, color=INK,
       line_mult=0.98, label=head)
    tb(s, x + 0.32, 3.78, 3.18, 1.15, body, size=10.2, color=MUTED_2, line_mult=1.17,
       label=body)

rect(s, 0.75, 5.62, 11.83, 0.72, SAND, 0.10)
tb(s, 1.02, 5.80, 11.25, 0.36,
   "Campus pickup ek alag category hai — iske liye alag product chahiye.",
   size=12.5, font=HEAD, bold=True, color=INK, label="takeaway")

footer(s, speaker="Sagar")
notes(
    s, "Sagar", "45 sec",
    "You might ask: why not Zomato or Swiggy? Three reasons. One, they are delivery-first — "
    "their product is built to bring food home, not to hand it over at a campus counter in "
    "fifteen seconds. Two, they have no idea about your class timetable; every order is "
    "'as soon as possible', which is exactly the wrong promise for a ten-minute break. "
    "Three, delivery fees — a thirty-rupee fee on a two-hundred-rupee student order makes "
    "no sense. Campus pickup is a different category and needs a different product. That "
    "is what we built. Anirudh will show you how it works.",
    "Aap poochh sakte hain — Zomato ya Swiggy kyun nahi? Teen reasons. Ek, wo delivery-first "
    "hain: unka product khaana ghar pahunchane ke liye bana hai, campus counter pe 15 "
    "second mein handover ke liye nahi. Do, unhe aapke class timetable ka pata hi nahi — "
    "har order 'ASAP' hota hai, jo 10-minute break ke liye bilkul galat promise hai. Teen, "
    "delivery fee: ₹200 ke student order pe ₹30 fee ka koi logic nahi. Campus pickup ek "
    "alag category hai, iske liye alag product chahiye. Wahi humne banaya hai. Ab Anirudh "
    "aapko dikhayenge ki ye kaise kaam karta hai.",
    cue="Turn to Anirudh. Anirudh: 'Thank you Sagar.'")

# =========================================================
# 05 — SOLUTION
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, DEEP)
decor_dark(s)
eyebrow(s, "02  ·  THE SOLUTION", YELLOW)
title(s, "Pre-order. Pay. Pick up.", size=40, color=CREAM, y=0.92)
tb(s, 0.75, 1.78, 11.5, 0.34,
   "One platform — student ke liye speed, café ke liye control.",
   size=12.5, color=FAINT, label="solution sub")

pillars = [
    ("1", "Pickup windows",
     "Break-wise slots with fixed capacity. Café decide karta hai ek slot mein kitne "
     "orders jayenge."),
    ("2", "One pickup code",
     "OR-0427. Counter pe code bolo, 15 second mein collect. Naam chillana khatam."),
    ("3", "Café control room",
     "Live queue, menu, slots, refunds aur audit — sab ek dashboard mein."),
]
for i, (num, head, body) in enumerate(pillars):
    x = 0.75 + i * 4.0
    rect(s, x, 2.62, 3.82, 3.02, ESPRESSO, 0.05, "3A2216", 0.75)
    circle(s, x + 0.32, 2.90, 0.56, YELLOW)
    tb(s, x + 0.32, 3.02, 0.56, 0.34, num, size=15, font=HEAD, bold=True, color=INK,
       align=PP_ALIGN.CENTER, check=False)
    tb(s, x + 0.32, 3.72, 3.18, 0.34, head, size=16, font=HEAD, bold=True, color=CREAM,
       label=head)
    tb(s, x + 0.32, 4.18, 3.18, 1.20, body, size=10.4, color=FAINT, line_mult=1.18,
       label=body)

tb(s, 0.75, 6.06, 11.8, 0.38,
   "Student ko queue se aazadi. Café ko peak-hour ka control.",
   size=13, bold=True, color=YELLOW, label="solution footer")

footer(s, dark=True, speaker="Sagar")
notes(
    s, "Sagar", "40 sec",
    "Our solution has three parts. First, pickup windows: instead of 'ASAP', the student "
    "chooses a break-time slot, and every slot has a fixed capacity so the kitchen is never "
    "flooded. Second, one pickup code: every order gets a short code like OR-0427 — the "
    "student shows it at the counter and walks away in seconds. Third, a control room for "
    "the café: live orders, menu, slots, refunds and audit in a single dashboard. Same "
    "platform, both sides — speed for the student, control for the café.",
    "Hamara solution teen parts mein hai. Pehla, pickup windows: 'ASAP' ki jagah student "
    "apne break ka slot chunta hai, aur har slot ki fixed capacity hoti hai taaki kitchen "
    "ek saath flood na ho. Doosra, ek pickup code: har order ko OR-0427 jaisa short code "
    "milta hai — student counter pe dikhata hai aur seconds mein nikal jaata hai. Teesra, "
    "café ke liye control room: live orders, menu, slots, refunds aur audit — sab ek hi "
    "dashboard mein. Same platform, dono sides: student ko speed, café ko control.",
    cue="Hand over to Anirudh: 'Let me hand that over to Anirudh for the product walkthrough.'",
)

# =========================================================
# 06 — STUDENT JOURNEY
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "03  ·  HOW IT WORKS")
title(s, "Order in class. Collect between classes.", size=28)

steps = ["Browse\nmenu", "Add to\ncart", "Pickup\nwindow", "Pay\nonline", "Show code\n& collect"]
for i, st in enumerate(steps):
    x = 0.75 + i * 2.35
    rect(s, x, 1.95, 2.10, 0.60, SAND, 0.12)
    tb(s, x + 0.14, 2.04, 0.28, 0.4, str(i + 1), size=13, font=HEAD, bold=True,
       color=RED, check=False)
    tb(s, x + 0.38, 1.99, 1.60, 0.52, st.replace("\n", " "), size=9.5, bold=True,
       color=INK, line_mult=1.0, check=False)

image_card(s, "02-menu.png", 0.75, 2.86, 3.82,
           "Live menu — 74 items, options aur prices", caption_lines=1)
image_card(s, "12-checkout.png", 4.75, 2.86, 3.82,
           "Checkout — pickup window + payment", caption_lines=1)
image_card(s, "04-order-detail.png", 8.75, 2.86, 3.82,
           "Track order + pickup code", caption_lines=1)

tb(s, 0.75, 6.40, 11.8, 0.30, "5 steps. About 5 minutes. Zero queue.", size=12,
   bold=True, color=RED, label="journey footer")

footer(s, speaker="Anirudh")
notes(
    s, "Anirudh", "60 sec",
    "Thank you, Sagar. Let me walk you through the student journey — five steps, roughly "
    "five minutes. Step one, open the live menu from any browser. Step two, add items to "
    "the cart and customise them. Step three, choose a pickup window that fits your break. "
    "Step four, pay online. Step five, show the pickup code at the counter and collect. No "
    "app install, no phone call, no queue. On screen you can see the actual menu, checkout "
    "and tracking screens from our build — these are not mockups.",
    "Thank you Sagar. Ab main student journey dikhata hoon — paanch steps, lagbhag paanch "
    "minute. Step one: kisi bhi browser se live menu kholo. Step two: items cart mein daalo "
    "aur customise karo. Step three: apne break ka pickup window chuno. Step four: online "
    "payment karo. Step five: counter pe pickup code dikhao aur order collect karo. Na app "
    "install, na phone call, na line. Screen pe aap hamare actual menu, checkout aur "
    "tracking screens dekh rahe hain — ye mockups nahi hain.",
    cue="Advance to the menu slide while saying 'let me show you the menu'.")

# =========================================================
# 07 — MENU & CART
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "03  ·  HOW IT WORKS")
title(s, "A live menu — not a PDF.", size=30)

image_card(s, "02-menu.png", 0.75, 2.10, 6.2,
           "Menu — categories, search, veg filter and live availability", caption_lines=1)

items = [
    ("74 items · 16 categories",
     "Coffee, pizza, burgers, maggi, wraps — sab ek jagah."),
    ("Customise your order",
     "Size, milk, extra cheese, toppings — price turant update."),
    ("Veg / non-veg + prep time",
     "Har item pe clear label aur estimated preparation time."),
    ("A cart that remembers",
     "Class ke beech items add karo — cart save rehta hai."),
]
for i, (h, b) in enumerate(items):
    yy = 2.12 + i * 1.06
    tb(s, 7.35, yy, 5.15, 0.28, h, size=12, bold=True, color=INK, label=h)
    tb(s, 7.35, yy + 0.30, 5.15, 0.52, b, size=10.3, color=MUTED_2, line_mult=1.12,
       label=b)

footer(s, speaker="Anirudh")
notes(
    s, "Anirudh", "45 sec",
    "On the menu screen, students see 74 items across 16 categories — coffee, pizza, "
    "burgers, maggi, wraps. Prices are live, veg and non-veg are clearly marked, and every "
    "item carries a preparation time. Items can be customised — size, milk, extra cheese, "
    "toppings — and the price updates immediately. The cart is saved locally, so if a "
    "student gets pulled into a discussion between classes, the order is still there when "
    "they come back.",
    "Menu screen pe students ko 74 items milte hain, 16 categories mein — coffee, pizza, "
    "burgers, maggi, wraps. Prices live hain, veg aur non-veg clearly marked hai, aur har "
    "item pe preparation time diya hai. Items customise ho sakte hain — size, milk, extra "
    "cheese, toppings — aur price turant update hota hai. Cart locally save rehta hai, to "
    "agar class ke beech koi distraction ho jaaye, wapas aane pe order wahin milega.",
)

# =========================================================
# 08 — CHECKOUT & PAYMENT
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "03  ·  HOW IT WORKS")
title(s, "Pay online. Skip the counter.", size=30)

blocks = [
    ("Pickup window chuno",
     "Lunch ya short break — jo slot free hai wahi dikhta hai."),
    ("Order notes",
     "'Less spicy', 'extra ketchup' — seedha café tak pahunchta hai."),
    ("Live price breakup",
     "Subtotal + tax + service fee — payment se pehle sab clear."),
    ("Razorpay checkout",
     "UPI, card, wallet. Sandbox fallback bhi built-in hai."),
    ("Server-verified total",
     "Client se aaya price trust nahi karte — server dobara calculate karta hai."),
]
for i, (h, b) in enumerate(blocks):
    yy = 2.10 + i * 0.87
    tb(s, 0.75, yy, 5.10, 0.27, h, size=11.5, bold=True, color=INK, label=h)
    tb(s, 0.75, yy + 0.28, 5.10, 0.50, b, size=10.2, color=MUTED_2, line_mult=1.12,
       label=b)

image_card(s, "12-checkout.png", 6.28, 2.10, 6.3,
           "Checkout — pickup window, notes and live price breakup", caption_lines=1)

footer(s, speaker="Anirudh")
notes(
    s, "Anirudh", "45 sec",
    "At checkout, the student picks a pickup window, adds a note like 'less spicy', and "
    "sees the full price breakup before paying — subtotal, tax and service fee. Payment "
    "goes through Razorpay: UPI, card or wallet. If the keys are not configured, the system "
    "falls back to a sandbox mode so the demo never breaks. And one important detail: the "
    "server recalculates the total. We never trust a price that comes from the browser.",
    "Checkout pe student pickup window chunta hai, 'less spicy' jaisa note add karta hai, "
    "aur payment se pehle poora breakup dekhta hai — subtotal, tax aur service fee. Payment "
    "Razorpay se hota hai: UPI, card ya wallet. Agar keys configured na hon, system sandbox "
    "mode mein chala jaata hai taaki demo kabhi break na ho. Aur ek important detail: total "
    "server dobara calculate karta hai. Browser se aaya price hum trust nahi karte.",
)

# =========================================================
# 09 — PICKUP CODE & TRACKING
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, DEEP)
decor_dark(s)
eyebrow(s, "03  ·  HOW IT WORKS", YELLOW)
title(s, "One code. Zero confusion.", size=36, color=CREAM, y=0.92)

rect(s, 0.75, 2.12, 5.35, 1.32, ESPRESSO, 0.07, "3A2216", 0.75)
tb(s, 1.02, 2.28, 2.0, 0.22, "PICKUP CODE", size=7.5, color=FAINT, bold=True,
   spacing=160, check=False)
tb(s, 1.00, 2.46, 3.0, 0.64, "OR-0427", size=30, bold=True, color=YELLOW)
chip(s, 3.98, 2.55, 1.88, 0.34, "Ready to collect", "1F3B22", "7BD88F", 9)
tb(s, 1.02, 3.09, 4.8, 0.22, "verified at the counter in seconds", size=8.5,
   color=FAINT, check=False)

tb(s, 0.75, 3.66, 5.2, 0.22, "LIVE ORDER TIMELINE", size=7.5, color=FAINT, bold=True,
   spacing=160, check=False)
rect(s, 1.03, 4.02, 0.014, 2.22, "4A2618")
timeline = ["Placed", "Accepted", "Preparing", "Ready", "Collected"]
tcol = [MUTED, MUTED, MUTED, "7BD88F", MUTED]
for i, t in enumerate(timeline):
    yy = 3.98 + i * 0.55
    circle(s, 0.97, yy, 0.13, tcol[i])
    tb(s, 1.30, yy - 0.05, 4.7, 0.30, t, size=10.5, bold=(i == 3),
       color=CREAM if i == 3 else FAINT, label=t)

tb(s, 0.75, 6.42, 5.4, 0.30, "Cancel before prep · paid order = auto refund", size=8.5,
   color=FAINT)

image_card(s, "04-order-detail.png", 6.58, 2.12, 6.0,
           "Order detail — live status, pending time and pickup code", dark=True,
           caption_lines=1)

footer(s, dark=True, speaker="Anirudh")
notes(
    s, "Anirudh", "45 sec",
    "After payment, the student gets a unique pickup code — for example OR-0427. The order "
    "detail page is a live timeline: Placed, Accepted, Preparing, Ready, Collected. The "
    "student can see how long the order has been pending, gets an update when it is ready, "
    "or cancels before preparation begins — paid orders are refunded automatically. There "
    "is no need to call the counter and ask 'mera order kab ready hoga?' — the app already "
    "answers that. At pickup, the staff types this code, and the order is closed.",
    "Payment ke baad student ko unique pickup code milta hai — jaise OR-0427. Order detail "
    "page ek live timeline hai: Placed, Accepted, Preparing, Ready, Collected. Student dekh "
    "sakta hai order kitni der se pending hai, ready hone pe update milta hai, ya "
    "preparation shuru hone se pehle cancel kar sakta hai — paid order auto refund ho jaata "
    "hai. Counter pe phone karke 'mera order kab ready hoga?' poochhne ki zaroorat nahi — "
    "app already bata raha hai. Pickup pe staff ye code daalta hai aur order close ho "
    "jaata hai.",
)

# =========================================================
# 10 — PICKUP WINDOWS
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "04  ·  THE DIFFERENTIATOR")
title(s, "Slots, not “ASAP”.", size=32)
tb(s, 0.75, 1.72, 11.5, 0.30, "The kitchen gets a schedule. The student gets a time.",
   size=11, color=MUTED_2, label="slots sub")

left = [
    ("Break-wise windows",
     "10:45–11:15, 13:00–14:00, 15:45–16:15 — college timetable ke hisaab se."),
    ("Fixed capacity",
     "Har slot mein 25–40 orders. Kitchen ek saath overwhelm nahi hota."),
    ("Café ke control mein",
     "Slot full ya band? Student ko sirf valid options dikhte hain."),
]
for i, (h, b) in enumerate(left):
    yy = 2.12 + i * 0.80
    tb(s, 0.75, yy, 5.05, 0.26, h, size=11.5, bold=True, color=INK, label=h)
    tb(s, 0.75, yy + 0.27, 5.05, 0.46, b, size=9.8, color=MUTED_2, line_mult=1.12,
       label=b)

tb(s, 0.75, 4.50, 5.05, 0.22, "TODAY'S WINDOWS", size=7.5, color=MUTED, bold=True,
   spacing=160, check=False)
slots = [("10:45 – 11:15", "Break 1", "30"), ("13:00 – 14:00", "Lunch", "40"),
         ("15:45 – 16:15", "Break 2", "30"), ("17:30 – 18:30", "Evening", "25")]
for i, (tm, lab, cap) in enumerate(slots):
    yy = 4.76 + i * 0.43
    rect(s, 0.75, yy, 5.05, 0.38, WHITE, 0.20, BORDER, 0.6)
    tb(s, 0.92, yy + 0.085, 1.55, 0.24, tm, size=9, bold=True, color=INK, check=False)
    tb(s, 2.50, yy + 0.095, 1.60, 0.22, lab, size=8.5, color=MUTED_2, check=False)
    tb(s, 4.35, yy + 0.075, 1.28, 0.24, f"{cap} orders", size=8.5, bold=True,
       color=RED, align=PP_ALIGN.RIGHT, check=False)

image_card(s, "13-checkout-slots.png", 6.28, 2.12, 6.3,
           "Checkout — only open windows with remaining capacity", caption_lines=1)

footer(s, speaker="Anirudh")
notes(
    s, "Anirudh", "40 sec",
    "The pickup window is our biggest differentiator. Most food apps promise 'ASAP'. We "
    "promise a time. Break one is 10:45 to 11:15 with thirty orders, lunch is 1 to 2 with "
    "forty, break two has thirty and evening has twenty-five. The café sets these numbers "
    "and can hide a slot when it is full. That means the kitchen knows the load in advance, "
    "and the student knows exactly when to walk in. This is the difference between a queue "
    "and a schedule.",
    "Pickup window hamara sabse bada differentiator hai. Zyadatar food apps 'ASAP' promise "
    "karte hain. Hum ek time promise karte hain. Break one 10:45–11:15, 30 orders; lunch "
    "1–2, 40 orders; break two 30; evening 25. Café ye numbers set karta hai aur slot full "
    "hone pe hide kar sakta hai. Matlab kitchen ko load pehle se pata hai, aur student ko "
    "exactly pata hai kab aana hai. Queue aur schedule mein yahi difference hai.",
)

# =========================================================
# 11 — CAFE DASHBOARD
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "05  ·  CAFÉ SIDE")
title(s, "The café's control room.", size=30)

image_card(s, "06-staff-dashboard.png", 0.75, 2.10, 6.9,
           "Staff dashboard — live order queue with one-tap status flow", caption_lines=1)

right = [
    ("Live queue", "Socket.IO se naye orders bina refresh aate hain."),
    ("One-tap status", "Accept → Preparing → Ready. Staff ko sirf next step dabana hai."),
    ("Code verify", "OR-#### daalo, order collected mark ho jaata hai."),
    ("Pause anytime", "Kitchen full? Orders pause — student ko turant dikhta hai."),
    ("Refund-safe", "Paid order cancel = auto refund + ledger entry."),
]
for i, (h, b) in enumerate(right):
    yy = 2.14 + i * 0.87
    tb(s, 7.95, yy, 4.60, 0.27, h, size=11.5, bold=True, color=INK, label=h)
    tb(s, 7.95, yy + 0.28, 4.60, 0.50, b, size=10.0, color=MUTED_2, line_mult=1.12,
       label=b)

footer(s, speaker="Anirudh")
notes(
    s, "Anirudh", "40 sec",
    "This is the café side. Orders arrive in real time over Socket.IO — no refresh. The "
    "staff moves each order through Accept, Preparing, Ready. When the student arrives, the "
    "staff types the pickup code and the order is marked Collected. If the kitchen is "
    "overloaded, the café can pause orders, and students see that instantly. Cancellations "
    "of paid orders create an automatic refund entry in the ledger. The whole counter runs "
    "from one screen.",
    "Ye hai café side. Orders Socket.IO se real time mein aate hain — koi refresh nahi. "
    "Staff har order ko Accept, Preparing, Ready se aage badhata hai. Student aaye to staff "
    "pickup code daalta hai aur order Collected mark ho jaata hai. Kitchen overloaded ho "
    "to café orders pause kar sakta hai, aur students ko turant dikh jaata hai. Paid order "
    "cancel hone pe ledger mein automatic refund entry ban jaati hai. Poora counter ek hi "
    "screen se chalta hai.",
)

# =========================================================
# 12 — OPERATIONS
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "05  ·  CAFÉ SIDE")
title(s, "Menu, slots, refunds — all in one place.", size=28)

ops = [
    ("08-staff-menu.png", "Menu manager",
     "Categories, photos, options, availability — no developer needed."),
    ("07-staff-slots.png", "Pickup windows",
     "Create slots, set capacity, hide when full."),
    ("10-admin-console.png", "Admin console",
     "Orders, revenue, users, refunds and audit log."),
]
for i, (img, head, cap) in enumerate(ops):
    x = 0.75 + i * 4.0
    rect(s, x, 2.02, 3.82, 2.46, WHITE, 0.06, BORDER, 0.75, shdw=True)
    add_pic(s, img, x + 0.08, 2.10, 3.66, 2.2875)
    tb(s, x + 0.02, 4.64, 3.80, 0.26, head, size=11.5, bold=True, color=INK, label=head)
    tb(s, x + 0.02, 4.94, 3.80, 0.60, cap, size=9.2, color=MUTED_2, line_mult=1.14,
       label=cap)

rect(s, 0.75, 5.78, 11.83, 0.72, SAND, 0.10)
tb(s, 1.02, 5.95, 11.25, 0.34,
   "Owner aur admin ke paas poora control — menu se refund tak, bina kisi developer ke.",
   size=11.5, bold=True, color=INK, label="ops footer")

footer(s, speaker="Anirudh")
notes(
    s, "Anirudh", "35 sec",
    "Behind that one screen is the full operations kit: a menu manager for categories, "
    "items, photos, options and availability; a pickup window manager for creating slots "
    "and setting capacity; and an admin console for orders, revenue, users, refunds and the "
    "audit log. The owner does not need a developer to change the menu or pause a slot — "
    "they just click. That is what makes this deployable in a real cafeteria, not just a "
    "college demo.",
    "Us ek screen ke peeche poora operations kit hai: menu manager — categories, items, "
    "photos, options aur availability; pickup window manager — slots banao aur capacity "
    "set karo; aur admin console — orders, revenue, users, refunds aur audit log. Menu "
    "badalne ya slot pause karne ke liye owner ko developer ki zaroorat nahi — bas click. "
    "Isi wajah se ye real cafeteria mein deploy ho sakta hai, sirf college demo nahi.",
)

# =========================================================
# 13 — TECH STACK
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "06  ·  UNDER THE HOOD")
title(s, "Built like a real product.", size=30)
tb(s, 0.75, 1.70, 8.6, 0.30, "Auth, payments, refunds and audit — not just screens.",
   size=10.5, color=MUTED_2, label="tech sub")

apps = ["Student app\n(React)", "Café dashboard\n(React)", "Admin console\n(React)"]
for i, a in enumerate(apps):
    x = 0.75 + i * 2.92
    rect(s, x, 2.06, 2.70, 0.62, WHITE, 0.14, BORDER, 0.75, shdw=True)
    tb(s, x, 2.18, 2.70, 0.40, a.replace("\n", " "), size=9.5, bold=True,
       align=PP_ALIGN.CENTER, color=INK, check=False)

rect(s, 0.75, 2.96, 8.54, 0.62, ESPRESSO, 0.12)
tb(s, 0.95, 3.12, 8.15, 0.34,
   "REST API  ·  Node 22 + Express + TypeScript  ·  Zod validation  ·  JWT httpOnly cookie",
   size=10.2, bold=True, color=CREAM, check=False)

rect(s, 0.75, 3.88, 4.12, 0.62, SAND, 0.12)
tb(s, 0.93, 4.06, 3.8, 0.30, "SQLite · multi-tenant data", size=10, bold=True,
   color=INK, check=False)
rect(s, 5.17, 3.88, 4.12, 0.62, SAND, 0.12)
tb(s, 5.35, 4.06, 3.8, 0.30, "Socket.IO · realtime + polling fallback", size=10,
   bold=True, color=INK, check=False)

rect(s, 0.75, 4.80, 8.54, 0.62, "3A2216", 0.12)
tb(s, 0.95, 4.97, 8.15, 0.30,
   "Razorpay — order → checkout → signature verify  |  auto-refund on cancel",
   size=10, bold=True, color=YELLOW, check=False)

tb(s, 0.75, 5.72, 8.54, 0.44,
   "Same codebase, three role-based interfaces. Students, staff, owner and admin — "
   "four roles, clear permissions.", size=9.2, color=MUTED_2, line_mult=1.2,
   label="tech note")

stats = [("30", "integration tests"), ("4", "roles"), ("2", "outlets configured")]
for i, (num, lab) in enumerate(stats):
    yy = 2.06 + i * 1.06
    rect(s, 9.62, yy, 2.96, 0.92, WHITE, 0.12, BORDER, 0.75, shdw=True)
    tb(s, 9.84, yy + 0.13, 1.05, 0.42, num, size=22, font=HEAD, bold=True, color=RED,
       check=False)
    tb(s, 10.75, yy + 0.26, 1.66, 0.42, lab, size=8.8, color=MUTED_2, line_mult=1.05,
       check=False)

footer(s, speaker="Anirudh")
notes(
    s, "Anirudh", "40 sec",
    "A quick look under the hood. The front end is React 18 with Vite and Tailwind — three "
    "role-based interfaces: student, café and admin. The API is Node 22, Express and "
    "TypeScript, with Zod validation and a JWT in an httpOnly cookie. Data is SQLite with "
    "multi-tenant tables, realtime is Socket.IO with a polling fallback for weak campus "
    "Wi-Fi, and payments are Razorpay with signature verification and auto-refund. We also "
    "have thirty integration tests covering orders, payments and permissions.",
    "Ab thoda technical side. Front end React 18 + Vite + Tailwind hai — teen role-based "
    "interfaces: student, café aur admin. API Node 22, Express aur TypeScript pe hai, Zod "
    "validation aur httpOnly cookie mein JWT ke saath. Data SQLite mein multi-tenant tables "
    "ke saath, realtime Socket.IO se with polling fallback for weak campus Wi-Fi, aur "
    "payments Razorpay — signature verification aur auto-refund ke saath. Orders, payments "
    "aur permissions ke liye 30 integration tests bhi hain.",
)

# =========================================================
# 14 — LIVE DEMO
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, DEEP)
decor_dark(s)
eyebrow(s, "07  ·  LIVE DEMO", YELLOW)
title(s, "Let's place an order.", size=36, color=CREAM, y=0.92)
tb(s, 0.75, 1.70, 4.9, 0.24, "localhost:5173 · student se café tak",
   size=11, color=FAINT, label="demo sub")

# left desktop
rect(s, 0.75, 2.10, 4.55, 2.90, WHITE, 0.05, "D9C9B6", 0.75, shdw=True)
add_pic(s, "01-home.png", 0.82, 2.17, 4.41, 2.756)
tb(s, 0.82, 5.04, 4.41, 0.20, "STUDENT HOME", size=8, bold=True, color=FAINT,
   spacing=120, check=False)
tb(s, 0.82, 5.42, 4.41, 0.20, "Order  →  pay  →  pickup code", size=8.8,
   color="C9B5A6", check=False)

# phone
rect(s, 5.70, 1.92, 1.94, 3.86, "351A0E", 0.10, "452A1A", 1.0, shdw=True)
add_pic(s, "14-mobile-menu.png", 5.81, 2.03, 1.72, 3.686)
tb(s, 5.70, 5.82, 1.94, 0.20, "MOBILE MENU", size=8, bold=True, color=FAINT,
   align=PP_ALIGN.CENTER, spacing=120, check=False)

# right desktop
rect(s, 8.03, 2.10, 4.55, 2.90, WHITE, 0.05, "D9C9B6", 0.75, shdw=True)
add_pic(s, "06-staff-dashboard.png", 8.10, 2.17, 4.41, 2.756)
tb(s, 8.10, 5.04, 4.41, 0.20, "CAFÉ DASHBOARD", size=8, bold=True, color=FAINT,
   spacing=120, check=False)
tb(s, 8.10, 5.42, 4.41, 0.20, "Live queue  →  accept  →  verify", size=8.8,
   color="C9B5A6", check=False)

flow = ["Menu", "Cart", "Pay", "Pickup code", "Café accepts", "Collected"]
for i, f in enumerate(flow):
    x = 0.85 + i * 1.97
    chip(s, x, 6.12, 1.82, 0.34, f, ESPRESSO, YELLOW, 8.5, ln="3A2216")
    if i < len(flow) - 1:
        tb(s, x + 1.82, 6.15, 0.15, 0.28, "›", size=12, bold=True, color="6B4A38",
           align=PP_ALIGN.CENTER, check=False)

footer(s, dark=True, speaker="Anirudh")
notes(
    s, "Anirudh", "90 sec",
    "Now let me show you the actual product. [open http://localhost:5173] This is the "
    "student home — it shows the outlet and whether it is accepting orders. I open the "
    "menu, add a cold coffee and a cheese garlic bread, go to the cart, choose the lunch "
    "pickup window, and check out. [complete the test payment — Razorpay test mode or sandbox] Here is the pickup code — "
    "OR-0427 style — with the live timeline. [switch to the staff dashboard in a second "
    "tab] On the café side, the same order appears instantly without a refresh. I accept "
    "it, mark it preparing, then ready. [back to the student tab] The student timeline "
    "updates live. At the counter, staff enters the code, and the order becomes Collected. "
    "That is the complete loop in under two minutes. If the network misbehaves, the "
    "screenshots in this deck are the backup.",
    "Ab main actual product dikhata hoon. [localhost:5173 kholo] Ye student home hai — outlet "
    "aur 'accepting orders' status dikh raha hai. Menu kholta hoon, cold coffee aur cheese "
    "garlic bread add karta hoon, cart mein jaata hoon, lunch pickup window chunta hoon, "
    "aur checkout karta hoon. [test payment complete karo — Razorpay test mode ya sandbox] Ye hai pickup code — OR-0427 "
    "format — live timeline ke saath. [doosre tab mein staff dashboard kholo] Café side pe "
    "wahi order turant aa jaata hai, bina refresh. Accept, preparing, ready. [student tab] "
    "Student ka timeline live update ho jaata hai. Counter pe staff code daalta hai, order "
    "Collected ho jaata hai. Poora loop do minute se kam mein. Agar network gadbad kare to "
    "deck ke screenshots backup hain.",
    cue="Student login: student@mdu.test / Student@12345.  Staff login: owner@ordrix.test / Owner@12345.  Keep both tabs open before you start.",
)

# =========================================================
# 15 — IMPACT
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "08  ·  IMPACT")
title(s, "Small change. Big difference.", size=32)

impact_stats = [
    ("5 min", "to place an order — from the classroom"),
    ("0 min", "standing in the queue"),
    ("125", "orders/day capacity per outlet"),
    ("100%", "orders tracked live"),
]
for i, (num, lab) in enumerate(impact_stats):
    x = 0.75 + i * 3.0
    rect(s, x, 2.02, 2.85, 1.42, WHITE, 0.08, BORDER, 0.75, shdw=True)
    tb(s, x + 0.26, 2.16, 2.35, 0.56, num, size=28, font=HEAD, bold=True, color=RED,
       check=False)
    tb(s, x + 0.26, 2.78, 2.35, 0.52, lab, size=8.6, color=MUTED_2, line_mult=1.15,
       check=False)

groups = [
    ("STUDENTS", "Break ka time khaane ke liye — line ke liye nahi."),
    ("CAFETERIA", "Peak-hour load pehle se pata — staff, stock aur kitchen plan."),
    ("CAMPUS", "Crowded counters kam, better experience, digital-first campus."),
]
for i, (h, b) in enumerate(groups):
    x = 0.75 + i * 4.0
    tb(s, x, 3.78, 3.82, 0.24, h, size=8.5, bold=True, color=RED, spacing=140,
       check=False)
    tb(s, x, 4.06, 3.82, 0.75, b, size=11, color=INK, line_mult=1.18, label=h + " body")

rect(s, 0.75, 5.10, 5.72, 1.02, SAND, 0.12)
tb(s, 0.98, 5.24, 5.3, 0.22, "BEFORE", size=7.5, bold=True, color=MUTED, spacing=150,
   check=False)
tb(s, 0.98, 5.48, 5.3, 0.50, "Break = queue + waiting + cold food", size=11.5,
   font=HEAD, bold=True, color=INK, check=False)

rect(s, 6.86, 5.10, 5.72, 1.02, "1F3B22", 0.12)
tb(s, 7.09, 5.24, 5.3, 0.22, "AFTER", size=7.5, bold=True, color="7BD88F",
   spacing=150, check=False)
tb(s, 7.09, 5.48, 5.3, 0.50, "Break = order, collect, relax", size=11.5, font=HEAD,
   bold=True, color=CREAM, check=False)

footer(s, speaker="Tushar")
notes(
    s, "Tushar", "55 sec",
    "Thank you, Anirudh. So what does this change? For the student, the break becomes "
    "usable again — order from class, collect in seconds, eat peacefully. For the cafeteria, "
    "the peak load is visible before it hits: they know how many orders are coming in each "
    "window, so they can plan staff and stock, and they stop losing students who see the "
    "queue and walk away. For the campus, counters become less crowded and the whole "
    "experience feels digital. The numbers on screen are our current configuration and "
    "design targets — five minutes to order, zero minutes in queue, up to 125 orders a day "
    "per outlet across four windows, and every order tracked live.",
    "Thank you Anirudh. To kya badalta hai? Student ke liye break dobara usable ho jaata "
    "hai — class se order, seconds mein collect, aaram se khaana. Cafeteria ke liye peak "
    "load aane se pehle dikh jaata hai: har window mein kitne orders aa rahe hain pata hai, "
    "to staff aur stock plan ho jaata hai, aur jo students line dekh kar laut jaate the wo "
    "business bhi bachta hai. Campus ke liye counters kam crowded, experience digital. "
    "Screen pe jo numbers hain wo hamari current configuration aur design targets hain — "
    "paanch minute mein order, zero minute queue, per outlet char windows mein 125 orders "
    "per day tak, aur har order live tracked.",
    cue="Slow down on the before/after strip. Then move to the roadmap.",
)

# =========================================================
# 16 — ROADMAP
# =========================================================
s = prs.slides.add_slide(BLANK)
bg(s, CREAM)
eyebrow(s, "09  ·  WHAT'S NEXT")
title(s, "From one counter to every campus.", size=30)

phases = [
    ("1 MONTH", "3 more cafés", "MDU campus ke andar pilot expand karo."),
    ("3 MONTHS", "Multi-campus + analytics", "Peak-hour data, best-sellers, slot demand."),
    ("6 MONTHS", "Prediction + services", "Order ETA, library, print, stationery."),
]
for i, (tag, head, body) in enumerate(phases):
    x = 0.75 + i * 4.0
    rect(s, x, 2.02, 3.82, 1.55, WHITE, 0.07, BORDER, 0.75, shdw=True)
    tb(s, x + 0.28, 2.18, 3.2, 0.22, tag, size=8, bold=True, color=RED, spacing=150,
       check=False)
    tb(s, x + 0.28, 2.44, 3.3, 0.34, head, size=14.5, font=HEAD, bold=True, color=INK,
       label=head)
    tb(s, x + 0.28, 2.86, 3.3, 0.55, body, size=9.6, color=MUTED_2, line_mult=1.14,
       label=body)

tb(s, 0.75, 3.88, 11.8, 0.22, "EXPANSION MAP", size=7.5, bold=True, color=MUTED,
   spacing=160, check=False)
chips = ["Multi-outlet platform", "Smart analytics", "Order-time prediction",
         "Library / print / stationery"]
for i, c in enumerate(chips):
    chip(s, 0.75 + i * 2.98, 4.14, 2.80, 0.42, c, SAND, INK, 9.2)

rect(s, 0.75, 4.94, 11.83, 0.012, BORDER)
tb(s, 0.75, 5.16, 11.6, 0.36,
   "Vision: campus ki har service — ek hi app mein, bina line ke.", size=17,
   font=HEAD, bold=True, color=INK, label="vision")

tb(s, 0.75, 5.78, 11.6, 0.62,
   "Same playbook: start with food pickup, learn the peak hours, then plug in more "
   "campus services on top of the same identity and payments layer.",
   size=10.2, color=MUTED_2, line_mult=1.2, label="vision sub")

footer(s, speaker="Tushar")
notes(
    s, "Tushar", "45 sec",
    "Our roadmap has three phases. In one month, we want three more cafeterias inside the "
    "MDU campus. In three months, a multi-campus rollout with peak-hour analytics for "
    "owners — which items sell out, which slots fill first, where the kitchen is slow. In "
    "six months, smarter order-time prediction and more campus services in the same app — "
    "library, printing, stationery. The vision is simple: every campus service should be "
    "one tap away, without a line.",
    "Hamara roadmap teen phases mein hai. Ek mahine mein MDU campus ke andar teen aur "
    "cafeterias. Teen mahine mein multi-campus rollout aur owners ke liye peak-hour "
    "analytics — kaun sa item jaldi khatam hota hai, kaun sa slot pehle full hota hai, "
    "kitchen kahan slow hai. Chhe mahine mein smarter order-time prediction aur usi app mein "
    "aur campus services — library, printing, stationery. Vision simple hai: campus ki har "
    "service ek tap door, bina line ke.",
)

# =========================================================
# 17 — THANK YOU
# =========================================================
s = prs.slides.add_slide(BLANK)
rect(s, 0, 0, SW, SH, DEEP)
decor_dark(s)
rect(s, 0, 0, 0.16, SH, RED)

tb(s, 0.95, 1.32, 11.5, 0.24, "THANK YOU FOR YOUR TIME", size=9.5, color=YELLOW,
   bold=True, spacing=200, check=False)
tb(s, 0.90, 1.68, 11.4, 1.15, "Thank you.", size=64, font=HEAD, bold=True,
   color=CREAM, check=False)
tb(s, 0.95, 2.88, 11.2, 0.45, "Questions? We would love your feedback.", size=18,
   font=HEAD, bold=True, color=YELLOW, check=False)

team = [("Sagar", "Problem · Solution"), ("Anirudh", "Product · Live demo"),
        ("Tushar", "Impact · Roadmap")]
for i, (name, role) in enumerate(team):
    x = 0.95 + i * 3.55
    rect(s, x, 3.78, 3.25, 0.98, ESPRESSO, 0.10, "3A2216", 0.75)
    tb(s, x + 0.24, 3.94, 2.8, 0.30, name, size=15, font=HEAD, bold=True, color=CREAM,
       check=False)
    tb(s, x + 0.24, 4.28, 2.8, 0.26, role, size=8.8, color=FAINT, check=False)

rect(s, 0.95, 5.18, 11.2, 0.012, "3A2216")
tb(s, 0.95, 5.36, 7.2, 0.28, "Demo:  localhost:5173", size=10.5, bold=True,
   color=CREAM, check=False)
tb(s, 0.95, 5.66, 7.2, 0.26, "ORDRIX · Maharshi Dayanand University, Rohtak",
   size=9, color=FAINT, check=False)

tb(s, 0.95, 6.38, 11.4, 0.40,
   "Break ka matlab coffee hona chahiye — line nahi.", size=14, font=HEAD, bold=True,
   color=YELLOW, check=False)

footer(s, dark=True, speaker="Tushar")
notes(
    s, "Tushar", "40 sec",
    "To close — we are not trying to build another food delivery app. We are fixing a very "
    "specific, everyday problem: the ten-minute break. Our platform works end to end today: "
    "live menu, online payment, pickup windows, pickup code, a realtime café dashboard and "
    "refunds. We would love your feedback, and if there is a cafeteria on this campus that "
    "wants to pilot it, we are ready. Thank you — and we are happy to take questions.",
    "Closing mein — hum ek aur food delivery app nahi bana rahe. Hum ek bahut specific, "
    "roz-marra ki problem fix kar rahe hain: 10-minute ka break. Hamara platform aaj end to "
    "end chalta hai: live menu, online payment, pickup windows, pickup code, realtime café "
    "dashboard aur refunds. Aapka feedback chahiye, aur agar is campus pe koi cafeteria "
    "pilot karna chahti hai to hum taiyar hain. Thank you — aur questions welcome hain.",
    cue="Pause, look at the judges, invite questions. Do not read the closing line — deliver it, then stop.",
)

# ---------------- save ----------------
prs.core_properties.title = "Campus Online Ordering System"
prs.core_properties.subject = "Campus food pre-ordering and pickup platform"
prs.core_properties.author = "Team ORDRIX — Sagar, Anirudh, Tushar"
prs.core_properties.company = "ORDRIX · MDU Rohtak"
prs.save(OUT)

print("saved", OUT, "slides:", len(prs.slides))
if CHECKS:
    print("POSSIBLE OVERFLOWS:")
    for c in CHECKS:
        print(f"  slide {c[0]:02d} | {c[1][:52]!r} | est {c[2]}in > box {c[3]}in")
else:
    print("no estimated overflows")
