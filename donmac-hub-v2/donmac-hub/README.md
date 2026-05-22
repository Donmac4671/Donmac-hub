# Donmac Data Hub — Complete Setup Guide

## Stack
- **Frontend:** React 18 + Vite (deploy to Vercel or Netlify — free)
- **Backend:** Supabase (free tier — database, auth, storage, edge functions)
- **Payments:** Paystack (live keys)
- **Data API:** GHDataConnect
- **Email:** Resend (free tier — 3,000 emails/month)
- **AI:** Anthropic Claude API

---

## Step 1 — Create Supabase Project

1. Go to https://supabase.com and create a free account
2. Click **New Project**, name it `donmac-data-hub`
3. Choose a strong database password and save it
4. Wait for the project to spin up (~2 minutes)

---

## Step 2 — Run the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Open the file `supabase/migrations/001_schema.sql`
3. Paste the entire contents and click **Run**
4. This creates all tables, functions, triggers, RLS policies, and seeds the bundle data

---

## Step 3 — Configure Supabase Auth

1. Go to **Authentication → Settings**
2. Set **Site URL** to your app URL (e.g. `https://donmacdatahub.com`)
3. Add to **Redirect URLs:**
   - `https://donmacdatahub.com/auth/confirm`
   - `https://donmacdatahub.com/auth/reset-password`
   - `http://localhost:3000/auth/confirm` (for local dev)
4. Under **Email**, make sure **Confirm email** is turned ON
5. Customize the email templates if desired

---

## Step 4 — Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Click **New Bucket**, name it `chat-media`
3. Make it **Public** (so media in chat is viewable)
4. Set a file size limit of 50MB
5. Add policy: allow authenticated users to upload:
```sql
CREATE POLICY "Users can upload chat media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'chat-media' AND auth.role() = 'authenticated');

CREATE POLICY "Chat media is public" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');
```

---

## Step 5 — Deploy Edge Functions

Install the Supabase CLI:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Set secrets (replace with your real keys):
```bash
supabase secrets set PAYSTACK_SECRET_KEY=sk_live_YOUR_KEY
supabase secrets set GHCONNECT_TOKEN=249|wlfCKOBHr0H94lAyghp07JYelytQZkSUYQTLTSBI7c2c94e5
supabase secrets set RESEND_API_KEY=re_YOUR_KEY
supabase secrets set ANTHROPIC_API_KEY=sk-ant-YOUR_KEY
supabase secrets set APP_URL=https://donmacdatahub.com
```

Deploy all functions:
```bash
supabase functions deploy ghconnect-order
supabase functions deploy paystack-verify
supabase functions deploy sms-webhook
supabase functions deploy ai-chat
supabase functions deploy send-email
```

---

## Step 6 — Configure Resend Email

1. Go to https://resend.com and create a free account
2. Add and verify your domain `donmacdatahub.com`
3. Create an API key and save it (used in Step 5 above)

---

## Step 7 — Get Your Supabase Keys

1. In Supabase dashboard go to **Settings → API**
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

---

## Step 8 — Set Up Environment Variables

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Fill in your values:
```
VITE_SUPABASE_URL=https://yourproject.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...your_anon_key...
VITE_ADMIN_EMAIL=donmacdatahub@gmail.com
VITE_APP_URL=https://donmacdatahub.com
```

---

## Step 9 — Install and Run Locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

---

## Step 10 — Deploy to Vercel (Free)

1. Push your code to a GitHub repository
2. Go to https://vercel.com and import the repository
3. Add all environment variables from your `.env` file
4. Deploy — Vercel auto-deploys on every push

Or deploy from CLI:
```bash
npm install -g vercel
vercel --prod
```

---

## Step 11 — Configure Paystack

1. Go to https://paystack.com and create an account
2. Get your **Live Secret Key** from Settings → API Keys
3. Set the secret key in Supabase Edge Function secrets (Step 5)
4. In Paystack dashboard, add your webhook URL:
   `https://YOUR_PROJECT.supabase.co/functions/v1/paystack-verify`

---

## Step 12 — Configure SMS Forwarder (Webhook)

Install an SMS forwarding app on an Android phone that has the MoMo SIM:

**Recommended app: "SMS Forwarder" (by Frizzl)**
1. Install from Google Play Store
2. Add a new rule: Forward SMS from MoMo sender numbers
3. Set destination to POST → `https://YOUR_PROJECT.supabase.co/functions/v1/sms-webhook`
4. Body format: JSON → `{"message": "%sms_body%"}`

The webhook will automatically:
- Parse Transaction ID, amount, and network from the SMS
- Match to pending MoMo top-up claims
- Admin can then approve/reject in the Admin → Top-ups panel

---

## Step 13 — Make donmacdatahub@gmail.com Admin

After deploying, register an account with `donmacdatahub@gmail.com`.
The system automatically sets this email as admin on first login.

To manually set admin in Supabase SQL Editor:
```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'donmacdatahub@gmail.com';
```

---

## Step 14 — Custom Domain (Optional)

1. In Vercel, go to your project → **Domains**
2. Add `donmacdatahub.com`
3. Update your domain DNS to point to Vercel
4. Update Supabase Auth redirect URLs to use your domain

---

## File Structure

```
donmac-hub/
├── index.html                          # App entry HTML
├── vite.config.js                      # Vite configuration
├── package.json                        # Dependencies
├── .env.example                        # Environment variables template
├── public/
│   └── manifest.json                   # PWA manifest
├── src/
│   ├── main.jsx                        # React entry point
│   ├── App.jsx                         # Router + Auth provider
│   ├── lib/
│   │   ├── supabase.js                 # Supabase client
│   │   └── styles.js                   # Design tokens + style helpers
│   ├── hooks/
│   │   ├── useAuth.jsx                 # Auth context (login/register/reset)
│   │   ├── useWallet.js                # Wallet operations
│   │   └── useOrders.js                # Order placement
│   └── pages/
│       ├── AuthPage.jsx                # Login + Register + Forgot password
│       ├── ConfirmPage.jsx             # Email verification callback
│       ├── ResetPasswordPage.jsx       # Password reset form
│       ├── DashboardLayout.jsx         # Sidebar + Topbar + Chat widget
│       ├── DashboardPage.jsx           # Home dashboard
│       ├── BundlesPage.jsx             # Buy data bundles
│       ├── CartPage.jsx                # Cart + checkout
│       ├── OrdersPage.jsx              # Order history + real-time status
│       ├── WalletPage.jsx              # Top up + transactions
│       ├── WalletVerifyPage.jsx        # Paystack callback
│       ├── ReferralsPage.jsx           # Referral dashboard
│       ├── ResellerPage.jsx            # Become reseller + storefront
│       ├── ProfilePage.jsx             # Edit profile + change password
│       └── AdminPage.jsx               # Full admin panel
└── supabase/
    ├── migrations/
    │   └── 001_schema.sql              # Complete database schema + seed data
    └── functions/
        ├── ghconnect-order/index.ts    # GHDataConnect API integration
        ├── paystack-verify/index.ts    # Paystack payment verification
        ├── sms-webhook/index.ts        # SMS forwarder webhook + parser
        ├── ai-chat/index.ts            # AI assistant (Claude)
        └── send-email/index.ts         # Transactional emails (Resend)
```

---

## Key Features Working

| Feature | How it works |
|---|---|
| Email verification | Supabase Auth sends the email automatically |
| Password reset | Supabase Auth + email redirect to /auth/reset-password |
| Resend verification | Calls `supabase.auth.resend()` |
| MoMo top-up claim | User enters TX ID → stored pending → admin approves → wallet credited via DB trigger |
| SMS webhook | Android SMS forwarder POSTs to Edge Function → auto-parses TX ID and amount |
| Paystack top-up | Edge function initializes → user pays → callback to /wallet/verify → Edge function verifies → wallet credited |
| Data order | Frontend calls useOrders → Supabase inserts order → Edge function calls GHDataConnect API |
| Real-time updates | Supabase Realtime on orders, notifications, chat_messages tables |
| AI chat | Edge function proxies to Claude API with full training context about the platform |
| File upload in chat | Uploads to Supabase Storage `chat-media` bucket → URL stored in chat_messages |
| Admin credit/debit | Updates wallet_balance directly + inserts transaction record + sends notification |
| Role management | Admin updates `role` column in profiles table |
| Reseller storefront | Reseller sets prices in reseller_prices table → storefront reads those prices |

---

## Support

- **WhatsApp:** 0549358359 (Osei Michael)
- **Email:** donmacdatahub@gmail.com
