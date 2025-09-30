# Customizable Achievements - Findings (read-only report)

Summary
- The codebase includes a robust set of structures and helpers to support customizable (editable) achievement thresholds across multiple sports. The approach centers on parsing and reconstructing labels with numeric thresholds, and wiring those through the grid-building and sharing system.

Key components and how they relate to customization
- Data model for editable achievements
  - client/src/lib/editable-achievements.ts
    - Exports ParsedAchievement with fields:
      - originalLabel, prefix, number, suffix, isEditable
    - Functions:
      - parseAchievementLabel(label, sport): parses a label to identify editable numeric parts
      - generateUpdatedLabel(parsed, newNumber, operator?): creates a new label when the threshold changes
      - createCustomNumericalAchievement(baseAchievement, newThreshold, sport, operator): builds a new custom achievement variant

- UI for editing numeric thresholds
  - client/src/components/editable-achievement-label.tsx
    - Exports:
      - EditableAchievementLabel: renders an inline editable numeric field within a label
      - EditableAchievementLabelNoPlus: variant without a trailing plus in the label
    - Features:
      - Handles input, blur, focus, keyboard enter, and click/mousedown to prevent dropdown interactions
      - Dynamically styles the input depending on editing state
      - Integrates with a callback onNumberChange(newNumber, newLabel)

- Grid customization integration
  - client/src/lib/custom-grid-utils.ts
    - Types:
      - CustomGridState: tracks rows/cols and cell results
      - HeaderConfig: supports customAchievement?: any and operator?: '≥' | '≤'
    - Functions:
      - headerConfigToCatTeam: converts a header config into a CatTeam constraint, with support for custom achievements
      - calculateCustomCellIntersection/getCustomCellEligiblePlayersAsync: compute intersections for cells that involve custom achievements
      - generateCustomCacheKey, customIntersectionCache: memoization for performance
      - updateCustomGridState, isGridValid, isGridSolvable: manage grid validity and solvability with custom thresholds

- Grid sharing/import
  - client/src/lib/grid-sharing.ts
    - exportGrid/importGrid
      - Serializes/deserializes grid definitions, including custom achievements
      - When encountering a custom achievement (base id + value + operator), reconstructs a custom numerical achievement via createCustomNumericalAchievement

- Season-level customization (thresholds per achievement)
  - client/src/lib/season-achievements.ts
    - Defines SeasonAchievement and SeasonAchievementId unions (e.g., AllStar, MVP, DPOY, ROY, etc.)
    - Includes a large set of BBGM_FBGM/Hockey/Baseball Football and season-specific achievements
    - Supports integration with the season index system, including per-season leaders

- Season index building and caching
  - client/src/lib/season-index-cache.ts
    - getCachedSeasonIndex builds or fetches a SeasonIndex using buildSeasonIndex from client/src/lib/season-achievements.ts
    - Includes a simple in-process cache with TTL-like behavior and periodic cleanup

- Shared types and core data structures
  - client/src/types/bbgm.ts
    - CatTeam, Team, Player, CellState, and related types
    - These types are used when converting header configs to constraints and evaluating achievements

- Deterministic hinting and seeds (supporting reproducible behavior)
  - client/src/lib/seeded.ts
    - SeededRandom and helper functions
    - createSeededRandom/grid hint seeds rely on deterministic inputs

What to consider adding next (suggestions)
- Persistence layer for user-customized thresholds, e.g., storing per-user custom achievements in localStorage or backend
- UI components for listing all customizable achievements and editing in bulk
- Extended sport coverage (if needed): add new sports to SeasonAchievementId and ensure their leader logic is wired into season-index
- Tests: unit tests for parseAchievementLabel, generateUpdatedLabel, and createCustomNumericalAchievement
- Documentation: a short README describing how to create and share custom achievements via the grid-sharing system

Notes
- This is a read-only report. No files were modified in this message.
# Plan: Bugfix for 3PT% Season Custom Grid in Create Custom Grid Modal

Summary
- There is a bug where editing the operator or threshold for a 3PT percentage season achievement in the customizable grid does not update the eligibility calculations. This likely stems from not propagating the operator through the onNumberChange path, causing the custom test to be rebuilt with stale parameters or not rebuilt at all.

Root cause hypothesis
- EditableAchievementLabel currently calls onNumberChange(newNumber, newLabel) without passing the operator context.
- The grid logic relies on the operator to recreate the custom achievement test (e.g., using createCustomNumericalAchievement with the correct operator). Without the operator, the test function may continue using the old threshold/operator logic and not reflect changes immediately.
- The caching layer for custom intersections may also cache results keyed by operator; if operator isn’t updated, cached results won’t reflect the new operator/threshold.

What I plan to change
- Change: Propagate operator context through EditableAchievementLabel so the parent can rebuild the custom achievement when number or operator changes.
- Files to modify:
  1) client/src/components/editable-achievement-label.tsx
     - Add an optional operator prop: operator?: '≥' | '≤'
     - Extend onNumberChange signature to: (newNumber: number, newLabel: string, operator?: '≥' | '≤') => void
     - When invoking onNumberChange after edits, pass the operator prop along.
  2) Ensure usage sites pass the operator prop to EditableAchievementLabel where available
     - If needed, adjust any call sites to forward operator so the new third parameter is populated.
- Why this fixes the bug
  - The createCustomNumericalAchievement path already supports an operator and will re-create the test function with the new threshold and operator. By ensuring the operator is always passed through, edits to the operator or threshold will cause a fresh custom achievement to be created, which updates eligibilities immediately rather than relying on stale data or cached results.
- Optional follow-up (if needed after this change)
  - Review the custom grid’s cache keys to ensure operator changes invalidate relevant caches (or rely on the new test function generation to re-run calculations).
  - Add a small regression test to simulate editing 3PT% (Season) with a new threshold and operator and verify computed eligibility updates.
- Testing plan (manual)
  - Open the Create Custom Grid modal.
  - Locate a 3PT% (Season) editable achievement.
  - Change the threshold from 40 to 5 and switch operator to ≤.
  - Verify that the grid cells re-calculate and reflect the new eligible player count, instead of remaining at the previous set.
  - Repeat with operator ≥ and different thresholds to confirm dynamic updates.

Questions for you
- Is it okay to add an optional operator prop to EditableAchievementLabel and pass it through from all usage sites, so we can always re-build the custom achievement when the user changes the threshold or operator?
- If there are existing usage sites that do not pass operator, should we default operator to undefined and rely on the existing non-custom path, or should we enforce passing an operator everywhere for clarity?

Notes
- This plan is scoped to fix the 3PT% (Season) case without changing other behaviors.
- After you approve, I will provide the exact SEARCH/REPLACE blocks to implement these changes.
