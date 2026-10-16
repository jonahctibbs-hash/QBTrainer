# QB Trainer — Web version (GitHub Pages)

A static, dependency-free port of the Android app. Everything runs client-side;
`questions.json` ships with the site, so it also works offline once loaded.

## Deploy to GitHub Pages

1. Create a GitHub repository (e.g. `qb-trainer`).
2. Copy the contents of this `webapp/` folder into the repo root:
   `index.html`, `style.css`, `app.js`, `questions.json`, `.nojekyll`
   (`.nojekyll` prevents GitHub from running Jekyll, which would choke on the
   large JSON file's underscores).
3. Repo → Settings → Pages → Source: "Deploy from a branch" → branch `main`,
   folder `/ (root)` → Save.
4. Your site is live at `https://<username>.github.io/qb-trainer/` within a
   minute or two.

To update the question data later: run `fetch_qbreader.py` from the project
root (top 100 answers per bucket, 10 strict-matched tossups each, threaded),
then `_build_tools/backfill_questions.py` to top up underfilled answers, then
`_build_tools/build_distractors.py` to regenerate close distractors (it applies
the hand-authored overrides in `_build_tools/manual_distractors*.py`).
`webapp/test_core.js` smoke-tests the app logic afterwards.

## Settings

- **Top answers per subcategory** slider (1–100): how many of each bucket's
  frequency-ranked answers are eligible for questions (default 30).
- Round length (5–40) and reading speed (100–600 wpm).

You can also run it locally: `python -m http.server` inside `webapp/`, then
open http://localhost:8000.

## Features (parity with the Android app)

- 35,000+ real qbreader tossups, strict main-answer matching, 55
  category/subcategory/alternate buckets, top 100 answers each (slider
  selectable at runtime).
- **Close distractors**: each answer has a precomputed ranked list of
  confusable distractors (same answer type + shared tokens within the same
  category, plus hand-authored sets), with randomized variety per question.
- qbreader-inspired styling with dark/light themes.
- **Two layouts**: *Vertical* (phone-style: Categories → Subcategories →
  Alternate subcategories sections, stacked answer buttons) and *Horizontal*
  (desktop qbreader-style: Categories column with the selected category's
  Subcategories / Alternate subcategories in columns beside it, answers in a
  2×2 grid). Toggle from the home screen.
- Word-by-word reader with speed control, pause, reveal-all, power `(*)`
  highlighting, and auto-scroll.
- Four always-visible choices with type-matched distractors (same answer type
  preferred — country→country, author→author — within the same category).
- Adjustable rounds; play-another-round; difficulty filtering.
- Round-complete page: per-answer results color-coded, weakest answers with
  their subcategory (wraps to a second line when tight).
- Adaptive weighting from your right/wrong history (localStorage).
- Stats screen: study recommendations ("Study these →" applies them),
  per-subcategory accuracy bars, weakest answers, and star/trophy badges
  (85%+ accuracy over 10+ attempts).
- Keyboard: 1–4 select, Space pause, Y reveal, arrows move, Enter submit.
  Gamepad: A select/next, B pause, Y reveal, D-pad move.

## Notes

- Progress is stored in each browser's localStorage; it is per-browser, not
  synced between devices.
- The web app and the Android app keep separate stats.
