# TreinoHG

Premium mobile-first calorie & workout tracker. Built with Next.js 14, Supabase, OpenAI Vision, and Tailwind CSS.

> **Disciplina, dados, resultado.**

## Features

- **Daily dashboard** — calorie ring, macros, meals/workouts summaries, AI insight, motivational phrase
- **Calorie tracking** — log meals by type (breakfast/lunch/snack/dinner/pre-workout/post-workout/other) with multiple food entries (kcal + protein/carbs/fat)
- **AI photo analysis** — snap or upload a meal photo, OpenAI Vision identifies foods and estimates kcal/macros, you review/edit before saving
- **Workout logging** — 13 workout types, intensity selector, treadmill time, MET-based calorie burn estimate
- **Day-based history** — every day stored independently with copy-day, prev/next navigation, full meal+workout detail
- **Progress charts** — 7d / 30d trends for calories, net balance, workout minutes
- **AI coach** — conversational Q&A grounded in the user's profile and today's data
- **Auto-calculated targets** — Mifflin-St Jeor BMR → TDEE → calorie target → macro split based on goal
- **Three themes** — Claro, Escuro, Premium (instant switch, persisted to DB)
- **Mobile-first** — bottom navigation, FAB for quick entry, safe-area aware, large touch targets

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router, RSC, Server Actions) |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS variables for theming |
| UI primitives | Radix UI + shadcn-style components |
| Database & Auth | Supabase (Postgres + RLS + Storage) |
| AI | OpenAI-compatible provider (default: FreeModel.dev, `gpt-5.5`) — works with any OpenAI-compatible endpoint |
| Charts | Recharts |
| Forms / Toasts | Sonner |
| Theming | next-themes |
| Deployment | Vercel-ready |

## Project Structure

```
app/
  (auth)/login, (auth)/signup        Auth pages (email + Google)
  auth/callback                      OAuth + email confirmation handler
  (app)/dashboard                    Daily summary
  (app)/meals/add                    Manual meal logging
  (app)/meals/analyze                AI photo analysis
  (app)/workouts/add                 Workout logging
  (app)/history                      30-day list
  (app)/history/[date]               Full day detail (edit/delete/copy)
  (app)/progress                     Charts (7d/30d)
  (app)/insights                     AI coach chat + daily insight
  (app)/profile                      Profile + theme + targets
  api/ai/insight                     GET — daily insight (cached 2h)
  api/ai/analyze-photo               POST — vision analysis
  api/ai/chat                        POST — coach Q&A
components/
  ui/                                Button, Card, Input, Dialog, Tabs, ...
  layout/                            BottomNav, FAB, Header, ThemeToggle
  dashboard/                         CalorieRing, MacroBars, summary cards
  meals/                             AddMealForm, FoodEntryRow, PhotoAnalyzer
  workouts/                          WorkoutTypePicker, AddWorkoutForm
  history/                           HistoryList, DayDetailActions
  progress/                          ProgressCharts
  profile/                           ProfileForm, ThemeSelector
  insights/                          CoachChat, DailyInsightBlock
lib/
  calculations/                      BMR/TDEE, MET-based burn
  openai/                            analyze-photo, insights
  supabase/                          client/server/middleware
  actions.ts                         Server actions (write paths)
  queries.ts                         Server queries (read paths)
  motivational-phrases.ts            25 daily phrases
  constants.ts                       Meal types, workout types, etc.
supabase/
  schema.sql                         Full schema + RLS + triggers
types/
  database.ts                        Profile, Meal, FoodEntry, Workout, ...
```

## Setup

### 1. Install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://wtsdlfjtfromgtfeormn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# AI provider (OpenAI-compatible)
OPENAI_API_KEY=YOUR_FREEMODEL_API_KEY
OPENAI_BASE_URL=https://api.freemodel.dev/v1
OPENAI_MODEL=gpt-5.5

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The AI provider is fully OpenAI-compatible. Swap `OPENAI_BASE_URL` to
`https://api.openai.com/v1` (and `OPENAI_MODEL` to e.g. `gpt-4o`) to use
OpenAI directly — no other code changes required. All AI requests run
server-side from `app/api/ai/*` so the API key is never exposed to the
browser.

### 3. Apply database schema

In your Supabase SQL editor, run the contents of `supabase/schema.sql`. It creates:

- 8 tables (`profiles`, `days`, `meals`, `food_entries`, `workouts`, `meal_photo_analyses`, `ai_messages`, `favorite_foods`)
- Row Level Security policies (`user_id = auth.uid()`)
- An `on_auth_user_created` trigger that auto-creates a profile on signup
- `get_or_create_day(date)` helper

(Optional) Create a public bucket called `meal-photos` if you want hosted photo storage.

### 4. Configure auth providers

In Supabase **Authentication → Providers**:
- Enable **Email** (with or without confirmation, your choice)
- Enable **Google** and set the redirect URL to `https://your-app.com/auth/callback`

### 4a. Configure auth URLs (critical for email confirmation in production)

Email confirmation links are generated by Supabase using the **Site URL**
configured in the dashboard. If that points at `localhost:3000`, the link in
the production email will too — and clicking it from a real user's inbox
fails with `otp_expired` / `access_denied`.

To fix this once and for all:

1. **Vercel → Project → Settings → Environment Variables**, set
   ```
   NEXT_PUBLIC_APP_URL = https://your-app.vercel.app
   ```
   (use your stable production domain, not the per-deployment URL)

2. **Supabase → Authentication → URL Configuration**:
   - **Site URL**: `https://your-app.vercel.app`
   - **Redirect URLs** (add all of these):
     - `https://your-app.vercel.app/auth/callback`
     - `https://your-app.vercel.app/auth-error`
     - `http://localhost:3000/auth/callback` *(dev only)*
     - `http://localhost:3000/auth-error` *(dev only)*

The app reads `NEXT_PUBLIC_APP_URL` via `lib/site-url.ts` and uses it for
every `emailRedirectTo` and OAuth `redirectTo`. The `/auth/callback` route
exchanges the code for a session and redirects to `/dashboard`. Expired or
malformed links are routed to `/auth-error`, which offers a "resend
confirmation" form so the user is never stuck.

### 5. Run

```bash
npm run dev
```

Open http://localhost:3000.

## How calculations work

- **BMR** — Mifflin-St Jeor: `10·weight + 6.25·height - 5·age + (5 if male else -161)`
- **TDEE** — `BMR · activity_factor` (sedentary 1.2 → very active 1.9)
- **Calorie target** — `TDEE · (1 + goal_adjustment)` (lose: −20%, maintain: 0, gain: +10%)
- **Macros** — Protein g/kg by goal (lose 2.2, maintain 1.8, gain 2.0); fat 25% of kcal; carbs balance
- **Workout calories** — `MET · 3.5 · weight_kg / 200 · minutes`, scaled by intensity multiplier

## AI flows

### Photo analysis (`/api/ai/analyze-photo`)
1. Client sends image as data URL or hosted URL
2. Server calls OpenAI Vision with strict JSON system prompt
3. Returns `{ foods[], total_calories, total_protein, total_carbs, total_fat, confidence, summary }`
4. Stored in `meal_photo_analyses` (applied=false) — only marked applied when user saves
5. User can edit any field before confirming

### Daily insight (`/api/ai/insight`)
- Reads profile + today's summary
- Generates a 1–2 sentence coach insight via `gpt-4o-mini`
- Cached for 2 hours per (user, day) in `ai_messages`

### Coach chat (`/api/ai/chat`)
- Grounded in the user's profile and today's totals
- Stored in `ai_messages` for history

## Production checklist

- [x] Auth-protected routes via middleware
- [x] Row Level Security on every table
- [x] Server actions revalidate the right paths
- [x] Server-side validation in actions; client-side UX validation
- [x] No AI auto-save — user always confirms
- [x] Loading + error states for all AI calls
- [x] Mobile-first, safe-area aware, bottom navigation
- [x] Theme persistence in DB + next-themes
- [ ] Add Supabase Storage upload for meal photos (currently photos are sent as data URLs to AI)
- [ ] Add reminders / push notifications
- [ ] Add weekly streak badge polish

## License

Private.
