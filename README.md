# Amsterdam Bingo — shared edition

A live bingo board your whole group can play together. Anyone can create a
board (using the Amsterdam preset or their own squares) and gets a short
code to share. Everyone with the code sees the same board update in near
real time.

## How it works

- **`index.html`** — landing page: create a board or join one by code
- **`board.html`** — the live board itself (reads `?id=XXXXXX` from the URL)
- **`netlify/functions/board.js`** — a serverless function that stores each
  board and its checked squares using **Netlify Blobs** (Netlify's built-in
  storage — no extra account or service to sign up for)
- The board page polls the server every 4 seconds, so a square someone else
  taps shows up for everyone shortly after

There's no login — a board's 6-character code *is* the access key. Anyone
with the code or link can view and check squares on that board.

## Creating a board

On the landing page, either click "use Amsterdam preset" to fill in the
trip squares, or write your own — one per line, exactly 24 lines (a free
space fills the center automatically). Submitting gives you a code like
`A1B2C3` and takes you straight to the board.

## Deploying to Netlify

This version **needs a build step** to install the `@netlify/blobs`
dependency and bundle the function, so the drag-and-drop uploader
(app.netlify.com/drop) won't work here — use one of these instead:

**Option A — connect a Git repo (recommended):**
1. Push this folder to a new GitHub repo
2. In Netlify: "Add new site" → "Import an existing project" → pick the repo
3. Build command: `npm install` (already set in `netlify.toml`)
4. Publish directory: `.`
5. Deploy — Netlify Blobs works automatically, no setup needed

**Option B — Netlify CLI, no Git required:**
```bash
npm install -g netlify-cli
cd amsterdam-bingo-shared
netlify deploy --build --prod
```
This builds and deploys straight from your machine.

## Notes

- Boards don't expire automatically — feel free to reuse the same one for
  the whole trip.
- "reset board" clears every checked square for everyone on that board
  (asks for confirmation first).
- If you want a private/single-player version instead, the earlier
  local-storage-only version still works fine for that — this shared
  version is a separate, standalone site.
