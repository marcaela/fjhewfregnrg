# GPT Checkout Generator

A tool to generate ChatGPT subscription checkout links (Plus & Team plans) by proxying ChatGPT's internal payment API.

## Features

- **Plan Selection** — GPT Plus (personal) and GPT Business/Team (up to 5 seats)
- **Payment Methods** — Direct Checkout (short link via ChatGPT) or Stripe Hosted (full Stripe URL)
- **50+ Currency Regions** — Searchable dropdown with country-specific billing
- **Free Trial Support** — Includes `plus-1-month-free` promo campaign for eligible accounts
- **Proxy Support** — Route checkout requests through a proxy to match regional eligibility
- **Usage Stats** — Tracks total, team, and plus generation counts

## Prerequisites

- Node.js 18+ (built-in `fetch` required)

## Setup

```bash
npm install
npm start
```

Server runs at `http://localhost:3000`.

For development with auto-restart on file changes:

```bash
npm run dev
```

## How It Works

1. User opens `chatgpt.com/api/auth/session` while logged in and copies the JSON response
2. Paste the session JSON into the form
3. Select plan, payment method, currency region, and optional proxy
4. Click **Generate** — the backend calls `POST https://chatgpt.com/backend-api/payments/checkout` with the user's access token and returns a checkout link

### Payment Methods

| Method | `checkout_ui_mode` | Result |
|--------|-------------------|--------|
| Direct Checkout | `custom` | Returns `checkout_session_id` → constructs `chatgpt.com/checkout/openai_llc/{id}` |
| Stripe Hosted | `hosted` / `redirect` | Returns full Stripe checkout URL directly |

### Free Trial

The Plus plan includes `promo_campaign_id: plus-1-month-free`. Eligibility depends on:
- Account must never have had Plus before
- Billing region must be in a supported country
- Requesting IP must be in an eligible region (use proxy if needed)

### Proxy

When selecting **Manual Proxy**, enter a proxy address like `103.152.112.166:8080`. Free proxy sources are linked in the UI.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/gpt/stats` | GET | Returns `{ total, team, plus }` generation counters |
| `/gpt/currency` | GET | Returns currency list with `{ key, label, currency }` objects |
| `/gpt/payment` | POST | Generates checkout link — see request body below |

### POST `/gpt/payment`

**Request body:**

```json
{
  "plan": "plus",
  "payment": "shortlink",
  "currency": "Indonesia",
  "session": "eyJhbGci...",
  "proxy": "manual",
  "manualProxy": "103.152.112.166:8080"
}
```

**Response (success):**

```json
{
  "success": true,
  "url": "https://chatgpt.com/checkout/openai_llc/cs_live_..."
}
```

**Response (error):**

```json
{
  "success": false,
  "msg": "Error description"
}
```

## Project Structure

```
cgpt-link/
├── server.js          # Express backend with API endpoints
├── package.json
├── .gitignore
├── stats.json         # Auto-generated (gitignored)
└── public/
    ├── index.html     # Frontend (Tailwind CSS)
    └── app.js         # Frontend JavaScript
```

## License

ISC
