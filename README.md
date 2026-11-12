# Khel Club frontend: Walkover match outcome

Next.js (App Router, JavaScript, MUI + SCSS modules) frontend of the Khel Club tournament system.
Branch `feature/walkover-match-outcome` adds the UI for the **Walkover** outcome introduced in the backend
(`v0_backend`, same branch name). **The full write-up (how scoring works, design, migration, API, assumptions,
future work) is in the backend README**; this file covers the frontend only.

## What a user sees

1. **Referee match screen** (`/referee/<tournament>/matches/<match>`): a **Declare Walkover** button sits under
   the existing Update / Final buttons, and is also offered in the "Match Not Started" prompt (a walkover is
   usually declared before play starts).
2. The **confirmation dialog** lists both teams (id, name, players) as radio options ("Team X wins"), explains that the
   match is finalized without normal scoring and no score is saved, and keeps **Confirm Walkover** disabled until a
   winner is chosen. While submitting it shows "Recording..." and disables the controls; a backend error (for example
   "Match is already completed") is shown inside the dialog, which stays open.
3. On success the match is re-fetched and the screen shows **Status: Completed**, **Outcome: Walkover**, a Walkover
   tag and the winning team highlighted with a Winner label. The score form is gone, so a completed walkover cannot be
   re-scored and there is no "override score" prompt for it. The result survives a page refresh (it comes from the backend).
4. Everywhere else a walkover appears with a **Walkover** badge and the winner (taken from the backend's
   `winner_team_id`, never inferred from scores) instead of a misleading `0-0`:

| View | Behaviour for a walkover |
|---|---|
| Match table (`MatchTable`, tournament "Table" tab) | Badge + "Winner: <players>"; CSV export prints `Walkover - Winner: ...` |
| Referee table (`RefereeMatchTable`) | Badge + winner; no "Override Score" button |
| Fixture cards (`Fixtures`, `TournamentFixtures`, `RefereeFixtures`) | Badge in the info row; score slot shows **Winner** / a dash |
| Brackets (`KnockoutBracket`, `KnockoutBracket2`) | `W/O` next to the winner |
| Organizer pool fixtures (`PoolFixtures`) | Badge, no numeric scores |
| Live overlay (`MatchOverlay`) | `W` / dash with a `WALKOVER` caption; updates live from the `score_update` socket event |
| Organizer `MatchList` | Inspected, unchanged: it never renders results (and calls an `endpoints.getMatches` that does not exist; pre-existing) |

## Changes

| File | Change |
|---|---|
| `src/store/urls.js` | `endpoints.matchOutcome` = `<base>/matches/{match_id}/outcome` (base URL logic unchanged, nothing hard-coded). |
| `src/store/matchOutcome.js` | **New.** Outcome labels (`UNSCORED_OUTCOME_LABELS`; a future outcome such as `forfeit` is one more entry), `isUnscoredOutcome`, a tolerant `parseMatchResult` (the string `"Walkover"` yields zeros instead of `NaN`), `getFixtureWinnerPlayers`, `declareWalkover` (uses the existing `apiCall` helper). |
| `src/components/outcomeBadge/` | **New.** `OutcomeBadge` (pill that reuses the existing status-tag look) and `TeamScore` (score slot of fixture cards). |
| `src/screen/referee/match/Match.js` + `.module.scss` | Walkover button, dialog, state (`walkoverOpen`, `walkoverWinner`, `walkoverSubmitting`, `walkoverError`; the current outcome is `scoreData.outcome_type`), completed-walkover panel. **Finalizing now sends one request** (`/update-score` with `final`), because the backend sets status and outcome itself; the screen used to fire a second, concurrent `/update-match-status` request. 409 errors are shown. |
| `src/components/refereeMatchTable/RefereeMatchTable.js` | Same single-request finalize, tolerant parsing, badge/winner, no override for walkovers. |
| `src/components/matchTable/MatchTable.js` (+ `.scss`) | Badge, winner, CSV text. |
| `src/components/matchOverlay/MatchOverlay.js` | Walkover display; socket handler compares `String(match_id)`s (URL id is a string, the walkover payload id is a number) and updates only result fields for a walkover event. |
| `src/components/fixtures/*.js`, `PoolFixtures.js` | Shared parser replaces three copies of `parseMatchResult`; `outcome_type` carried through; badge / winner / `W/O`. |

No redesign: existing components, MUI dialog and SCSS conventions are reused; new styles are additive.

## Setup

```bash
npm ci --legacy-peer-deps   # the upstream lockfile has a peer-dependency conflict
                            # (@g-loot/react-tournament-brackets wants styled-components@4); plain `npm ci` fails with ERESOLVE
npm run dev                 # http://localhost:3000
npm run build               # production build
```

From `localhost` the app calls the backend on `http://localhost:5001` (see `src/store/urls.js`); run the backend
as described in the backend README.

## Verification

* `npm run build`: **succeeds** (exit code 0, 37 pages generated), run on 2026-11-12 after the changes.
* **Manual browser run** against the real backend and the provided dump: dialog (selection, disabled confirm, loading
  state, backend-error state), completed-walkover view, refresh persistence, match table, standings, knockout bracket
  with `W/O` and final-slot advancement, live overlay update, and regular scoring still working. Details in the backend
  README (section 10).
* **Not available:** the repo has no ESLint configuration (so `next lint` would only start an interactive setup and was
  not run) and no frontend test framework, so there are no automated frontend tests. These are listed as future work.

## Notes and limitations

* A regular completed match still offers the pre-existing "Override Score" flow; only walkovers are locked.
* `match_result` is now the string `"Walkover"` for walkovers. All consumers in this repo use the tolerant parser;
  any external client that splits it on `-` must do the same.
* The screen-recording video is not part of this repository.

---

*Original template notes:* this is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
