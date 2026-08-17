// Generated from the published guide. Static, author-written markup — no user input.
export const OPERATIONS_HANDBOOK_HTML = `<nav class="bar">
  <div class="bar-in">
    <span class="bar-name">SuitLabs Handbook</span>
    <a href="#shape">The system</a>
    <a href="#words">Words</a>
    <a href="#roles">Roles</a>
    <a href="#menu">Every screen</a>
    <a href="#ops">Operations</a>
    <a href="#books">The books</a>
    <a href="#branches">Two shops</a>
    <a href="#sheets">Spreadsheets</a>
    <a href="#devices">Devices</a>
    <a href="#close">Month close</a>
    <a href="#cadence">Who does what, when</a>
    <a href="#care">Watch out</a>
    <a href="#onboard">Onboarding</a>
  </div>
</nav>

<div class="guide-main">

<header class="mast">
  <span class="eyebrow">Operating manual · Admin &amp; Staff</span>
  <h1>SuitLabs Operations Handbook</h1>
  <p class="lede">How the shop runs on the system: what every screen is for, who owns it, what happens automatically overnight, and the daily, monthly and yearly rhythm that keeps the books honest.</p>
</header>

<a class="handoff" href="/dashboard/guides/cashier">
  <strong>Onboarding a cashier? Send them the Cashier Floor Guide instead →</strong>
  <span>A separate, counter-only page: the POS, pickup, returns, and their shift routine. No accounting, no admin screens. This handbook is for whoever owns the whole shop.</span>
</a>

<section id="shape">
  <span class="eyebrow">01 — Orientation</span>
  <h2>What the system actually is</h2>
  <p class="measure">Four moving parts. Everyone touches the first one; almost nobody needs to think about the rest — until something goes quiet, and then knowing the shape saves an afternoon.</p>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 400" role="img" aria-label="System map: the web app on tablets and phones and the Android print bridge both talk to the Go API, which owns the PostgreSQL database, mirrors data to Google Sheets, stores photos in Cloudflare R2, and runs three scheduled jobs each night.">
        <defs>
          <marker id="sm-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <text x="20" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">WHAT PEOPLE TOUCH</text>
        <rect x="20" y="40" width="200" height="72" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="120" y="66" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Web app</text>
        <text x="120" y="84" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">Cashier POS · Dashboard</text>
        <text x="120" y="100" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">Bookings · Rentals · Admin</text>

        <rect x="20" y="128" width="200" height="60" rx="3" fill="none" stroke="currentColor" opacity=".6"/>
        <text x="120" y="152" text-anchor="middle" font-size="13" fill="currentColor">Print Bridge</text>
        <text x="120" y="170" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">Android · Bluetooth ESC/POS</text>

        <rect x="20" y="204" width="200" height="52" rx="3" fill="none" stroke="currentColor" opacity=".45" stroke-dasharray="4 3"/>
        <text x="120" y="226" text-anchor="middle" font-size="12" fill="currentColor" opacity=".8">Thermal printer</text>
        <text x="120" y="243" text-anchor="middle" font-size="11" fill="currentColor" opacity=".6">+ cash drawer on the DK port</text>

        <line x1="220" y1="76" x2="358" y2="140" stroke="currentColor" marker-end="url(#sm-a)"/>
        <text x="286" y="98" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">every action</text>
        <line x1="220" y1="158" x2="358" y2="158" stroke="currentColor" marker-end="url(#sm-a)"/>
        <text x="289" y="150" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">fetches receipt</text>
        <line x1="120" y1="188" x2="120" y2="200" stroke="currentColor" marker-end="url(#sm-a)"/>

        <text x="364" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">THE ONE SOURCE OF TRUTH</text>
        <rect x="364" y="118" width="212" height="80" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="470" y="148" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">API</text>
        <text x="470" y="167" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">rules, permissions,</text>
        <text x="470" y="183" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">branch scope, journal entries</text>

        <line x1="470" y1="198" x2="470" y2="238" stroke="currentColor" marker-end="url(#sm-a)"/>
        <rect x="364" y="244" width="212" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="470" y="268" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">PostgreSQL</text>
        <text x="470" y="286" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">everything lives here</text>

        <text x="612" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">ATTACHED, NOT IN CHARGE</text>

        <line x1="576" y1="146" x2="662" y2="86" stroke="currentColor" marker-end="url(#sm-a)"/>
        <text x="626" y="105" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">writes</text>
        <path d="M 662 108 L 620 108 L 620 152 L 580 152" fill="none" stroke="currentColor" stroke-dasharray="4 3" marker-end="url(#sm-a)"/>
        <text x="686" y="126" font-size="11" fill="currentColor" opacity=".7">manual import only</text>

        <rect x="662" y="52" width="258" height="56" rx="3" fill="none" stroke="currentColor" opacity=".6"/>
        <text x="791" y="76" text-anchor="middle" font-size="13" fill="currentColor">Google Sheets · one per shop</text>
        <text x="791" y="93" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">item tabs + one tab per month</text>

        <line x1="576" y1="168" x2="662" y2="168" stroke="currentColor" marker-end="url(#sm-a)"/>
        <rect x="662" y="144" width="258" height="48" rx="3" fill="none" stroke="currentColor" opacity=".6"/>
        <text x="791" y="164" text-anchor="middle" font-size="13" fill="currentColor">Cloudflare R2</text>
        <text x="791" y="181" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">item photos, ID photos, proofs</text>

        <rect x="662" y="228" width="258" height="90" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="791" y="252" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Scheduled jobs · inside the API</text>
        <text x="676" y="274" font-family="ui-monospace, monospace" font-size="11" fill="currentColor" opacity=".8">00:05  mark rentals overdue</text>
        <text x="676" y="292" font-family="ui-monospace, monospace" font-size="11" fill="currentColor" opacity=".8">00:10  post recurring expenses</text>
        <text x="676" y="310" font-family="ui-monospace, monospace" font-size="11" fill="currentColor" opacity=".8">00:20  1st only — export the month</text>
        <path d="M 576 190 L 620 190 L 620 262 L 656 262" fill="none" stroke="currentColor" opacity=".5" marker-end="url(#sm-a)"/>

        <line x1="20" y1="350" x2="920" y2="350" stroke="currentColor" opacity=".15"/>
        <text x="20" y="374" font-size="12" fill="currentColor" opacity=".7">The database is the record. Google Sheets is a mirror for people who like spreadsheets — editing a sheet does not change the shop.</text>
      </svg>
    </div>
    <figcaption><b>Everything routes through one API.</b> That is why permissions, branch scope and the accounting rules cannot be worked around from the front end: the browser only ever asks, the API decides. Jobs run in Asia/Makassar (WITA) and catch up on startup if the server was down when they were due.</figcaption>
  </figure>
</section>

<section id="words">
  <span class="eyebrow">02 — Vocabulary</span>
  <h2>Say it the way the system says it</h2>
  <p class="measure">Half of all confusion in a shop like this is two people using one word for different things. These are the ones that matter; the full list lives in the project's <code>CONTEXT.md</code>.</p>

  <dl class="gloss">
    <div><dt>Branch</dt><dd>A physical shop. Its own stock, cash drawer, staff, and its own Profit &amp; Loss. Not "outlet", not "location".</dd></div>
    <div><dt>Booking</dt><dd>The agreement and the money. Created at the POS, can be paid by down payment or in full.</dd></div>
    <div><dt>Rental</dt><dd>The physical hand-over. Created automatically the moment its booking is charged, and it waits on <code>pending</code> until someone taps Pickup. This is what carries the ID photo, the late fee and the damage charge.</dd></div>
    <div><dt>Sale</dt><dd>Goods that leave for good — walk-in retail, an add-on to a booking, a lost-item replacement fee, or an ex-rental suit sold off.</dd></div>
    <div><dt>Expense</dt><dd>Money out to run the shop. <b>Recorded</b> counts toward P&amp;L; <b>voided</b> does not. Never deleted.</dd></div>
    <div><dt>Journal Entry</dt><dd>A dated posting for one shop event, with debits equal to credits. Every report is read from these.</dd></div>
    <div><dt>Ledger Account</dt><dd>A named bucket on the books: Cash Drawer, Bank, Accounts Receivable, Booking revenue, and so on.</dd></div>
    <div><dt>Accrual Basis</dt><dd>Revenue counts when it is earned, expenses when they are recorded — even if the cash moves on a different day. So P&amp;L and the drawer are not the same number, and never will be.</dd></div>
    <div><dt>Cash on Hand</dt><dd>Cash Drawer plus Bank, from the ledger. Cash goes to the drawer; QRIS, transfer, debit and card go to Bank.</dd></div>
    <div><dt>Opening Balance</dt><dd>The starting point of the books: cash on a chosen date, plus a snapshot of inventory, fixed assets and receivables.</dd></div>
    <div><dt>Buying Price</dt><dd>What the shop paid. Admin-only — the server strips it out of anything a staff account requests.</dd></div>
    <div><dt>Fixed Asset</dt><dd>Equipment used to run the shop — racks, chairs, a steamer. In use, or disposed. Never rented or sold as stock.</dd></div>
    <div><dt>Write-off</dt><dd>Taking item or asset value off the books without a sale — dropping an item's quantity in Items, or disposing a fixed asset. A suit lost on rental is <i>not</i> a manual write-off: charging the replacement fee takes it off stock for you.</dd></div>
    <div><dt>Closed Month</dt><dd>A month an admin has locked. Nothing dated inside it can be added, changed or reversed until it is explicitly unlocked.</dd></div>
    <div><dt>Transfer</dt><dd>Moving an available item's home branch. Not a sale, not a write-off — the shop still owns it.</dd></div>
  </dl>
</section>

<section id="roles">
  <span class="eyebrow">03 — Who is who</span>
  <h2>Two working roles, one hard boundary</h2>
  <p class="measure">The system has three roles. <b>Staff</b> runs the floor, <b>Admin</b> runs the books, and <b>Customer</b> is a login type that no shop worker should be given. The split is not a suggestion — the API enforces it on every request.</p>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 340" role="img" aria-label="Staff can reach the operational screens and their own branches. Admin additionally reaches users, assets, financial reports, branches, sheet sync, buying prices, all-branch view, and month locking.">
        <defs>
          <marker id="rl-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <rect x="20" y="46" width="150" height="60" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="95" y="72" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">STAFF</text>
        <text x="95" y="91" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">the cashier</text>

        <rect x="20" y="196" width="150" height="60" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="95" y="222" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">ADMIN</text>
        <text x="95" y="241" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">owner / manager</text>

        <line x1="170" y1="76" x2="272" y2="112" stroke="currentColor" marker-end="url(#rl-a)"/>
        <line x1="170" y1="226" x2="272" y2="150" stroke="currentColor" marker-end="url(#rl-a)"/>
        <line x1="170" y1="240" x2="272" y2="262" stroke="currentColor" marker-end="url(#rl-a)"/>

        <rect x="278" y="86" width="300" height="90" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="428" y="110" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Shop floor</text>
        <text x="292" y="132" font-size="11.5" fill="currentColor" opacity=".8">Cashier · Bookings · Rentals · Sales</text>
        <text x="292" y="150" font-size="11.5" fill="currentColor" opacity=".8">Expenses · Items · Customers</text>
        <text x="292" y="168" font-size="11.5" fill="currentColor" opacity=".8">Packages · Discounts · Categories</text>

        <rect x="278" y="212" width="300" height="106" rx="3" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="5 3"/>
        <text x="428" y="236" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Admin only</text>
        <text x="292" y="258" font-size="11.5" fill="currentColor" opacity=".8">Users · Branches · Assets · Analytics</text>
        <text x="292" y="276" font-size="11.5" fill="currentColor" opacity=".8">Financial Report · Bulk Input Sync</text>
        <text x="292" y="294" font-size="11.5" fill="currentColor" opacity=".8">Buying price · Lock month · All branches</text>

        <line x1="578" y1="131" x2="660" y2="131" stroke="currentColor" marker-end="url(#rl-a)"/>
        <line x1="578" y1="265" x2="660" y2="265" stroke="currentColor" marker-end="url(#rl-a)"/>

        <rect x="666" y="86" width="254" height="90" rx="3" fill="none" stroke="currentColor" opacity=".6"/>
        <text x="793" y="112" text-anchor="middle" font-size="12.5" fill="currentColor">Scoped to the branches</text>
        <text x="793" y="130" text-anchor="middle" font-size="12.5" fill="currentColor">this account is assigned</text>
        <text x="793" y="156" text-anchor="middle" font-size="11" fill="currentColor" opacity=".65">buying price stripped from every reply</text>

        <rect x="666" y="212" width="254" height="106" rx="3" fill="none" stroke="currentColor" opacity=".6"/>
        <text x="793" y="240" text-anchor="middle" font-size="12.5" fill="currentColor">Any branch, plus the</text>
        <text x="793" y="258" text-anchor="middle" font-size="12.5" fill="currentColor">"All branches" group view</text>
        <text x="793" y="284" text-anchor="middle" font-size="11" fill="currentColor" opacity=".65">writes still land in one chosen shop —</text>
        <text x="793" y="300" text-anchor="middle" font-size="11" fill="currentColor" opacity=".65">"all" is for reading, not recording</text>

        <text x="20" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">ROLE</text>
        <text x="278" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">WHAT IT OPENS</text>
        <text x="666" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">HOW FAR IT SEES</text>
      </svg>
    </div>
    <figcaption><b>Admin is a superset of Staff, plus the books.</b> Note the dashed box: nothing in it can be reached by a staff login, even by typing the URL directly.</figcaption>
  </figure>

  <div class="table-wrap">
    <table>
      <thead>
        <tr><th style="width:34%">Capability</th><th class="mid" style="width:14%">Staff</th><th class="mid" style="width:14%">Admin</th><th>Notes</th></tr>
      </thead>
      <tbody>
        <tr><td>Take bookings, rentals, sales</td><td class="mid yes">Yes</td><td class="mid yes">Yes</td><td>Admin normally shouldn't — let the floor own the floor.</td></tr>
        <tr><td>Record and void expenses</td><td class="mid yes">Yes</td><td class="mid yes">Yes</td><td>Recurring expense templates are admin.</td></tr>
        <tr><td>Edit items, transfer between shops</td><td class="mid yes">Yes</td><td class="mid yes">Yes</td><td>Selling price yes; buying price admin only.</td></tr>
        <tr><td>See buying price / cost of goods</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>Removed server-side, not just hidden.</td></tr>
        <tr><td>Create and disable user accounts</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>Also assigns which branches a person can reach.</td></tr>
        <tr><td>Financial Report — P&amp;L, Balance Sheet, Cash Flow</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>Per shop, or the whole group.</td></tr>
        <tr><td>Opening Balance, Payables, Loans, Dividends</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>Inside the Financial Report page.</td></tr>
        <tr><td>Fixed assets and their purchases</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>The Assets page.</td></tr>
        <tr><td>Analytics — demand, mix, idle stock</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>Admin → Analytics.</td></tr>
        <tr><td>Recurring expense templates</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>On the Expenses page, admin only.</td></tr>
        <tr><td>Lock / unlock a month</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>The single most consequential button in the system. It locks that month for <b>both</b> shops.</td></tr>
        <tr><td>Google Sheets import, branch setup</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>Bulk Input Sync and Branches.</td></tr>
        <tr><td>View "All branches" together</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>Staff sees only assigned shops.</td></tr>
        <tr><td>See the money tiles on the Dashboard</td><td class="mid no">No</td><td class="mid yes">Yes</td><td>Revenue, profit, cash on hand and assets are hidden from staff.</td></tr>
      </tbody>
    </table>
  </div>

  <div class="flag care">
    <span class="flag-t">Give each person their own login</span>
    <p>Every booking, sale, expense and rental records who created it and who last touched it. A shared account throws that away, and with it any chance of tracing a mistake. When someone leaves, <b>deactivate</b> the account rather than deleting it — deleting orphans their history.</p>
  </div>
</section>

<section id="menu">
  <span class="eyebrow">04 — Feature tour</span>
  <h2>Every screen, and what it is for</h2>

  <h4>Shop floor · staff and admin</h4>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:22%">Screen</th><th style="width:38%">What it is for</th><th>The thing people get wrong</th></tr></thead>
      <tbody>
        <tr><td><b>Cashier</b></td><td>The POS. Rental mode and Sale mode, barcode scan, ticket, occasion, payment, charge.</td><td>One charge writes a <b>Booking</b> <i>and</i> its <b>Rental</b>, already on <code>pending</code>. Pickup still happens on Rentals. Set both dates before picking items or the catalogue won't filter by availability.</td></tr>
        <tr><td><b>Dashboard</b></td><td>Today at a glance: item count, bookings, active rentals, today's revenue, low stock, maintenance. For an admin, also this month's accrual summary and the shop's asset value.</td><td>Today's revenue is accrual, not the cash in the drawer. Staff see only the six counts.</td></tr>
        <tr><td><b>Bookings</b></td><td>The full booking list. Edit, <b>Collect balance</b>, print DP or full invoices, add a sale on top.</td><td>A booking with payment status <code>completed</code> is deliberately locked from editing. While its rental is still <code>pending</code>, editing the booking rewrites the rental to match; after pickup the two are independent.</td></tr>
        <tr><td><b>Rentals</b></td><td>Pickup the pending rental the POS created, change dates, complete, cancel with a reason.</td><td>Everything chargeable — lost items, damage, add-ons — must be recorded <b>before</b> Complete. <b>New Rental</b> is only for legacy bookings that have no rental.</td></tr>
        <tr><td><b>Sales</b></td><td>Walk-in retail, booking add-ons, and rental-return charges — including the lost-item replacement screen. Cancel a sale here.</td><td>Only items marked sellable appear. An ex-rental suit sells as clearance, not retail. A replacement line also marks the lost item <code>lost</code>.</td></tr>
        <tr><td><b>Expenses</b></td><td>Money out, by category, with the payment method. Monthly summary. Recurring templates (admin only).</td><td>Void, never delete. Record on the day the money actually moved.</td></tr>
        <tr><td><b>Items</b></td><td>Inventory. Search, filter, barcode lookup, availability check for a date range, transfer to the other shop, generate and print labels.</td><td>Availability depends on status <i>and</i> dates. Maintenance items are invisible to the catalogue — that is the point. For an admin, the buying price field here <b>posts a purchase or a write-off</b> to the books.</td></tr>
        <tr><td><b>Customers</b></td><td>One company-wide customer list. Origin branch shows which shop first registered them.</td><td>Customers are shared across shops on purpose. Don't create a duplicate because "they're ours now."</td></tr>
        <tr><td><b>Package Pricing</b></td><td>Fixed-price bundles that replace the item total on a booking. Only active packages show at the POS.</td><td>A package replaces the item total <i>and</i> hides the discount field. Lines flipped to <b>Add-on</b> are charged on top of the package price. It is not a discount tool.</td></tr>
        <tr><td><b>Discounts</b></td><td>Discount codes and rules, at booking level or item level.</td><td>Booking-level and item-level can both apply. Check the total before charging.</td></tr>
        <tr><td><b>Categories</b></td><td>How items are grouped in the catalogue and in reports.</td><td>Renaming a category reshapes past reports. Decide the taxonomy once.</td></tr>
      </tbody>
    </table>
  </div>

  <h4>Admin only</h4>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:22%">Screen</th><th style="width:38%">What it is for</th><th>The thing people get wrong</th></tr></thead>
      <tbody>
        <tr><td><b>Users</b></td><td>Create accounts, set role, assign branches, deactivate leavers.</td><td>Deactivate, don't delete. And no shared logins.</td></tr>
        <tr><td><b>Branches</b></td><td>Each shop's name, code, receipt subtitle, address, phone, geofence, and Google Sheet.</td><td>Receipt text here is what prints on customers' invoices. The spreadsheet ID is this shop only — Jimbaran and Nusa Dua do not share a sheet.</td></tr>
        <tr><td><b>Assets</b></td><td>Inventory value plus fixed assets — racks, steamers, chairs — with buying price, purchase date, vendor, and how they were paid for. In use, or disposed.</td><td>Recording a purchase here moves real money. Paying by cash or bank reduces cash; on credit it creates a payable. Disposing an asset writes its remaining value off.</td></tr>
        <tr><td><b>Financial Report</b></td><td>P&amp;L, Balance Sheet, Cash Flow, per month or full year, per shop or the group. Opening Balance, Payables, Loans, Dividends. Excel export. Google Sheets export runs with retry. Lock month.</td><td>All of it is accrual. Reconcile before you lock, not after.</td></tr>
        <tr><td><b>Analytics</b></td><td>Owner decision board: booking value and outstanding, sales revenue, monthly volume, occasion and package mix, how money arrived, sales vs clearance, sizes and colours that move, hottest and idle stock, per shop — with advice cards.</td><td>This is operational demand and mix, not P&amp;L. Use Financial Report for the books. The sheet is a mirror, not the place to decide.</td></tr>
        <tr><td><b>Bulk Input Sync</b></td><td>Pull item changes in from the Google Sheet when someone has edited it in bulk.</td><td>The database is the source of truth. Blank cells in the sheet preserve the database value — they don't clear it.</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section id="ops">
  <span class="eyebrow">05 — The operating loop</span>
  <h2>Booking, rental, and everything that can happen in between</h2>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 350" role="img" aria-label="State diagram: booking moves from pending to confirmed and is converted into a rental, which moves pending, active, overdue, and completed, with cancel paths and side effects at completion.">
        <defs>
          <marker id="lc-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <text x="20" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">BOOKING — THE AGREEMENT AND THE MONEY</text>

        <rect x="20" y="42" width="140" height="46" rx="23" fill="none" stroke="currentColor" opacity=".7"/>
        <text x="90" y="70" text-anchor="middle" font-size="12.5" fill="currentColor">pending</text>

        <line x1="160" y1="65" x2="228" y2="65" stroke="currentColor" marker-end="url(#lc-a)"/>
        <text x="194" y="57" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".7">DP paid</text>

        <rect x="234" y="42" width="140" height="46" rx="23" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="304" y="70" text-anchor="middle" font-size="12.5" font-weight="600" fill="currentColor">confirmed</text>

        <line x1="374" y1="65" x2="442" y2="65" stroke="currentColor" marker-end="url(#lc-a)"/>
        <text x="408" y="57" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".7">balance</text>

        <rect x="448" y="42" width="150" height="46" rx="23" fill="none" stroke="currentColor" opacity=".7"/>
        <text x="523" y="70" text-anchor="middle" font-size="12.5" fill="currentColor">paid in full · locked</text>

        <rect x="672" y="42" width="140" height="46" rx="23" fill="none" stroke="currentColor" opacity=".45" stroke-dasharray="4 3"/>
        <text x="742" y="70" text-anchor="middle" font-size="12.5" fill="currentColor" opacity=".75">cancelled</text>
        <path d="M 598 65 L 666 65" fill="none" stroke="currentColor" opacity=".45" marker-end="url(#lc-a)"/>
        <text x="632" y="57" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".6">any time</text>
        <text x="742" y="105" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".6">no revenue counted</text>

        <path d="M 304 88 L 304 118 L 90 118 L 90 156" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#lc-a)"/>
        <text x="200" y="111" text-anchor="middle" font-size="11" fill="currentColor" opacity=".75">created with the booking, at the moment of charge</text>

        <text x="20" y="146" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">RENTAL — THE PHYSICAL SUIT</text>

        <rect x="20" y="160" width="140" height="46" rx="23" fill="none" stroke="currentColor" opacity=".7"/>
        <text x="90" y="188" text-anchor="middle" font-size="12.5" fill="currentColor">pending</text>

        <line x1="160" y1="183" x2="228" y2="183" stroke="currentColor" stroke-width="2" marker-end="url(#lc-a)"/>
        <text x="194" y="175" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".8">Pickup</text>
        <text x="194" y="203" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".65">ID photo</text>

        <rect x="234" y="160" width="140" height="46" rx="23" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="304" y="188" text-anchor="middle" font-size="12.5" font-weight="600" fill="currentColor">active</text>

        <path d="M 280 206 L 280 241 L 240 241" fill="none" stroke="currentColor" marker-end="url(#lc-a)"/>
        <rect x="94" y="218" width="140" height="46" rx="23" fill="none" stroke="currentColor" opacity=".7"/>
        <text x="164" y="246" text-anchor="middle" font-size="12.5" fill="currentColor">overdue</text>
        <text x="88" y="238" text-anchor="end" font-size="10.5" fill="currentColor" opacity=".65">automatic</text>
        <text x="88" y="253" text-anchor="end" font-size="10.5" fill="currentColor" opacity=".65">at 00:05</text>

        <line x1="374" y1="183" x2="442" y2="183" stroke="currentColor" stroke-width="2" marker-end="url(#lc-a)"/>
        <text x="408" y="175" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".8">Complete</text>
        <path d="M 164 264 L 164 286 L 523 286 L 523 210" fill="none" stroke="currentColor" opacity=".55" marker-end="url(#lc-a)"/>
        <text x="344" y="279" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".65">returned late — completes the same way, plus the fee</text>

        <rect x="448" y="160" width="150" height="46" rx="23" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="523" y="188" text-anchor="middle" font-size="12.5" font-weight="600" fill="currentColor">completed</text>

        <line x1="598" y1="183" x2="666" y2="183" stroke="currentColor" marker-end="url(#lc-a)"/>
        <rect x="672" y="146" width="248" height="140" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="796" y="170" text-anchor="middle" font-size="12.5" font-weight="600" fill="currentColor">Settled at completion</text>
        <text x="686" y="192" font-size="11" fill="currentColor" opacity=".8">· late fee — 20% of daily rate / day</text>
        <text x="686" y="210" font-size="11" fill="currentColor" opacity=".8">· damage charge — typed, revenue</text>
        <text x="686" y="228" font-size="11" fill="currentColor" opacity=".8">· lost item — replacement sale, then</text>
        <text x="686" y="244" font-size="11" fill="currentColor" opacity=".8">  marked lost and off stock, automatically</text>
        <text x="686" y="262" font-size="11" fill="currentColor" opacity=".8">· items back to available, or maintenance</text>

        <line x1="20" y1="318" x2="920" y2="318" stroke="currentColor" opacity=".15"/>
        <text x="20" y="336" font-size="11.5" fill="currentColor" opacity=".7">While the rental is pending the booking drives it: edit the booking and the dates, items and total follow; cancel the booking and the rental is cancelled with it.</text>
        <text x="20" y="354" font-size="11.5" fill="currentColor" opacity=".7">After pickup that link stops. Cancelling a booking whose suit is out is refused outright, and once a rental is completed a correction is an admin job — impossible if the month is locked.</text>
      </svg>
    </div>
    <figcaption><b>Two records, two lifecycles, one customer.</b> The booking answers "what did they agree and pay"; the rental answers "where is the suit". Both are created by the same tap on <i>Charge booking</i>. Late fees and damage attach to the rental, which is why nothing chargeable can wait until after completion.</figcaption>
  </figure>

  <div class="cols three">
    <div class="card">
      <h3>Lost item</h3>
      <p>Charged as a <b>replacement sale</b> at return. That one record does all of it: takes the money, marks the item <code>lost</code>, drops it out of stock, and relieves its value from inventory. Do <b>not</b> add a manual write-off on top — that double-counts.</p>
    </div>
    <div class="card">
      <h3>Damage</h3>
      <p>A <b>damage charge</b> is income, not a cost. Always write the note: it is the only evidence the shop has if the customer disputes it later.</p>
    </div>
    <div class="card">
      <h3>Late return</h3>
      <p>20% of the daily rate for each day past the return date, calculated automatically. If the customer actually returned earlier, backdate the actual return date — that is the only correct fix.</p>
    </div>
  </div>
</section>

<section id="books">
  <span class="eyebrow">06 — The books</span>
  <h2>Every shop event becomes a journal entry</h2>
  <p class="measure">This is the part that surprises people. SuitLabs is not a till with a report bolted on — it keeps double-entry books. Every booking, sale, expense, purchase and write-off posts a dated entry whose debits equal its credits, and <b>every report is read back out of those entries</b>. Nothing is summed from the operational tables.</p>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 400" role="img" aria-label="Shop events post journal entries with equal debits and credits into ledger accounts, and the profit and loss, balance sheet and cash flow reports are read back from those ledger accounts.">
        <defs>
          <marker id="bk-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <text x="20" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">WHAT HAPPENS IN THE SHOP</text>
        <rect x="20" y="42" width="176" height="30" rx="3" fill="none" stroke="currentColor" opacity=".65"/>
        <text x="108" y="62" text-anchor="middle" font-size="12" fill="currentColor">Booking charged</text>
        <rect x="20" y="80" width="176" height="30" rx="3" fill="none" stroke="currentColor" opacity=".65"/>
        <text x="108" y="100" text-anchor="middle" font-size="12" fill="currentColor">Sale completed</text>
        <rect x="20" y="118" width="176" height="30" rx="3" fill="none" stroke="currentColor" opacity=".65"/>
        <text x="108" y="138" text-anchor="middle" font-size="12" fill="currentColor">Expense recorded</text>
        <rect x="20" y="156" width="176" height="30" rx="3" fill="none" stroke="currentColor" opacity=".65"/>
        <text x="108" y="176" text-anchor="middle" font-size="12" fill="currentColor">Purchase made</text>
        <rect x="20" y="194" width="176" height="30" rx="3" fill="none" stroke="currentColor" opacity=".65"/>
        <text x="108" y="214" text-anchor="middle" font-size="12" fill="currentColor">Item written off</text>
        <rect x="20" y="232" width="176" height="30" rx="3" fill="none" stroke="currentColor" opacity=".65"/>
        <text x="108" y="252" text-anchor="middle" font-size="12" fill="currentColor">Loan · dividend</text>

        <path d="M 196 57 L 236 57 L 236 150 L 272 150" fill="none" stroke="currentColor" opacity=".55"/>
        <path d="M 196 95 L 236 95" fill="none" stroke="currentColor" opacity=".55"/>
        <path d="M 196 133 L 236 133" fill="none" stroke="currentColor" opacity=".55"/>
        <path d="M 196 171 L 236 171" fill="none" stroke="currentColor" opacity=".55"/>
        <path d="M 196 209 L 236 209" fill="none" stroke="currentColor" opacity=".55"/>
        <path d="M 196 247 L 236 247" fill="none" stroke="currentColor" opacity=".55"/>
        <line x1="236" y1="57" x2="236" y2="247" stroke="currentColor" opacity=".55"/>
        <line x1="236" y1="150" x2="272" y2="150" stroke="currentColor" marker-end="url(#bk-a)"/>

        <text x="278" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">POSTED AS</text>
        <rect x="278" y="100" width="216" height="100" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="386" y="126" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Journal Entry</text>
        <text x="386" y="146" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".75">one date · one event</text>
        <line x1="298" y1="158" x2="474" y2="158" stroke="currentColor" opacity=".3"/>
        <text x="330" y="178" text-anchor="middle" font-size="12" fill="currentColor">Debits</text>
        <text x="386" y="178" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">=</text>
        <text x="442" y="178" text-anchor="middle" font-size="12" fill="currentColor">Credits</text>

        <line x1="494" y1="150" x2="546" y2="150" stroke="currentColor" stroke-width="2" marker-end="url(#bk-a)"/>

        <text x="552" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">LANDS IN</text>
        <rect x="552" y="60" width="184" height="180" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="644" y="84" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Ledger Accounts</text>
        <text x="566" y="108" font-size="11.5" fill="currentColor" opacity=".8">Cash Drawer</text>
        <text x="566" y="128" font-size="11.5" fill="currentColor" opacity=".8">Bank</text>
        <text x="566" y="148" font-size="11.5" fill="currentColor" opacity=".8">Accounts Receivable</text>
        <text x="566" y="168" font-size="11.5" fill="currentColor" opacity=".8">Inventory · Fixed Assets</text>
        <text x="566" y="188" font-size="11.5" fill="currentColor" opacity=".8">Payables · Loans</text>
        <text x="566" y="208" font-size="11.5" fill="currentColor" opacity=".8">Revenue · COGS · Expenses</text>
        <text x="566" y="228" font-size="11.5" fill="currentColor" opacity=".8">Equity</text>

        <line x1="736" y1="150" x2="788" y2="150" stroke="currentColor" stroke-width="2" marker-end="url(#bk-a)"/>
        <text x="762" y="142" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".7">read</text>

        <text x="794" y="26" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">REPORTED AS</text>
        <rect x="794" y="88" width="126" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="857" y="113" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">Profit &amp; Loss</text>
        <rect x="794" y="132" width="126" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="857" y="157" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">Balance Sheet</text>
        <rect x="794" y="176" width="126" height="40" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="857" y="201" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">Cash Flow</text>

        <line x1="20" y1="290" x2="920" y2="290" stroke="currentColor" opacity=".15"/>
        <text x="20" y="314" font-size="12" font-weight="600" fill="currentColor">Two consequences worth internalising</text>
        <text x="20" y="336" font-size="11.5" fill="currentColor" opacity=".78">1 · Accrual. Revenue counts when the booking is earned, not when the cash arrives — so P&amp;L will never equal the drawer, and it isn't meant to.</text>
        <text x="20" y="356" font-size="11.5" fill="currentColor" opacity=".78">2 · Dates matter more than entry order. An expense dated last month lands in last month's P&amp;L — unless that month is locked, in which case it is refused.</text>
        <text x="20" y="382" font-size="11.5" fill="currentColor" opacity=".78">Tax is a plug-in seam that is switched off. Until an admin configures a tax pack, gross amounts post in full and no tax is split out.</text>
      </svg>
    </div>
    <figcaption><b>One pipeline, no shortcuts.</b> Because reports are read from ledger accounts, you cannot fix a report by editing a booking — you fix the event, and the report follows.</figcaption>
  </figure>

  <h3>The admin-only money records</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:22%">Record</th><th style="width:40%">When you use it</th><th>What it does to the books</th></tr></thead>
      <tbody>
        <tr><td><b>Opening Balance</b></td><td>Once, when the books start — cash on a chosen date, plus inventory, fixed assets and receivables as they stood.</td><td>Sets the starting equity so every later number means something.</td></tr>
        <tr><td><b>Purchase</b></td><td>Buying stock — a buying price on <b>Items</b>. Buying equipment — a fixed asset on <b>Assets</b>. Both ask "paid with", or "on credit".</td><td>Increases inventory or fixed assets; reduces cash, or creates a payable if bought on credit. There is no separate purchase screen.</td></tr>
        <tr><td><b>Write-off</b></td><td>Dropping an item's quantity or value in <b>Items</b>; disposing a fixed asset in <b>Assets</b>. Not for a suit lost on rental — the replacement sale already handles that one.</td><td>Removes the remaining value from assets and records it as an expense.</td></tr>
        <tr><td><b>Payable</b></td><td>A vendor bill you haven't paid yet.</td><td>Recording it books the expense now; paying it later only moves cash.</td></tr>
        <tr><td><b>Loan</b></td><td>Money borrowed.</td><td>Increases cash on hand — it is <b>not</b> revenue. Repayment reduces cash.</td></tr>
        <tr><td><b>Dividend</b></td><td>Profit paid out to a shareholder.</td><td>Reduces cash and equity. It is <b>not</b> an expense, and it must not be entered as one.</td></tr>
        <tr><td><b>Recurring Expense</b></td><td>Rent, salaries — anything the same every month.</td><td>Posts automatically at 00:10 on its day of the month. Set it once; check it monthly.</td></tr>
      </tbody>
    </table>
  </div>
</section>

<section id="branches">
  <span class="eyebrow">07 — Two shops</span>
  <h2>Separate books, shared customers, movable stock</h2>
  <p class="measure">Jimbaran and Nusa Dua each keep their own stock, cash drawer, staff and P&amp;L. What crosses the line between them is deliberate and short:</p>

  <div class="cols three">
    <div class="card">
      <h3>Customers are shared</h3>
      <p>One company-wide list. Any shop can serve anyone. <b>Origin branch</b> just records who registered them first, so staff can see where a face comes from.</p>
    </div>
    <div class="card">
      <h3>Stock moves by Transfer</h3>
      <p>An available item can change its home branch. It is not a sale and not a write-off — the company still owns it, it just now belongs to the other shop's inventory.</p>
    </div>
    <div class="card">
      <h3>Money never mixes</h3>
      <p>Revenue and expenses belong to whichever branch was selected when the record was created. "All branches" shows the group total <i>and</i> a per-shop breakdown — it never merges the books.</p>
    </div>
  </div>

  <div class="flag stop">
    <span class="flag-t">The branch selector is a write switch, not just a filter</span>
    <p>Whatever shop is showing in the top bar is the shop the next booking, sale or expense is written to. On "All branches" the write still goes somewhere — the shop that account last had selected — so an admin reading the group should switch back to one shop before recording anything. This is the most common way for a month's numbers to go wrong, and untangling it afterwards is an admin job. Make "check the shop name" the first thing every person does when they sit down.</p>
  </div>
</section>

<section id="sheets">
  <span class="eyebrow">08 — The spreadsheet</span>
  <h2>What Google Sheets is, and is not</h2>
  <p class="measure">Each shop has its own spreadsheet, with three kinds of tab: two item tabs and one tab per month of bookings. It exists so the people who think in spreadsheets can read <b>that shop</b>. It is a <b>mirror</b> — and the two directions of that mirror behave completely differently, which is where every misunderstanding starts. Paste the spreadsheet URL on Admin → Branches. Share it with the service account as Editor.</p>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 330" role="img" aria-label="The database pushes item and booking changes to Google Sheets automatically, matching rows by code and by hidden booking ID. The reverse direction only happens when an admin manually runs Bulk Input Sync, and blank cells preserve database values.">
        <defs>
          <marker id="sh-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <rect x="20" y="96" width="190" height="120" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="115" y="130" text-anchor="middle" font-size="14" font-weight="600" fill="currentColor">Database</text>
        <text x="115" y="152" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".75">the record of the shop</text>
        <text x="115" y="176" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".75">what the app reads,</text>
        <text x="115" y="192" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".75">what reports are built from</text>

        <rect x="720" y="96" width="200" height="120" rx="3" fill="none" stroke="currentColor" opacity=".65"/>
        <text x="820" y="130" text-anchor="middle" font-size="14" fill="currentColor">Google Sheet</text>
        <text x="820" y="152" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".75">Suit tab · Acc tab</text>
        <text x="820" y="172" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".75">JAN 2026, FEB 2026, …</text>
        <text x="820" y="196" text-anchor="middle" font-size="11" fill="currentColor" opacity=".55">a mirror, not a source</text>

        <text x="230" y="40" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">AUTOMATIC · EVERY CHANGE</text>
        <path d="M 210 128 L 714 128" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#sh-a)"/>
        <text x="462" y="66" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">item created, renamed, or quantity changed</text>
        <text x="462" y="84" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">→ its row is upserted into the Suit or Acc tab, matched on CODE</text>
        <text x="462" y="118" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">booking or walk-in rental created, edited, or deleted</text>
        <text x="462" y="152" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">→ upserted into that month's tab, matched on the hidden Booking ID column</text>
        <text x="462" y="170" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">→ change the date and the row moves to the other month's tab</text>

        <text x="230" y="244" font-family="ui-monospace, monospace" font-size="11" letter-spacing="1.5" fill="currentColor" opacity=".5">MANUAL ONLY · ADMIN PRESSES A BUTTON</text>
        <path d="M 714 200 L 210 200" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4" marker-end="url(#sh-a)"/>
        <text x="462" y="266" text-anchor="middle" font-size="12" font-weight="600" fill="currentColor">Bulk Input Sync · items only, never bookings</text>
        <text x="462" y="284" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">matched on CODE · blank cells keep the database value · no write-back loop</text>
        <text x="462" y="302" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">reports back created / updated / skipped, with the row number of every rejection</text>

        <line x1="20" y1="228" x2="920" y2="228" stroke="currentColor" opacity=".15"/>
      </svg>
    </div>
    <figcaption><b>Solid arrow constant, dashed arrow on demand.</b> Bookings only ever travel outward — nothing you type into a month tab will reach the shop. Items travel back, but only when an admin runs the import, and only for rows that carry a code.</figcaption>
  </figure>

  <h3>The three tabs</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:18%">Tab</th><th style="width:10%" class="num">Columns</th><th>Layout, in order</th></tr></thead>
      <tbody>
        <tr>
          <td><b>Suit</b><br><span style="color:var(--ink-3);font-size:.85rem">items of type suit</span></td>
          <td class="num"><code>A:T</code></td>
          <td><code>GENDER</code> <code>COLOUR</code> <code>DETAIL</code> <code>MATERIAL</code> <code>CODE</code> <code>SIZE</code> <code>TROUSERS CODE</code> <code>DETAIL SIZE</code> <code>QTY</code> <code>NOTE</code> <code>OWNER</code> <code>CATEGORY</code> <code>SUBCATEGORY</code> <code>BUYING PRICE</code> <code>SELLING PRICE</code> <code>4H PRICE</code> <code>1D PRICE</code> <code>3D PRICE</code> <code>BRAND</code> <code>TYPE</code><br><span style="color:var(--ink-3);font-size:.85rem">GENDER is Mens, Women, Kids, Unisex (the old TYPE column). TYPE is the product kind — suit, shirt, tie, shoes — and maps to items.type. DETAIL is the item name. SIZE is written as "Jas &amp; Celana Size M". 3D PRICE is the standard rental rate. SUBCATEGORY is stored under CATEGORY. BRAND is column S; blank on import defaults to SuitLabs.</span></td>
        </tr>
        <tr>
          <td><b>Acc</b><br><span style="color:var(--ink-3);font-size:.85rem">everything else</span></td>
          <td class="num"><code>A:Q</code></td>
          <td><code>COLOUR</code> <code>BRAND</code> <code>DETAIL</code> <code>CODE</code> <code>SIZE</code> <code>DETAIL SIZE</code> <code>QTY</code> <code>NOTE</code> <code>OWNER</code> <code>CATEGORY</code> <code>SUBCATEGORY</code> <code>BUYING PRICE</code> <code>SELLING PRICE</code> <code>4H PRICE</code> <code>1D PRICE</code> <code>3D PRICE</code> <code>TYPE</code><br><span style="color:var(--ink-3);font-size:.85rem">SIZE is written as "Size M". TYPE is shirt, tie, shoes, vest, belt, accessory, retail. If TYPE is blank, it is inferred from DETAIL (Tuxedo Shirt → shirt).</span></td>
        </tr>
        <tr>
          <td><b>Month</b><br><span style="color:var(--ink-3);font-size:.85rem">one per month, created automatically, named like <code>JAN 2026</code></span></td>
          <td class="num"><code>A:Q</code></td>
          <td>Email Address · Full Name · Phone Number · Booking Date · Product Name · Suit Size · Suit Detail · Booking Guarantee · Appointment Date · Add Ons · Tie · Shoes · <b>Payment</b> · <b>Paid Amount</b> · Status · Remaining Payment · <b>Booking ID</b><br><span style="color:var(--ink-3);font-size:.85rem">Payment is the method (DP Cash, Full Transfer, …); Paid Amount is the money taken, split into its own column so the two are never read as one. Booking ID is the last column and is hidden on purpose — it is how a row is matched on update. A walk-in rental with no booking is exported here too, under its rental id.</span></td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3>Running an item import</h3>
  <ol class="steps">
    <li><b>Edit the sheet, keeping every code intact.</b><span>The code is the item's identity. Changing a code in the sheet does not rename an item — the import will create a second one.</span></li>
    <li><b>Admin › Bulk Input Sync › sync.</b><span>Items only. One shop in the header syncs that shop. All branches lists each spreadsheet — sync one row, or all shops together. There is no import path for bookings, by design.</span></li>
    <li><b>Read the result, not just the headline.</b><span>You get created, updated and skipped counts, plus a row number and reason for every rejection. A row with no code is skipped. A brand-new row also needs name, type, gender, brand and colour before it can be created — on the Suit tab type is assumed, and on the Acc tab a blank TYPE is guessed from the name, so the usual missing one is <b>colour</b>.</span></li>
    <li><b>Check the same numbers on the Financial Report page.</b><span>Every sync run — item imports and monthly exports alike — is logged with its status and row count, and a failed export can be retried there.</span></li>
  </ol>

  <div class="flag care">
    <span class="flag-t">The tab names and column widths live in configuration, not in the app</span>
    <p>Which tabs are read, and how many columns of them, comes from the backend's environment — currently <code>'Suit Dev'!A:T</code> and <code>'Acc Dev'!A:Q</code>. Two consequences. Adding a column past that range puts it <b>outside</b> the synced range, where it will be ignored in both directions. And renaming a tab in the spreadsheet breaks the sync silently until someone updates the configuration to match — so rename in the config first, or not at all.</p>
    <p>Those two ranges each grew by a column when TYPE and GENDER were separated. If a shop's spreadsheet still ends a column short, widen the range in the configuration <b>and</b> nothing else — the next export writes the new headers itself.</p>
  </div>

  <div class="flag ok">
    <span class="flag-t">The old Mens/Women column migrates itself</span>
    <p>A spreadsheet written before the split has one <code>TYPE</code> column holding Mens, Women, Kids or Unisex. On the next export the app recognises that, moves those values into the new <code>GENDER</code> column, and frees <code>TYPE</code> to mean the actual product kind. <b>Do not hand-fix an old sheet first</b> — retyping the header yourself is what turns a clean migration into a column of genders labelled as product types.</p>
  </div>

  <div class="flag stop">
    <span class="flag-t">Things that quietly break a month tab</span>
    <p>Deleting or unhiding and reordering the <b>Booking ID</b> column, sorting a month tab in a way that separates a row from its ID, or hand-editing a booking row — none of it reaches the database, and all of it makes the next automatic update land in the wrong place or duplicate. If a month tab looks wrong, don't repair it by hand: fix the booking in the app, and the row will be rewritten.</p>
  </div>
</section>

<section id="devices">
  <span class="eyebrow">09 — Hardware</span>
  <h2>Devices, printing, and the cash drawer</h2>
  <p class="measure">There is one <b>Print</b> button on every invoice, and it picks its own route from the device it was pressed on — no setting, no choice to get wrong. Knowing which path a device takes is the difference between a two-minute fix and an afternoon.</p>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 330" role="img" aria-label="The print button routes to the Bluetooth Print app on iOS and to the SuitLabs Print Bridge on Android, which also opens the cash drawer. On a desktop nothing prints; the Download button saves the receipt as an image instead. Both phone paths fetch the receipt from the API using the configured API URL.">
        <defs>
          <marker id="dv-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <rect x="20" y="130" width="150" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="95" y="155" text-anchor="middle" font-size="13" font-weight="600" fill="currentColor">Print</text>
        <text x="95" y="173" text-anchor="middle" font-size="11" fill="currentColor" opacity=".7">one button</text>

        <path d="M 170 148 L 220 148 L 220 60 L 268 60" fill="none" stroke="currentColor" marker-end="url(#dv-a)"/>
        <text x="244" y="52" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".7">iPhone / iPad</text>
        <path d="M 170 158 L 220 158 L 220 158 L 268 158" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#dv-a)"/>
        <text x="244" y="150" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".8">Android</text>
        <path d="M 170 168 L 220 168 L 220 262 L 268 262" fill="none" stroke="currentColor" marker-end="url(#dv-a)"/>
        <text x="244" y="282" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".7">laptop</text>

        <rect x="274" y="34" width="216" height="52" rx="3" fill="none" stroke="currentColor" opacity=".7"/>
        <text x="382" y="56" text-anchor="middle" font-size="12.5" fill="currentColor">Bluetooth Print app</text>
        <text x="382" y="74" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".65">"Browser Print" must be enabled</text>

        <rect x="274" y="130" width="216" height="56" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="382" y="153" text-anchor="middle" font-size="12.5" font-weight="600" fill="currentColor">SuitLabs Print Bridge</text>
        <text x="382" y="171" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".7">our own app · saved paired printer</text>

        <rect x="274" y="236" width="216" height="52" rx="3" fill="none" stroke="currentColor" opacity=".7"/>
        <text x="382" y="256" text-anchor="middle" font-size="12.5" fill="currentColor">Browser print dialog</text>
        <text x="382" y="274" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".65">58 mm receipt · or pair for drawer</text>

        <path d="M 490 60 L 540 60 L 540 108 L 600 108" fill="none" stroke="currentColor" opacity=".6" marker-end="url(#dv-a)"/>
        <path d="M 490 158 L 600 158" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#dv-a)"/>
        <path d="M 490 262 L 540 262 L 540 208 L 600 208" fill="none" stroke="currentColor" opacity=".6" stroke-dasharray="4 3" marker-end="url(#dv-a)"/>
        <text x="520" y="300" text-anchor="middle" font-size="10" fill="currentColor" opacity=".6">only once paired</text>

        <rect x="606" y="86" width="150" height="140" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="681" y="112" text-anchor="middle" font-size="12.5" font-weight="600" fill="currentColor">Receipt JSON</text>
        <text x="681" y="132" text-anchor="middle" font-size="11" fill="currentColor" opacity=".75">fetched from the API</text>
        <line x1="622" y1="146" x2="740" y2="146" stroke="currentColor" opacity=".3"/>
        <text x="681" y="168" text-anchor="middle" font-size="11" fill="currentColor" opacity=".75">plain text lines only</text>
        <text x="681" y="186" text-anchor="middle" font-size="11" fill="currentColor" opacity=".75">no barcode, no QR</text>
        <text x="681" y="210" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".6">branch receipt text</text>

        <path d="M 382 186 L 382 214 L 848 214 L 848 190" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#dv-a)"/>
        <rect x="772" y="122" width="150" height="66" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="847" y="146" text-anchor="middle" font-size="12.5" font-weight="600" fill="currentColor">Cash drawer</text>
        <text x="847" y="164" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".7">pulse down the printer's</text>
        <text x="847" y="179" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".7">DK port, then print</text>
        <text x="606" y="240" font-size="10.5" fill="currentColor" opacity=".65">drawer opens on Android, and on a paired laptop — never on iOS</text>

        <line x1="20" y1="308" x2="920" y2="308" stroke="currentColor" opacity=".15"/>
        <text x="20" y="326" font-size="11.5" fill="currentColor" opacity=".75">The phone paths ask the API for the receipt, using the API address baked into the web app at build time. If a phone cannot reach that address, nothing prints. The laptop path prints the receipt already on screen, so it works even when the API is unreachable.</text>
      </svg>
    </div>
    <figcaption><b>Same button, four routes, chosen for you.</b> The order is best-available: bridge on Android, Bluetooth Print on iOS, a paired thermal printer on a laptop, and the browser dialog as the floor that always works. Product labels are the exception — on the item page they go to the Bluetooth Print app on both phone platforms, so printing a label never opens the drawer.</figcaption>
  </figure>

  <div class="flag stop">
    <span class="flag-t">The one setting that breaks printing on every phone at once</span>
    <p>The web app is built with an API address in it, and that address is handed to the printing app on the phone. In the shop it must be the machine's address on the shop network; in production it must be the real HTTPS address. Change it, rebuild the web app, and reinstall or reload on every device — a stale build keeps the old address. A laptop is the exception: it prints what is already on screen, so it keeps working when the phones cannot reach the API.</p>
  </div>

  <div class="flag care">
    <span class="flag-t">Why "Connect printer" sometimes isn't there</span>
    <p>Pairing a printer straight from the browser needs Web Bluetooth, and browsers only expose that on a <b>secure origin</b> — an HTTPS address, or <code>localhost</code>. A laptop pointed at the shop's plain <code>http://192.168.x.x</code> will not show the button at all, by design and not by fault. That laptop still prints through the browser dialog; it just cannot open the drawer. If you want the drawer on a laptop, put the shop on HTTPS.</p>
  </div>

  <h3>Setting up a device</h3>
  <div class="table-wrap">
    <table>
      <thead><tr><th style="width:16%">Device</th><th style="width:42%">One-time setup</th><th>Prints</th></tr></thead>
      <tbody>
        <tr>
          <td><b>Android</b><br><span style="color:var(--ink-3);font-size:.85rem">the counter tablet</span></td>
          <td>Pair the ESC/POS printer in Android Bluetooth settings. Install the SuitLabs Print Bridge, grant Nearby Devices permission, pick the printer, <b>Save printer &amp; continue</b>. Install the Bluetooth Print app too, for labels.</td>
          <td>Receipts and invoices via the bridge — <b>and the cash drawer opens</b>. Labels via the Bluetooth Print app.</td>
        </tr>
        <tr>
          <td><b>iPhone / iPad</b></td>
          <td>Install the Bluetooth Print app, pair the printer inside it, and turn on <b>Browser Print</b> in the app's settings. There is no bridge on iOS.</td>
          <td>Receipts, invoices and labels. The drawer does <b>not</b> open — open it by hand.</td>
        </tr>
        <tr>
          <td><b>Laptop / desktop</b></td>
          <td>Nothing. <b>Print</b> opens the browser's own dialog with the 58&nbsp;mm receipt.</td>
          <td>Whatever printer the computer has, including a USB thermal printer through its driver. No drawer.</td>
        </tr>
        <tr>
          <td><b>Laptop + paired printer</b><br><span style="color:var(--ink-3);font-size:.85rem">Chrome or Edge, on the HTTPS address</span></td>
          <td>Open an invoice, press <b>Connect printer</b>, pick the Bluetooth printer. Lasts for that browser tab — the web platform will not let a page silently reconnect to it later.</td>
          <td>Straight to 58&nbsp;mm paper, <b>and the drawer opens</b>, with the same pulse the Android bridge sends.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <h3>Wiring the drawer</h3>
  <ul class="plain">
    <li>The drawer connects to the <b>printer's DK / RJ11 port</b> with the iWare CD-339 cable — not to the phone, not to a USB port, not to a computer.</li>
    <li>Check the printer's DK output voltage, current rating and pinout against the drawer <b>before</b> connecting it.</li>
    <li>The bridge sends a 100&nbsp;ms on / 200&nbsp;ms off pulse on drawer pin 2, inside the drawer's documented 50–200&nbsp;ms range, then waits 250&nbsp;ms and prints.</li>
  </ul>

  <h3>What is on a printed receipt</h3>
  <ul class="plain">
    <li>A fixed <b>SUITLABS BALI</b> heading, then the <b>branch receipt subtitle, address and phone</b> — those three are edited on the Branches page, so check a real print after any branch edit.</li>
    <li>Invoice number, date, the last eight of the booking id, DP or FULL, payment status, the customer's name, the item lines, and the totals. It closes with a thank-you and <code>suitlabs.bali</code>.</li>
    <li><b>No barcode and no QR code.</b> The only barcode the shop prints is the <b>CODE128 item label</b> from the item detail page — that is what the POS scanner reads. Non-alphanumeric characters are stripped from it.</li>
    <li>Paper is 58&nbsp;mm.</li>
  </ul>

  <div class="flag care">
    <span class="flag-t">When someone says "the printer is connected but nothing prints"</span>
    <p>Work down this order: is the device on the shop network and can it reach the API; is the printer powered, in range, with paper; is it already claimed by <i>another</i> device; and on Android, has the bridge got a saved printer and the Nearby Devices permission. Re-pairing in Bluetooth settings fixes most of it. One printer serves one device at a time — a laptop that has grabbed it with <b>Connect printer</b> is holding it from the tablet until that tab is closed or disconnected.</p>
  </div>
</section>

<section id="close">
  <span class="eyebrow">10 — The monthly close</span>
  <h2>How a month gets shut</h2>
  <p class="measure">Most of it is automatic. Your job is the reconciliation in the middle, and the decision at the end.</p>

  <figure>
    <div class="fig-scroll">
      <svg viewBox="0 0 940 300" role="img" aria-label="Timeline of the monthly close: nightly automatic jobs through the month, the automatic sheet export at 00:20 on the first, then the admin reconciliation steps, ending with locking the month.">
        <defs>
          <marker id="cl-a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/>
          </marker>
        </defs>

        <line x1="20" y1="120" x2="900" y2="120" stroke="currentColor" stroke-width="2" marker-end="url(#cl-a)"/>

        <line x1="120" y1="112" x2="120" y2="128" stroke="currentColor"/>
        <text x="120" y="146" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="currentColor" opacity=".7">EVERY NIGHT</text>
        <text x="120" y="94" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".85">00:05 overdue</text>
        <text x="120" y="78" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".85">00:10 recurring</text>
        <text x="120" y="60" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".55">automatic</text>

        <line x1="300" y1="112" x2="300" y2="128" stroke="currentColor" stroke-width="2"/>
        <text x="300" y="146" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="currentColor" opacity=".7">1st · 00:20</text>
        <text x="300" y="94" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".85">last month exported</text>
        <text x="300" y="78" text-anchor="middle" font-size="11.5" fill="currentColor" opacity=".85">to the Google Sheet</text>
        <text x="300" y="60" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".55">automatic · retry if it failed</text>

        <line x1="470" y1="112" x2="470" y2="128" stroke="currentColor" stroke-width="2"/>
        <text x="470" y="146" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" fill="currentColor" opacity=".7">FIRST WORKING DAYS</text>

        <line x1="760" y1="106" x2="760" y2="134" stroke="currentColor" stroke-width="3"/>
        <text x="760" y="152" text-anchor="middle" font-family="ui-monospace, monospace" font-size="11" font-weight="700" fill="currentColor">LOCK MONTH</text>
        <text x="760" y="94" text-anchor="middle" font-size="11.5" font-weight="600" fill="currentColor">one admin decision</text>
        <text x="760" y="78" text-anchor="middle" font-size="10.5" fill="currentColor" opacity=".6">unlock stays possible, but it is explicit</text>

        <rect x="360" y="176" width="222" height="106" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="374" y="198" font-size="11.5" fill="currentColor" opacity=".85">· no rentals left active</text>
        <text x="374" y="216" font-size="11.5" fill="currentColor" opacity=".85">· every expense in</text>
        <text x="374" y="234" font-size="11.5" fill="currentColor" opacity=".85">· purchases + write-offs posted</text>
        <text x="374" y="252" font-size="11.5" fill="currentColor" opacity=".85">· payables, loans, dividends</text>
        <text x="374" y="270" font-size="11.5" fill="currentColor" opacity=".85">· cash on hand matches reality</text>
        <line x1="470" y1="128" x2="470" y2="172" stroke="currentColor" opacity=".5" marker-end="url(#cl-a)"/>

        <rect x="612" y="196" width="222" height="66" rx="3" fill="none" stroke="currentColor" stroke-width="2"/>
        <text x="626" y="218" font-size="11.5" fill="currentColor" opacity=".85">· read P&amp;L, Balance Sheet,</text>
        <text x="626" y="234" font-size="11.5" fill="currentColor" opacity=".85">  Cash Flow — per shop and group</text>
        <text x="626" y="252" font-size="11.5" fill="currentColor" opacity=".85">· generate the Excel, file it</text>
        <line x1="582" y1="228" x2="606" y2="228" stroke="currentColor" opacity=".5" marker-end="url(#cl-a)"/>
        <path d="M 723 196 L 723 170 L 760 170 L 760 138" fill="none" stroke="currentColor" opacity=".5" marker-end="url(#cl-a)"/>

        <text x="20" y="30" font-size="12" fill="currentColor" opacity=".75">Reconcile first, lock second. Once a month is locked, no journal entry dated inside it can be added, changed or reversed.</text>
      </svg>
    </div>
    <figcaption><b>The lock is the whole point of the exercise.</b> An unlocked month drifts — a backdated expense in March quietly changes a March report you already sent someone. Locking freezes the story.</figcaption>
  </figure>

  <h3>The close checklist</h3>
  <ol class="steps">
    <li><b>Chase the floor first.</b><span>No rental from last month may still be <code>active</code> or <code>pending</code>. Everything is completed or cancelled. This is the item most likely to be outstanding, and it is the one you cannot fix from your own desk.</span></li>
    <li><b>Confirm the expenses are complete.</b><span>Everything paid last month is recorded, dated correctly, with the right payment method. Check the recurring templates actually fired.</span></li>
    <li><b>Post purchases and write-offs.</b><span>Anything bought for the shop, on Items or on Assets; anything scrapped or retired. Suits lost on rental are already off the books — the replacement sale did it — so check rather than re-post, or you will count the loss twice.</span></li>
    <li><b>Settle the liability side.</b><span>Payables paid, loan repayments, any dividend taken. A dividend is not an expense — record it as a dividend.</span></li>
    <li><b>Check the Google Sheets export.</b><span>The Financial Report page lists each monthly run. If one is <code>failed</code>, retry it there.</span></li>
    <li><b>Reconcile cash on hand.</b><span>Count the drawer; pull the bank and EDC statements. Compare against Cash Drawer and Bank in the Balance Sheet. Investigate any gap <b>before</b> the next step, not after.</span></li>
    <li><b>Read the three reports, per shop and for the group.</b><span>P&amp;L, Balance Sheet, Cash Flow. If a number surprises you, find the event behind it now — that option disappears in a moment.</span></li>
    <li><b>Generate the Excel and file it.</b><span>Your durable copy, outside the system.</span></li>
    <li><b>Lock the month.</b><span>From the Financial Report page, with that month selected. Unlocking is possible but should be rare and deliberate — if you find yourself unlocking often, something upstream is broken.</span></li>
  </ol>
</section>

<section id="cadence">
  <span class="eyebrow">11 — Responsibilities</span>
  <h2>Who does what, and when</h2>
  <p class="measure">The rule of thumb: <b>Staff owns the day. Admin owns the month.</b> If an admin is fixing yesterday's counter work every morning, the floor routine has broken down — fix the routine, not the records.</p>

  <h3><span class="chip stf">Staff</span> <span class="chip day">Daily</span></h3>
  <ul class="plain">
    <li>Confirm the shop in the top bar before the first transaction.</li>
    <li>Review today's pickups, today's returns, and the overdue list.</li>
    <li>Run every transaction through the POS as it happens — no paper, no catching up later.</li>
    <li>ID photo on every hand-over; full check on every return before completing.</li>
    <li>Record every expense the same day, with the correct payment method.</li>
    <li>Count the drawer at close and report any difference that night, in writing.</li>
  </ul>

  <h3><span class="chip stf">Staff</span> <span class="chip wk">Weekly</span></h3>
  <ul class="plain">
    <li>Return maintenance items to available once they are actually ready.</li>
    <li>Reconcile item statuses against what is physically on the rack.</li>
    <li>Flag worn-out stock for the admin to decide on.</li>
    <li>Hand over expense receipts.</li>
  </ul>

  <h3><span class="chip stf">Staff</span> <span class="chip mo">Monthly</span></h3>
  <ul class="plain">
    <li>By the first working day: <b>nothing from last month left open.</b> Every rental completed or cancelled, every expense entered.</li>
    <li>Raise anything doubtful <i>before</i> the month is locked.</li>
  </ul>

  <p class="measure" style="color:var(--ink-3);font-size:.93rem">The full counter-level version of this, with screenshots of the flow and a cheat sheet, is the <a href="/dashboard/guides/cashier">Cashier Floor Guide</a>.</p>

  <h3><span class="chip adm">Admin</span> <span class="chip day">Daily</span> <span style="font-size:.85rem;color:var(--ink-3);font-weight:400">— ten minutes</span></h3>
  <ul class="plain">
    <li>Dashboard: today's revenue, active rentals, low stock, maintenance count.</li>
    <li>Overdue rentals — anything more than a day or two old needs a decision, not just a phone call.</li>
    <li>Yesterday's expenses: sensible categories, sensible amounts, correct methods.</li>
    <li>Any drawer discrepancy reported by the floor. Same day, while people still remember.</li>
  </ul>

  <h3><span class="chip adm">Admin</span> <span class="chip wk">Weekly</span></h3>
  <ul class="plain">
    <li>Skim bookings and sales for odd discounts, odd packages, or suspiciously round numbers.</li>
    <li>Check that recurring expenses posted as expected.</li>
    <li>Check the Google Sheets sync status; retry any failed run.</li>
    <li>Review low stock and maintenance backlog — is the same suit stuck in maintenance every week?</li>
    <li>Cash sanity check: does the drawer roughly track the week's cash payments?</li>
  </ul>

  <h3><span class="chip adm">Admin</span> <span class="chip mo">Monthly</span></h3>
  <ul class="plain">
    <li>Run the nine-step close above, in order, and lock the month.</li>
    <li>Compare the two shops side by side: revenue, COGS, expenses, net profit.</li>
    <li>Review the price list and packages against what actually sold.</li>
    <li>Review user accounts — anyone left, anyone changed shops?</li>
  </ul>

  <h3><span class="chip adm">Admin</span> <span class="chip yr">Yearly</span></h3>
  <ul class="plain">
    <li><b>Confirm the opening position.</b> The Opening Balance and the year's first locked month should agree with each other.</li>
    <li><b>Full-year P&amp;L and Balance Sheet</b>, per shop and group. Export and archive.</li>
    <li><b>Fixed asset review.</b> Walk the shop. Anything gone or broken becomes <i>disposed</i>; anything new gets recorded.</li>
    <li><b>Stock take.</b> Physical count against the system, per shop. Write off what is genuinely gone rather than carrying it forever.</li>
    <li><b>Price and package refresh</b> ahead of the wedding season.</li>
    <li><b>Access audit.</b> Every account, every role, every branch assignment. Deactivate the rest.</li>
    <li><b>Tax decision.</b> The tax pack is a seam that is currently switched off; if the business needs PPN handling, that is the moment to configure it — and it changes how every future entry posts.</li>
    <li><b>Reprint worn barcode labels</b> and check the printers, the drawer cable, and the bridge app on each device.</li>
    <li><b>Branch details</b> — receipt text, address, phone, geofence — still correct on every printed invoice.</li>
  </ul>

  <h3><span class="chip adm">Admin</span> <span class="chip ev">One-time · when something changes</span></h3>
  <ul class="plain">
    <li>Opening a shop → create the <b>Branch</b> first, then assign staff to it.</li>
    <li>New hire → create a <b>user</b>, set role Staff, assign only their shop.</li>
    <li>New stock → add <b>items</b> with buying price and selling price, print labels, mark sellable if it can be sold.</li>
    <li>New rent or salary agreement → create a <b>recurring expense</b> rather than remembering to type it monthly.</li>
    <li>Bulk item edits done in the spreadsheet → import them from <b>Bulk Input Sync</b>. Blank cells preserve what is in the database.</li>
  </ul>
</section>

<section id="care">
  <span class="eyebrow">12 — Concerns</span>
  <h2>What actually goes wrong</h2>

  <div class="flag stop">
    <span class="flag-t">Locking a month before reconciling it</span>
    <p>The lock is meant to be the last step, after the cash matches and the reports have been read. Locking early means unlocking later, and every unlock erodes the point of having a close at all.</p>
  </div>
  <div class="flag stop">
    <span class="flag-t">Records written to the wrong branch</span>
    <p>The branch selector decides where writes land. "All branches" is a reading view only: a booking, sale or expense created while it is on quietly lands in <b>the last single shop that account had selected</b>, and nothing on screen says which. Pick a real shop before you record anything. This is the single most expensive habit to let slide.</p>
  </div>
  <div class="flag stop">
    <span class="flag-t">Treating the Google Sheet as the system</span>
    <p>The database is the record; the sheet is a mirror the app writes to. Editing the sheet changes nothing until an admin runs an import — and even then, blank cells preserve existing values rather than clearing them. Anyone who "fixed it in the spreadsheet" has not fixed it.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">Expecting P&amp;L to equal the cash in the drawer</span>
    <p>The books are accrual. Revenue is recognised when the booking is earned; the cash may arrive on a different day, or a different month. Cash on Hand is the number to reconcile against reality — not net profit.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">Dividends and loans entered as revenue or expense</span>
    <p>A loan increases cash but is not income. A dividend reduces cash but is not a cost. Both have their own record for exactly this reason, and getting it wrong distorts profit in a way nobody notices for months.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">Deleting instead of cancelling or voiding</span>
    <p>Cancelled bookings, cancelled rentals and voided expenses stay visible and stop counting. Deletion removes the trail. The same applies to users: deactivate, never delete.</p>
  </div>
  <div class="flag care">
    <span class="flag-t">A lost suit written off twice</span>
    <p>Charging the replacement fee on the return screen is the whole entry: it takes the money, marks the item <code>lost</code>, and relieves its value from inventory in the same posting. Adding a manual write-off afterwards understates profit and inventory for a month nobody will think to re-check. The failure to watch for is the opposite one — a suit that never came back and was never charged at all, so it still sits in stock as available.</p>
  </div>
  <div class="flag">
    <span class="flag-t">Package pricing used as a discount</span>
    <p>A package covers the included items and disables the discount field. Extra pieces marked as add-ons stack on top of the package price. It is a product, not a lever. Watch for staff reaching for it to give a friend a deal.</p>
  </div>
  <div class="flag">
    <span class="flag-t">Renaming categories mid-year</span>
    <p>Categories shape historical reports as well as the current catalogue. Settle the taxonomy, then leave it alone until the yearly review.</p>
  </div>
  <div class="flag">
    <span class="flag-t">Shared logins</span>
    <p>Every record stores who created and last changed it. One shared account turns every question about a mistake into a guess.</p>
  </div>
</section>

<section id="onboard">
  <span class="eyebrow">13 — Bringing someone in</span>
  <h2>The onboarding plan</h2>

  <div class="cols two">
    <div class="card">
      <h3>Onboarding a cashier <span class="chip stf">Staff</span></h3>
      <p><b>Before day 1</b> — create their user with role Staff, assign only their shop, and send them the <a href="/dashboard/guides/cashier">Cashier Floor Guide</a>.</p>
      <p><b>Day 1</b> — log in together. Walk the counter flow diagram. Then take one real booking, one real pickup and one real return with you standing next to them.</p>
      <p><b>Week 1</b> — they run the counter; you review the day's records each evening with them, out loud. Focus on the four habits: right shop, both dates, ID photo, charge before complete.</p>
      <p><b>Week 2</b> — they close the drawer alone and report the count. You still check.</p>
      <p><b>Month 1</b> — they own the month-end floor checklist: nothing left open.</p>
    </div>
    <div class="card">
      <h3>Onboarding an admin <span class="chip adm">Admin</span></h3>
      <p><b>First</b> — they must already understand the floor. Give them the Cashier Floor Guide too, and a shift on the counter.</p>
      <p><b>Then</b> — sections 6 to 8 of this handbook: the journal-entry pipeline, the branch model, the close.</p>
      <p><b>First month end</b> — run the nine-step close together, on a real month. Let them read the reports and find the events behind the numbers.</p>
      <p><b>Second month end</b> — they run it; you watch. They press Lock.</p>
      <p><b>Not yet</b> — hold back the tax pack and opening balance until they have closed two months cleanly. Both are hard to undo.</p>
    </div>
  </div>

  <div class="flag ok">
    <span class="flag-t">The four habits that prevent most problems</span>
    <p><b>1.</b> Check the shop in the top bar before the first transaction. <b>2.</b> Set both dates before choosing items. <b>3.</b> ID photo on every hand-over. <b>4.</b> Charge for damage, lost items and add-ons <i>before</i> completing a rental. Teach these four until they are automatic; everything else can be looked up.</p>
  </div>
</section>

<p class="end">SuitLabs Operations Handbook · Jimbaran &amp; Nusa Dua. Where this page and the screen disagree, the screen is right — and this page needs an edit.</p>

</div>`;
