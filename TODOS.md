# TODOS — no-more-fault

Last updated: 2026-04-03 (A+B feature PR)

---

## PR: A+B — 바이럴 공유 + 서브 기록

Design doc: `~/.gstack/projects/nomorefault-/starload_jo-main-design-20260403-013626.md`
Eng review: `~/.gstack/projects/nomorefault-/starload_jo-main-eng-review-20260403.md`

### New files (can start in parallel)

- [ ] `src/utils/angles.ts` — `angleBetween(a, b, c)` pure angle function (degrees)
- [ ] `src/utils/verdict.ts` — BWF 1.15m height calc → PERFECT / FAULT / VAR_CHALLENGE
- [ ] `src/utils/history.ts` — `saveHistory()`, `loadHistory()`, `deleteHistoryEntry(id)` (nmf_history key)
- [ ] `src/utils/shareCard.ts` — Canvas 1200×630 PNG card generator

### Bug fixes (baked into feature implementation)

- [ ] `src/store/useStore.ts` — add `poseLandmarks: any[] | null` + `setPoseLandmarks`
- [ ] `src/components/AnalysisWizard.tsx` — fix netBase/netTop/ground destructuring (lines 8-12), remove step 6 confirm button (line 129)
- [ ] `src/pages/AnalysisSetup.tsx` — useMemo URL fix, store landmarks after drawSkeleton, verdict calc + navigate with state
- [ ] `src/pages/Camera.tsx` — update silent catch to console.warn

### New pages

- [ ] `src/pages/Result.tsx` — auto-save to history, verdict display, share card button
- [ ] `src/pages/History.tsx` — list view + bar chart (< 3 entries = list only)

### Wiring

- [ ] `src/App.tsx` — add `/result` → Result, `/history` → History routes

---

## Backlog (v2)

- [ ] 60fps → 15fps throttle after wizardStep > 4
- [ ] Player tagging for 2-person sessions
- [ ] Ad banner slots in History (every 5 items)
