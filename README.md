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

## Local development

The Netlify CLI runs the whole site locally — static pages, the function,
and Blobs storage — using a sandboxed local store that's completely
separate from production. Nothing you do locally touches the real,
deployed board data.

**One-time setup:**
```bash
cd amsterdam-bingo-shared
npm install
```
This installs both the function's dependency (`@netlify/blobs`) and the
Netlify CLI itself (`netlify-cli` is a devDependency, so you don't need it
installed globally).

**Run it:**
```bash
npm run dev
```
This starts a local server, normally at **http://localhost:8888**. Open
that in your browser — creating and joining boards, toggling squares, and
the live polling all work exactly like production, just talking to a local
Blobs store on disk instead of Netlify's servers.

Local blob data lives in a `.netlify/` folder that gets created
automatically (already excluded via `.gitignore`) — delete that folder any
time to wipe your local boards and start fresh.

*Optional:* if you want local dev to mirror your real Netlify site even
more closely (e.g. picking up the same environment variables), run
`netlify link` once to connect this folder to your deployed site. It isn't
required — `npm run dev` works fine unlinked.

## Production deployment (Netlify)

This site needs a build step to install `@netlify/blobs` and bundle the
function, so the drag-and-drop uploader (app.netlify.com/drop) won't work
here — use one of these instead:

**Option A — connect a Git repo (recommended):**
1. Push this folder to a new GitHub repo
2. In Netlify: "Add new site" → "Import an existing project" → pick the repo
3. Build command: `npm install` (already set in `netlify.toml`)
4. Publish directory: `.`
5. Deploy — Netlify Blobs works automatically in production, no setup needed

**Option B — Netlify CLI, no Git required:**
```bash
netlify deploy --build --prod
```
Run from inside `amsterdam-bingo-shared/`. This builds and deploys straight
from your machine to a live URL.

Either way, production reads and writes to Netlify's real Blobs storage —
separate from whatever you created while running `npm run dev` locally.

## Notes

- Boards don't expire automatically — feel free to reuse the same one for
  the whole trip.
- "reset board" clears every checked square for everyone on that board
  (asks for confirmation first).
- If you want a private/single-player version instead, the earlier
  local-storage-only version still works fine for that — this shared
  version is a separate, standalone site.
