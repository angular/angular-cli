---
trigger: always_on
---

This is the source code for the Angular CLI and related build tooling. This guide outlines standard practices for AI agents working in this repository.

## Environment

- Use `pnpm` for package management.
- Use `pnpm bazel test //target` to run tests.

## Key Documentation

- [Developer Guide](docs/DEVELOPER.md): definitive guide for building, debugging, and running test targets.
- [Contributing Guide](CONTRIBUTING.md): general contribution workflows and guidelines.
- [Commit Guidelines](CONTRIBUTING.md#commit): format for commit messages and PR titles.

## Building

- Make a local build of all packages:
  ```shell
  pnpm build --local
  ```

## Coding Practices

- **Imports:**
  - Always use the `node:` protocol for Node.js built-in imports (e.g., `node:fs`, `node:path`, `node:assert`).
  - Prefer named imports (e.g., `import { mkdtemp } from 'node:fs'`) or default imports (`import fs from 'node:fs'`) instead of namespace imports (`import * as fs`).
  - Use type-only imports (`import type { ... }`) when importing types to avoid runtime side-effects.
- **Classes:**
  - Prefer ECMAScript private fields (`#field`) over TypeScript `private` keywords for encapsulated state.

## Testing

- **Temporary Directories (`TEST_TMPDIR`):**
  - Tests in this repository only run in Bazel. **ALWAYS** use `process.env['TEST_TMPDIR']` and assert that it is set:
    ```ts
    import assert from 'node:assert';
    import { mkdtemp } from 'node:fs/promises';
    import { join } from 'node:path';

    describe('...', () => {
      let tempRoot: string;

      beforeAll(async () => {
        const baseTmpDir = process.env['TEST_TMPDIR'];
        assert(baseTmpDir, 'TEST_TMPDIR is not set');
        tempRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-test-'));
      });
    });
    ```
  - **NEVER** use or fallback to `os.tmpdir()`. Bazel executes tests in hermetic sandboxes and sets `TEST_TMPDIR` to an isolated, sandboxed directory. Using `os.tmpdir()` can cause sandboxing failures, permission errors, or file leakage outside the Bazel sandbox.
- **Unit Tests:**
  - Run all unit tests: `pnpm bazel test //packages/...`
  - Run a specific test target: `pnpm bazel test //packages/angular/build:test`
  - Query test targets: `pnpm bazel query "tests(//packages/...)"`
  - Focus specific tests when debugging: use `fdescribe()` and `fit()`. NEVER commit focused tests to the repository.
  - Run tests without sharding: use `--config=no-sharding` (e.g., `pnpm bazel test //packages/angular/build:test --config=no-sharding`).
    This disables test sharding (`--test_sharding_strategy=disabled`) and flaky test retries (`--flaky_test_attempts=1`).
    This is especially useful when isolating test runs or debugging with focused tests (`fit`/`fdescribe`) to avoid empty shard failures and unnecessary re-runs.
- **End-to-End Tests:**
  - Run subset of E2E tests: `pnpm bazel test //tests:e2e_node22 --config=e2e --test_filter="<filter>"`

## Pull Requests

- Use the `gh` CLI (GitHub CLI) for creating and managing pull requests.
- **Fixup Commits:**
  - When addressing review feedback, **ALWAYS** use fixup commits (`git commit --fixup <commit>`) instead of amending existing commits. This preserves commit history during review and allows reviewers to easily see incremental changes.
  - Fixup commits are automatically squashed when merging with `pnpm ng-dev pr merge` or rebasing with `pnpm ng-dev pr rebase <pr>`.
- Use `pnpm ng-dev pr` commands:
  - `pnpm ng-dev pr rebase <pr>`: Rebase a PR branch on its target branch and squash fixup commits.
  - `pnpm ng-dev pr merge <pr>`: Merge an approved PR into its targeted branches.
