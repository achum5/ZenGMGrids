# Repository Guidelines

## Project Structure & Module Organization
The app is split into a Vite-powered client in `client/` and an Express API in `server/`. Pages live in `client/src/pages`, reusable UI in `client/src/components`, shared helpers in `client/src/lib`, and Tailwind styles in `client/src/index.css`. Static assets belong in `client/public` and `client/src/assets`. The API surface is defined in `server/routes.ts`, while `server/vite.ts` handles hybrid dev serving and static file delivery. Cross-cutting types and Drizzle schemas live in `shared/`. Build artifacts land in `dist/`; treat them as read-only.

## Build, Test, and Development Commands
Install dependencies with `npm install`. `npm run dev` starts the Express server and Vite middleware with hot reload. `npm run build` emits optimized client bundles and a bundled `dist/index.js` server build. Use `npm run start` to serve the production build from `dist/`. `npm run check` runs the TypeScript compiler for type safety, and `npm run db:push` syncs Drizzle schema changes to the target database.

## Coding Style & Naming Conventions
Write TypeScript modules with ES imports. Use two-space indentation and enable Prettier or editor auto-formatting. Name React components and hooks in PascalCase and camelCase respectively; colocate page-level routes in `client/src/pages` and export them as default components for routing. Favor named exports for utilities in `client/src/lib` and `shared/`. Tailwind utility classes stay inline in JSX; extract recurring patterns into helpers under `client/src/lib`.

## Testing Guidelines
There is no automated suite today, so manually exercise critical flows via `npm run dev` before opening a PR. When adding coverage, create Vitest or React Testing Library specs under `client/src/__tests__` and focus on data hooks and route components. Provide mock API responses or leverage the in-memory helpers in `server/storage.ts` to keep tests deterministic.

## Commit & Pull Request Guidelines
Commits follow the current history: concise, imperative subject lines with sentence casing (for example, “Improve grid generation performance…”). Reference related tickets in the body when applicable. Pull requests should describe the behavior change, outline manual test steps, and include screenshots or API payload examples when UI or contract changes occur. Link any issue IDs and call out schema updates so reviewers can run `npm run db:push`.
