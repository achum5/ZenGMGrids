# 3PT% Eligibility helper and season-accessor documentation

What I added
- client/src/lib/three-point-eligibility.ts
  - Exposed isThreePtEligibleForSeason(params, statsBySeason) to determine if a player hit a configurable 3-point percentage threshold for a given season.
  - Defaults threshold to 0.05 (5%).

- client/src/lib/season-achievements.ts
  - Exposed getThreePtPctBySeason(player: Player): Record<number, number> which returns per-season 3P% (threesMade / threesAtt) using available stats fields.
  
Intended usage
- Use isThreePtEligibleForSeason within a season-specific 3PT% achievement test instead of inline calculations.
- Drive the threshold from editable-achievements.ts so admins can customize per-season thresholds without code changes.

Integration notes
- Ensure per-season stats used by the helper expose threesMade and threesAtt fields, or fallback mappings (tpm/tpa or tp/ tpa depending on data).
- Wire getThreePtPctBySeason into UI or reports if you need to inspect players’ seasonal 3PT% values.
- Consider caching the per-season 3PT% values in the SeasonIndex when computing season indices.

Migration steps (suggested)
- Update client/src/lib/achievements.ts: replace 3PT% season logic with a call to isThreePtEligibleForSeason(params, statsBySeason) for the chosen threshold.
- Extend client/src/lib/editable-achievements.ts ParsedAchievement to hold threshold for the 3PT% season test if not already present.
- Ensure tests exist for threshold boundaries (e.g., 4.9%, 5.0%, 5.1% depending on inclusive/exclusive rules).

Notes
- If you have existing 3PT% season achievements, you may want to deprecate the old inline logic and migrate to the helper with a configurable threshold.

What to review
- Are your per-season stats shape compatible with threesMade and threesAtt? If not, adapt the helper to compute from tpm/tpa fields when needed.

No changes have been committed yet in this doc block; review and approve to apply via a SEARCH/REPLACE block.
