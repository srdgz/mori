# MŌRI — Matcha Bar & Culture

**English** | [Español](README.es.md)

**Not just matcha. It's a mood.**

MŌRI is a fictional urban matcha bar in Malasaña, Madrid. It started as a brand and motion design case study and grew into a complete online shop: drink configurator, accounts, cart, Stripe checkout, live order tracking and a store panel where the team runs the day.

**Live site:** [mori-matcha-bar.vercel.app](https://mori-matcha-bar.vercel.app)

![MŌRI home page: "Good matcha. Good mood." headline over an iced matcha latte](docs/screenshots/home-hero.webp)

## Try it

Everything works like a real shop, but nothing is charged and no drink is made.

| What                | How                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Order as a customer | Pick a drink from the menu, check out as a guest and pay with card `4242 4242 4242 4242`, any future date and any CVC |
| Customer account    | On the sign-in page, choose **Try the demo**                                                                          |
| Store panel         | On the sign-in page, choose **See the store panel (demo)**. The demo staff can move example orders but not real ones  |
| Watch an order live | Open your order's tracking link in one window and the store panel in another                                          |

## Screenshots

| Drink configurator                                                                                     | Checkout                                                                                                                            |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| ![Classic Matcha page with size, milk and extras options and the price](docs/screenshots/product.webp) | ![Checkout with Stripe payment and an order summary where 8 stamps make the Strawberry Matcha free](docs/screenshots/checkout.webp) |

| MŌRI card                                                                                                                  | Reviews                                                                                                                          |
| -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| ![Customer account with a full MŌRI card of 8 stamps and a free drink ready to redeem](docs/screenshots/loyalty-card.webp) | ![Classic Matcha reviews: 4.7 average from 6 reviews, each marked as a verified purchase](docs/screenshots/product-reviews.webp) |

| Live tracking                                                                                       | Store panel board                                                                                                  |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| ![Order tracking page with the steps received, preparing and ready](docs/screenshots/tracking.webp) | ![Live order board with columns for new, preparing, ready and completed orders](docs/screenshots/admin-board.webp) |

| Sales dashboard                                                                                          | Product editor                                                                                                               |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ![Dashboard with today's sales, average ticket and sales by hour](docs/screenshots/admin-dashboard.webp) | ![Product editor with Spanish and English copy, price, options and a live card preview](docs/screenshots/admin-product.webp) |

| Pinned horizontal collection                                                                                                     | Menu                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| ![The Matcha Collection: drink cards that scroll sideways while the section stays pinned](docs/screenshots/home-collection.webp) | ![Menu with drink photos, cup colour tags and prices](docs/screenshots/menu.webp) |

![Three phones showing the mobile home page, menu and navigation](docs/screenshots/mobile.webp)

## What it does

### For customers

- **Menu and drink pages** with a configurator: size, temperature, milk, sweetness and extras, with the price updated as you choose. Drinks or ingredients that are sold out today show as such.
- **Cart** that survives reloads and merges with the saved cart when you sign in.
- **Checkout** with pickup slots that fill up (capacity per slot, kept atomic in Postgres) or delivery by postcode with a minimum order, a flat fee and free delivery above 25 €. Coupons and 10 % VAT shown separately.
- **Stripe Payment Element** styled with the brand, confirmed by webhook. Unpaid orders free their slot after 30 minutes.
- **Live tracking** through Neon Realtime, with polling as a fallback, for both account holders and guests with a private link. Emails when the order is ready or out for delivery.
- **Account:** order history and reorder, profile, addresses, favourites, password and account deletion. Sign in with email, Google or a one-click demo account.
- **MŌRI card:** every paid drink earns a stamp. With 8, the customer picks which drink in the order is on us, extras included. Cancellations give the stamps back.
- **Reviews:** customers rate the drinks they've received, from the order page. Reviews show on the drink page as verified purchases.
- **Installable app and push alerts:** a PWA with an offline page, and Web Push alerts when the order is ready or on its way.

### For the store

- **Live board** with one column per step and a button to move each order on. Optional sound alert for new orders.
- **Order detail** with history, an 80 mm printable ticket, cancellation and refunds through Stripe.
- **Catalogue editor** with photo upload to Vercel Blob, "sold out today" switches per drink and per ingredient, and instant menu revalidation.
- **Coupons, opening hours, closed days, slot capacity, delivery zones, customers, reviews and a sales dashboard.**
- **Demo mode:** a staff account that can see everything but only move example orders, which a scheduled job keeps going.

## Design

Matcha brands usually go one of two ways: solemn and ceremonial, or pastel and delicate. MŌRI avoids both: an urban, fresh brand that turns matcha into a small daily ritual.

![MŌRI colour palette: Forest, Matcha, Cream, Charcoal and Sage](docs/palette.svg)

- **Colour:** deep forest green carries the brand, with a single acid matcha accent for highlights, calls to action and data. Cream and paper backgrounds pick up the travertine of the photography.
- **Type:** Space Grotesk for headlines and DM Sans for reading text and interface.
- **Logo:** an emblem (a tea sprout rising out of a bowl) plus the MŌRI wordmark, drawn as vector symbols that take their colour from the context.
- **Motion that paces the story:** line-by-line headlines, a pinned horizontal collection, liquid wave dividers and a footer wordmark that fills as you reach the end. Everything respects "reduce motion".
- **The shop keeps the brand:** cart drawer, checkout, tracking and the store panel use the same tokens, type and tone of voice.

## Architecture

Clean architecture: dependencies only point inwards, and ESLint (`eslint-plugin-boundaries`) fails the build if a layer imports one it shouldn't.

```
src/
├─ core/
│  ├─ domain/          Pure rules: money, cart, options, pickup slots, delivery, coupons, order status, access policies
│  └─ application/     Use cases (PlaceOrder, AdvanceOrderStatus, RefundOrder, GetBoard…) and their ports
├─ infrastructure/     Adapters: Drizzle (Neon), Better Auth, Stripe, Neon Realtime, Vercel Blob, mailers, in-memory
├─ composition/        Builds the use cases with their adapters (server only)
├─ app/[locale]/       Next.js routes, metadata and Server Actions
├─ app/api/            Stripe webhook, tracking, live queries, uploads and scheduled jobs
├─ ui/                 Brand, shop, account, admin, motion and SEO components
└─ i18n/               next-intl routing with localised paths
db/                    Migrations, seed and the least-privilege role
e2e/                   Playwright and axe tests
```

Key decisions (the full list, in Spanish, is in [`docs/00-decisiones.md`](docs/00-decisiones.md)):

- **Server first.** Brand pages and the menu are static Server Components, revalidated when the panel changes the catalogue. Only interaction and motion run on the client.
- **Three layers of permissions.** Domain policies are checked in every use case (100 % tested). Critical operations (create order, confirm payment, change status) are SQL functions that validate transitions and capacity on their own. The app is ready to connect with a Postgres role that can only read and write rows (`db/app-role.sql`).
- **The browser never talks to the database.** Server Actions validate input with zod and call use cases. Guests reach their order only with its tracking token.
- **Realtime without lock-in.** Neon Realtime sealed queries push changes to the board and the tracking page. If Realtime is off, the same screens poll with `ETag` and `304` responses.
- **Scheduled jobs on GitHub Actions** every 15 minutes, because Vercel Hobby cron runs once a day.

## Quality

| Level             | Tool                         | Covers                                                                                             |
| ----------------- | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| Domain            | Vitest                       | 100 % coverage required                                                                            |
| Use cases         | Vitest + in-memory adapters  | Every use case with each role: guest, customer, staff, demo staff and admin                        |
| Adapter contracts | Vitest + PGlite              | The same suite against the in-memory and Drizzle adapters, with the real migrations                |
| Database          | Vitest + Postgres in CI      | SQL functions, constraints and two orders racing for the last place in a slot                      |
| End to end        | Playwright (desktop, mobile) | Buying, accounts, live tracking, the store panel, demo limits, keyboard-only checkout, legal pages |
| Accessibility     | axe in Playwright            | WCAG 2.2 AA on every public page in both languages and every panel page                            |
| Performance       | Lighthouse CI                | Performance, accessibility, best practices, SEO and a JavaScript budget per route                  |

Security: a Content Security Policy limited to Stripe, Vercel Blob and Neon Realtime, HSTS, Stripe webhook signatures, rate limits on sign-in, sign-up, password reset and orders, and no message that reveals whether an email is registered.

### Performance

Lighthouse on the live site, mobile, median of three runs, November 2026:

| Page           | Performance | Accessibility | Best practices | SEO | LCP   |
| -------------- | ----------- | ------------- | -------------- | --- | ----- |
| Home           | 100         | 100           | 100            | 100 | 1.2 s |
| Story          | 98          | 100           | 100            | 100 | 2.3 s |
| Menu           | 100         | 100           | 100            | 100 | 1.1 s |
| Drink page     | 98          | 100           | 100            | 100 | 2.3 s |
| Matcha culture | 100         | 100           | 100            | 100 | 1.1 s |
| Find us        | 100         | 100           | 100            | 100 | 1.1 s |

## Stack

[Next.js 16](https://nextjs.org) (App Router, React 19) · TypeScript · [Tailwind CSS 4](https://tailwindcss.com) · [next-intl](https://next-intl.dev) · [Neon](https://neon.com) Postgres and Realtime · [Drizzle ORM](https://orm.drizzle.team) · [Better Auth](https://www.better-auth.com) · [Stripe](https://stripe.com) · Vercel Blob · Web Push · [GSAP](https://gsap.com) · [Lenis](https://lenis.darkroom.engineering) · zod · Vitest · PGlite · Playwright · axe · Lighthouse CI · GitHub Actions · Vercel

## Running it locally

```bash
npm install
npm run db:local
```

In a second terminal, with `DATABASE_URL` pointing at `postgres://postgres:postgres@127.0.0.1:5433/postgres`:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

`.env.example` lists every variable. Without Stripe keys the checkout explains that payments aren't configured; without Realtime the tracking page polls.

| Script               | What it does                                                  |
| -------------------- | ------------------------------------------------------------- |
| `npm run dev`        | Development server at `localhost:3000`                        |
| `npm run db:local`   | Local Postgres (PGlite) on port 5433, no Docker needed        |
| `npm run db:migrate` | Applies the migrations                                        |
| `npm run db:seed`    | Menu, settings, coupons and demo accounts (safe to run again) |
| `npm run lint`       | ESLint, including the architecture rules                      |
| `npm run typecheck`  | TypeScript checks                                             |
| `npm run test`       | Unit, use case, contract and database tests                   |
| `npm run e2e`        | End-to-end and accessibility tests against a production build |
| `npm run lighthouse` | Lighthouse CI with the budgets in `lighthouserc.json`         |

Node 22 or newer is required.

## Deployment

Vercel builds every push: `main` is production and every pull request gets a preview with its own Neon database branch. The build runs the migrations and the seed before `next build`.

---

MŌRI is a fictional brand created for a portfolio. The address, opening hours and prices are made up, and payments run in Stripe's test mode.
