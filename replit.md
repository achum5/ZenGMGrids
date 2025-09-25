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
- **File Parsing**: Handles both .json and .json.gz BBGM league files
- **Compression**: Uses Pako library for decompressing .gz files
- **Data Processing**: Normalizes BBGM data into searchable format with player/team indices
- **Grid Generation**: Algorithmic generation of valid 3x3 team intersections with retry logic

### Data Architecture
- **In-Memory Storage**: All game data stored client-side in React state
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

### External Dependencies

- **UI Framework**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **File Processing**: Pako for gzip decompression
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