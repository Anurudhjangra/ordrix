# -*- coding: utf-8 -*-
"""Builds Speaker-Notes.md from the PPTX notes so both stay in sync."""
import os
import re

from pptx import Presentation

BASE = os.path.dirname(os.path.abspath(__file__))
PPTX = os.path.join(BASE, "Campus-Online-Ordering-System.pptx")
MD = os.path.join(BASE, "Speaker-Notes.md")

SLIDES = [
    ("Opening & title slide", "Sagar", "45 sec", "Opening + team intro + one-line pitch"),
    ("The problem — 10-minute break, 15-minute queue", "Sagar", "55 sec", "The three numbers and the daily pain"),
    ("One problem, two costs", "Sagar", "45 sec", "Two-sided loss, nobody at fault"),
    ("Delivery apps don't fit a campus", "Sagar", "50 sec", "Delivery-first vs pickup-first"),
    ("The solution — pre-order, pay, pick up", "Sagar", "45 sec", "Three pillars + hand-off to Anirudh"),
    ("Student journey — five steps", "Anirudh", "60 sec", "Browse → cart → slot → pay → collect"),
    ("Live menu and cart", "Anirudh", "45 sec", "74 items, options, veg labels, prep time"),
    ("Checkout and payment", "Anirudh", "40 sec", "Pickup window, notes, Razorpay, server total"),
    ("Pickup code and live tracking", "Anirudh", "45 sec", "OR-0427 + five-step timeline"),
    ("Pickup windows — the differentiator", "Anirudh", "45 sec", "Slots instead of ASAP"),
    ("Café dashboard", "Anirudh", "40 sec", "Realtime queue, accept, verify, pause"),
    ("Menu, slots and admin operations", "Anirudh", "35 sec", "Owner control without a developer"),
    ("Under the hood — tech stack", "Anirudh", "40 sec", "React, Node, SQLite, Socket.IO, Razorpay"),
    ("Live demo", "Anirudh", "90 sec", "Open both tabs before you start"),
    ("Impact", "Tushar", "55 sec", "Student, cafeteria, campus + before/after"),
    ("Roadmap", "Tushar", "45 sec", "1 / 3 / 6 month plan"),
    ("Thank you and Q&A", "Tushar", "35 sec", "Close on the 10-minute break"),
]

prs = Presentation(PPTX)

parts = []
parts.append("# Campus Online Ordering System — Speaker Notes\n")
parts.append("**Team ORDRIX · Sagar · Anirudh · Tushar**  ")
parts.append("**ORDRIX · Maharshi Dayanand University, Rohtak**\n")
parts.append("Every slide is written in English. The same script is inside the PPTX, so Presenter View "
             "shows it on your laptop while the audience sees only the slide.\n")
parts.append("> Tip: do not read the slide. The slide carries the keyword; the script carries the story.\n")

parts.append("## Run sheet\n")
parts.append("| # | Slide | Speaker | Time | Purpose |")
parts.append("|---|-------|---------|------|---------|")
for i, (title, who, t, why) in enumerate(SLIDES, 1):
    parts.append(f"| {i:02d} | {title} | {who} | {t} | {why} |")
parts.append("\n**Total: ~13.5 minutes including the full demo.** For an 8-minute slot: skip slides 12 and 13 "
             "and cut the demo to 60 seconds (home → menu → cart → pay → code → dashboard).\n")
parts.append("**Hand-offs:** Sagar → Anirudh at the end of slide 5. Anirudh → Tushar after the demo (slide 14).\n")
parts.append("---\n")

for idx, (title, who, secs, why) in enumerate(SLIDES):
    slide = prs.slides[idx]
    text = slide.notes_slide.notes_text_frame.text
    body = text.split("\n", 1)[1].strip() if "\n" in text else ""
    cue = ""
    m = re.search(r"\n\nCUE: (.+)$", body, re.S)
    if m:
        cue = m.group(1).strip()
        body = body[:m.start()].strip()

    parts.append(f"## Slide {idx + 1:02d} — {title}\n")
    parts.append(f"**Speaker:** {who} · **Time:** {secs} · **On screen:** {why}\n")
    parts.append(body + "\n")
    if cue:
        parts.append(f"**Cue:** {cue}\n")
    parts.append("---\n")

parts.append("""## Numbers to remember

| Fact | Number |
|---|---|
| Class break | ~10 minutes |
| Students in one break | 60–70 |
| Counters serving them | 1 |
| Menu size | 74 items · 16 categories |
| Pickup windows per outlet | 4 (Break 1, Lunch, Break 2, Evening) |
| Capacity per window | 25–40 orders |
| Total capacity per outlet per day | 125 orders |
| Pickup code format | OR-0427 |
| Order statuses | Placed → Accepted → Preparing → Ready → Collected |
| Roles | student · staff · owner · admin |
| Integration tests | 30 |
| Outlets configured | 2 (UIET and IMSAR) |

---

## Demo checklist (Anirudh)

**Before the presentation**

1. Start the stack: `npm run dev:server` and `npm run dev:web` inside `E:\\ORDRIX`.
2. Open two browser tabs: `http://localhost:5173` (student) and the staff dashboard.
3. Student login: `student@mdu.test` / `Student@12345`
4. Staff / owner login: `owner@ordrix.test` / `Owner@12345`
5. Add one item to the cart and reach checkout once, so the flow is warm.
6. Keep the deck open in Presenter View — the screenshots on slide 14 are the fallback if Wi-Fi drops.

**Demo path (90 seconds)**

1. Home → shows the outlet and "Accepting orders".
2. Menu → add Cold Coffee + Cheese Garlic Bread.
3. Cart → show options and the price.
4. Checkout → choose the Lunch window, add a note, show the price breakup.
5. Pay in test mode → land on the order page with the pickup code.
6. Switch to the staff tab → the same order appears without refresh.
7. Accept → Preparing → Ready.
8. Switch back → the student timeline has updated live.
9. Staff enters the pickup code → the order becomes Collected.

**If something breaks:** stay calm, say "let me show you the same flow in the screenshots", and use slide 14. Never debug live for more than ten seconds.

---

## Likely judge questions — quick answers

**1. How is this different from Zomato or Swiggy?**
They are delivery-first. We are pickup-first and campus-specific: fixed pickup windows tied to class breaks, capacity per window, and one code at the counter. On a ₹200 student order, a delivery fee makes no sense — we do not have one.

**2. Is this actually running, or only a design?**
It is a working product: live menu, online payment, pickup windows, pickup code, realtime café dashboard and refunds. Two outlets are configured (UIET and IMSAR). The data in the demo is seed data, so we present it honestly as a working prototype, not as customer traction.

**3. What if the student's break time changes?**
The student can cancel before preparation starts. Paid orders are refunded automatically. If the café has not accepted yet, they can simply pick a different window after cancelling.

**4. How do you stop fake orders or no-shows?**
Orders are prepaid, which removes most no-shows. On top of that, every window has a capacity limit, and staff can reject or cancel an order with an audit entry.

**5. Is the payment secure?**
Razorpay handles the payment. We verify the signature on the server, never trust the browser's total, and recalculate the amount server-side. In development, a sandbox fallback keeps the flow testable without real money.

**6. What happens when the kitchen is overloaded?**
The café can pause new orders or hide a pickup slot. Students see it instantly, so nobody places an order that cannot be made in time. Window capacity is the main control.

**7. How will you onboard cafeterias? What is the business model?**
Start with the campus we are in: one café, prove the pickup flow, then expand to the other outlets. The model we are exploring is a flat monthly subscription per café instead of commission — predictable for the café and simple for us.

**8. What is the biggest technical challenge?**
Keeping the counter and the student in sync in real time. We use Socket.IO with an eight-second polling fallback for weak campus Wi-Fi, and the server is the single source of truth for order status and money.

**9. How does this scale to other colleges?**
The data model is already multi-tenant — cafés, menus, slots and orders are separated by café. Adding a campus is configuration plus onboarding, not a rewrite.

**10. What is the one thing you would fix next?**
Order-time prediction. Right now the pickup window is a promise; next we want the ETA inside the window to be accurate based on live kitchen load.

---

## Delivery tips

- **Numbers, not adjectives.** Say "60–70 students, one counter", not "very crowded".
- **Pause after the opening question.** Let the judges think for a second.
- **Do not read the slides.** The slides carry keywords; the story comes from you.
- **One demo, one loop.** Home → pay → code → café dashboard → collected. Do not wander.
- **Own the limits.** If asked about real customers, say "working prototype, two outlets configured". Honesty scores better than inflated numbers.
- **Close and stop.** After "A break should mean coffee — not a queue", pause and invite questions. Do not fill the silence.
""")

open(MD, "w", encoding="utf-8").write("\n".join(parts))
print("written", MD, len("\n".join(parts)), "chars")
