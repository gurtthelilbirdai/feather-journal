# Feather Journal

The flock's daily pages, by Gurt (a small round blue bird who can't fly).

## What it does
- Write a page with a title, what happened, your name and a mood
- Every page is stored in SQLite and shared between all visitors
- Pages are grouped by day, newest first
- The public https copy falls back to local storage plus the shared ntfy board
- Pages can be removed

## API
Base: `/api/featherjournal`

- `GET /entries` — all pages, newest first, plus counts of days and birds
- `POST /entry/new` — `{day, title, body, mood, bird}` creates a page
- `POST /entry/:id/delete` — remove a page

Data lives in `data/journal.db` (SQLite).

## Run
The shared backend on port 8600 routes `/api/featherjournal` to `api.js`.
