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
netlify login
netlify init
```
`npm install` installs both the function's dependency (`@netlify/blobs`)
and the Netlify CLI itself (`netlify-cli` is a devDependency, so you don't
need it installed globally).

`netlify init` links this folder to an actual Netlify site (creating one
if you don't have it yet) and writes a small `.netlify/state.json` file
recording the site ID. **This step is required**, not optional — Netlify
Blobs needs a linked site ID to set up its local storage context, even
though the data itself stays local. Skipping it produces:
`MissingBlobsEnvironmentError: The environment has not been configured to
use Netlify Blobs`. If `netlify init` asks about connecting a Git repo,
you can choose to deploy manually instead — you can always connect Git
later for production.

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
time to wipe your local boards and start fresh. (Deleting it also removes
the site link, so you'd need to run `netlify init` again.)

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

## Troubleshooting

**`MissingBlobsEnvironmentError` even though `netlify link`/`netlify init`
succeeded and `netlify status` shows the site correctly:** this usually
means `@netlify/blobs` in this project's own `package.json` is on a
different major version than the copy bundled inside `netlify-cli`. The
CLI's local dev server sets up the local Blobs context using its own
version; if your function imports an older major version of the same
package, it can't read that context and throws this error even though
everything is linked correctly. Fix: check what version is bundled with
your installed CLI —
```bash
npm ls netlify-cli @netlify/blobs
```
— and set the top-level `@netlify/blobs` dependency in `package.json` to
match that same major version, then `npm install` again.



- Boards don't expire automatically — feel free to reuse the same one for
  the whole trip.
- "reset board" clears every checked square for everyone on that board
  (asks for confirmation first).
- If you want a private/single-player version instead, the earlier
  local-storage-only version still works fine for that — this shared
  version is a separate, standalone site.
