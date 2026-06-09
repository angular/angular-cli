/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { getMinReleaseAgeMs } from './min-release-age';
import { SUPPORTED_PACKAGE_MANAGERS } from './package-manager-descriptor';
import { MockHost } from './testing/mock-host';

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 86_400_000;

describe('getMinReleaseAgeMs', () => {
  it('returns 0 when the descriptor has no minReleaseAge configuration', async () => {
    const host = new MockHost();

    expect(await getMinReleaseAgeMs(host, '/project', SUPPORTED_PACKAGE_MANAGERS.bun)).toBe(0);
  });

  it('returns 0 when no .npmrc file is present', async () => {
    const host = new MockHost();
    host.setDirectory('/project/.git');

    expect(await getMinReleaseAgeMs(host, '/project', SUPPORTED_PACKAGE_MANAGERS.npm)).toBe(0);
  });

  it('reads npm `min-release-age` (in days) from project .npmrc', async () => {
    const host = new MockHost();
    host.setDirectory('/project/.git');
    host.setFile('/project/.npmrc', 'min-release-age=7\n');

    expect(await getMinReleaseAgeMs(host, '/project', SUPPORTED_PACKAGE_MANAGERS.npm)).toBe(
      7 * MS_PER_DAY,
    );
  });

  it('reads pnpm `minimum-release-age` (in minutes) from project .npmrc', async () => {
    const host = new MockHost();
    host.setDirectory('/project/.git');
    host.setFile('/project/.npmrc', 'minimum-release-age=1440\n');

    expect(await getMinReleaseAgeMs(host, '/project', SUPPORTED_PACKAGE_MANAGERS.pnpm)).toBe(
      1440 * MS_PER_MINUTE,
    );
  });

  it('does not pick up an unrelated key', async () => {
    const host = new MockHost();
    host.setDirectory('/project/.git');
    host.setFile('/project/.npmrc', 'min-release-age=7\n');

    // pnpm uses `minimum-release-age`, not `min-release-age`.
    expect(await getMinReleaseAgeMs(host, '/project', SUPPORTED_PACKAGE_MANAGERS.pnpm)).toBe(0);
  });

  it('walks up the directory tree until reaching the .git root', async () => {
    const host = new MockHost();
    host.setDirectory('/repo/.git');
    host.setFile('/repo/.npmrc', 'min-release-age=3\n');

    expect(
      await getMinReleaseAgeMs(host, '/repo/packages/app', SUPPORTED_PACKAGE_MANAGERS.npm),
    ).toBe(3 * MS_PER_DAY);
  });

  it('lets values closer to the project override ancestor values', async () => {
    const host = new MockHost();
    host.setDirectory('/repo/.git');
    host.setFile('/repo/.npmrc', 'min-release-age=10\n');
    host.setFile('/repo/packages/app/.npmrc', 'min-release-age=2\n');

    expect(
      await getMinReleaseAgeMs(host, '/repo/packages/app', SUPPORTED_PACKAGE_MANAGERS.npm),
    ).toBe(2 * MS_PER_DAY);
  });

  it('treats a `.git` file as a repo root (git submodules and worktrees)', async () => {
    const host = new MockHost();
    // In a submodule or worktree `.git` is a regular file containing a
    // `gitdir:` pointer, not a directory. The walk must still stop here.
    host.setFile('/repo/.git', 'gitdir: /elsewhere/.git/modules/repo\n');
    host.setFile('/repo/.npmrc', 'min-release-age=4\n');

    expect(await getMinReleaseAgeMs(host, '/repo', SUPPORTED_PACKAGE_MANAGERS.npm)).toBe(
      4 * MS_PER_DAY,
    );
  });

  it('returns 0 for non-positive or non-numeric values', async () => {
    const host = new MockHost();
    host.setDirectory('/project/.git');
    host.setFile('/project/.npmrc', 'min-release-age=not-a-number\n');

    expect(await getMinReleaseAgeMs(host, '/project', SUPPORTED_PACKAGE_MANAGERS.npm)).toBe(0);

    host.setFile('/project/.npmrc', 'min-release-age=0\n');
    expect(await getMinReleaseAgeMs(host, '/project', SUPPORTED_PACKAGE_MANAGERS.npm)).toBe(0);

    host.setFile('/project/.npmrc', 'min-release-age=-5\n');
    expect(await getMinReleaseAgeMs(host, '/project', SUPPORTED_PACKAGE_MANAGERS.npm)).toBe(0);
  });
});
