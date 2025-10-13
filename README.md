## SuitLabs Frontend (Next.js)

Dashboard UI for SuitLabs. Built with Next.js App Router and Tailwind.

## Getting Started

```bash
npm install
npm run dev
# open http://localhost:3000
```

## Environment

The frontend reads the API base URL from `NEXT_PUBLIC_API_BASE_URL` (default proxied to the backend via Next.js API routes).

## Key Flows

### Rentals
- Create from booking: Dashboard ➜ Rentals ➜ Create Rental ➜ select a confirmed booking, set rental and return dates. The modal previews booked items.
- Pick up (activate): In the rentals list or details, for `pending` rentals press “Pick up” to call `PUT /api/v1/rentals/:id/activate`.
- Change dates: “Change Dates” updates timestamps via `PUT /api/v1/rentals/:id/change-dates`. Same‑day rentals are allowed.
- Complete: “Complete Rental” supports optional actual return date, damage notes/charges, and optional “send to maintenance.” Shows printable invoice on success.
- Status display: UI auto-badges `overdue` when `status === 'active' && now > return_date`; actions are same as active. `completed` and `cancelled` are read‑only.

### Items Availability
- Items page accepts combined filters (barcode, category, etc.) plus date range (`rentalDate`, `returnDate`) using `/api/v1/items/available`.

## Components
- `SimpleModal` is wide and scrollable by default.
- `RentalDetailsModal` has compact summary, expandable two‑column layout, and print‑optimized landscape CSS. Use “View Invoice” for completed rentals.

## Notes
- Dates are sent as ISO strings. The UI normalizes date inputs to full timestamps.
- Late fee rate is configured in backend `.env` via `LATE_FEE_RATE` and reflected in invoices.
