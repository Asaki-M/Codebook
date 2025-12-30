# Repository Guidelines

## Project Structure & Module Organization

- Root entrypoints follow Plasmo conventions: `popup.tsx` (popup UI). Optional pages can be added as root files like `options.tsx`, `content.ts`, or `background.ts`.
- Static assets live in `assets/` (e.g., `assets/icon.png`).
- CI/workflows live in `.github/workflows/` (see `.github/workflows/submit.yml`).
- Generated outputs are ignored by git: `.plasmo/`, `build/`, `dist/`, `out/` (see `.gitignore`).

## Build, Test, and Development Commands

- `pnpm install`: install dependencies (preferred; lockfile is `pnpm-lock.yaml`).
- `pnpm dev`: start Plasmo dev build; load `build/chrome-mv3-dev` as an unpacked extension.
- `pnpm build`: create a production build under `build/`.
- `pnpm package`: produce a store-ready zip (used by the submit workflow).
- `pnpm exec tsc -p tsconfig.json --noEmit`: typecheck (no separate lint step is configured).

## Coding Style & Naming Conventions

- TypeScript + React (TSX). Formatting is enforced via Prettier (`.prettierrc.mjs`): 2-space indentation, `printWidth: 80`, no semicolons.
- Keep imports sorted/partitioned (uses `@ianvs/prettier-plugin-sort-imports`). If imports look out of order, run `pnpm exec prettier -w .`.
- Path alias: imports may use `~` (configured in `tsconfig.json`), e.g. `import x from "~/lib/x"`.

## Testing Guidelines

- No automated test runner is set up yet. For changes, include clear manual verification steps (what to click, expected result) and test in the extension popup.
- If you add reusable logic, consider extracting it into a plain `.ts` module to make future unit testing straightforward.

## Commit & Pull Request Guidelines

- Keep commits small and imperative (the current history uses simple subject lines like “Created …”).
- PRs should include: summary + rationale, manual test steps, and screenshots/GIFs for UI changes.
- Call out any changes to permissions/hosts (see `package.json` → `manifest.host_permissions`).

## Security & Configuration Tips

- Never commit store submission keys or tokens; the submit workflow expects secrets in GitHub Actions (see `.github/workflows/submit.yml`).
