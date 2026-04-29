# TradeLog Pro

The professional trading journal for crypto, forex, and equities. Premium fintech aesthetic. Real auth. Real database. Real payments.

Built with Next.js 14 (App Router), Supabase (Postgres + Auth), Lemon Squeezy (payments), and Claude (AI Coach).

---

## Quick start

```bash
# 1. Install deps
npm install

# 2. Set up env vars
cp .env.example .env.local
# Then fill in your Supabase, Lemon Squeezy, and Anthropic keys

# 3. Run the database migration in Supabase
# Go to your Supabase project → SQL Editor → paste the contents of
# supabase/schema.sql → Run

# 4. Start the dev server
npm run dev
```

Open <http://localhost:3000>.

---

## What's included

### Public site
- **Landing page** — Hero with mouse-tracking spotlight, ticker tape, features grid, dashboard mockup, comparison table, daily quote, pricing, FAQ, final CTA
- **Pricing page** (`/pricing`) — 3 tiers: Core $19, Pro $25, Prop Trader $30
- **Blog / Journal** (`/blog`) — Editorial blog backed by Supabase, 4 seed posts included
- **Daily Edge** (`/quotes`) — Curated trading wisdom, deterministic daily rotation
- **AI Coach demo** (`/coach`) — Marketing page with sample weekly report
- **Built in Public** (`/public-mrr`) — MRR transparency page with weekly journal
- **Auth** (`/login`, `/signup`) — Split-screen editorial design, Google OAuth + email/password

### Authenticated dashboard
- **Overview** (`/dashboard`) — KPIs, equity curve, daily quote, recent trades, trial countdown
- **Journal** (`/dashboard/journal`) — Full CRUD trade form (symbol, market, direction, entry/exit, fees, strategy, emotion, notes)
- **Analytics** (`/dashboard/analytics`) — Equity curve, P&L by strategy, win/loss split, P&L by emotion
- **Settings** (`/dashboard/settings`) — Account, plan & billing, CSV export, account deletion

### API routes
- `POST /api/checkout` — Creates a Lemon Squeezy checkout session
- `POST /api/webhooks/lemon-squeezy` — Handles subscription events (creates/cancels)
- `POST /api/coach` — Generates an AI Coach weekly report from your trades
- `GET  /api/trades?format=csv` — Exports your full trade history

---

## Setting up the integrations

### 1. Supabase
1. Create a project at <https://supabase.com>
2. Go to **Settings → API**, copy the URL, anon key, and service role key into `.env.local`
3. Open the **SQL Editor**, paste the entire contents of `supabase/schema.sql`, and run it
4. (Optional) Enable Google OAuth at **Authentication → Providers → Google**

### 2. Lemon Squeezy
1. Create an account at <https://lemonsqueezy.com>
2. Create three products: Core ($19/mo), Pro ($25/mo), Prop Trader ($30/mo)
3. Each product has a "variant" — copy each variant ID into `.env.local`
4. Generate an API key under **Settings → API**, paste it into `.env.local`
5. Set up a webhook pointing to `https://yourdomain.com/api/webhooks/lemon-squeezy`, generate a signing secret, paste into `.env.local`

### 3. Anthropic (for the AI Coach)
1. Get an API key from <https://console.anthropic.com>
2. Paste into `.env.local` as `ANTHROPIC_API_KEY`

### 4. Flutterwave (for M-Pesa, optional)
The marketing copy mentions M-Pesa support. To wire this up, integrate Flutterwave's API and replace the Lemon Squeezy checkout call with Flutterwave for users in supported African markets. The architecture supports adding a second payment provider easily — just create `app/api/checkout-mpesa/route.ts` mirroring the Lemon Squeezy route.

---

## Deployment

### Vercel (recommended)
1. Push this repo to GitHub
2. Import the project in Vercel
3. Add all the env vars from `.env.example` to **Settings → Environment Variables**
4. Set `NEXT_PUBLIC_SITE_URL` to your production URL (e.g. `https://tradelog.pro`)
5. Update OAuth redirect URLs in Supabase to match production
6. Update Lemon Squeezy webhook URL to production
7. Deploy

That's it.

---

## Design system

### Colors
- **Backgrounds**: `ink-950` (#070B14), `ink-900` (#0B1220), `ink-800` (#111A2E)
- **Primary accent**: `gold-400` (#C9A227)
- **Text**: `bone-50` (#FAF7F2)
- **Status**: `signal-green` (#3DDC97), `signal-red` (#FF5C5C), `signal-blue` (#5BA3FF)

### Typography
- **Display**: Fraunces (Google Fonts) — distinctive serif with custom SOFT and WONK axes
- **Body**: Instrument Sans — modern, refined sans-serif
- **Mono**: JetBrains Mono — used for tabular data, ticker symbols, labels

These are deliberately non-default font choices to differentiate from typical AI-generated aesthetics.

### Components
- `.btn-gold` — Primary CTA button
- `.btn-ghost-gold` — Secondary outlined button
- `.luxe-card` — Glass-morphism card with subtle gold border
- `.divider-gold` — Editorial hairline divider
- `.text-gold-gradient` — Gold gradient text
- `.pull-quote` — Italic Fraunces serif for emphasis
- `.crosshair-corner` — Decorative gold corner brackets
- `.grain-overlay` — Subtle film grain noise
- `.spotlight` — Mouse-tracking spotlight (used on hero)

---

## Tech stack

- **Framework**: Next.js 14 (App Router, Server Components)
- **Database**: Postgres via Supabase
- **Auth**: Supabase Auth (email + Google OAuth)
- **Payments**: Lemon Squeezy (cards), wire-up-ready for Flutterwave (M-Pesa)
- **AI**: Anthropic Claude (claude-sonnet-4)
- **Styling**: Tailwind CSS with custom design tokens
- **Charts**: Recharts
- **Icons**: Lucide
- **TypeScript**: strict mode

---

## Built in Nairobi

By a trader, for traders. The product the rest of the world forgot to build for the markets that matter.
