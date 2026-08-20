// Generated from the published guide. Static, author-written markup — no user input.
export const CASHIER_GUIDE_HTML = `<nav class="bar">
  <div class="bar-in">
    <span class="bar-name">Cashier Floor Guide</span>
    <a href="#access">Access</a>
    <a href="#flow">Counter flow</a>
    <a href="#pos">POS screen</a>
    <a href="#pay">Payment</a>
    <a href="#pickup">Pickup</a>
    <a href="#return">Return</a>
    <a href="#other">Other jobs</a>
    <a href="#rhythm">Your day</a>
    <a href="#care">Watch out</a>
    <a href="#ref">Cheat sheet</a>
  </div>
</nav>

<div class="guide-main">

<header class="mast">
  <span class="eyebrow">SuitLabs · Staff role</span>
  <h1>Cashier Floor Guide</h1>
  <p class="lede">Everything a cashier does at the counter — take a booking, hand over the suit, take it back, and close the day clean. Read it once end to end, then keep the cheat sheet at the bottom.</p>
</header>

<section id="access">
  <span class="eyebrow">01 — Your account</span>
  <h2>What you can do, and what you can't</h2>
  <p class="measure">Your login has the <b>Staff</b> role. Staff runs the shop floor. Admin runs the books. The system enforces this — pages you cannot open simply do not appear in your menu.</p>

  <div class="cols two">
    <div class="card">
      <h4 style="margin-top:0">You can</h4>
      <ul class="plain" style="margin-bottom:0">
        <li><b>Cashier</b> — the POS. Your main screen.</li>
        <li><b>Dashboard</b> — today's counts: items, bookings, active rentals, low stock, maintenance.</li>
        <li><b>Bookings</b> — see, edit, invoice, collect the balance.</li>
        <li><b>Rentals</b> — pick up, change dates, complete, cancel.</li>
        <li><b>Sales</b> — walk-in retail, add-ons, replacement fees.</li>
        <li><b>Expenses</b> — record money you pay out of the drawer.</li>
        <li><b>Items</b> — check availability, transfer between shops, edit details.</li>
        <li><b>Customers, Package Pricing, Discounts, Categories</b>.</li>
      </ul>
    </div>
    <div class="card">
      <h4 style="margin-top:0">You cannot</h4>
      <ul class="plain" style="margin-bottom:0">
        <li><b>See the buying price</b> of any item. The server removes it from your screen before it is sent. If a customer asks what the shop paid, you genuinely do not know.</li>
        <li><b>Open Analytics, Financial Report, Assets, Users, Branches, or Bulk Input Sync.</b></li>
        <li><b>See the money side of the Dashboard.</b> Revenue, net profit, cash on hand and assets only appear for an admin login.</li>
        <li><b>Lock or unlock a month.</b></li>
        <li><b>Switch to another shop for bookings or sales.</b> Your write shop stays the one you are assigned to. You can still open Items across shops and Transfer stock.</li>
      </ul>
    </div>
  </div>

  <div class="flag stop">
    <span class="flag-t">Before your first transaction, every shift</span>
    <p>Look at the shop name in the top bar. That selector does two things: it filters what you see, <b>and it decides which shop's books your next booking, sale, or expense is written to.</b> Charging a Nusa Dua customer while the bar says Jimbaran puts the money in the wrong shop's P&amp;L, and only an admin can move it.</p>
  </div>
</section>

<section id="flow">
  <span class="eyebrow">02 — The whole job in one picture</span>
  <h2>The counter flow</h2>
  <p class="measure">A rental is not one record. It is a <b>Booking</b> (the agreement and the money) plus a <b>Rental</b> (the physical hand-over). Charging at the POS creates <b>both at once</b> — the rental is created for you, sitting on <code>pending</code>. Your job on collection day is to tap <b>Pickup</b> on it.</p>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 400" role="img" aria-label="Counter flow: the cashier POS creates a booking and a pending rental together, the Rentals page hands the suit over at pickup, and completing the rental settles late fees, damage and lost items.">
        <defs>
          <marker id="cf-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <!-- lane labels -->
        <text x="12" y="40" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">DAY 0 · BOOK</text>
        <text x="12" y="168" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">DAY 1 · PICK UP</text>
        <text x="12" y="296" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">DAY N · RETURN</text>
        <line x1="12" y1="52" x2="928" y2="52" stroke="currentColor" opacity=".12"/>
        <line x1="12" y1="180" x2="928" y2="180" stroke="currentColor" opacity=".12"/>
        <line x1="12" y1="308" x2="928" y2="308" stroke="currentColor" opacity=".12"/>

        <!-- row 1 -->
        <rect x="12" y="66" width="150" height="56" rx="3" fill="none" stroke="currentColor" opacity=".55"/>
        <text x="87" y="90" text-anchor="middle" font-size="13" fill="currentColor">Customer</text>
        <text x="87" y="107" text-anchor="middle" font-size="13" fill="currentColor">walks in</text>

        <line x1="162" y1="94" x2="222" y2="94" stroke="currentColor" marker-end="url(#cf-a)"/>

        <rect x="228" y="66" width="182" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="319" y="90" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Cashier POS</text>
        <text x="319" y="107" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">Rental mode · ticket</text>

        <line x1="410" y1="94" x2="470" y2="94" stroke="currentColor" marker-end="url(#cf-a)"/>
        <text x="440" y="86" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">charge</text>

        <rect x="476" y="66" width="182" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="567" y="88" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">BOOKING created</text>
        <text x="567" y="105" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">+ RENTAL · pending</text>

        <line x1="658" y1="94" x2="718" y2="94" stroke="currentColor" marker-end="url(#cf-a)"/>

        <rect x="724" y="66" width="204" height="56" rx="3" fill="none" stroke="currentColor" opacity=".55"/>
        <text x="826" y="90" text-anchor="middle" font-size="13" fill="currentColor">Print DP invoice,</text>
        <text x="826" y="107" text-anchor="middle" font-size="13" fill="currentColor">customer leaves</text>

        <!-- drop to row 2 -->
        <path d="M 567 122 L 567 150 L 319 150 L 319 190" fill="none" stroke="currentColor" marker-end="url(#cf-a)"/>
        <text x="443" y="143" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">the pending rental waits until collection day</text>

        <!-- row 2 -->
        <rect x="228" y="194" width="182" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="319" y="218" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Rentals · pending</text>
        <text x="319" y="235" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">it is already listed</text>

        <line x1="410" y1="222" x2="470" y2="222" stroke="currentColor" marker-end="url(#cf-a)"/>

        <rect x="476" y="194" width="182" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="567" y="218" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Tap Pickup</text>
        <text x="567" y="235" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">ID photo · required</text>

        <line x1="658" y1="222" x2="718" y2="222" stroke="currentColor" marker-end="url(#cf-a)"/>

        <rect x="724" y="194" width="204" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="826" y="215" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">RENTAL · active</text>
        <text x="826" y="233" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">suit is with the customer</text>

        <!-- drop to row 3 -->
        <path d="M 826 250 L 826 278 L 319 278 L 319 318" fill="none" stroke="currentColor" marker-end="url(#cf-a)"/>
        <text x="572" y="271" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">suit is out with the customer · overnight job flags it overdue past the return date</text>

        <!-- row 3 -->
        <rect x="228" y="322" width="182" height="56" rx="3" fill="none" stroke="currentColor" opacity=".55"/>
        <text x="319" y="346" text-anchor="middle" font-size="13" fill="currentColor">Customer returns</text>
        <text x="319" y="363" text-anchor="middle" font-size="13" fill="currentColor">the items</text>

        <line x1="410" y1="350" x2="470" y2="350" stroke="currentColor" marker-end="url(#cf-a)"/>
        <text x="440" y="342" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">check</text>

        <rect x="476" y="322" width="182" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="567" y="343" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Lost / add-on?</text>
        <text x="567" y="361" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">sell it FIRST</text>

        <line x1="658" y1="350" x2="718" y2="350" stroke="currentColor" marker-end="url(#cf-a)"/>

        <rect x="724" y="322" width="204" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="826" y="343" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Complete Rental</text>
        <text x="826" y="361" text-anchor="middle" font-size="12" fill="currentColor" opacity=".7">damage + late fee settled</text>
      </svg>
    </div>
    <figcaption><b>One customer, three visits, two records.</b> Charging at the POS writes both the Booking and its Rental. The Booking holds the agreement and the money; the Rental holds the ID photo, the late fee and the damage charge — and stays on <code>pending</code> until you hand the suit over.</figcaption>
  </figure>

  <div class="flag care">
    <span class="flag-t">The single most common mistake</span>
    <p>Charging is not handing over. The rental appears on the Rentals page the moment you charge, but it reads <code>pending</code> — the suit is still on the rack and no ID photo has been taken. Nothing is out with a customer until someone taps <b>Pickup</b>. Use <b>New Rental</b> only for an old booking made before this was automatic and that still has no rental of its own.</p>
  </div>
</section>

<section id="pos">
  <span class="eyebrow">03 — Your main screen</span>
  <h2>The Cashier POS</h2>
  <p class="measure">Built for a tablet held in two hands. Everything on the left is choosing what the customer takes; everything on the right is what they pay.</p>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 470" role="img" aria-label="Labelled layout of the Cashier POS screen: mode tabs, search and scan, date range, type filter and catalogue on the left; the ticket panel with customer, guarantee, occasion, payment and charge button on the right.">
        <defs>
          <marker id="pos-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <!-- device frame -->
        <rect x="180" y="20" width="580" height="430" rx="8" fill="none" stroke="currentColor" stroke-width="2"/>
        <line x1="562" y1="20" x2="562" y2="450" stroke="currentColor" opacity=".35"/>

        <!-- mode tabs -->
        <rect x="196" y="36" width="170" height="30" rx="4" fill="currentColor" opacity=".85"/>
        <text x="281" y="56" text-anchor="middle" font-size="12" font-weight="700" fill="var(--surface)">RENTAL</text>
        <rect x="374" y="36" width="172" height="30" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="460" y="56" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor" opacity=".65">SALE</text>

        <!-- search + scan -->
        <rect x="196" y="76" width="308" height="30" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="208" y="96" font-size="12" fill="currentColor" opacity=".6">Find suit, size, colour, code…</text>
        <rect x="514" y="76" width="32" height="30" rx="4" fill="currentColor" opacity=".85"/>
        <text x="530" y="96" text-anchor="middle" font-size="13" fill="var(--surface)">▣</text>

        <!-- dates -->
        <rect x="196" y="116" width="170" height="30" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="208" y="136" font-size="12" fill="currentColor" opacity=".8">Rental date</text>
        <rect x="376" y="116" width="170" height="30" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="388" y="136" font-size="12" fill="currentColor" opacity=".8">Return date</text>

        <!-- type filter -->
        <rect x="196" y="154" width="350" height="26" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="208" y="171" font-size="11" fill="currentColor" opacity=".7">All types</text>
        <text x="534" y="171" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">▾</text>

        <!-- catalogue tiles -->
        <rect x="196" y="192" width="110" height="118" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <rect x="316" y="192" width="110" height="118" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <rect x="436" y="192" width="110" height="118" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <rect x="196" y="320" width="110" height="118" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <rect x="316" y="320" width="110" height="118" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <rect x="436" y="320" width="110" height="118" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="371" y="258" text-anchor="middle" font-size="12" fill="currentColor" opacity=".55">tap a tile to add it</text>

        <!-- ticket panel -->
        <text x="578" y="52" font-size="12" font-weight="700" fill="currentColor">Ticket</text>
        <rect x="578" y="62" width="168" height="46" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="590" y="80" font-size="11" fill="currentColor" opacity=".75">Navy 3-piece ×1</text>
        <text x="590" y="98" font-size="11" fill="currentColor" opacity=".75">Black oxford ×1</text>

        <rect x="578" y="118" width="168" height="26" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="590" y="136" font-size="11" fill="currentColor" opacity=".75">Customer · required</text>

        <rect x="578" y="150" width="168" height="24" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="590" y="167" font-size="11" fill="currentColor" opacity=".75">Guarantee · KTP</text>

        <rect x="578" y="180" width="168" height="24" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="590" y="197" font-size="11" fill="currentColor" opacity=".75">Occasion · required</text>

        <rect x="578" y="210" width="80" height="26" rx="4" fill="currentColor" opacity=".85"/>
        <text x="618" y="228" text-anchor="middle" font-size="11" font-weight="700" fill="var(--surface)">DP</text>
        <rect x="666" y="210" width="80" height="26" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="706" y="228" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">FULL</text>

        <rect x="578" y="242" width="30" height="28" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <rect x="613" y="242" width="30" height="28" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <rect x="648" y="242" width="30" height="28" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <rect x="683" y="242" width="30" height="28" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <rect x="718" y="242" width="28" height="28" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="662" y="286" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">cash · qris · transfer · debit · card</text>

        <rect x="578" y="294" width="168" height="26" rx="4" fill="none" stroke="currentColor" opacity=".45"/>
        <text x="590" y="312" font-size="11" fill="currentColor" opacity=".75">Down payment amount</text>

        <line x1="578" y1="340" x2="746" y2="340" stroke="currentColor" opacity=".3"/>
        <text x="578" y="360" font-size="11" fill="currentColor" opacity=".7">Subtotal</text>
        <text x="746" y="360" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">Rp 1.200.000</text>
        <text x="578" y="378" font-size="11" fill="currentColor" opacity=".7">Remaining</text>
        <text x="746" y="378" text-anchor="end" font-size="11" fill="currentColor" opacity=".7">Rp 700.000</text>
        <rect x="578" y="392" width="168" height="34" rx="4" fill="currentColor" opacity=".85"/>
        <text x="662" y="414" text-anchor="middle" font-size="12" font-weight="700" fill="var(--surface)">Charge booking</text>

        <!-- callouts left -->
        <line x1="120" y1="51" x2="192" y2="51" stroke="currentColor" opacity=".6" marker-end="url(#pos-a)"/>
        <text x="114" y="48" text-anchor="end" font-size="11" font-weight="600" fill="currentColor">Rental or Sale</text>
        <text x="114" y="63" text-anchor="end" font-size="10" fill="currentColor" opacity=".6">switching clears the ticket</text>

        <line x1="120" y1="91" x2="192" y2="91" stroke="currentColor" opacity=".6" marker-end="url(#pos-a)"/>
        <text x="114" y="88" text-anchor="end" font-size="11" font-weight="600" fill="currentColor">Search or scan</text>
        <text x="114" y="103" text-anchor="end" font-size="10" fill="currentColor" opacity=".6">item barcode → ticket · invoice → booking</text>

        <line x1="120" y1="131" x2="192" y2="131" stroke="currentColor" opacity=".6" marker-end="url(#pos-a)"/>
        <text x="114" y="128" text-anchor="end" font-size="11" font-weight="600" fill="currentColor">Set BOTH dates first</text>
        <text x="114" y="143" text-anchor="end" font-size="10" fill="currentColor" opacity=".6">then the grid hides booked items</text>

        <line x1="120" y1="167" x2="192" y2="167" stroke="currentColor" opacity=".6" marker-end="url(#pos-a)"/>
        <text x="114" y="164" text-anchor="end" font-size="11" font-weight="600" fill="currentColor">Type filter</text>
        <text x="114" y="179" text-anchor="end" font-size="10" fill="currentColor" opacity=".6">one dropdown, all item types</text>

        <line x1="120" y1="251" x2="192" y2="251" stroke="currentColor" opacity=".6" marker-end="url(#pos-a)"/>
        <text x="114" y="248" text-anchor="end" font-size="11" font-weight="600" fill="currentColor">Catalogue</text>
        <text x="114" y="263" text-anchor="end" font-size="10" fill="currentColor" opacity=".6">scrolls, loads more as you go</text>

        <!-- callouts right -->
        <line x1="820" y1="131" x2="752" y2="131" stroke="currentColor" opacity=".6" marker-end="url(#pos-a)"/>
        <text x="826" y="128" font-size="11" font-weight="600" fill="currentColor">No customer, no rental</text>
        <text x="826" y="143" font-size="10" fill="currentColor" opacity=".6">"New" needs name and phone</text>

        <line x1="820" y1="192" x2="752" y2="192" stroke="currentColor" opacity=".6" marker-end="url(#pos-a)"/>
        <text x="826" y="189" font-size="11" font-weight="600" fill="currentColor">Occasion is required</text>
        <text x="826" y="204" font-size="10" fill="currentColor" opacity=".6">it will not charge without one</text>

        <line x1="820" y1="223" x2="752" y2="223" stroke="currentColor" opacity=".6" marker-end="url(#pos-a)"/>
        <text x="826" y="238" font-size="11" font-weight="600" fill="currentColor">DP or Full</text>
        <text x="826" y="253" font-size="10" fill="currentColor" opacity=".6">Full auto-fills the whole total</text>

        <line x1="820" y1="409" x2="752" y2="409" stroke="currentColor" opacity=".6" marker-end="url(#pos-a)"/>
        <text x="826" y="406" font-size="11" font-weight="600" fill="currentColor">One tap = booking + rental</text>
        <text x="826" y="421" font-size="10" fill="currentColor" opacity=".6">there is no undo — cancel instead</text>
      </svg>
    </div>
    <figcaption><b>The POS in Rental mode.</b> In Sale mode the date row, the guarantee, the occasion and the DP/Full row all disappear — a sale is always paid in full, and a customer is optional.</figcaption>
  </figure>

  <h3>Taking a rental booking</h3>
  <ol class="steps">
    <li><b>Set the rental date and the return date first.</b><span>The rental date starts on today; the return date starts empty. Only when <b>both</b> are set does the grid filter by availability — until then it shows everything, including suits already promised to someone else.</span></li>
    <li><b>Fill the ticket.</b><span>Tap tiles, or hit the scan button and scan the tag. Adjust quantity with − and + in the ticket. Same-day rentals are fine — return date can equal rental date.</span></li>
    <li><b>Attach the customer.</b><span>Search by name or phone. If they are new, tap <b>New</b>: first name, last name and phone, plus Instagram and TikTok if they offer them. Phone is what you will search on next time, so get it right.</span></li>
    <li><b>Pick the guarantee.</b><span>KTP, Passport, Student ID, or <b>Existing Customer</b> for returning customers who do not need to leave an ID. Existing Customer skips the ID photo at pickup.</span></li>
    <li><b>Pick the occasion.</b><span>Wedding, wedding guest, corporate, university, SMA/SMK, SMP, SD or TK. It starts on Wedding, so change it deliberately — Analytics reads the occasion mix straight off this, and the POS will not charge without one.</span></li>
    <li><b>Choose a package, or leave it on item total.</b><span>A package price covers every item on the ticket by default. Tap a line’s badge to flip it to <b>Add-on</b> and charge it on top of the package. The discount box disappears while a package is selected.</span></li>
    <li><b>DP or Full, then the method.</b><span>DP: type the amount, or use the <b>0</b>, <b>50%</b> and <b>100%</b> shortcuts. Full: the total fills in automatically. Then tap how they are actually paying — cash, QRIS, transfer, debit or card.</span></li>
    <li><b>Charge booking.</b><span>The green panel confirms <i>Booking charged</i> after the invoice opens. Print it, then close — pickup is on Rentals, with the last eight characters of the booking id.</span></li>
  </ol>

  <h3>Taking a walk-in sale</h3>
  <p class="measure">Switch to <b>Sale</b> mode. Only items marked sellable appear. There are no dates and no DP — a sale is paid in full, right now. Customer is optional for a walk-in. Selling an ex-rental suit or jacket is recorded as a clearance; socks, tumblers and the like are recorded as retail. The system does that classification for you. Switching between Rental and Sale clears the ticket. After charge, the sale invoice opens so you can print it.</p>
</section>

<section id="pay">
  <span class="eyebrow">04 — Money</span>
  <h2>Payment method decides where the money lands</h2>
  <p class="measure">The method button is not a label. It is an instruction to the books about which pot the money went into, and it is what the shop reconciles against at the end of the month.</p>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 240" role="img" aria-label="Cash payments go to the Cash Drawer; QRIS, transfer, debit and credit card settle to Bank; a direct transfer bypasses the EDC terminal and leaves no slip.">
        <defs>
          <marker id="pay-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <rect x="20" y="30" width="120" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="80" y="52" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Cash</text>

        <rect x="20" y="96" width="120" height="34" rx="3" fill="none" stroke="currentColor" opacity=".6"/>
        <text x="80" y="118" text-anchor="middle" font-size="13" fill="currentColor">QRIS</text>
        <rect x="20" y="140" width="120" height="34" rx="3" fill="none" stroke="currentColor" opacity=".6"/>
        <text x="80" y="162" text-anchor="middle" font-size="13" fill="currentColor">Debit</text>
        <rect x="160" y="96" width="120" height="34" rx="3" fill="none" stroke="currentColor" opacity=".6"/>
        <text x="220" y="118" text-anchor="middle" font-size="13" fill="currentColor">Card</text>
        <rect x="160" y="140" width="120" height="34" rx="3" fill="none" stroke="currentColor" opacity=".6"/>
        <text x="220" y="162" text-anchor="middle" font-size="13" fill="currentColor">Transfer</text>

        <line x1="140" y1="47" x2="392" y2="47" stroke="currentColor" marker-end="url(#pay-a)"/>
        <text x="266" y="39" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">goes into the till you count tonight</text>

        <path d="M 300 135 L 350 135 L 350 122 L 392 122" fill="none" stroke="currentColor" marker-end="url(#pay-a)"/>
        <text x="330" y="182" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">all four settle to the bank</text>

        <rect x="398" y="28" width="180" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="488" y="53" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Cash Drawer</text>

        <rect x="398" y="102" width="180" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="488" y="127" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Bank</text>
        <text x="488" y="160" text-anchor="middle" font-size="11" fill="currentColor" opacity=".6">BCA merchant / EDC</text>

        <line x1="578" y1="48" x2="656" y2="72" stroke="currentColor" marker-end="url(#pay-a)"/>
        <line x1="578" y1="122" x2="656" y2="98" stroke="currentColor" marker-end="url(#pay-a)"/>

        <rect x="662" y="62" width="258" height="46" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="791" y="82" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Cash on Hand</text>
        <text x="791" y="99" text-anchor="middle" font-size="11" fill="currentColor" opacity=".65">what the owner checks every month</text>

        <line x1="20" y1="200" x2="920" y2="200" stroke="currentColor" opacity=".15"/>
        <text x="20" y="192" font-size="11" fill="currentColor" opacity=".6">EDC is the machine, not a payment method — always record the actual method the customer used: QRIS, debit, or card.</text>
        <text x="20" y="212" font-size="11" fill="currentColor" opacity=".6">A transfer never touches the EDC, so it leaves no slip. That is the payment to attach a proof to.</text>
      </svg>
    </div>
    <figcaption><b>Two pots, five buttons.</b> Pick the wrong button and the drawer count won't match the system that night — which becomes someone's problem at month end.</figcaption>
  </figure>

  <div class="cols two">
    <div class="card">
      <h4 style="margin-top:0">Taking the rest of the money later</h4>
      <p>Open <b>Bookings</b>, find them by name, or scan the invoice barcode at the POS — that jumps you to the booking. Use <b>Collect balance</b> in the row menu. The full invoice opens as soon as the payment is recorded. Do not create a second booking.</p>
    </div>
    <div class="card">
      <h4 style="margin-top:0">A booking that is fully paid is locked</h4>
      <p>Once payment status reads <code>completed</code>, edit is disabled — on purpose. If something is genuinely wrong, get an admin. Do not cancel and re-book to work around it.</p>
    </div>
  </div>

  <h3>Payment proof</h3>
  <p class="measure">Not every payment goes through the EDC terminal. A customer who transfers from their phone, or pays a courier on the doorstep, leaves you no slip at all. <b>Payment proof</b> is where you keep the receipt they send you.</p>

  <div class="flag ok">
    <span class="flag-t">Optional everywhere, and it never blocks you</span>
    <p>Every proof box is optional. No button waits on it, and a failed upload never loses the payment — the money is recorded first, and you get a message telling you to attach the proof from <b>Bookings</b> afterwards. Take the money, serve the customer, attach the proof after.</p>
  </div>

  <p class="measure">You get the same control in four places, and each one has a <b>Camera</b> button next to it, so a screenshot on their phone can be photographed at the counter:</p>
  <div class="table-wrap">
    <table>
      <thead>
        <tr><th style="width:26%">Where</th><th style="width:36%">Which receipt</th><th>Attach it when</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><b>POS</b>, under the method buttons</td>
          <td>The first payment — the DP or the full amount</td>
          <td>The customer transferred or scanned a QRIS that is not the shop's EDC.</td>
        </tr>
        <tr>
          <td><b>Bookings › Collect balance</b></td>
          <td>The remaining balance</td>
          <td>The balance arrived by transfer before they walked in.</td>
        </tr>
        <tr>
          <td><b>Pickup</b>, deposit and balance boxes</td>
          <td>The security deposit, and the balance if it is still owing</td>
          <td>The deposit came in by transfer, or a courier is collecting instead of the customer.</td>
        </tr>
        <tr>
          <td><b>Complete rental</b>, refund box</td>
          <td>The deposit going back out</td>
          <td>You refunded by transfer. This one is the shop's own evidence that the money left.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <p class="measure">JPEG, PNG, WebP, GIF or <b>PDF</b>, under 5 MB. PDF is there because a bank or e-wallet statement usually comes as one. Everything you attach shows up under <b>Payment proofs</b> when you open the booking or the rental, so the next person to serve that customer can see it too.</p>

  <div class="flag care">
    <span class="flag-t">Proof is evidence, not the payment</span>
    <p>Attaching a receipt records <b>nothing</b> in the books. The amount and the method you enter are what post to the ledger. So a transfer still has to be recorded as <i>transfer</i> — attaching the receipt does not do that part for you.</p>
  </div>
</section>

<section id="pickup">
  <span class="eyebrow">05 — Hand-over</span>
  <h2>Pickup</h2>
  <ol class="steps">
    <li><b>Rentals.</b><span>Find the customer's <code>pending</code> rental — it was created the moment you charged the booking. Fastest: scan the invoice barcode at the POS and it opens the rental. If theirs genuinely isn't there, <b>New Rental</b> builds one from an older booking that never got one.</span></li>
    <li><b>Send the deposit agreement, if the shop takes a deposit.</b><span>Tap <b>Send agreement</b> and the customer gets a WhatsApp link listing the deposit amount and the replacement fee on every item they are taking. The link also names <b>your shop, its address and its phone</b>, so the customer can see where the money is held and where to bring the suit back. <b>Confirm pickup stays disabled until they tap Accept.</b> Nothing you can type gets around that. If they say they never got it, <b>Resend agreement</b>.</span></li>
    <li><b>Collect the remaining balance and the deposit.</b><span>Both boxes appear on the Pickup screen with the amount already worked out. Pick how each one was paid. A deposit paid by <b>transfer</b> also asks for the customer's bank, account name and account number — that is the account you refund to at return, so get it right at the counter, not later. Attach a proof for either one if the money came in online.</span></li>
    <li><b>Photograph the ID.</b><span>A clear photo of the guarantee document is normally <b>required</b> — <i>Confirm pickup</i> stays disabled until you attach one. JPEG, PNG or WebP, under 5 MB. If this customer already has an ID on file from a previous rental (or the guarantee is <b>Existing Customer</b>), the photo is optional and Confirm uses the saved one.</span></li>
    <li><b>Check the items physically as you hand them over.</b><span>The rental becomes <code>active</code>. Print the rental invoice from the row menu if the customer wants one.</span></li>
  </ol>

  <div class="flag ok">
    <span class="flag-t">The deposit is not revenue</span>
    <p>A security deposit is money the shop is <b>holding</b>, not money it has earned. It sits as a debt to the customer until you refund it at return, or until a damage charge eats into it. Never describe it to a customer as part of the price.</p>
  </div>

  <div class="flag stop">
    <span class="flag-t">Do not tap Resend agreement repeatedly</span>
    <p>Each tap is a real WhatsApp message from the shop's number. Tapping it three times because the customer is slow does not make the link arrive faster — it makes the shop look like a spammer, and WhatsApp restricts numbers that behave that way. Send once, then <b>phone them</b>. A restricted number stops every reminder for every customer, at both shops.</p>
    <p>If a customer replies <b>STOP</b>, or tells you they do not want messages, open their <b>Customer</b> record and tick <b>No WhatsApp</b>. That stops every reminder and every agreement to them. It protects the shop's number — someone who is ignored presses Block, and blocks are what get the number restricted.</p>
  </div>

  <div class="flag care">
    <span class="flag-t">When a courier collects instead of the customer</span>
    <p>Nobody signs anything at the counter, so the paperwork <b>is</b> the record. Get the agreement accepted before the driver arrives, and attach the deposit and balance receipts on the Pickup screen. Without them there is nothing on file showing the money arrived.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">Dates changed at the counter?</span>
    <p>Use <b>Change dates</b> on the rental while it is pending or active. Do not just let it run over — a wrong return date silently creates a late fee that the customer will argue about. Once a rental is <code>overdue</code> the dates are frozen; only Complete is left.</p>
  </div>
  <div class="flag">
    <span class="flag-t">If they never collect</span>
    <p><b>Cancel rental</b> is in the row menu while it is pending or active, and it asks for a written reason. That reason is the whole point — it is what an admin reads next month. Cancel the rental, don't delete anything.</p>
  </div>

  <div class="flag ok">
    <span class="flag-t">Fix it on the booking, not on both</span>
    <p>While the rental is still <code>pending</code>, editing the <b>booking</b> rewrites it — dates, items, total and notes all follow across on their own. So change the dates on the booking and the pending rental moves with them; you do not have to edit the same thing twice.</p>
    <p>That stops the moment you tap Pickup. Once the rental is <code>active</code> it has its own life, and from then on the <b>Change dates</b> action on the rental is the one that counts.</p>
  </div>

  <div class="flag care">
    <span class="flag-t">Cancelling a booking, once the suit is out</span>
    <p>Cancel a booking while its rental is still <code>pending</code> and the rental is cancelled with it, in one step. But if the suit has already been handed over, the system <b>refuses</b> — <i>"Cancel or complete the Rental before cancelling the Booking"</i>. That is not a bug to work around: settle the physical suit first, then deal with the paperwork.</p>
  </div>
</section>

<section id="return">
  <span class="eyebrow">06 — The hardest five minutes of the day</span>
  <h2>Return and complete</h2>
  <p class="measure">Everything that costs the customer extra has to be recorded <b>before</b> you press Complete. After that, the rental is closed and the charge belongs to an admin to fix.</p>

  <div class="table-wrap">
    <table>
      <thead>
        <tr><th style="width:22%">Situation</th><th style="width:34%">What you do</th><th>Why it matters</th></tr>
      </thead>
      <tbody>
        <tr>
          <td><b>Item is missing</b></td>
          <td>On the complete screen, tap <b>Lost items / add-ons</b>. It opens the Sales screen with their rental attached. Tick the missing item under <b>Lost items</b>, check the replacement fee, take payment.</td>
          <td>This records the money as a replacement sale <i>and</i> takes the suit off stock automatically — its status goes to <code>lost</code> and its value leaves inventory. Typing the amount into damage charge instead loses all of that.</td>
        </tr>
        <tr>
          <td><b>Item is damaged</b></td>
          <td>If the shop holds a deposit, write the note now and charge the damage later, on <b>Release deposit</b> — the complete screen will not take an amount. With no deposit, put the amount in <b>Damage charge</b> and pick how they paid it.</td>
          <td>Damage charge is <b>income</b> for the shop, not a cost. The note is your evidence if they come back to complain.</td>
        </tr>
        <tr>
          <td><b>They are late</b></td>
          <td>Nothing — the system calculates it. If they actually returned on an earlier day, set <b>Actual return date</b> to that day. Leave it empty and it uses right now.</td>
          <td>One day late costs <b>50% of the rental</b>. More than one day costs the <b>whole rental</b>, and it stops there — three days and three weeks cost the same. Days end at midnight, so the hour they walk in does not change it. Backdating is the only way to make a wrong day correct.</td>
        </tr>
        <tr>
          <td><b>They want to buy something too</b></td>
          <td>Same <b>Lost items / add-ons</b> screen — search the sellable stock and add it to the cart.</td>
          <td>It attaches the sale to their rental, so the history stays in one place.</td>
        </tr>
        <tr>
          <td><b>Suit needs cleaning or repair</b></td>
          <td>Tick <b>Send rented items to maintenance</b> before completing.</td>
          <td>Keeps it out of the catalogue until it is ready. Nobody can book it by accident.</td>
        </tr>
        <tr>
          <td><b>A deposit is being refunded</b></td>
          <td><b>Not here.</b> The deposit stays held when you complete. Check the suit first, then tap <b>Release deposit</b> on that rental.</td>
          <td>The complete screen tells you the deposit stays held. Releasing is a second, separate tap — see <b>Releasing a deposit</b> below.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="flag ok">
    <span class="flag-t">Then, and only then</span>
    <p>Press <b>Complete</b>. Status goes to <code>completed</code>, the items go back to available (or to maintenance if you ticked it), the day's revenue is settled — and the rental invoice opens by itself with the late fee and damage charge on it, ready to print.</p>
  </div>

  <h4>Releasing a deposit</h4>
  <p class="measure">A returned suit keeps its deposit until somebody checks it. That is on purpose: damage found on the rack after the customer has gone is too late if the money is already back in their pocket.</p>
  <ol class="steps">
    <li><b>Check the suit.</b><span>Look it over properly, off the counter, with time. This is the step the whole design exists for.</span></li>
    <li><b>Open the rental and tap Release deposit.</b><span>Find it on <b>Rentals</b>, or set the deposit filter to <b>Awaiting item check</b> to see every suit waiting.</span></li>
    <li><b>Price the check.</b><span>Damage notes, then the damage charge. The screen shows the <b>refundable deposit</b> as you type. If the damage runs past the deposit, it tells you what to collect and you pick how they paid.</span></li>
    <li><b>Pay the deposit back — cash or transfer.</b><span>Those are the only two. Pick <b>Refund deposit with</b>. <b>Cash</b> comes out of the drawer, so count it out in front of them. <b>Transfer</b> goes to the bank account they gave at Pickup, shown right there on the screen — send it, then attach the receipt. You are not tied to how the deposit arrived: a deposit paid by transfer can go back as cash if that is what they want.</span></li>
  </ol>

  <div class="flag care">
    <span class="flag-t">Seven days and it goes back on its own</span>
    <p>A deposit nobody releases within <b>seven days</b> of the return is paid back in full overnight, with no damage charge. The shop loses the claim because nobody looked at the suit. Work the <b>Awaiting item check</b> list and this never happens. A row waiting seven days or more turns amber.</p>
    <p>The books record that refund the moment the job runs, using whichever way the deposit came in. If your drawer has not paid it out, the drawer and the books disagree — tell your admin the same day. A deposit that came in by transfer is worse: the books show a transfer nobody sent, and no drawer count will catch it.</p>
  </div>

  <h4>If they never come back</h4>
  <p class="measure">Leave it. The overnight job marks any active rental past its return date as <code>overdue</code> at 00:05 every night, and it shows up red on the Rentals page and the dashboard. Chase it by phone; tell your admin if it goes past a few days.</p>
</section>

<section id="other">
  <span class="eyebrow">07 — The rest of the counter</span>
  <h2>Other things you'll be asked to do</h2>

  <div class="cols two">
    <div class="card">
      <h3 style="margin-top:0">Recording an expense</h3>
      <p><b>Expenses › New.</b> Date, category, description, amount, and the method you paid with. Categories are rent, utilities, salary, supplies, laundry, marketing, maintenance, transport, tax, other.</p>
      <p>Record it the <b>same day</b> you pay it. If you entered one by mistake, <b>void</b> it — never delete. Voided stays visible but stops counting.</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">"Is this suit free next Saturday?"</h3>
      <p><b>Items</b>, find the suit, tap the availability button, put in the two dates. Or, faster: open the POS in Rental mode, set the dates, and see what the grid shows you.</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Moving a suit to the other shop</h3>
      <p><b>Items › Transfer.</b> Only works on an available item, and it changes which shop that suit belongs to. It is not a sale — nobody is buying anything. Tell the other shop it is coming.</p>
    </div>
    <div class="card">
      <h3 style="margin-top:0">Printing</h3>
      <p>One <b>Print</b> button, and it behaves differently depending on what you are holding:</p>
      <ul class="plain" style="margin-bottom:0">
        <li><b>Android tablet</b> — hands the receipt to the SuitLabs Print Bridge, which pops the cash drawer and then prints, without leaving SuitLabs. This is the counter setup.</li>
        <li><b>iPhone or iPad</b> — opens the Bluetooth Print app. Prints fine, but <b>does not open the drawer</b>.</li>
        <li><b>Laptop</b> — opens your normal print dialog with the 58 mm receipt ready to go. Any printer the laptop can already use will take it. No drawer.</li>
        <li><b>Laptop with the thermal printer paired</b> — press <b>Connect printer</b> once on the invoice, pick the printer, and from then on Print goes straight to paper <b>and opens the drawer</b>, exactly like the tablet.</li>
      </ul>
      <p style="margin-bottom:0">You never have to choose: the button looks at the device and picks the best route it can.</p>
    </div>
  </div>

  <h3>When nothing comes out of the printer</h3>
  <p class="measure">Work down this list in order. Nine times out of ten it stops at step 2 or 3.</p>
  <ol class="steps">
    <li><b>Is the tablet on the shop wifi?</b><span>The print app has to fetch the receipt over the network. No network, no receipt — and the error message will not say so.</span></li>
    <li><b>Is the printer on, in range, and loaded with paper?</b><span>Under 10 metres. Check the paper roll is not jammed or finished, and that the printer is not asleep.</span></li>
    <li><b>Is another device already holding the printer?</b><span>Only one device at a time. If the other tablet or someone's phone has it, disconnect there first.</span></li>
    <li><b>Re-pair it in Bluetooth settings.</b><span>Forget the printer, pair it again, then open the bridge and re-save it. This fixes most of what is left.</span></li>
    <li><b>Still nothing? Take payment anyway.</b><span>A receipt is not what makes the booking real — the record in the system is. Write the booking number down for the customer, finish serving them, and tell your admin. Never hold up a customer over a printer.</span></li>
  </ol>

  <div class="flag care">
    <span class="flag-t">Drawer will not open on its own</span>
    <p>The drawer pulse comes from the Android bridge, or from a laptop with the printer paired through <b>Connect printer</b> — and only for a receipt or invoice. <b>Product labels never open the drawer</b> — they print from the item page through the Bluetooth Print app on both Android and iPhone. On an iPhone, and on a laptop printing through the normal dialog, you open the drawer by hand. If the drawer stops responding, check the cable is still in the <b>printer's</b> DK port; it does not connect to the tablet.</p>
  </div>
</section>

<section id="rhythm">
  <span class="eyebrow">08 — Cadence</span>
  <h2>Your day, your week, your month</h2>

  <h3><span class="chip day">Every shift · open</span></h3>
  <ul class="plain">
    <li>Log in and <b>check the shop name in the top bar</b> is your shop.</li>
    <li>Open <b>Rentals</b>. Note today's pickups (<code>pending</code>) and today's returns (<code>active</code>).</li>
    <li>Scan the <code>overdue</code> list. Anything there is a phone call you owe someone.</li>
    <li>Check the printer is paired and the drawer opens. Check the float in the drawer.</li>
    <li>Glance at the dashboard: low stock and maintenance counts.</li>
  </ul>

  <h3><span class="chip day">Every shift · during</span></h3>
  <ul class="plain">
    <li>Every walk-in goes through the POS. No paper, no "I'll enter it later."</li>
    <li>Every hand-over gets an ID photo. Every return gets checked before Complete.</li>
    <li>Every rupiah that leaves the drawer gets an expense record, same day, correct method.</li>
    <li>New customer? Get the phone number right — it is how you find them next time. Mark ID or EN so the next shift knows which language to use.</li>
  </ul>

  <h3><span class="chip day">Every shift · close</span></h3>
  <ul class="plain">
    <li><b>Count the drawer.</b> Compare it against the day's cash payments in the system.</li>
    <li>If it does not match, <b>report it tonight</b>, in writing, to your admin. Do not adjust anything yourself and do not wait until tomorrow.</li>
    <li>Confirm every suit that came back today is completed — nothing left sitting on <code>active</code>.</li>
    <li>Confirm nothing you handed over today is still on <code>pending</code>.</li>
  </ul>

  <h3><span class="chip wk">Every week</span></h3>
  <ul class="plain">
    <li>Walk the maintenance rack. Anything cleaned and repaired goes back to <b>available</b> in Items.</li>
    <li>Check for rentals stuck in a status that does not match reality.</li>
    <li>Flag any suit that is getting worn out — your admin decides what happens to it.</li>
    <li>Hand over the week's paper receipts for expenses you recorded.</li>
  </ul>

  <h3><span class="chip mo">Every month · first working day</span></h3>
  <ul class="plain">
    <li>Confirm that <b>every rental from last month</b> is completed or cancelled. Nothing left active. This is the one thing that blocks your admin from closing the books.</li>
    <li>Confirm every expense you paid last month is in the system.</li>
    <li>Once your admin locks the month, <b>nothing dated in that month can be changed</b> — so raise anything doubtful before they do.</li>
  </ul>
</section>

<section id="care">
  <span class="eyebrow">09 — Concerns</span>
  <h2>What to watch out for</h2>

  <div class="flag stop">
    <span class="flag-t">Wrong shop selected</span>
    <p>Revenue and expenses land in whichever shop the top bar says. Check it at the start of every shift and after anyone else has used the tablet.</p>
  </div>
  <div class="flag stop">
    <span class="flag-t">Handing over without the ID photo</span>
    <p>The photo is your protection, not paperwork. The system requires it because the shop has no other proof of who took the suit.</p>
  </div>
  <div class="flag stop">
    <span class="flag-t">Completing a rental before charging for damage or a lost item</span>
    <p>There is no going back at the counter. Charge first, complete second, always in that order.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">Not setting both dates before you pick items</span>
    <p>Without the dates the catalogue shows everything, including suits already promised to someone else for that weekend.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">Recording the wrong payment method</span>
    <p>Cash is the only method that goes in the drawer. QRIS, transfer, debit and card all go to the bank. Guessing breaks the nightly count.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">An online payment with no proof attached</span>
    <p>The system will let you through — proof is optional. But a transfer that never went through the shop's EDC leaves no slip anywhere, so a month later the only answer to "did this customer really pay?" is the receipt you did or did not attach. Attach it while the customer is still in front of you.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">Taking the customer's bank details "later"</span>
    <p>A deposit paid by transfer asks for their bank, account name and account number at <b>Pickup</b>. That is the account you refund at return. Chasing it on the return day, with a queue behind them, is how refunds go to the wrong account.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">Applying a package "to give a discount"</span>
    <p>A package overrides the item total completely and switches off the discount box. Use it only when the customer is genuinely on that package. For a normal discount, use the discount field.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">Deleting instead of cancelling or voiding</span>
    <p>Cancel a booking or rental. Void an expense. The record stays, marked, and stops counting. Deleting destroys history the shop needs.</p>
  </div>
  <div class="flag">
    <span class="flag-t">Talking about cost</span>
    <p>You cannot see what the shop paid for anything, and that is deliberate. If a customer or a colleague pushes for it, the honest answer is that you don't have it.</p>
  </div>
</section>

<section id="ref">
  <span class="eyebrow">10 — Keep this open</span>
  <h2>Cheat sheet</h2>

  <h4>Booking status</h4>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:20%">Status</th><th style="width:40%">Means</th><th>You do</th></tr></thead>
      <tbody>
        <tr><td><code>pending</code></td><td>Booked, nothing paid yet.</td><td>Take a DP, or chase it.</td></tr>
        <tr><td><code>confirmed</code></td><td>Money has been taken. Suit is reserved.</td><td>Nothing — its rental already exists, waiting on <code>pending</code>.</td></tr>
        <tr><td><code>active</code></td><td>The rental attached to it is out.</td><td>Nothing.</td></tr>
        <tr><td><code>completed</code></td><td>Finished and returned.</td><td>Nothing.</td></tr>
        <tr><td><code>cancelled</code></td><td>Called off. Doesn't count as revenue.</td><td>Nothing.</td></tr>
      </tbody>
    </table>
  </div>

  <h4>Payment status</h4>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:20%">Status</th><th style="width:40%">Means</th><th>You do</th></tr></thead>
      <tbody>
        <tr><td><code>pending</code></td><td>Nothing paid.</td><td>Take money — the DP invoice opens itself.</td></tr>
        <tr><td><code>partial</code></td><td>DP taken, balance owing.</td><td>Collect the rest; the full invoice opens itself.</td></tr>
        <tr><td><code>completed</code></td><td>Paid in full.</td><td>Nothing — and the booking is now locked from editing.</td></tr>
      </tbody>
    </table>
  </div>

  <h4>Payment proof</h4>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:26%">Question</th><th>Answer</th></tr></thead>
      <tbody>
        <tr><td>Is it required?</td><td>No. Never. Every proof box is optional and no button waits on it.</td></tr>
        <tr><td>When should I attach one?</td><td>Whenever the money moved outside the drawer and outside the shop's EDC — a transfer, a QRIS to a personal account, a courier payment.</td></tr>
        <tr><td>What files work?</td><td>JPEG, PNG, WebP, GIF, PDF. Under 5 MB. Or use the <b>Camera</b> button.</td></tr>
        <tr><td>Where do I see them later?</td><td><b>Payment proofs</b> on the booking detail, and on the rental detail for the deposit and the refund.</td></tr>
        <tr><td>Which rentals is the shop holding a deposit on?</td><td>On <b>Rentals</b>, set the deposit filter to <b>Deposit held</b>. Each row shows the amount. <b>Awaiting item check</b> is the queue to release, and <b>Deposit released</b> shows the ones already paid back.</td></tr>
        <tr><td>Can I refund a deposit by transfer?</td><td>Yes. <b>Cash</b> and <b>transfer</b> are both offered on <b>Release deposit</b>. For a transfer, use the account taken at Pickup and attach the receipt.</td></tr>
        <tr><td>Upload failed — did I lose the payment?</td><td>No. The payment is already recorded. Attach the proof from the booking afterwards.</td></tr>
        <tr><td>Does attaching it record the payment?</td><td>No. The amount and method you enter do that. Proof is evidence only.</td></tr>
      </tbody>
    </table>
  </div>

  <h4>WhatsApp</h4>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:30%">Situation</th><th>What you do</th></tr></thead>
      <tbody>
        <tr><td>Customer says the agreement never arrived</td><td>Resend <b>once</b>, then phone them. Never tap it repeatedly.</td></tr>
        <tr><td>Customer replies STOP, or asks for no messages</td><td>Tick <b>No WhatsApp</b> on their Customer record. Do not send anything more.</td></tr>
        <tr><td>Customer has No WhatsApp ticked and needs the agreement</td><td>Ask them face to face. Only if they agree, untick it and send.</td></tr>
        <tr><td>Reminders stopped for everyone</td><td>Tell your admin at once. The shop's number may be restricted.</td></tr>
        <tr><td>Customer asks what the reminder said</td><td>It gives the date, the items, the shop address, the <b>opening hours</b>, and the shop phone. The return reminder also states the late fee: 50% of the rental one day late, the whole rental beyond that.</td></tr>
        <tr><td>The reminder shows the wrong opening hours</td><td>Tell your admin. Hours are edited per shop on <b>Admin &rarr; Branches</b>, not in the message.</td></tr>
      </tbody>
    </table>
  </div>

  <h4>Rental status</h4>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:20%">Status</th><th style="width:40%">Means</th><th>You do</th></tr></thead>
      <tbody>
        <tr><td><code>pending</code></td><td>Created with the booking, not handed over.</td><td>Pickup — agreement accepted, deposit taken, ID photo.</td></tr>
        <tr><td><code>active</code></td><td>Suit is with the customer.</td><td>Wait for the return date.</td></tr>
        <tr><td><code>overdue</code></td><td>Past the return date. Set automatically at 00:05.</td><td>Phone them. Late fee is already accruing.</td></tr>
        <tr><td><code>completed</code></td><td>Back, checked, settled.</td><td>Nothing.</td></tr>
        <tr><td><code>cancelled</code></td><td>Called off before hand-over.</td><td>Nothing.</td></tr>
      </tbody>
    </table>
  </div>

  <h4>Item status</h4>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:22%">Status</th><th>Means</th></tr></thead>
      <tbody>
        <tr><td><code>available</code></td><td>Can be booked and can be sold. This is the only status the POS will rent.</td></tr>
        <tr><td><code>rented</code></td><td>Out with a customer right now.</td></tr>
        <tr><td><code>maintenance</code></td><td>Cleaning or repair. Hidden from the catalogue until you set it back.</td></tr>
        <tr><td><code>damaged</code> · <code>lost</code> · <code>retired</code></td><td>Off the floor. Admin decides what happens next.</td></tr>
      </tbody>
    </table>
  </div>

  <h4>Automatic, every night — you don't do these</h4>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:18%" class="num">Time</th><th>What happens</th></tr></thead>
      <tbody>
        <tr><td class="num"><code>00:05</code></td><td>Active rentals past their return date become <code>overdue</code>.</td></tr>
        <tr><td class="num"><code>00:10</code></td><td>Recurring expenses your admin set up (rent, salary) are posted.</td></tr>
        <tr><td class="num"><code>00:20</code></td><td>On the 1st only — last month's bookings are exported to the shop's Google Sheet.</td></tr>
      </tbody>
    </table>
  </div>
  <p style="font-size:.9rem;color:var(--ink-3)">All times are WITA (Asia/Makassar).</p>
</section>

<p class="end">SuitLabs · Cashier Floor Guide. If something in here doesn't match what you see on screen, the screen is right and this page needs updating — tell your admin.</p>

</div>`;
