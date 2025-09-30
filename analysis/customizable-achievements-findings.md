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
