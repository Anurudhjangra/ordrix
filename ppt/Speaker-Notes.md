# Campus Online Ordering System — Speaker Notes

**Team ORDRIX · Sagar · Anirudh · Tushar**  
**ORDRIX · Maharshi Dayanand University, Rohtak**

Every slide is written in English. The same script is inside the PPTX, so Presenter View shows it on your laptop while the audience sees only the slide.

> Tip: do not read the slide. The slide carries the keyword; the script carries the story.

## Run sheet

| # | Slide | Speaker | Time | Purpose |
|---|-------|---------|------|---------|
| 01 | Opening & title slide | Sagar | 45 sec | Opening + team intro + one-line pitch |
| 02 | The problem — 10-minute break, 15-minute queue | Sagar | 55 sec | The three numbers and the daily pain |
| 03 | One problem, two costs | Sagar | 45 sec | Two-sided loss, nobody at fault |
| 04 | Delivery apps don't fit a campus | Sagar | 50 sec | Delivery-first vs pickup-first |
| 05 | The solution — pre-order, pay, pick up | Sagar | 45 sec | Three pillars + hand-off to Anirudh |
| 06 | Student journey — five steps | Anirudh | 60 sec | Browse → cart → slot → pay → collect |
| 07 | Live menu and cart | Anirudh | 45 sec | 74 items, options, veg labels, prep time |
| 08 | Checkout and payment | Anirudh | 40 sec | Pickup window, notes, Razorpay, server total |
| 09 | Pickup code and live tracking | Anirudh | 45 sec | OR-0427 + five-step timeline |
| 10 | Pickup windows — the differentiator | Anirudh | 45 sec | Slots instead of ASAP |
| 11 | Café dashboard | Anirudh | 40 sec | Realtime queue, accept, verify, pause |
| 12 | Menu, slots and admin operations | Anirudh | 35 sec | Owner control without a developer |
| 13 | Under the hood — tech stack | Anirudh | 40 sec | React, Node, SQLite, Socket.IO, Razorpay |
| 14 | Live demo | Anirudh | 90 sec | Open both tabs before you start |
| 15 | Impact | Tushar | 55 sec | Student, cafeteria, campus + before/after |
| 16 | Roadmap | Tushar | 45 sec | 1 / 3 / 6 month plan |
| 17 | Thank you and Q&A | Tushar | 35 sec | Close on the 10-minute break |

**Total: ~13.5 minutes including the full demo.** For an 8-minute slot: skip slides 12 and 13 and cut the demo to 60 seconds (home → menu → cart → pay → code → dashboard).

**Hand-offs:** Sagar → Anirudh at the end of slide 5. Anirudh → Tushar after the demo (slide 14).

---

## Slide 01 — Opening & title slide

**Speaker:** Sagar · **Time:** 45 sec · **On screen:** Opening + team intro + one-line pitch

Good morning, respected judges. We are Team ORDRIX — Sagar, Anirudh and Tushar — and our project is the Campus Online Ordering System. Let me start with a simple question: how many of us have skipped lunch just because the canteen queue was too long? [pause] That is exactly the problem. A student gets ten or fifteen minutes of break. In that time they walk to the cafeteria, stand in line, order, wait for the food and rush back to class. We move the ordering part into the classroom: browse the live menu, pay online, choose a pickup window, and collect with one code. No queue, no guessing, no wasted break.

**Cue:** Hold the phone visual while the judges read the title. Then move to the problem slide.

---

## Slide 02 — The problem — 10-minute break, 15-minute queue

**Speaker:** Sagar · **Time:** 55 sec · **On screen:** The three numbers and the daily pain

Let us look at the numbers. A break is about ten minutes long. In the same ten minutes, sixty to seventy students walk into the cafeteria — and there is one counter serving everyone. So the queue is not a bug, it is arithmetic. [pause] The result is predictable. The break ends before the order is ready, the student sits through the next class hungry, or simply walks away without ordering. For the cafeteria this is lost business too. Nobody is lazy here and nobody is at fault. The process is the problem.

**Cue:** Point at the three numbers, then at the three pain points on the right.

---

## Slide 03 — One problem, two costs

**Speaker:** Sagar · **Time:** 45 sec · **On screen:** Two-sided loss, nobody at fault

Two sides lose here. The student loses time, and sometimes the meal itself — they sit in the next class hungry. The cafeteria loses sales: students see the line and walk away, and at peak hours the staff is completely overwhelmed. Notice that neither side is doing anything wrong. The counter is working as fast as it can; the student is just hungry. The process is broken. That is why we did not build a faster queue — we removed the queue.

**Cue:** Pause on the last line, then ask: so why not just use Zomato or Swiggy?

---

## Slide 04 — Delivery apps don't fit a campus

**Speaker:** Sagar · **Time:** 50 sec · **On screen:** Delivery-first vs pickup-first

You might ask: why not Zomato or Swiggy? Three reasons. One, they are delivery-first — their product is built to bring food home, not to hand it over at a campus counter in fifteen seconds. Two, they have no idea about your class timetable; every order is 'as soon as possible', which is exactly the wrong promise for a ten-minute break. Three, the delivery fee — thirty rupees on a two-hundred-rupee student order makes no sense, and the waiting time loses the customer. Campus pickup is a different category and needs a different product. That is what we built. Anirudh will show you how it works.

**Cue:** Turn to Anirudh. He opens with: thank you, Sagar.

---

## Slide 05 — The solution — pre-order, pay, pick up

**Speaker:** Sagar · **Time:** 45 sec · **On screen:** Three pillars + hand-off to Anirudh

Our solution has three parts. First, pickup windows: instead of ASAP, the student chooses a break-time slot, and every slot has a fixed capacity so the kitchen is never flooded. Second, one pickup code: every order gets a short code like OR-0427 — the student says it at the counter and walks away in seconds. Third, a control room for the café: live orders, menu, slots, refunds and audit in a single dashboard. Same platform, both sides — speed for the student, control for the café.

**Cue:** Hand over to Anirudh for the product walkthrough.

---

## Slide 06 — Student journey — five steps

**Speaker:** Anirudh · **Time:** 60 sec · **On screen:** Browse → cart → slot → pay → collect

Thank you, Sagar. Let me walk you through the student journey — five steps, roughly five minutes. Step one, open the live menu from any browser. Step two, add items to the cart and customise them. Step three, choose a pickup window that fits your break. Step four, pay online. Step five, show the pickup code at the counter and collect. No app install, no phone call, no queue. On screen you can see the actual menu, checkout and tracking screens from our build — these are not mockups.

**Cue:** Advance to the menu slide while saying 'let me show you the menu'.

---

## Slide 07 — Live menu and cart

**Speaker:** Anirudh · **Time:** 45 sec · **On screen:** 74 items, options, veg labels, prep time

On the menu screen, students see 74 items across 16 categories — coffee, pizza, burgers, maggi, wraps. Prices are live, veg and non-veg are clearly marked, and every item carries a preparation time. Items can be customised — size, milk, extra cheese, toppings — and the price updates immediately. The cart is saved locally, so if a student gets pulled into a discussion between classes, the order is still there when they come back.

**Cue:** Tap the veg filter and one item option while the judges watch.

---

## Slide 08 — Checkout and payment

**Speaker:** Anirudh · **Time:** 40 sec · **On screen:** Pickup window, notes, Razorpay, server total

At checkout, the student picks a pickup window, adds a note like 'less spicy', and sees the full price breakup before paying — subtotal, tax and service fee. Payment goes through Razorpay: UPI, card or wallet. If the keys are not configured, the system falls back to a sandbox mode so the demo never breaks. And one important detail: the server recalculates the total. We never trust a price that comes from the browser.

**Cue:** Pause on 'server recalculates'. That line lands well with judges.

---

## Slide 09 — Pickup code and live tracking

**Speaker:** Anirudh · **Time:** 45 sec · **On screen:** OR-0427 + five-step timeline

After payment, the student gets a unique pickup code — for example OR-0427. The order detail page is a live timeline: Placed, Accepted, Preparing, Ready, Collected. The student can see how long the order has been pending, gets an update when it is ready, or cancels before preparation begins — paid orders are refunded automatically. Nobody has to call the counter and ask when the order will be ready; the app already answers that. At pickup, staff type the code and the order is closed.

**Cue:** Point at the Ready step, then at the code chip.

---

## Slide 10 — Pickup windows — the differentiator

**Speaker:** Anirudh · **Time:** 45 sec · **On screen:** Slots instead of ASAP

The pickup window is our biggest differentiator. Most food apps promise ASAP. We promise a time. Break one is 10:45 to 11:15 with thirty orders, lunch is one to two with forty, break two has thirty and the evening window has twenty-five. The café sets these numbers and can hide a slot when it is full. That means the kitchen knows the load in advance, and the student knows exactly when to walk in. This is the difference between a queue and a schedule.

**Cue:** Compare the four rows on the left with the live slot picker on the right.

---

## Slide 11 — Café dashboard

**Speaker:** Anirudh · **Time:** 40 sec · **On screen:** Realtime queue, accept, verify, pause

This is the café side. Orders arrive in real time over Socket.IO — no refresh. The staff moves each order through Accept, Preparing, Ready. When the student arrives, staff type the pickup code and the order is marked Collected. If the kitchen is overloaded, the café can pause orders, and students see that instantly. Cancelling a paid order creates an automatic refund entry in the ledger. The whole counter runs from one screen.

**Cue:** Tap through Accept and Preparing on the dashboard if you are demoing live.

---

## Slide 12 — Menu, slots and admin operations

**Speaker:** Anirudh · **Time:** 35 sec · **On screen:** Owner control without a developer

Behind that one screen is the full operations kit: a menu manager for categories, items, photos, options and availability; a pickup window manager for creating slots and setting capacity; and an admin console for orders, revenue, users, refunds and the audit log. The owner does not need a developer to change the menu or pause a slot — they just click. That is what makes this deployable in a real cafeteria, not just a college demo.

**Cue:** Move quickly here; the dashboard slide already carried the main idea.

---

## Slide 13 — Under the hood — tech stack

**Speaker:** Anirudh · **Time:** 40 sec · **On screen:** React, Node, SQLite, Socket.IO, Razorpay

A quick look under the hood. The front end is React 18 with Vite and Tailwind — three role-based interfaces: student, café and admin. The API is Node 22, Express and TypeScript, with Zod validation and a JWT in an httpOnly cookie. Data is SQLite with multi-tenant tables; realtime is Socket.IO with a polling fallback for weak campus Wi-Fi; and payments go through Razorpay with signature verification and auto-refund. We also have thirty integration tests covering orders, payments and permissions.

**Cue:** Keep this to forty seconds — the judges only need the shape of the system.

---

## Slide 14 — Live demo

**Speaker:** Anirudh · **Time:** 90 sec · **On screen:** Open both tabs before you start

Now let me show you the actual product. [open http://localhost:5173] This is the student home — it shows the outlet and whether it is accepting orders. I open the menu, add a cold coffee and a cheese garlic bread, go to the cart, choose the lunch pickup window, and check out. [complete the test payment — Razorpay test mode or sandbox] Here is the pickup code — OR-0427 style — with the live timeline. [switch to the staff dashboard in a second tab] On the café side, the same order appears instantly without a refresh. I accept it, mark it preparing, then ready. [back to the student tab] The student timeline updates live. At the counter, staff enter the code, and the order becomes Collected. That is the complete loop in under two minutes. If the network misbehaves, the screenshots in this deck are the backup.

**Cue:** Student login: student@mdu.test / Student@12345.  Staff login: owner@ordrix.test / Owner@12345.  Keep both tabs open before you start.

---

## Slide 15 — Impact

**Speaker:** Tushar · **Time:** 55 sec · **On screen:** Student, cafeteria, campus + before/after

Thank you, Anirudh. So what does this change? For the student, the break becomes usable again — order from class, collect in seconds, eat peacefully. For the cafeteria, the peak load is visible before it hits: they know how many orders are coming in each window, so they can plan staff and stock, and they stop losing students who see the queue and walk away. For the campus, counters become less crowded and the whole experience feels digital. The numbers on screen are our current configuration and design targets — five minutes to order, zero minutes in queue, up to 125 orders a day per outlet across four windows, and every order tracked live.

**Cue:** Slow down on the before/after strip, then move to the roadmap.

---

## Slide 16 — Roadmap

**Speaker:** Tushar · **Time:** 45 sec · **On screen:** 1 / 3 / 6 month plan

Our roadmap has three phases. In one month, we want three more cafeterias inside the MDU campus. In three months, a multi-campus rollout with peak-hour analytics for owners — which items sell out, which slots fill first, where the kitchen is slow. In six months, smarter order-time prediction and more campus services in the same app — library, printing, stationery. The vision is simple: every campus service should be one tap away, without a line.

**Cue:** Point at the three phase cards, then at the expansion chips.

---

## Slide 17 — Thank you and Q&A

**Speaker:** Tushar · **Time:** 35 sec · **On screen:** Close on the 10-minute break

To close — we are not trying to build another food delivery app. We are fixing a very specific, everyday problem: the ten-minute break. Our platform works end to end today: live menu, online payment, pickup windows, pickup code, a realtime café dashboard and refunds. We would love your feedback, and if there is a cafeteria on this campus that wants to pilot it, we are ready. Thank you — and we are happy to take questions.

**Cue:** Pause, look at the judges, invite questions. Deliver the closing line, then stop.

---

## Numbers to remember

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

1. Start the stack: `npm run dev:server` and `npm run dev:web` inside `E:\ORDRIX`.
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
