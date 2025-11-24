# AGENTS

The instructions in this file apply to the entire repository.

## Development workflow
- Use Node.js 18 or newer.
- Run `npm install` once to install dependencies.
- Before committing, execute `npm run lint` and ensure it passes with no errors or warnings.
- Treat modernization work as an ongoing practice: when updating internals, reference current MV3 and web crypto guidance and leave short notes in `docs/` summarizing the rationale.
- When agents work on this project, they must proactively scan the codebase and relevant internet sources for contemporary best practices and forward-looking ideas, then integrate the most valuable findings to keep the extension aligned with cutting-edge approaches.
- For substantial refactors, prefer incremental, testable slices rather than large unreviewable drops.
- Prefer modern JavaScript features: ES modules, `const`/`let`, and arrow functions.
- Avoid committing build artifacts or files in `node_modules`.

## Dependencies
- When adding or removing packages, update both `package.json` and `package-lock.json` in the same commit.

## Commit conventions
- Write concise commit messages in the imperative mood (e.g., "Add feature" not "Added feature").
- Commit messages should be in English.

## Code style
- Use two spaces for indentation.
- Use single quotes for strings.
- Always terminate statements with semicolons.
- Prefer descriptive names for variables and functions.

## UI guidelines
- Keep the popup focused on lightweight connection controls (import key, choose location, connect/disconnect). Move advanced management to the options page.
- When modifying user-facing workflows, update both the English and Russian documentation.

## Testing
- `npm run lint` is currently the only automated check; run it after every change and include its results in the PR description.
<!-- Updated: 2025-11-17 -->
