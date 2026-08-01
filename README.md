# ✦ Manifestation Star Map

A private, personal star map for the things you're manifesting. Every intention
you set becomes a star. Watch your sky fill up, revisit your affirmations,
and mark stars as manifested when they come true.

Live at: https://manifestyourlife-one.vercel.app

## What it does

- **Add a star** — write your own intention, or pick one from a small built-in
  library of affirmations (Career, Love, Health, Abundance, Confidence, Peace).
- **Sky view** — every active intention as a star. Stars in the same
  "constellation" (category) are connected with a line. Revisiting a star
  makes it glow bigger.
- **Affirmations view** — a slow, full-screen carousel that cycles through
  your active intentions as affirmations to read.
- **Mark as manifested** — sends the star shooting across the sky with a
  little chime, then moves it to your **Fulfilled Dreams** view.

## Privacy — how your data is kept just yours

This app uses [Supabase](https://supabase.com) for sign-in and storage. Every
star is saved in a database row tagged with your user ID, and a **Row Level
Security (RLS)** policy on the table (see [`supabase/schema.sql`](supabase/schema.sql))
enforces, at the database level, that a user can only ever read or write rows
where `user_id` matches their own signed-in account. Nobody — not another
visitor, not anyone with the site's public URL — can see your stars or
affirmations, including anyone else who deploys or forks this same code.

Sign-in is passwordless (a magic link emailed to you via Supabase Auth), so
there's no password to manage or leak.

The `SUPABASE_ANON_KEY` in `config.js` is meant to be public — Supabase's anon
key is safe to ship in client-side code because the RLS policy above (not the
key) is what actually enforces privacy.

## Tech stack

Deliberately dependency-free: plain HTML, CSS, and JavaScript (ES modules),
no build step, no framework. The only external piece is the
[`@supabase/supabase-js`](https://supabase.com/docs/reference/javascript)
client, loaded straight from a CDN.

- `index.html` — page shell
- `style.css` — all styling and animations
- `app.js` — app logic (auth, rendering, star map state)
- `config.js` — your Supabase project URL + anon key
- `supabase/schema.sql` — the database table and privacy policy

## Setup

### 1. Create a free Supabase project

1. Go to [supabase.com](https://supabase.com) and create a project (free tier
   is enough).
2. In the SQL Editor, paste and run the contents of
   [`supabase/schema.sql`](supabase/schema.sql). This creates the `stars`
   table and the privacy policy.
3. In **Authentication → Providers**, make sure **Email** is enabled (it is
   by default). Passwordless "magic link" sign-in works out of the box.
4. In **Authentication → URL Configuration**, add the URL you'll deploy this
   site to (and `http://localhost:3000` for local testing) under **Redirect
   URLs**, so the magic-link email can send people back to the right place.
5. In **Project Settings → API**, copy your **Project URL** and **anon
   public** key.

### 2. Configure the app

Edit `config.js` and paste in your values:

```js
export const SUPABASE_URL = "https://your-project-ref.supabase.co";
export const SUPABASE_ANON_KEY = "your-anon-public-key";
```

### 3. Run it locally

Any static file server works, for example:

```bash
npx serve .
```

Then open the printed `localhost` URL.

### 4. Deploy

This is a static site, so it deploys anywhere that serves static files —
GitHub Pages, Vercel, Netlify, etc. Just make sure the deployed URL is also
added to Supabase's **Redirect URLs** (step 1.4 above), or the magic-link
sign-in won't be able to send people back to your site.

## Using it yourself

If you want your *own* completely separate star map (not shared with anyone
who might use this same deployment), the easiest path is to create your own
Supabase project and deploy your own copy of this repo with your own
`config.js`. Because privacy is enforced per Supabase project + per
authenticated user, everyone gets their own private sky either way — but a
separate deployment also gives you your own custom URL.
