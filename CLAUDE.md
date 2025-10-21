# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a client-side basketball game based on Immaculate Grid, specifically designed for Basketball GM (BBGM) league files. Users upload their BBGM league files (.json or .json.gz) and play an interactive 3x3 grid game where they need to find players who match team intersections. Built as a single-page application deployable to Vercel without server-side functionality.

## Development Commands

### Running the Development Server
```bash
npm run dev
```
Starts the development server using tsx. Sets NODE_ENV=development and runs server/index.ts, which serves both the Vite dev server and API routes.

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
  - `client/src/pages/` - Page-level components
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
- `@assets/*` → `attached_assets/*`

Always use these aliases when importing files to maintain consistency.

### File Upload Processing Methods

The application supports multiple methods for parsing BBGM league files (client/src/lib/bbgm-parser.ts):

1. **Traditional**: Loads entire file into memory, universal compatibility but may fail on very large files
2. **Streaming**: Uses DecompressionStream API for memory-efficient processing on desktop browsers (unreliable on mobile)
3. **Mobile (IndexedDB)**: Streams data directly to IndexedDB in small batches for handling extremely large files on mobile devices

The parser uses Web Workers (league-parser.worker.ts) for background processing to prevent UI freezes.

### Core Data Flow

1. **File Upload** → `bbgm-parser.ts` processes file via Web Worker
2. **Normalization** → `league-normalizer.ts` converts BBGM data to standardized format
3. **Index Building** → Creates search indices by player name and ID
4. **Grid Generation** → `grid-generator.ts` creates valid 3x3 team/achievement intersections
5. **Achievement Calculation** → `achievements.ts` computes player achievements for validation
6. **Intersection Caching** → `intersection-cache.ts` caches eligible players for each grid cell
7. **Rarity Computation** → `rarity.ts` calculates player rarity based on intersection sizes

### Key Library Files

- **bbgm-parser.ts**: Main entry point for parsing league files, orchestrates Web Worker communication
- **league-parser.worker.ts**: Web Worker that handles actual file decompression and parsing
- **league-normalizer.ts**: Normalizes BBGM data structures across different league formats
- **idb-league-reader.ts**: IndexedDB-based reader for mobile processing method
- **grid-generator.ts**: Generates valid 3x3 grids ensuring each cell has eligible players
- **achievements.ts**: Massive file (~97KB) containing achievement calculation logic
- **season-achievements.ts**: Handles season-specific achievements (All-Star, MVP, etc.)
- **intersection-cache.ts**: Optimized caching for player eligibility by cell
- **rarity.ts**: Calculates player rarity scores
- **custom-grid-utils.ts**: Utilities for custom grid creation
- **editable-achievements.ts**: Allows achievements to be customized (e.g., "≥20 PPG" → "≤20 PPG")

### State Management

- React hooks for local component state
- TanStack Query for caching and async data patterns (though mostly client-side)
- localStorage for:
  - Saved leagues (league-storage.ts)
  - Grid attempt counts
  - User preferences (parsing method, theme)
  - Game state persistence

### Mobile Performance Considerations

When working with file upload/processing code, be aware of mobile memory constraints:

- The IndexedDB method exists specifically to handle 100MB+ files on mobile browsers
- Never materialize giant arrays in memory all at once
- Use backpressure when streaming data between workers and main thread
- Include GC windows (setTimeout delays) for stable performance
- Avoid transferring large objects across threads (causes structured clone crashes)

### UI Component Library

Uses shadcn/ui components built on Radix UI primitives. Components are in `client/src/components/ui/` and are imported directly into the codebase (not via npm). To modify UI components, edit the files directly.

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

### Achievement System

The achievement system is complex and spans multiple files:

- **achievements.ts**: Core achievement definitions and calculation
- **season-achievements.ts**: Season-specific achievements (All-Star, awards, etc.)
- **achv-mappers.ts**: Maps achievement IDs to achievement definitions
- **editable-achievements.ts**: Parses/generates customizable achievement labels

When adding new achievements, update all three files consistently.

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
5. Verify grid generation produces valid intersections
6. Check that achievement calculations are correct

## Common Gotchas

- **TypeScript paths**: Always use `@/` imports, not relative paths
- **Worker modifications**: Remember to update both worker and main thread message handling
- **IndexedDB**: Only used by Mobile (IndexedDB) parsing method, not for general app data
- **Achievement conflicts**: Some achievements are mutually exclusive (e.g., draft pick categories)
- **Grid generation failures**: If grid generation fails, it will retry automatically up to 50 times
- **Vercel deployment**: The Express server in `server/` is NOT used in production, only for Replit dev
