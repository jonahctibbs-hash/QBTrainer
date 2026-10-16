# QB Trainer

A fast, offline-capable quiz bowl trainer built on real qbreader tossups.
Everything runs client-side in the browser; `questions.json` ships with the
site, so it also works offline once loaded.

Live site: https://jonahctibbs-hash.github.io/QBTrainer/

## How it works

- 35,000+ real qbreader tossups, strict main-answer matching, 55
  category/subcategory/alternate buckets, top 100 frequency-ranked answers
  each (selectable at runtime).
- **Close distractors**: each answer has a precomputed ranked list of
  confusable distractors (same answer type + shared tokens within the same
  category, plus hand-authored sets), with randomized variety per question.
- qbreader-inspired styling with dark/light themes.
- Word-by-word reader with speed control, pause, reveal-all, power `(*)`
  highlighting, and auto-scroll.
- Four always-visible choices.
- Adjustable rounds; play-another-round.
- Adaptive weighting from your right/wrong history (localStorage).
- Stats page: study recommendations ("Study these →" applies them),
  per-subcategory accuracy bars, weakest answers, and star/trophy badges
  (85%+ accuracy over 10+ attempts).

## Keybinds

Every binding is editable on the in-app **Keybinds** page (`K` from home).

- **All pages**: Esc back/exit
- **Home**: S stats · K keybinds · A select all · C clear · T theme ·
  Enter start round · arrows navigate tiles and sliders · Space check/uncheck
  (on a slider: Space enters edit mode, ←/→ adjust, Space confirms)
- **Questions**: 1–4 select · P pause · A reveal all · ↑/↓ move · Enter submit ·
  Esc exit
- **Round complete**: Enter play again · Esc done
- **Stats**: S study these
- Gamepad also works: A select/next, B pause, Y reveal, D-pad move.

## Settings

- **Top answers per subcategory** slider (1–100): how many of each bucket's
  frequency-ranked answers are eligible for questions (default 30).
- Round length (5–40) and reading speed (100–600 wpm).

## Deploying (GitHub Pages)

The site is published from this folder's contents (repo root):
`index.html`, `style.css`, `app.js`, `questions.json`, `.nojekyll`
(`.nojekyll` prevents GitHub from running Jekyll, which would choke on the
large JSON file's underscores).

1. Repo → **Settings** → left sidebar **"Pages"** (under "Code and automation").
2. Under **"Build and deployment"**, set **Source** to **"Deploy from a branch"**.
3. Branch: `main`, folder: `/ (root)` → **Save**.
4. The site builds within a minute or two; the URL appears at the top of that
   same Pages settings page.

To update: change files, bump the `?v=N` cache-busters in `index.html` when
`app.js`/`style.css` change, commit, and push — Pages redeploys automatically.

## Notes

- Progress is stored in each browser's localStorage; it is per-browser, not
  synced between devices.
- To develop locally: `python _build_tools/serve.py` from the project root,
  then open http://localhost:8613/webapp/index.html (caching disabled).
