# FoundSC Code Style Guide

This document summarizes the conventions used in this repo so contributors can keep the codebase consistent.

## Formatting
- **Formatter**: Prettier-style formatting (no explicit config yet).
- **Indentation**: 2 spaces.
- **Semicolons**: Yes.
- **Quotes**: Single quotes in TS/JS. JSX attributes use double quotes.
- **Trailing commas**: Minimal (objects/arrays where convenient).
- **Line length**: Keep readable (~100–120 chars); break long expressions thoughtfully.

## Linting
- **Mobile app**: Uses `eslint-config-expo` (Flat config) via `mobile/eslint.config.js`.
  - React, React Native, Hooks, and TS rules from Expo defaults.
- **Root**: No enforced ESLint config yet. When adding one, extend Expo + TS for consistency.

## TypeScript
- Prefer explicit types on function parameters and return values for exported APIs.
- Use `interface` for object shapes; `type` for unions and utility types.
- Avoid `any`. If unavoidable, isolate and leave a TODO to refine types.
- Narrow types with guards where possible.

## React / React Native
- Functional components with hooks.
- Hooks at top-level; follow Rules of Hooks.
- Keep components focused. Extract UI pieces into smaller components when they grow.
- Props: define with TS interfaces and default values where sensible.
- Styling via `StyleSheet.create` or local style objects. Prefer meaningful, concise style names.
- Avoid `overflow: 'hidden'` directly on `Surface`/`Card` (Paper) to preserve shadows.

## Imports & Modules
- Group imports: React/stdlib, third-party, project modules, then styles/types.
- Use absolute or clean relative paths consistently within each app segment.
- Keep import lists minimal; remove unused imports.

## Naming
- Files: `PascalCase` for components (`ChatScreen.tsx`), `kebab-case` or `lowercase` for configs.
- Variables & functions: `camelCase`.
- Components: `PascalCase` and named by intent (e.g., `PostsGrid`).
- Booleans prefixed with `is/has/should`.

## State & Data Flow
- Co-locate state with components; lift when shared.
- Avoid deep prop drilling; consider context for cross-cutting state (Auth, Theme, etc.).
- Prefer immutable updates.

## Network & Data (Supabase)
- Keep RPC names descriptive and parameters explicit (e.g., `in_user_id`).
- Handle errors explicitly; surface user-friendly messages.
- RLS: design policies first; make client writes conform to them.

## UI/UX Details
- Use React Native Paper components for UI consistency.
- Keep accessible touch targets and sufficient contrast (e.g., own messages use white text on dark bubble).
- Provide empty states and loading indicators.

## Git Workflow
- Feature branches prefixed by scope (e.g., `s4-messages+post-details`).
- Small, descriptive commits.
- Merge with conflict resolution and basic smoke testing.

## Comments & Docs
- Keep comments concise and accurate; prefer self-explanatory code.
- Document non-obvious decisions and workarounds.

## When in doubt
- Follow existing patterns in nearby files.
- Prefer clarity over cleverness.
- Keep components and functions small, typed, and testable.
