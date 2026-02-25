# BBGM Immaculate Grid

## Overview

This is a client-side basketball game based on Immaculate Grid, specifically designed for Basketball GM (BBGM) league files. Users upload their BBGM league files (.json or .json.gz) and play an interactive 3x3 grid game where they need to find players who match team intersections. The application is built as a static single-page application that can be deployed on Vercel without requiring server-side functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **UI Components**: Shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming
- **State Management**: React hooks for local state, TanStack Query for server state (though minimal server interaction)
- **Routing**: Wouter for lightweight client-side routing
- **File Structure**: Organized into components, pages, hooks, lib utilities, and types

### Client-Side Processing
- **File Parsing**: Handles both .json and .json.gz BBGM league files with multiple upload methods
  - **Auto (Recommended)**: Intelligent method selection based on device detection (mobile → IndexedDB, desktop → Streaming)
  - **Traditional**: Universal compatibility, loads entire file into memory (may fail on very large files)
  - **Streaming**: Uses DecompressionStream API for memory-efficient processing on desktop browsers (iffy on mobile)
  - **Mobile (IndexedDB)**: Streams data directly to IndexedDB in tiny batches, never materializes giant arrays in memory
    - Handles files of ANY size on mobile (tested with 120MB compressed / 1.6GB decompressed / 53k players)
    - Worker streams → IndexedDB with strict backpressure (max 400 items queued, 200 items per batch)
    - Main thread reads from IndexedDB in chunks, processes achievements incrementally
    - No cross-thread transfer of large objects (prevents structured clone crashes)
    - Real GC windows with setTimeout delays for stable mobile performance
- **Compression**: Dual approach - DecompressionStream for desktop, Pako library for mobile compatibility
- **Data Processing**: Normalizes BBGM data into searchable format with player/team indices
- **Grid Generation**: Algorithmic generation of valid 3x3 team intersections with retry logic
- **Mobile Optimization**: IndexedDB-based streaming prevents memory overflow on constrained mobile browsers

### Data Architecture
- **In-Memory Storage**: Game data stored client-side in React state (traditional/streaming methods)
- **IndexedDB Storage**: NEW - Mobile (IndexedDB) method stores raw data in IndexedDB, processes on-demand
  - Database: `grids-league` with stores for players, teams, and metadata
  - Bounded memory usage: only 500-1000 players in memory at any time during processing
  - Achievement calculation runs in chunks with yielding to prevent UI freezes
- **Search Indices**: Pre-built searchable player arrays and lookup maps for performance
- **Type Safety**: Comprehensive TypeScript interfaces for BBGM data structures

### Game Logic
- **Grid System**: 3x3 grid where rows and columns represent teams
- **Player Validation**: Real-time validation of player eligibility for team intersections
- **Search Functionality**: Live filtering of players by name with substring matching
- **Visual Feedback**: Color-coded cells (green for correct, red for incorrect answers)

### Build and Deployment
- **Development**: Vite dev server with HMR and runtime error overlay
- **Production**: Static build output suitable for CDN deployment
- **Vercel Ready**: Configured for static deployment with SPA fallback routing
- **Build Process**: Custom build script handles output directory structure for Vercel
- **Server Stub**: Express server included for Replit development only

### Branding and Icons (v3)
- **App Icons**: Complete icon set generated from zengm-grids-logo-mark.png
  - Location: `public/icons/` directory
  - Favicon: Multi-size favicon.ico (16x16, 32x32, 48x48)
  - PNG Icons: 16, 32, 48, 192, 384, 512 pixel sizes
  - Apple Touch Icon: 180x180 for iOS home screen
  - Maskable Icons: 192x192 and 512x512 with safe zone padding for Android
  - Social Share: 1200x630 OG image with logo on brand color background
- **Brand Colors**: Theme color #0b2a5b (deep blue) used throughout
- **PWA Support**: Web app manifest with standalone display mode
- **In-App Logo**: Header uses optimized /icons/icon-192.png
- **Cache Version**: v3 (bumped from v2 for icon refresh)

### External Dependencies

- **UI Framework**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **File Processing**: Pako for gzip decompression, @streamparser/json-whatwg for streaming JSON parsing
- **Client Storage**: idb (IndexedDB wrapper) for Mobile (IndexedDB) upload method
- **State Management**: TanStack React Query for caching and data fetching patterns
- **Icons**: Lucide React for consistent iconography
- **Database**: Drizzle ORM with PostgreSQL support (configured but not actively used in current implementation)
- **Deployment**: Optimized for Vercel static hosting
- **Vercel Configuration**: Custom build script and vercel.json for SPA routing

### Sport-Specific Features

- **Editable Statistical Achievements**: Currently only available for Basketball GM
  - Allows users to customize numerical thresholds (e.g., "30+ PPG" can be changed to "25+ PPG")
  - Temporarily disabled for Football, Hockey, and Baseball until those sport parsers are fully implemented
  - Uses regex pattern matching to identify editable numerical values in achievement labels