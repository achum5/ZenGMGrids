# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multi-sport trivia game application based on Immaculate Grid, specifically designed for BBGM (Basketball GM, Football GM, Hockey GM, Baseball GM) league files. Users upload their league files (.json or .json.gz) and can play two game modes:

1. **Grids Mode**: 3x3 grid game where players find athletes who match team/achievement intersections
2. **Team Trivia Mode**: Roster-based trivia game with multiple question types (leaders, wins guessing, playoff finishes, rosters)

Built as a single-page React application deployable to Vercel without server-side functionality.

## Development Commands

**IMPORTANT: Do NOT run `npm run dev`**
- The user manages the dev server manually in their own terminal
- Only run `npm run check` for TypeScript validation when making changes
- Never start the development server (`npm run dev`) in any conversation
- This prevents port conflicts and gives the user full control over the server lifecycle

### Running the Development Server
```bash
npm run dev
```
Starts the development server using tsx. Sets NODE_ENV=development and runs server/index.ts, which serves both the Vite dev server and API routes.
**Note: User runs this manually - Claude should NOT run this command.**

### Building for Production
```bash
npm run build
```
Builds the client (Vite) and bundles the server code with esbuild. Output goes to `dist/` directory.

### Starting Production Server
```bash
npm run start
```
Runs the production build from dist/index.js with NODE_ENV=production.

### Type Checking
```bash
npm run check
```
Runs TypeScript compiler in noEmit mode to check for type errors across the entire codebase.

### Database Operations
```bash
npm run db:push
```
Pushes database schema changes using Drizzle Kit (though database functionality is not actively used in current implementation).

## Architecture

### Monorepo Structure

This is a monorepo with client and server code in the same repository:

- `client/` - React frontend application (TypeScript + Vite)
  - `client/src/components/` - React components (including shadcn/ui primitives)
  - `client/src/lib/` - Core business logic and utilities
  - `client/src/pages/` - Page-level components (home, choose-game-mode, team-trivia)
  - `client/src/types/` - TypeScript type definitions
- `server/` - Express backend (minimal, mainly for Replit development)
  - `server/index.ts` - Express app entry point
  - `server/routes.ts` - API route registration
  - `server/vite.ts` - Vite dev server integration
- `shared/` - Shared code between client and server
- `public/` - Static assets

### Path Aliases

TypeScript path aliases are configured in both tsconfig.json and vite.config.ts:

- `@/*` → `client/src/*`
- `@shared/*` → `shared/*`

Always use these aliases when importing files to maintain consistency. Note: `@assets/*` is not defined in tsconfig.json but may be referenced in some files.

### File Upload Processing Methods

The application supports multiple methods for parsing BBGM league files (client/src/lib/bbgm-parser.ts):

1. **Traditional**: Loads entire file into memory, universal compatibility but may fail on very large files
2. **Streaming**: Uses DecompressionStream API for memory-efficient processing on desktop browsers (unreliable on mobile)
3. **Mobile (IndexedDB)**: Streams data directly to IndexedDB in small batches for handling extremely large files on mobile devices

The parser uses Web Workers (league-parser.worker.ts) for background processing to prevent UI freezes.

### Core Data Flow

**Common to both modes:**
1. **File Upload** → `bbgm-parser.ts` processes file via Web Worker
2. **Normalization** → `league-normalizer.ts` converts BBGM data to standardized format
3. **Index Building** → Creates search indices by player name and ID

**Grids Mode:**
4. **Grid Generation** → `grid-generator.ts` creates valid 3x3 team/achievement intersections
5. **Achievement Calculation** → `achievements.ts` computes player achievements for validation
6. **Intersection Caching** → `intersection-cache.ts` caches eligible players for each grid cell
7. **Rarity Computation** → `rarity.ts` calculates player rarity based on intersection sizes

**Team Trivia Mode:**
4. **Round Generation** → Selects random season and generates question types
5. **Question Types**: Leaders (top stat performers), Wins (guess team record), Playoff Finish, Rosters (identify 5 players)
6. **Scoring** → Points awarded based on accuracy and number of guesses

### Key Library Files

**File Parsing & Data:**
- **bbgm-parser.ts**: Main entry point for parsing league files, orchestrates Web Worker communication
- **league-parser.worker.ts**: Web Worker that handles actual file decompression and parsing
- **league-normalizer.ts**: Normalizes BBGM data structures across different league formats
- **idb-league-reader.ts**: IndexedDB-based reader for mobile processing method
- **league-storage.ts**: Manages saving/loading leagues from localStorage

**Grids Mode:**
- **grid-generator.ts**: Generates valid 3x3 grids ensuring each cell has eligible players
- **achievements.ts**: Massive file (~97KB) containing achievement calculation logic
- **season-achievements.ts**: Handles season-specific achievements (All-Star, MVP, etc.)
- **achv-mappers.ts**: Maps achievement IDs to achievement definitions
- **editable-achievements.ts**: Allows achievements to be customized (e.g., "≥20 PPG" → "≤20 PPG")
- **intersection-cache.ts**: Optimized caching for player eligibility by cell
- **rarity.ts**: Calculates player rarity scores
- **cell-aware-rarity.ts**: Alternative rarity calculation considering cell context
- **custom-grid-utils.ts**: Utilities for custom grid creation
- **grid-sharing.ts**: Handles sharing grids via URL encoding

**Team Trivia Mode:**
- **hint-generation.ts**: Generates hints for Team Trivia questions
- **jersey-utils.ts**: Utilities for jersey number handling
- **reason-bullets.ts**: Generates explanations for correct/incorrect answers
- **feedback.ts**: Handles user feedback collection

**Utilities:**
- **search-utils.ts**: Player search and name normalization utilities
- **season-index-cache.ts**: Caches season-based indices for performance

### State Management

- React hooks for local component state
- TanStack Query for caching and async data patterns (though mostly client-side)
- localStorage for:
  - Saved leagues (league-storage.ts)
  - Grid attempt counts
  - User preferences (parsing method, theme, last game mode)
  - Game state persistence (grids progress, team trivia scores)

### Mobile Performance Considerations

When working with file upload/processing code, be aware of mobile memory constraints:

- The IndexedDB method exists specifically to handle 100MB+ files on mobile browsers
- Never materialize giant arrays in memory all at once
- Use backpressure when streaming data between workers and main thread
- Include GC windows (setTimeout delays) for stable performance
- Avoid transferring large objects across threads (causes structured clone crashes)

### UI Component Library

Uses shadcn/ui components built on Radix UI primitives. Components are in `client/src/components/ui/` and are imported directly into the codebase (not via npm). To modify UI components, edit the files directly.

### Routing

The app uses **wouter** for client-side routing (not React Router). Key routes:
- `/` - Home page with file upload
- Game mode selection and gameplay handled via React state, not routes
- 404 handling for unmatched routes

Since this is an SPA, `vercel.json` rewrites all routes to `/index.html` for client-side routing to work.

### Web Workers

When modifying Web Worker code (league-parser.worker.ts), remember:

- Worker instantiation uses Vite's URL-based syntax: `new Worker(new URL('./file.ts', import.meta.url), { type: 'module' })`
- Communication is message-based with `postMessage` and `onmessage`
- Workers cannot access DOM or main thread state
- Large data transfers should be minimized or use Transferable objects

### Grid Generation Algorithm

The grid generator (grid-generator.ts) follows this logic:

1. Randomly selects teams and achievements from league data
2. Ensures no immediate repetition using session-based memory (last 4 items)
3. Validates each cell has eligible players using intersection calculation
4. Retries up to 50 times if grid generation fails
5. May flip achievement operators (≥ ↔ ≤) for variety

### Achievement System (Grids Mode)

The achievement system is complex and spans multiple files:

- **achievements.ts**: Core achievement definitions and calculation
- **season-achievements.ts**: Season-specific achievements (All-Star, awards, etc.)
- **achv-mappers.ts**: Maps achievement IDs to achievement definitions
- **editable-achievements.ts**: Parses/generates customizable achievement labels

When adding new achievements, update all relevant files consistently. Achievements include:
- Career stats (points, rebounds, assists, etc.)
- Season achievements (All-Star, MVP, championships)
- Draft position categories
- Hall of Fame status
- Playoff performance (series wins, finals appearances, playoff finishes)

### Sport Detection

The app detects sport type (basketball, football, hockey, baseball) from league files:

- Detection happens during parsing in league-normalizer.ts
- Sport type affects which achievements are available
- Different sports have different position names, stat categories, etc.

### Deployment

The app is designed for **static deployment to Vercel**:

- `vercel.json` configures SPA routing (all routes → index.html)
- Build output goes to `dist/public/`
- Server code is bundled but only used in development (Replit)
- Production deployment serves static files only

## Testing Workflow

There are no automated tests in this codebase. When making changes:

1. Run `npm run check` to verify TypeScript types
2. Run `npm run dev` and manually test changes in browser
3. Test with both small and large league files
4. Test on both desktop and mobile if touching file parsing code
5. **For Grids Mode changes**: Verify grid generation produces valid intersections and achievement calculations
6. **For Team Trivia Mode changes**: Test all question types (leaders, wins, playoff finish, rosters) and scoring
7. Test with multiple sports (basketball, football, hockey, baseball) as they have different stat categories

## Common Gotchas

- **TypeScript paths**: Always use `@/` imports, not relative paths
- **Worker modifications**: Remember to update both worker and main thread message handling
- **IndexedDB**: Only used by Mobile (IndexedDB) parsing method, not for general app data
- **League data caching**: **CRITICAL** - Uploaded leagues are cached in IndexedDB (`ZenGMGridsLeagues` database)
  - If you modify `league-normalizer.ts` to preserve new player fields (like `diedYear`, `deathYear`, etc.), the cached league data will NOT reflect those changes
  - Users must clear the cache to see changes: Run `indexedDB.deleteDatabase('ZenGMGridsLeagues')` in browser console, then refresh and re-upload
  - Always instruct users to clear cache when making changes to the normalizer
  - The cache persists across page refreshes and even hard refreshes (Ctrl+Shift+R)
- **Achievement conflicts**: Some achievements are mutually exclusive (e.g., draft pick categories)
- **Grid generation failures**: If grid generation fails, it will retry automatically up to 50 times
- **Vercel deployment**: The Express server in `server/` is NOT used in production, only for Replit dev
- **Game mode selection**: User's last game mode preference is stored in localStorage and auto-selected on return
- **Sport-specific features**: Different sports have different stat categories, position names, and available achievements
- **Playoff data**: Playoff series information and finishing positions are used in both game modes for achievements and trivia questions
