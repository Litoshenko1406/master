# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000) with Turbopack
npm run dev:daemon   # Start dev server in background, logs → logs.txt
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all tests with Vitest
npm run setup        # npm install + prisma generate + prisma migrate dev
npm run db:reset     # Reset and re-run all migrations (destructive)
```

Run a single test file:
```bash
npx vitest src/lib/__tests__/file-system.test.ts
```

## Environment

Copy `.env` and set `ANTHROPIC_API_KEY`. Without it, the app falls back to a mock provider that returns static code instead of AI-generated components.

## Architecture

UIGen is an AI-powered React component generator with a split UI: chat panel (left, 35%) and live preview/code editor (right, 65%).

### Request flow

1. User types a prompt → `ChatInterface` sends it to `POST /api/chat`
2. `route.ts` calls Claude (via Vercel AI SDK + `@ai-sdk/anthropic`) with streaming enabled and prompt caching on the system message
3. Claude responds using two tools: `str_replace_editor` (create/view/edit files) and `file_manager` (mkdir/rm/mv)
4. Tool call results stream back to the frontend and update `FileSystemContext` (in-memory virtual FS — nothing written to disk)
5. `PreviewFrame` picks up the updated virtual FS, compiles JSX with Babel standalone, and renders the component in an iframe
6. For authenticated users, the final message history + serialized FS are persisted to SQLite via Prisma

### Key abstractions

- **`VirtualFileSystem`** (`src/lib/file-system.ts`) — in-memory file tree; the single source of truth for generated component files
- **`FileSystemContext`** (`src/lib/contexts/file-system-context.tsx`) — React context wrapping `VirtualFileSystem`, shared across chat, editor, and preview
- **`ChatContext`** (`src/lib/contexts/chat-context.tsx`) — manages message list and loading state
- **AI tools** (`src/lib/tools/`) — `str_replace_editor` and `file_manager` define the schema Claude uses to manipulate the virtual FS
- **System prompt** (`src/lib/prompts/generation.tsx`) — instructs Claude how to generate React components
- **`PreviewFrame`** (`src/components/preview/PreviewFrame.tsx`) — compiles and sandboxes JSX in an iframe using Babel standalone
- **Server actions** (`src/actions/`) — auth (JWT + bcrypt, 7-day cookie) and project CRUD

### Database

SQLite via Prisma. Two models: `User` (email + hashed password) and `Project` (messages and file system state stored as JSON strings). Prisma client is generated into `src/generated/prisma`.

### Model selection

`src/lib/provider.ts` returns the real Anthropic provider when `ANTHROPIC_API_KEY` is set, or a mock provider otherwise. The chat route uses `claude-haiku-4-5` by default.

### Path alias

`@/*` maps to `src/*`.

### Behaviour
1. Don’t assume. Don’t hide confusion. Surface tradeoffs.
2. Minimum code that solves the problem. Nothing speculative.
3. Touch only what you must. Clean up only your own mess.
4. Define success criteria. Loop until verified.