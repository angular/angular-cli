/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Host, LocalWorkspaceHost, createRootRestrictedHost } from './host';
import { createMockHost } from './testing/test-utils';

describe('createRootRestrictedHost', () => {
  let root1: string;
  let root2: string;
  let outsideDir: string;

  beforeEach(() => {
    const baseTmpDir = process.env['TEST_TMPDIR'];
    assert(baseTmpDir, 'TEST_TMPDIR is not set');
    root1 = mkdtempSync(join(baseTmpDir, 'angular-cli-mcp-root1-'));
    root2 = mkdtempSync(join(baseTmpDir, 'angular-cli-mcp-root2-'));
    outsideDir = mkdtempSync(join(baseTmpDir, 'angular-cli-mcp-outside-'));

    writeFileSync(join(root1, 'file1.txt'), 'root 1 content');
    writeFileSync(join(root2, 'file2.txt'), 'root 2 content');
    writeFileSync(join(outsideDir, 'outside.txt'), 'outside content');
  });

  afterEach(() => {
    rmSync(root1, { recursive: true, force: true });
    rmSync(root2, { recursive: true, force: true });
    rmSync(outsideDir, { recursive: true, force: true });
  });

  it('should allow file access inside any of the configured initial roots', () => {
    const host = createRootRestrictedHost(LocalWorkspaceHost, [root1, root2]);

    expect(host.existsSync(join(root1, 'file1.txt'))).toBeTrue();
    expect(host.existsSync(join(root2, 'file2.txt'))).toBeTrue();
  });

  it('should allow entries whose names start with two dots inside a root', () => {
    const dotDotFile = join(root1, '..hidden.txt');
    writeFileSync(dotDotFile, 'content');
    const host = createRootRestrictedHost(LocalWorkspaceHost, [root1]);

    expect(host.existsSync(dotDotFile)).toBeTrue();
    expect(() => host.glob('..hidden.txt', { cwd: root1 })).not.toThrow();
  });

  it('should reject glob patterns escaping roots via braces or multiple negations', () => {
    const linkOut = join(root1, 'link-out');
    symlinkSync(outsideDir, linkOut, 'junction');
    const host = createRootRestrictedHost(LocalWorkspaceHost, [root1]);

    for (const pattern of [`{${outsideDir},src}/*`, './{link-out,src}/*', '!!../outside/*']) {
      expect(() => host.glob(pattern, { cwd: root1 })).toThrowError(/Access denied/);
    }
  });

  it('should reject file access outside of the configured roots', () => {
    const host = createRootRestrictedHost(LocalWorkspaceHost, [root1, root2]);

    expect(() => host.existsSync(join(outsideDir, 'outside.txt'))).toThrowError(
      new RegExp(
        `Access denied: path '${join(outsideDir, 'outside.txt')}' is outside allowed roots.`,
      ),
    );
  });

  it('should reject dangling symlinks pointing outside configured roots', () => {
    const danglingLink = join(root1, 'dangling-out');
    symlinkSync(join(outsideDir, 'does-not-exist'), danglingLink, 'junction');
    const host = createRootRestrictedHost(LocalWorkspaceHost, [root1]);

    expect(() => host.existsSync(danglingLink)).toThrowError(/Access denied/);
    expect(() => host.existsSync(join(danglingLink, 'nested'))).toThrowError(/Access denied/);
  });

  it('should fall back to initial roots when setRoots is called with an empty array', () => {
    const host = createRootRestrictedHost(LocalWorkspaceHost, [root1, root2]);

    host.setRoots([]);

    expect(host.existsSync(join(root1, 'file1.txt'))).toBeTrue();
    expect(host.existsSync(join(root2, 'file2.txt'))).toBeTrue();
  });

  describe('command argument validation', () => {
    let baseHost: ReturnType<typeof createMockHost>;
    let restrictedHost: Host;

    beforeEach(() => {
      baseHost = createMockHost();
      restrictedHost = createRootRestrictedHost(baseHost, [root1]);
    });

    it('should allow valid output-path values inside the allowed root', async () => {
      await restrictedHost.executeNgCommand(['build', 'my-app', '--output-path=dist/my-app'], {
        cwd: root1,
      });
      await restrictedHost.executeNgCommand(
        ['build', 'my-app', `--output-path=${join(root1, 'dist/abs')}`],
        { cwd: root1 },
      );

      expect(baseHost.executeNgCommand).toHaveBeenCalledTimes(2);
    });

    it('should allow non-filesystem URL, enum, and boolean options', async () => {
      await restrictedHost.executeNgCommand(
        [
          'build',
          'my-app',
          '--base-href=/my-app/',
          '--deploy-url=/assets/',
          '--serve-path=/app',
          '--delete-output-path=false',
          '--output-hashing=all',
          '--output-mode=static',
          '--configuration=production',
          '-c',
          'production',
          '--define=API_BASE=/v1',
          '--filter=/AppComponent/',
          '--reporters=default',
          '--reporters=json',
          '--coverage-reporters=lcov',
          '--route=/shell',
          '--routes=/home',
          '--profile',
          '--runner-config=false',
          '--index=false',
          '--server=true',
          '--service-worker=true',
          '--no-delete-output-path',
          '--no-runner-config',
        ],
        { cwd: root1 },
      );

      expect(baseHost.executeNgCommand).toHaveBeenCalledTimes(1);
    });

    it('should reject absolute output-path values outside allowed roots', () => {
      const outsideTarget = join(outsideDir, 'target');

      for (const args of [
        ['build', 'my-app', `--output-path=${outsideTarget}`],
        ['build', 'my-app', `--outputPath=${outsideTarget}`],
        ['build', 'my-app', `--output_path=${outsideTarget}`],
        ['build', 'my-app', `--OUTPUT-PATH=${outsideTarget}`],
        ['build', 'my-app', '--output-path', outsideTarget],
        ['build', 'my-app', '--output-path=dist/ok', `--output-path=${outsideTarget}`],
        ['build', 'my-app', `--no-output-path=${outsideTarget}`],
        ['build', 'my-app', `--output-path.base=${outsideTarget}`],
      ]) {
        expect(() => restrictedHost.executeNgCommand(args, { cwd: root1 })).toThrowError(
          /Access denied: option .* is outside allowed roots/,
        );
      }

      expect(baseHost.executeNgCommand).not.toHaveBeenCalled();
    });

    it('should reject relative traversal output-path values outside allowed roots', () => {
      expect(() =>
        restrictedHost.executeNgCommand(['build', 'my-app', '--output-path=../outside'], {
          cwd: root1,
        }),
      ).toThrowError(/Access denied: option '--output-path' path '\.\.\/outside' is outside/);

      expect(() =>
        restrictedHost.executeNgCommand(['build', 'my-app', '--output-path=dist/../../outside'], {
          cwd: root1,
        }),
      ).toThrowError(/Access denied: option '--output-path'/);

      expect(baseHost.executeNgCommand).not.toHaveBeenCalled();
    });

    it('should reject output-path equal to or ancestor of the workspace or root directory', () => {
      const monoWorkspace = join(root1, 'apps', 'web');
      mkdirSync(monoWorkspace, { recursive: true });

      for (const value of ['', '.', './', '..', '../..', root1]) {
        expect(() =>
          restrictedHost.executeNgCommand(['build', 'web', `--output-path=${value}`], {
            cwd: monoWorkspace,
          }),
        ).toThrowError(/Access denied: option '--output-path'/);
      }

      // Bare flag without a value defaults to empty string (`cwd`).
      expect(() =>
        restrictedHost.executeNgCommand(['build', 'web', '--output-path'], { cwd: monoWorkspace }),
      ).toThrowError(/Access denied: option '--output-path'/);

      // Multi-root: must not target another root directory directly.
      restrictedHost.setRoots([root1, root2]);
      expect(() =>
        restrictedHost.executeNgCommand(['build', 'web', `--output-path=${root2}`], {
          cwd: monoWorkspace,
        }),
      ).toThrowError(/must not be an allowed root directory/);

      expect(baseHost.executeNgCommand).not.toHaveBeenCalled();
    });

    it('should allow monorepo sibling output paths strictly inside the allowed root', async () => {
      const monoWorkspace = join(root1, 'apps', 'web');
      mkdirSync(monoWorkspace, { recursive: true });

      await restrictedHost.executeNgCommand(['build', 'web', '--output-path=../../dist/web'], {
        cwd: monoWorkspace,
      });

      expect(baseHost.executeNgCommand).toHaveBeenCalledTimes(1);
    });

    it('should reject symlinks inside root pointing outside roots or to workspace root', () => {
      const linkOut = join(root1, 'link-out');
      const danglingOut = join(root1, 'dangling-out');
      const linkSelf = join(root1, 'link-self');
      const outsideNested = join(outsideDir, 'sub');
      mkdirSync(outsideNested, { recursive: true });
      const linkNested = join(root1, 'link-nested');

      symlinkSync(outsideDir, linkOut, 'junction');
      symlinkSync(join(outsideDir, 'missing'), danglingOut, 'junction');
      symlinkSync(root1, linkSelf, 'junction');
      symlinkSync(outsideNested, linkNested, 'junction');

      expect(() =>
        restrictedHost.executeNgCommand(['build', 'my-app', '--output-path=link-out'], {
          cwd: root1,
        }),
      ).toThrowError(/Access denied/);

      expect(() =>
        restrictedHost.executeNgCommand(['build', 'my-app', '--output-path=link-out/nested'], {
          cwd: root1,
        }),
      ).toThrowError(/Access denied/);

      expect(() =>
        restrictedHost.executeNgCommand(['build', 'my-app', '--output-path=dangling-out'], {
          cwd: root1,
        }),
      ).toThrowError(/Access denied/);

      expect(() =>
        restrictedHost.executeNgCommand(['build', 'my-app', '--output-path=link-self'], {
          cwd: root1,
        }),
      ).toThrowError(/must not be the workspace directory/);

      // Lexical `link-nested/../secret` must still be caught when walking via the symlink target.
      expect(() =>
        restrictedHost.executeNgCommand(
          ['build', 'my-app', '--output-path=link-nested/../secret'],
          {
            cwd: root1,
          },
        ),
      ).toThrowError(/Access denied/);

      expect(baseHost.executeNgCommand).not.toHaveBeenCalled();
    });

    it('should reject compound output-path and out-file traversal regardless of flag order', () => {
      const monoWorkspace = join(root1, 'apps', 'web');
      mkdirSync(monoWorkspace, { recursive: true });

      expect(() =>
        restrictedHost.executeNgCommand(
          ['extract-i18n', 'web', '--output-path=../../dist', '--out-file=../../evil.xlf'],
          { cwd: monoWorkspace },
        ),
      ).toThrowError(/Access denied: option '--out-file'/);

      expect(() =>
        restrictedHost.executeNgCommand(
          ['extract-i18n', 'web', '--out-file=../../evil.xlf', '--output-path=../../dist'],
          { cwd: monoWorkspace },
        ),
      ).toThrowError(/Access denied: option '--out-file'/);

      // Output-relative traversal must be rejected even without an explicit CLI --output-path
      // (e.g., when outputPath is configured in angular.json).
      expect(() =>
        restrictedHost.executeNgCommand(['extract-i18n', 'web', '--out-file=../escape.xlf'], {
          cwd: monoWorkspace,
        }),
      ).toThrowError(/Access denied: option '--out-file'/);

      // Output-relative sub-options must not traverse up to the workspace root either.
      expect(() =>
        restrictedHost.executeNgCommand(
          ['build', 'web', '--output-path=dist/app', '--output-path.browser=../..'],
          { cwd: monoWorkspace },
        ),
      ).toThrowError(/Access denied: option '--output-path\.browser'/);

      expect(baseHost.executeNgCommand).not.toHaveBeenCalled();
    });

    it('should allow valid relative output-relative options', async () => {
      await restrictedHost.executeNgCommand(
        [
          'build',
          'my-app',
          '--output-path=dist/app',
          '--output-path.browser=browser',
          '--resources-output-path=media',
        ],
        { cwd: root1 },
      );
      await restrictedHost.executeNgCommand(['extract-i18n', 'my-app', '--out-file=messages.xlf'], {
        cwd: root1,
      });

      expect(baseHost.executeNgCommand).toHaveBeenCalledTimes(2);
    });

    it('should reject other path-bearing builder and third-party options outside roots', () => {
      const extPath = join(outsideDir, 'file');

      for (const flag of [
        `--out-file=${extPath}`,
        `--output-file=${extPath}`,
        `--ts-config=${extPath}`,
        `--karma-config=${extPath}`,
        `--runner-config=${extPath}`,
        `--webpack-config=${extPath}`,
        `--proxy-config=${extPath}`,
        `--ssl-key=${extPath}`,
        `--ssl-cert=${extPath}`,
        `--providers-file=${extPath}`,
        `--setup-files=${extPath}`,
        `--routes-file=${extPath}`,
        `--browser=${extPath}`,
        `--server=${extPath}`,
        `--main=${extPath}`,
        `--index=${extPath}`,
        `--service-worker=${extPath}`,
        `--project=${extPath}`,
        `--ngsw-config-path=${extPath}`,
        `--resources-output-path=${extPath}`,
        `--eslint-config=${extPath}`,
        `--cache-location=${extPath}`,
        `--output-dir=${extPath}`,
        `--config-dir=${extPath}`,
        `--dest=${extPath}`,
        `--reporters=${extPath}`,
        `--coverage-reporters=${extPath}`,
        `-o=${extPath}`,
        `-o${extPath}`,
      ]) {
        expect(() =>
          restrictedHost.executeNgCommand(['run', 'my-app:custom', flag], { cwd: root1 }),
        ).toThrowError(/Access denied/);
      }

      expect(() =>
        restrictedHost.executeNgCommand(['lint', 'my-app', '-o', extPath], { cwd: root1 }),
      ).toThrowError(/Access denied/);

      expect(() =>
        restrictedHost.executeNgCommand(
          ['build', 'my-app', '--ts-config', '-x/../../outside/tsconfig.json'],
          { cwd: root1 },
        ),
      ).toThrowError(/Access denied/);

      expect(baseHost.executeNgCommand).not.toHaveBeenCalled();
    });

    it('should validate glob-based path options while allowing normal patterns', async () => {
      const linkOut = join(root1, 'link-out');
      symlinkSync(outsideDir, linkOut, 'junction');

      await restrictedHost.executeNgCommand(
        [
          'test',
          'my-app',
          '--include=src/**/*.spec.ts',
          '--include=src/foo..bar.spec.ts',
          '--exclude=!src/ignored.spec.ts',
        ],
        { cwd: root1 },
      );
      expect(baseHost.executeNgCommand).toHaveBeenCalledTimes(1);

      for (const badPattern of [
        '../outside/*.spec.ts',
        join(outsideDir, '*.spec.ts'),
        'src/*/../../../outside/*.spec.ts',
        `{${outsideDir},src}/*.spec.ts`,
        `{a,{b,c},${outsideDir}}/*.spec.ts`,
        '{link-out,src}/*.spec.ts',
        './{link-out,src}/*.spec.ts',
        `src/{${outsideDir},a}/*.spec.ts`,
        '!../outside/*.spec.ts',
        '!!../outside/*.spec.ts',
        `!!${join(outsideDir, '*.spec.ts')}`,
      ]) {
        expect(() =>
          restrictedHost.executeNgCommand(['test', 'my-app', `--include=${badPattern}`], {
            cwd: root1,
          }),
        ).toThrowError(/Access denied/);
      }
    });

    it('should validate nested runner-args and passthrough args after --', async () => {
      await restrictedHost.executeNgCommand(
        [
          'test',
          'my-app',
          '--runner-args=--update',
          '--runner-args=--bail=1',
          '--runner-args=--config=my folder/vitest.config.ts',
        ],
        { cwd: root1 },
      );
      expect(baseHost.executeNgCommand).toHaveBeenCalledTimes(1);

      const extConfig = join(outsideDir, 'vitest.config.mjs');
      for (const args of [
        ['test', 'my-app', `--runner-args=--config=${extConfig}`],
        ['test', 'my-app', '--runner-args', `--config=${extConfig}`],
        ['test', 'my-app', '--runner-args=--outputFile', `--runner-args=${extConfig}`],
        ['test', 'my-app', `--runner-args=-c=${extConfig}`],
        ['test', 'my-app', `--runner-args=-c${extConfig}`],
        ['test', 'my-app', '--runner-args=-c', `--runner-args=${extConfig}`],
        ['test', 'my-app', `--runner-args=-r=${outsideDir}`],
        ['test', 'my-app', `--runner-args=-r${outsideDir}`],
        ['test', 'my-app', `--runner-args=--bail --config=${extConfig}`],
        ['test', 'my-app', '--', `--config=${extConfig}`],
        ['test', 'my-app', '--', '-c', extConfig],
        ['test', 'my-app', '--', `-r${outsideDir}`],
      ]) {
        expect(() => restrictedHost.executeNgCommand(args, { cwd: root1 })).toThrowError(
          /Access denied/,
        );
      }
    });

    it('should validate arguments in startNgProcess and allow valid devserver flags', () => {
      restrictedHost.startNgProcess(['serve', 'my-app', '--port=12345', '-o'], { cwd: root1 });
      expect(baseHost.startNgProcess).toHaveBeenCalledTimes(1);

      expect(() =>
        restrictedHost.startNgProcess(
          ['serve', 'my-app', `--proxy-config=${join(outsideDir, 'proxy.json')}`],
          { cwd: root1 },
        ),
      ).toThrowError(/Access denied/);

      expect(baseHost.startNgProcess).toHaveBeenCalledTimes(1);
    });

    it('should enforce updated roots after setRoots is called', async () => {
      const targetInRoot2 = join(root2, 'dist/app');
      expect(() =>
        restrictedHost.executeNgCommand(['build', 'my-app', `--output-path=${targetInRoot2}`], {
          cwd: root1,
        }),
      ).toThrowError(/Access denied/);

      restrictedHost.setRoots([root1, root2]);
      await restrictedHost.executeNgCommand(['build', 'my-app', `--output-path=${targetInRoot2}`], {
        cwd: root1,
      });

      expect(baseHost.executeNgCommand).toHaveBeenCalledTimes(1);
    });
  });
});
