# Campus Online Ordering System — Speaker Notes

**Team ORDRIX · Sagar · Anirudh · Tushar**  
**ORDRIX · Maharshi Dayanand University, Rohtak**

Each slide has the same script in two versions: **English** (say it as written) and **Hinglish** (same point, natural spoken style). Pick one per slide — do not read both.

> Tip: the same notes are inside the PPTX. Presenter View will show them on your laptop while the audience sees only the slide.

## Run sheet

| # | Slide | Speaker | Time | Purpose |
|---|-------|---------|------|---------|
| 01 | Opening & title slide | Sagar | 45 sec | Opening + team intro + one-line pitch |
| 02 | The problem — 10-minute break, 15-minute queue | Sagar | 55 sec | The three numbers and the daily pain |
| 03 | Who it hurts — student and café | Sagar | 45 sec | Two-sided loss, nobody at fault |
| 04 | Why Zomato / Swiggy can't fix it | Sagar | 45 sec | Delivery-first vs pickup-first |
| 05 | The solution — pre-order, pay, pick up | Sagar | 40 sec | Three pillars + hand-off to Anirudh |
| 06 | Student journey — 5 steps | Anirudh | 60 sec | Browse → cart → slot → pay → collect |
| 07 | Live menu and cart | Anirudh | 45 sec | 74 items, options, veg labels, prep time |
| 08 | Checkout and payment | Anirudh | 45 sec | Pickup window, notes, Razorpay, server total |
| 09 | Pickup code and live tracking | Anirudh | 45 sec | OR-0427 + 5-step timeline |
| 10 | Pickup windows — the differentiator | Anirudh | 40 sec | Slots instead of ASAP |
| 11 | Café dashboard | Anirudh | 40 sec | Realtime queue, accept, verify, pause |
| 12 | Menu, slots and admin operations | Anirudh | 35 sec | Owner control without a developer |
| 13 | Under the hood — tech stack | Anirudh | 40 sec | React, Node, SQLite, Socket.IO, Razorpay |
| 14 | Live demo | Anirudh | 90 sec | Open both tabs before you start |
| 15 | Impact | Tushar | 55 sec | Student, cafeteria, campus + before/after |
| 16 | Roadmap | Tushar | 45 sec | 1 / 3 / 6 month plan |
| 17 | Thank you and Q&A | Tushar | 40 sec | Close on the 10-minute break |

**Total: ~13 minutes with the full demo.** For an 8-minute slot: skip slides 12 and 13, and cut the demo to 60 seconds (home → menu → cart → pay → code → dashboard).

**Hand-offs:** Sagar → Anirudh at the end of slide 5. Anirudh → Tushar after the demo (slide 14).

---

## Slide 01 — Opening & title slide

**Speaker:** Sagar · **Time:** 45 sec · **On screen:** Opening + team intro + one-line pitch

**English**

Good morning, respected judges. We are Team ORDRIX — Sagar, Anirudh and Tushar — and our project is the Campus Online Ordering System. Let me start with a question: how many of us have skipped lunch just because the canteen line was too long? [pause] That is exactly the problem we are solving. A student gets a ten or fifteen minute break. In that time they walk to the cafeteria, stand in a queue, order, wait for the food, and rush back to class. Our platform moves the ordering part into the classroom: browse the live menu, pay online, choose a pickup window, and collect the order with one pickup code. No queue, no guessing, no wasted break.

**Hinglish**

Good morning respected judges! Hum Team ORDRIX hain — Sagar, Anirudh aur Tushar — aur hamara project hai Campus Online Ordering System. Sabse pehle ek chhota sawaal: hum mein se kitne log sirf canteen ki lambi line ki wajah se lunch skip kar dete hain? [pause] Yahi problem hum solve kar rahe hain. College mein break sirf 10–15 minute ka hota hai. Utne mein canteen tak jao, line mein lago, order do, khaana banne ka wait karo, aur wapas class bhi pahuncho. Hamara platform ordering ko classroom mein le aata hai — live menu browse karo, online pay karo, pickup window chuno, aur ek pickup code se order collect karo. Na line, na confusion, na break ka waste.

**Cue:** Smile, hold the phone visual, then move to the problem slide.

---

## Slide 02 — The problem — 10-minute break, 15-minute queue

**Speaker:** Sagar · **Time:** 55 sec · **On screen:** The three numbers and the daily pain

**English**

Let us look at the numbers. A typical break is about ten minutes. In that same ten minutes, sixty to seventy students walk into the cafeteria — and there is one counter serving everyone. So the queue is not a bug, it is arithmetic. [pause] The result is predictable: the break ends before the order is ready, the student sits through the next class hungry, or simply walks away without ordering. For the cafeteria this is lost business too — students look at the line and leave. Nobody is lazy here and nobody is at fault; the process is the problem.

**Hinglish**

Ab numbers dekhiye. Break hai sirf 10 minute ka. Usi 10 minute mein 60–70 students canteen pahunch jaate hain — aur counter sirf ek hai. To line lag jaana koi bug nahi, simple arithmetic hai. [pause] Result predictable hai: break khatam ho jaata hai aur order abhi bhi pending, student aglee class mein bhookha baithta hai, ya order kiye bina hi wapas chala jaata hai. Canteen ke liye bhi yeh loss hai — students line dekh kar laut jaate hain. Yahan koi aalsi nahi hai, koi galti nahi kar raha; problem process ki hai.

**Cue:** Point at the three numbers, then the right-hand pain points.

---

## Slide 03 — Who it hurts — student and café

**Speaker:** Sagar · **Time:** 45 sec · **On screen:** Two-sided loss, nobody at fault

**English**

Two sides lose here. The student loses time, and sometimes the meal itself — they sit in the next class hungry. The cafeteria loses sales: students see the line and walk away, and at peak hours the staff is completely overwhelmed. Notice that neither side is doing anything wrong. The counter is working as fast as it can; the student is just hungry. The process is broken. That is why we did not build a faster queue — we removed the queue.

**Hinglish**

Yahan dono sides ka nuksaan hai. Student ka time jaata hai, aur kabhi kabhi khaana bhi — aglee class mein bhookha baithna padta hai. Canteen ki sales jaati hai: students line dekh kar laut jaate hain, aur peak time pe staff completely overwhelmed ho jaata hai. Dhyan dijiye — koi bhi galti nahi kar raha. Counter apni poori speed se kaam kar raha hai, student bas bhookha hai. Process toota hua hai. Isliye humne tez line nahi banayi — humne line hata di.

**Cue:** Pause on the last line. Next line: 'You might ask — why not Zomato or Swiggy?'

---

## Slide 04 — Why Zomato / Swiggy can't fix it

**Speaker:** Sagar · **Time:** 45 sec · **On screen:** Delivery-first vs pickup-first

**English**

You might ask: why not Zomato or Swiggy? Three reasons. One, they are delivery-first — their product is built to bring food home, not to hand it over at a campus counter in fifteen seconds. Two, they have no idea about your class timetable; every order is 'as soon as possible', which is exactly the wrong promise for a ten-minute break. Three, delivery fees — a thirty-rupee fee on a two-hundred-rupee student order makes no sense. Campus pickup is a different category and needs a different product. That is what we built. Anirudh will show you how it works.

**Hinglish**

Aap poochh sakte hain — Zomato ya Swiggy kyun nahi? Teen reasons. Ek, wo delivery-first hain: unka product khaana ghar pahunchane ke liye bana hai, campus counter pe 15 second mein handover ke liye nahi. Do, unhe aapke class timetable ka pata hi nahi — har order 'ASAP' hota hai, jo 10-minute break ke liye bilkul galat promise hai. Teen, delivery fee: ₹200 ke student order pe ₹30 fee ka koi logic nahi. Campus pickup ek alag category hai, iske liye alag product chahiye. Wahi humne banaya hai. Ab Anirudh aapko dikhayenge ki ye kaise kaam karta hai.

**Cue:** Turn to Anirudh. Anirudh: 'Thank you Sagar.'

---

## Slide 05 — The solution — pre-order, pay, pick up

**Speaker:** Sagar · **Time:** 40 sec · **On screen:** Three pillars + hand-off to Anirudh

**English**

Our solution has three parts. First, pickup windows: instead of 'ASAP', the student chooses a break-time slot, and every slot has a fixed capacity so the kitchen is never flooded. Second, one pickup code: every order gets a short code like OR-0427 — the student shows it at the counter and walks away in seconds. Third, a control room for the café: live orders, menu, slots, refunds and audit in a single dashboard. Same platform, both sides — speed for the student, control for the café.

**Hinglish**

Hamara solution teen parts mein hai. Pehla, pickup windows: 'ASAP' ki jagah student apne break ka slot chunta hai, aur har slot ki fixed capacity hoti hai taaki kitchen ek saath flood na ho. Doosra, ek pickup code: har order ko OR-0427 jaisa short code milta hai — student counter pe dikhata hai aur seconds mein nikal jaata hai. Teesra, café ke liye control room: live orders, menu, slots, refunds aur audit — sab ek hi dashboard mein. Same platform, dono sides: student ko speed, café ko control.

**Cue:** Hand over to Anirudh: 'Let me hand that over to Anirudh for the product walkthrough.'

---

## Slide 06 — Student journey — 5 steps

**Speaker:** Anirudh · **Time:** 60 sec · **On screen:** Browse → cart → slot → pay → collect

**English**

Thank you, Sagar. Let me walk you through the student journey — five steps, roughly five minutes. Step one, open the live menu from any browser. Step two, add items to the cart and customise them. Step three, choose a pickup window that fits your break. Step four, pay online. Step five, show the pickup code at the counter and collect. No app install, no phone call, no queue. On screen you can see the actual menu, checkout and tracking screens from our build — these are not mockups.

**Hinglish**

Thank you Sagar. Ab main student journey dikhata hoon — paanch steps, lagbhag paanch minute. Step one: kisi bhi browser se live menu kholo. Step two: items cart mein daalo aur customise karo. Step three: apne break ka pickup window chuno. Step four: online payment karo. Step five: counter pe pickup code dikhao aur order collect karo. Na app install, na phone call, na line. Screen pe aap hamare actual menu, checkout aur tracking screens dekh rahe hain — ye mockups nahi hain.

**Cue:** Advance to the menu slide while saying 'let me show you the menu'.

---

## Slide 07 — Live menu and cart

**Speaker:** Anirudh · **Time:** 45 sec · **On screen:** 74 items, options, veg labels, prep time

**English**

On the menu screen, students see 74 items across 16 categories — coffee, pizza, burgers, maggi, wraps. Prices are live, veg and non-veg are clearly marked, and every item carries a preparation time. Items can be customised — size, milk, extra cheese, toppings — and the price updates immediately. The cart is saved locally, so if a student gets pulled into a discussion between classes, the order is still there when they come back.

**Hinglish**

Menu screen pe students ko 74 items milte hain, 16 categories mein — coffee, pizza, burgers, maggi, wraps. Prices live hain, veg aur non-veg clearly marked hai, aur har item pe preparation time diya hai. Items customise ho sakte hain — size, milk, extra cheese, toppings — aur price turant update hota hai. Cart locally save rehta hai, to agar class ke beech koi distraction ho jaaye, wapas aane pe order wahin milega.

---

## Slide 08 — Checkout and payment

**Speaker:** Anirudh · **Time:** 45 sec · **On screen:** Pickup window, notes, Razorpay, server total

**English**

At checkout, the student picks a pickup window, adds a note like 'less spicy', and sees the full price breakup before paying — subtotal, tax and service fee. Payment goes through Razorpay: UPI, card or wallet. If the keys are not configured, the system falls back to a sandbox mode so the demo never breaks. And one important detail: the server recalculates the total. We never trust a price that comes from the browser.

**Hinglish**

Checkout pe student pickup window chunta hai, 'less spicy' jaisa note add karta hai, aur payment se pehle poora breakup dekhta hai — subtotal, tax aur service fee. Payment Razorpay se hota hai: UPI, card ya wallet. Agar keys configured na hon, system sandbox mode mein chala jaata hai taaki demo kabhi break na ho. Aur ek important detail: total server dobara calculate karta hai. Browser se aaya price hum trust nahi karte.

---

## Slide 09 — Pickup code and live tracking

**Speaker:** Anirudh · **Time:** 45 sec · **On screen:** OR-0427 + 5-step timeline

**English**

After payment, the student gets a unique pickup code — for example OR-0427. The order detail page is a live timeline: Placed, Accepted, Preparing, Ready, Collected. The student can see how long the order has been pending, gets an update when it is ready, or cancels before preparation begins — paid orders are refunded automatically. There is no need to call the counter and ask 'mera order kab ready hoga?' — the app already answers that. At pickup, the staff types this code, and the order is closed.

**Hinglish**

Payment ke baad student ko unique pickup code milta hai — jaise OR-0427. Order detail page ek live timeline hai: Placed, Accepted, Preparing, Ready, Collected. Student dekh sakta hai order kitni der se pending hai, ready hone pe update milta hai, ya preparation shuru hone se pehle cancel kar sakta hai — paid order auto refund ho jaata hai. Counter pe phone karke 'mera order kab ready hoga?' poochhne ki zaroorat nahi — app already bata raha hai. Pickup pe staff ye code daalta hai aur order close ho jaata hai.

---

## Slide 10 — Pickup windows — the differentiator

**Speaker:** Anirudh · **Time:** 40 sec · **On screen:** Slots instead of ASAP

**English**

The pickup window is our biggest differentiator. Most food apps promise 'ASAP'. We promise a time. Break one is 10:45 to 11:15 with thirty orders, lunch is 1 to 2 with forty, break two has thirty and evening has twenty-five. The café sets these numbers and can hide a slot when it is full. That means the kitchen knows the load in advance, and the student knows exactly when to walk in. This is the difference between a queue and a schedule.

**Hinglish**

Pickup window hamara sabse bada differentiator hai. Zyadatar food apps 'ASAP' promise karte hain. Hum ek time promise karte hain. Break one 10:45–11:15, 30 orders; lunch 1–2, 40 orders; break two 30; evening 25. Café ye numbers set karta hai aur slot full hone pe hide kar sakta hai. Matlab kitchen ko load pehle se pata hai, aur student ko exactly pata hai kab aana hai. Queue aur schedule mein yahi difference hai.

---

## Slide 11 — Café dashboard

**Speaker:** Anirudh · **Time:** 40 sec · **On screen:** Realtime queue, accept, verify, pause

**English**

This is the café side. Orders arrive in real time over Socket.IO — no refresh. The staff moves each order through Accept, Preparing, Ready. When the student arrives, the staff types the pickup code and the order is marked Collected. If the kitchen is overloaded, the café can pause orders, and students see that instantly. Cancellations of paid orders create an automatic refund entry in the ledger. The whole counter runs from one screen.

**Hinglish**

Ye hai café side. Orders Socket.IO se real time mein aate hain — koi refresh nahi. Staff har order ko Accept, Preparing, Ready se aage badhata hai. Student aaye to staff pickup code daalta hai aur order Collected mark ho jaata hai. Kitchen overloaded ho to café orders pause kar sakta hai, aur students ko turant dikh jaata hai. Paid order cancel hone pe ledger mein automatic refund entry ban jaati hai. Poora counter ek hi screen se chalta hai.

---

## Slide 12 — Menu, slots and admin operations

**Speaker:** Anirudh · **Time:** 35 sec · **On screen:** Owner control without a developer

**English**

Behind that one screen is the full operations kit: a menu manager for categories, items, photos, options and availability; a pickup window manager for creating slots and setting capacity; and an admin console for orders, revenue, users, refunds and the audit log. The owner does not need a developer to change the menu or pause a slot — they just click. That is what makes this deployable in a real cafeteria, not just a college demo.

**Hinglish**

Us ek screen ke peeche poora operations kit hai: menu manager — categories, items, photos, options aur availability; pickup window manager — slots banao aur capacity set karo; aur admin console — orders, revenue, users, refunds aur audit log. Menu badalne ya slot pause karne ke liye owner ko developer ki zaroorat nahi — bas click. Isi wajah se ye real cafeteria mein deploy ho sakta hai, sirf college demo nahi.

---

## Slide 13 — Under the hood — tech stack

**Speaker:** Anirudh · **Time:** 40 sec · **On screen:** React, Node, SQLite, Socket.IO, Razorpay

**English**

A quick look under the hood. The front end is React 18 with Vite and Tailwind — three role-based interfaces: student, café and admin. The API is Node 22, Express and TypeScript, with Zod validation and a JWT in an httpOnly cookie. Data is SQLite with multi-tenant tables, realtime is Socket.IO with a polling fallback for weak campus Wi-Fi, and payments are Razorpay with signature verification and auto-refund. We also have thirty integration tests covering orders, payments and permissions.

**Hinglish**

Ab thoda technical side. Front end React 18 + Vite + Tailwind hai — teen role-based interfaces: student, café aur admin. API Node 22, Express aur TypeScript pe hai, Zod validation aur httpOnly cookie mein JWT ke saath. Data SQLite mein multi-tenant tables ke saath, realtime Socket.IO se with polling fallback for weak campus Wi-Fi, aur payments Razorpay — signature verification aur auto-refund ke saath. Orders, payments aur permissions ke liye 30 integration tests bhi hain.

---

## Slide 14 — Live demo

**Speaker:** Anirudh · **Time:** 90 sec · **On screen:** Open both tabs before you start

**English**

Now let me show you the actual product. [open http://localhost:5173] This is the student home — it shows the outlet and whether it is accepting orders. I open the menu, add a cold coffee and a cheese garlic bread, go to the cart, choose the lunch pickup window, and check out. [complete the test payment — Razorpay test mode or sandbox] Here is the pickup code — OR-0427 style — with the live timeline. [switch to the staff dashboard in a second tab] On the café side, the same order appears instantly without a refresh. I accept it, mark it preparing, then ready. [back to the student tab] The student timeline updates live. At the counter, staff enters the code, and the order becomes Collected. That is the complete loop in under two minutes. If the network misbehaves, the screenshots in this deck are the backup.

**Hinglish**

Ab main actual product dikhata hoon. [localhost:5173 kholo] Ye student home hai — outlet aur 'accepting orders' status dikh raha hai. Menu kholta hoon, cold coffee aur cheese garlic bread add karta hoon, cart mein jaata hoon, lunch pickup window chunta hoon, aur checkout karta hoon. [test payment complete karo — Razorpay test mode ya sandbox] Ye hai pickup code — OR-0427 format — live timeline ke saath. [doosre tab mein staff dashboard kholo] Café side pe wahi order turant aa jaata hai, bina refresh. Accept, preparing, ready. [student tab] Student ka timeline live update ho jaata hai. Counter pe staff code daalta hai, order Collected ho jaata hai. Poora loop do minute se kam mein. Agar network gadbad kare to deck ke screenshots backup hain.

**Cue:** Student login: student@mdu.test / Student@12345.  Staff login: owner@ordrix.test / Owner@12345.  Keep both tabs open before you start.

---

## Slide 15 — Impact

**Speaker:** Tushar · **Time:** 55 sec · **On screen:** Student, cafeteria, campus + before/after

**English**

Thank you, Anirudh. So what does this change? For the student, the break becomes usable again — order from class, collect in seconds, eat peacefully. For the cafeteria, the peak load is visible before it hits: they know how many orders are coming in each window, so they can plan staff and stock, and they stop losing students who see the queue and walk away. For the campus, counters become less crowded and the whole experience feels digital. The numbers on screen are our current configuration and design targets — five minutes to order, zero minutes in queue, up to 125 orders a day per outlet across four windows, and every order tracked live.

**Hinglish**

Thank you Anirudh. To kya badalta hai? Student ke liye break dobara usable ho jaata hai — class se order, seconds mein collect, aaram se khaana. Cafeteria ke liye peak load aane se pehle dikh jaata hai: har window mein kitne orders aa rahe hain pata hai, to staff aur stock plan ho jaata hai, aur jo students line dekh kar laut jaate the wo business bhi bachta hai. Campus ke liye counters kam crowded, experience digital. Screen pe jo numbers hain wo hamari current configuration aur design targets hain — paanch minute mein order, zero minute queue, per outlet char windows mein 125 orders per day tak, aur har order live tracked.

**Cue:** Slow down on the before/after strip. Then move to the roadmap.

---

## Slide 16 — Roadmap

**Speaker:** Tushar · **Time:** 45 sec · **On screen:** 1 / 3 / 6 month plan

**English**

Our roadmap has three phases. In one month, we want three more cafeterias inside the MDU campus. In three months, a multi-campus rollout with peak-hour analytics for owners — which items sell out, which slots fill first, where the kitchen is slow. In six months, smarter order-time prediction and more campus services in the same app — library, printing, stationery. The vision is simple: every campus service should be one tap away, without a line.

**Hinglish**

Hamara roadmap teen phases mein hai. Ek mahine mein MDU campus ke andar teen aur cafeterias. Teen mahine mein multi-campus rollout aur owners ke liye peak-hour analytics — kaun sa item jaldi khatam hota hai, kaun sa slot pehle full hota hai, kitchen kahan slow hai. Chhe mahine mein smarter order-time prediction aur usi app mein aur campus services — library, printing, stationery. Vision simple hai: campus ki har service ek tap door, bina line ke.

---

## Slide 17 — Thank you and Q&A

**Speaker:** Tushar · **Time:** 40 sec · **On screen:** Close on the 10-minute break

**English**

To close — we are not trying to build another food delivery app. We are fixing a very specific, everyday problem: the ten-minute break. Our platform works end to end today: live menu, online payment, pickup windows, pickup code, a realtime café dashboard and refunds. We would love your feedback, and if there is a cafeteria on this campus that wants to pilot it, we are ready. Thank you — and we are happy to take questions.

**Hinglish**

Closing mein — hum ek aur food delivery app nahi bana rahe. Hum ek bahut specific, roz-marra ki problem fix kar rahe hain: 10-minute ka break. Hamara platform aaj end to end chalta hai: live menu, online payment, pickup windows, pickup code, realtime café dashboard aur refunds. Aapka feedback chahiye, aur agar is campus pe koi cafeteria pilot karna chahti hai to hum taiyar hain. Thank you — aur questions welcome hain.

**Cue:** Pause, look at the judges, invite questions. Do not read the closing line — deliver it, then stop.

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
4. Checkout → choose Lunch window, add a note, show the price breakup.
5. Pay in sandbox → land on the order page with the pickup code.
6. Switch to the staff tab → the same order appears without refresh.
7. Accept → Preparing → Ready.
8. Switch back → student timeline has updated live.
9. Staff enters the pickup code → order becomes Collected.

**If something breaks:** stay calm, say "let me show you the same flow in the screenshots", and use slide 14. Never debug live for more than ten seconds.

---

## Likely judge questions — quick answers

**1. How is this different from Zomato or Swiggy?**
They are delivery-first. We are pickup-first and campus-specific: fixed pickup windows tied to class breaks, capacity per window, and one code at the counter. On a ₹200 student order, a delivery fee makes no sense — we do not have one.
*Hinglish:* Wo delivery-first hain, hum pickup-first. Hamare paas class break ke hisaab se slots, capacity aur counter pe ek code hai. ₹200 ke order pe delivery fee ka koi logic nahi.

**2. Is this actually running, or only a design?**
It is a working product: live menu, online payment, pickup windows, pickup code, realtime café dashboard and refunds. Two outlets are configured (UIET and IMSAR). The data in the demo is seed data, so we present it honestly as a working prototype, not as customer traction.
*Hinglish:* Ye chal raha hai — menu, payment, slots, code, dashboard aur refunds sab. Do outlets configured hain. Demo ka data seed data hai, to hum ise working prototype bolte hain, fake traction nahi.

**3. What if the student's break time changes?**
The student can cancel before preparation starts. Paid orders are refunded automatically. If the café has not accepted yet, they can simply pick a different window after cancelling.
*Hinglish:* Preparation shuru hone se pehle cancel kar sakte hain, paid order auto refund. Café ne accept nahi kiya to naya window bhi choose kar sakte hain.

**4. How do you stop fake orders or no-shows?**
Orders are prepaid. That alone removes most no-shows. On top of that, every window has a capacity limit, and staff can reject or cancel an order with an audit entry.
*Hinglish:* Order prepaid hai, isliye no-show ka risk kam. Upar se har window ki capacity fixed hai, aur staff reject/cancel kar sakta hai — audit entry ke saath.

**5. Is the payment secure?**
Razorpay handles the payment. We verify the signature on the server, never trust the browser's total, and recalculate the amount server-side. In development, a sandbox fallback keeps the flow testable without real money.
*Hinglish:* Payment Razorpay karta hai. Signature server pe verify hoti hai, browser ka total trust nahi karte, amount server dobara calculate karta hai. Development mein sandbox fallback hai.

**6. What happens when the kitchen is overloaded?**
The café can pause new orders or hide a pickup slot. Students see it instantly, so nobody places an order that cannot be made in time. The window capacity is the main control.
*Hinglish:* Café orders pause kar sakta hai ya slot hide kar sakta hai. Student ko turant dikhta hai, to aisa order nahi jaata jo time pe ban na sake. Capacity hi main control hai.

**7. How will you onboard cafeterias? What is the business model?**
Start with the campus we are in: one café, prove the pickup flow, then expand to the other outlets. The model we are exploring is a flat monthly subscription per café instead of commission — predictable for the café and simple for us.
*Hinglish:* Pehle apne campus se shuru — ek café, flow prove karo, phir baaki outlets. Model flat monthly subscription hai, commission nahi — café ke liye predictable, humare liye simple.

**8. What is the biggest technical challenge?**
Keeping the counter and the student in sync in real time. We use Socket.IO with an 8-second polling fallback for weak campus Wi-Fi, and the server is the single source of truth for order status and money.
*Hinglish:* Counter aur student ko real time sync mein rakhna. Socket.IO use karte hain, weak Wi-Fi ke liye 8-second polling fallback, aur order status aur paise ka single source of truth server hai.

**9. How does this scale to other colleges?**
The data model is already multi-tenant — cafés, menus, slots and orders are separated by café. Adding a campus is configuration plus onboarding, not a rewrite.
*Hinglish:* Data model multi-tenant hai — café, menu, slots aur orders café ke hisaab se separate hain. Naya campus add karna configuration aur onboarding hai, rewrite nahi.

**10. What is the one thing you would fix next?**
Order-time prediction. Right now the pickup window is a promise; next we want the ETA inside the window to be accurate based on live kitchen load.
*Hinglish:* Order-time prediction. Abhi pickup window ek promise hai; aage hum chahte hain ki live kitchen load ke hisaab se ETA bhi accurate ho.

---

## Delivery tips

- **Numbers, not adjectives.** Say "60–70 students, one counter", not "very crowded".
- **Pause after the opening question.** Let the judges think for a second.
- **Do not read the slides.** The slides carry keywords; the story comes from you.
- **One demo, one loop.** Home → pay → code → café dashboard → collected. Do not wander.
- **Own the limits.** If asked about real customers, say "working prototype, two outlets configured". Honesty scores better than inflated numbers.
- **Close and stop.** After "Break ka matlab coffee hona chahiye — line nahi", pause and invite questions. Do not fill the silence.
