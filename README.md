# Amsterdam Bingo — shared edition

A live bingo board your whole group can play together. Anyone can create a
board (using the Amsterdam preset or their own squares) and gets a short
code to share. Everyone with the code sees the same board update in near
real time.

## How it works

- **`index.html`** — landing page: create a board or join one by code
- **`board.html`** — the live board itself (reads `?id=XXXXXX` from the URL)
- **`netlify/functions/board.mjs`** — a serverless function that stores each
  board and its checked squares using **Netlify Blobs** (Netlify's built-in
  storage — no extra account or service to sign up for)
- The board page polls the server every 4 seconds, so a square someone else
  taps shows up for everyone shortly after

There's no login — a board's 6-character code *is* the access key. Anyone
with the code or link can view and check squares on that board.

The function is written in Netlify's **modern function format**
(`export default async (req) => {...}`, built on the standard
`Request`/`Response` objects). This matters for Blobs specifically: it's
the format Netlify auto-injects storage credentials into, both locally and
in production, with no extra configuration. The older "Lambda
compatibility" format (`exports.handler = async (event) => {...}`) does
*not* get that automatic injection — if you ever add another function to
this project, write it in the same modern style to avoid storage errors.

## Creating a board

On the landing page, either click "use Amsterdam preset" to fill in the
trip squares, or write your own — one per line, exactly 24 lines (a free
space fills the center automatically). Submitting gives you a code like
`A1B2C3` and takes you straight to the board.

## Local development

**One-time setup:**
```bash
cd amsterdam-bingo-shared
npm install
npx netlify login
npx netlify init
```
`npm install` installs both the function's dependency (`@netlify/blobs`)
and the Netlify CLI itself (`netlify-cli` is a devDependency, so you don't
need it installed globally — that's also why CLI commands need the `npx`
prefix rather than running as a bare `netlify ...`).

`npx netlify init` links this folder to an actual Netlify site (creating
one if you don't have it yet) and writes a small `.netlify/state.json`
file recording the site ID. If it asks about connecting a Git repo, you
can choose to deploy manually instead — you can always connect Git later
for production.

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
the site link, so you'd need to run `npx netlify init` again.)

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
npx netlify deploy --build --prod
```
Run from inside `amsterdam-bingo-shared/`. This builds and deploys straight
from your machine to a live URL.

Either way, production reads and writes to Netlify's real Blobs storage —
separate from whatever you created while running `npm run dev` locally.

## Troubleshooting

**"command not found: netlify":** the CLI is installed locally in this
project, not globally — run it via `npx netlify <command>` (e.g.
`npx netlify status`) rather than a bare `netlify`. `npm run dev` works
without `npx` because npm scripts automatically use the local install.

**`MissingBlobsEnvironmentError`:** make sure `npx netlify init` has been
run and `npx netlify status` shows a linked site, then fully restart
`npm run dev` (environment setup is only read at startup). If it still
happens, check that any function you've added uses the modern
`export default async (req) => {...}` format described above, not the
older `exports.handler` style — that's the one case Netlify doesn't
auto-configure Blobs for.

## Notes

- Boards don't expire automatically — feel free to reuse the same one for
  the whole trip.
- "reset board" clears every checked square for everyone on that board
  (asks for confirmation first).
- If you want a private/single-player version instead, the earlier
  local-storage-only version still works fine for that — this shared
  version is a separate, standalone site.
