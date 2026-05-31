# ChessEngineered

Next.js application for studying chess openings with interactive training, puzzles, progress tracking, Supabase authentication, and Stripe subscriptions.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000/openings](http://localhost:3000/openings).

## Verification

```bash
npm run build
npm run test:smoke
```

The smoke test starts the production server and checks the main Next.js routes and static assets used by nested trainer pages.

## Structure

- `src/app`: Next.js routes.
- `src/components`: shared React components.
- `src/context`: application state and Supabase synchronization.
- `src/modules`: trainer logic and the DOM compatibility adapter.
- `src/lib/cm-chessboard-src`: vendored chessboard implementation.
- `public`: catalog, puzzles, board assets, images, and sounds.
- `supabase`: database migrations and Edge Functions.

The trainer is served through Next.js. `src/modules/legacy-trainer-app.js` is an explicit compatibility adapter for the DOM-based training engine and owns its browser lifecycle.

## Backend Setup

See [GOOGLE_AUTH_SETUP.md](./GOOGLE_AUTH_SETUP.md) and [STRIPE_SETUP.md](./STRIPE_SETUP.md). Deploy Supabase changes with `./deploy.sh`.
