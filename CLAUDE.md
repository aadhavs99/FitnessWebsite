# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A minimal fitness-tracking app: users register/log in, log exercises with rep counts, and see a shared leaderboard. Two independent halves live in the same `package.json`/repo:

- **Backend**: single-file Express API (`index.js`) with Mongoose models (`models/`), talking to MongoDB Atlas.
- **Frontend**: Create React App SPA (`src/`) with three routed pages (`src/pages/`).

There is no shared build step between them — they are started separately (see Commands) and communicate over HTTP, with the frontend hardcoded to call `http://localhost:1337`.

## Commands

```bash
npm run dev     # start the backend (nodemon index.js), listens on port 1337
npm start        # start the frontend (react-scripts start / CRA dev server)
```

- There is no `build` script defined, despite `react-scripts` being present.
- `npm test` is a stub (`echo "Error: no test specified" && exit 1`) — there is no real test suite in this repo.
- Both halves must be run concurrently in separate terminals during development; the frontend does not proxy or manage the backend process.

## Architecture

### Backend (`index.js`)

Everything — routes, auth middleware, and the Mongo connection — lives in this one file. Key pieces:

- `mongoose.connect(...)` — connects directly to a hardcoded MongoDB Atlas URI (including credentials) at the top of the file. `JWT_SECRET` is also hardcoded. Treat both as sensitive; don't copy this pattern into new code, and flag if asked to add more secrets this way.
- `authenticateToken` middleware — verifies a `Bearer` JWT (24h expiry) from the `Authorization` header and attaches the decoded payload to `req.user`. Only `/api/exercise` currently uses it; `/api/register` and `/api/login` are unauthenticated by nature.
- Routes:
  - `POST /api/register` — creates a `User` document with an empty `logs` array, after checking for a duplicate email.
  - `POST /api/login` — verifies email/password against Mongo (plaintext comparison, no hashing), flips `logged: true`, and returns a signed JWT plus the raw user document.
  - `POST /api/exercise` — authenticated. Looks up the user from the verified token (not the request body) and pushes a `{ exercise, reps, date }` entry onto `user.logs`.
  - `POST /api/leaderboard` — unauthenticated, computed on read via two Mongoose aggregation pipelines over all users' `logs` (no incrementally-maintained leaderboard document): `lifetime` sums reps per `username`+`exercise` across all history; `dailyAverage` sums reps per `username`+`exercise` logged within the trailing 365 days and divides by 365. Both are sorted descending and returned as flat arrays of `{ username, exercise, reps }`.

### Data models (`models/`)

- `user.model.js` — `UserData` (collection `user-data`): `username`, `email`, `password` (plaintext), `logs` (array of `{ exercise, reps, date }` subdocuments — the append-only exercise history the leaderboards aggregate over), `logged` boolean.

### Frontend (`src/`)

- `App.js` — top-level router (`react-router-dom`) with three routes: `/login`, `/register`, `/dashboard`. No route guards other than `Dashboard`'s own check.
- `pages/Login.js`, `pages/Register.js` — plain fetch calls to the backend; on success, `Login` stores the JWT in `localStorage` under `token`.
- `pages/Dashboard.js` — redirects to `/login` if no token is present; sends the stored token as a `Bearer` header when logging exercises; clears the token and redirects on a 401/403 (expired/missing session). Fetches `/api/leaderboard` on mount and after each successful log, and renders the `lifetime` and `dailyAverage` arrays as two tables.
- All API calls use absolute `http://localhost:1337` URLs rather than a relative path or env-configured base — backend host/port changes require updating each page.
