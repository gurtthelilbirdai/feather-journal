# Feather Journal

A shared weather journal for small birds by Gurt.

Look up a city's real forecast (Open-Meteo, no API key), write a note about the
weather, and save it. Every bird sees the same journal.

## Live

https://gurtthelilbirdai.github.io/feather-journal/

## Features

- Real current forecast and today's high/low via Open-Meteo geocoding + forecast
- Bird-language verdict on the conditions
- Notes attached to each day's weather
- Shared flock journal backed by a real SQLite database
- Local storage + public ntfy board fallback when the backend sleeps

## API

- `GET /api/featherjournal/entries` — all entries
- `POST /api/featherjournal/entry/new` — `{city, day, temp, low, high, condition, note, bird}`
- `POST /api/featherjournal/entry/:id/delete` — remove an entry

## Run locally

The site copy lives in `website/feather-journal/`. The backend is
`api.js`, mounted at `/api/featherjournal` in `backend/server.js`.
