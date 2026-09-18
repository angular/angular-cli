/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { PluginBuild } from 'esbuild';
import assert from 'node:assert';
import { statSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SassCompiler } from '../../sass/sass-service';
import {
  SassStylesheetLanguage,
  getPackageScope,
  isPackageUrl,
  resetSassWorkerPoolCaches,
  shutdownSassWorkerPool,
} from './sass-language';

describe('sass-language', () => {
  describe('isPackageUrl', () => {
    it('should identify pkg: scheme URLs as package URLs', () => {
      expect(isPackageUrl('pkg:@angular/material')).toBeTrue();
      expect(isPackageUrl('pkg:bootstrap')).toBeTrue();
      expect(isPackageUrl('pkg:@material/button/button')).toBeTrue();
    });

    it('should identify bare specifiers as package URLs', () => {
      expect(isPackageUrl('@angular/material')).toBeTrue();
      expect(isPackageUrl('@angular/material/button')).toBeTrue();
      expect(isPackageUrl('@material/button/button.scss')).toBeTrue();
      expect(isPackageUrl('bootstrap')).toBeTrue();
      expect(isPackageUrl('bootstrap/scss/bootstrap')).toBeTrue();
    });

    it('should not identify relative paths as package URLs', () => {
      expect(isPackageUrl('./styles.scss')).toBeFalse();
      expect(isPackageUrl('../shared/variables')).toBeFalse();
      expect(isPackageUrl('.hidden')).toBeFalse();
      expect(isPackageUrl('.\\styles.scss')).toBeFalse();
      expect(isPackageUrl('..\\shared\\variables')).toBeFalse();
    });

    it('should not identify absolute paths or non-pkg URLs as package URLs', () => {
      expect(isPackageUrl('/styles/theme.scss')).toBeFalse();
      expect(isPackageUrl('\\styles\\theme.scss')).toBeFalse();
      expect(isPackageUrl('file:///path/to/theme.scss')).toBeFalse();
      expect(isPackageUrl('http://example.com/styles.css')).toBeFalse();
      expect(isPackageUrl('https://example.com/styles.css')).toBeFalse();
      expect(isPackageUrl('C:\\path\\to\\theme.scss')).toBeFalse();
      expect(isPackageUrl('C:/path/to/theme.scss')).toBeFalse();
    });

    it('should not identify empty string as a package URL', () => {
      expect(isPackageUrl('')).toBeFalse();
    });
  });

  describe('getPackageScope', () => {
    const scope = (containingPath?: string) => getPackageScope(containingPath, '/app');

    it('should use the working directory for a stylesheet outside node_modules', () => {
      expect(scope('/app/src/app.scss')).toBe('/app');
      expect(scope('/app/src/foo-node_modules/a.scss')).toBe('/app');
      expect(scope('/app/src/node_modules.scss')).toBe('/app');
      expect(scope(undefined)).toBe('/app');
    });

    it('should use the enclosing package root for a stylesheet within node_modules', () => {
      expect(scope('/app/node_modules/pkg/a.scss')).toBe('/app/node_modules/pkg');
      expect(scope('/app/node_modules/pkg/sub/a.scss')).toBe('/app/node_modules/pkg');
      expect(scope('/app/node_modules/@scope/pkg/sub/a.scss')).toBe('/app/node_modules/@scope/pkg');
      expect(scope('/app/node_modules/foo-node_modules/a.scss')).toBe(
        '/app/node_modules/foo-node_modules',
      );
      expect(scope('/app/node_modules/a.scss')).toBe('/app/node_modules');
    });

    it('should use the innermost package root for a nested dependency', () => {
      expect(scope('/app/node_modules/dep/node_modules/pkg/a.scss')).toBe(
        '/app/node_modules/dep/node_modules/pkg',
      );
      expect(scope('/app/node_modules/.pnpm/pkg@1.0.0/node_modules/pkg/a.scss')).toBe(
        '/app/node_modules/.pnpm/pkg@1.0.0/node_modules/pkg',
      );
    });

    it('should support Windows path separators', () => {
      expect(getPackageScope('C:\\app\\node_modules\\pkg\\sub\\a.scss', 'C:\\app')).toBe(
        'C:/app/node_modules/pkg',
      );
      expect(getPackageScope('C:\\app\\src\\app.scss', 'C:\\app')).toBe('C:\\app');
    });
  });

  describe('package resolution caching', () => {
    let temporaryRoot: string;
    let projectRoot: string;
    let buttonStylesheet: string;
    let cardStylesheet: string;
    let dependencyStylesheet: string;
    let resolveRequests: string[];

    /**
     * Creates a build stub that resolves a package specifier by searching the `node_modules`
     * directories visible from the resolve directory, which is how esbuild resolves the
     * package specifiers of a stylesheet.
     */
    function createBuildStub(): PluginBuild {
      return {
        initialOptions: { absWorkingDir: projectRoot },
        resolve: async (path: string, options: { resolveDir: string }) => {
          resolveRequests.push(`${options.resolveDir}:${path}`);

          for (let directory = options.resolveDir; ; directory = dirname(directory)) {
            // A package specifier resolves to the index file of the package, and an explicit file
            // within it to that file. A deeper subpath is left unresolved, as esbuild leaves one
            // that the `exports` of the package does not name; the Sass importer then resolves it
            // against the package root instead.
            for (const candidate of [
              join(directory, 'node_modules', path, '_index.scss'),
              join(directory, 'node_modules', path),
            ]) {
              if (statSync(candidate, { throwIfNoEntry: false })?.isFile()) {
                return { path: candidate, errors: [], warnings: [] };
              }
            }

            if (dirname(directory) === directory) {
              return { path: undefined, errors: [], warnings: [] };
            }
          }
        },
      } as unknown as PluginBuild;
    }

    async function compile(stylesheet: string, source = "@use 'theme';"): Promise<string> {
      const result = await SassStylesheetLanguage.process?.(
        source,
        stylesheet,
        'scss',
        { sourcemap: false },
        createBuildStub(),
      );
      if (!result) {
        throw new Error('The Sass stylesheet language has no process function.');
      }

      if (result.errors?.length) {
        return `error: ${result.errors[0].text}`;
      }

      return (result.contents as string).trim();
    }

    async function writePackage(directory: string, marker: string): Promise<void> {
      await mkdir(join(directory, 'sub'), { recursive: true });
      await writeFile(join(directory, 'package.json'), '{}');
      await writeFile(join(directory, '_index.scss'), `.marker { content: "${marker}"; }`);
      await writeFile(
        join(directory, 'sub', '_other.scss'),
        `.deep { content: "${marker} deep"; }`,
      );
    }

    beforeAll(async () => {
      const baseTmpDir = process.env['TEST_TMPDIR'];
      assert(baseTmpDir, 'TEST_TMPDIR is not set');
      temporaryRoot = await mkdtemp(join(baseTmpDir, 'angular-cli-sass-language-'));
      projectRoot = join(temporaryRoot, 'project');
      const dependencyRoot = join(projectRoot, 'node_modules', 'dependency');

      // An application using a `theme` package, and a dependency with its own nested version of
      // `theme` plus an `extra` package that only the dependency can see.
      await writePackage(join(projectRoot, 'node_modules', 'theme'), 'project');
      await writePackage(join(dependencyRoot, 'node_modules', 'theme'), 'dependency');
      await writePackage(join(dependencyRoot, 'node_modules', 'extra'), 'extra');

      buttonStylesheet = join(projectRoot, 'src', 'app', 'button', 'button.scss');
      cardStylesheet = join(projectRoot, 'src', 'app', 'card', 'card.scss');
      dependencyStylesheet = join(dependencyRoot, 'styles.scss');
      for (const stylesheet of [buttonStylesheet, cardStylesheet]) {
        await mkdir(dirname(stylesheet), { recursive: true });
      }
    });

    afterAll(async () => {
      shutdownSassWorkerPool();
      await rm(temporaryRoot, { force: true, recursive: true });
    });

    beforeEach(() => {
      resetSassWorkerPoolCaches();
      resolveRequests = [];
    });

    it('should not use the package resolution of a dependency for the application', async () => {
      const dependency = await compile(dependencyStylesheet);
      const application = await compile(buttonStylesheet);

      expect(dependency).toContain('content: "dependency";');
      expect(application).toContain('content: "project";');
    });

    it('should not use the package resolution of the application for a dependency', async () => {
      const application = await compile(buttonStylesheet);
      const dependency = await compile(dependencyStylesheet);

      expect(application).toContain('content: "project";');
      expect(dependency).toContain('content: "dependency";');
    });

    it('should not reuse a failed package resolution of the application for a dependency', async () => {
      const source = "@use 'extra';";
      const application = await compile(buttonStylesheet, source);
      const dependency = await compile(dependencyStylesheet, source);

      expect(application).toContain("Can't find stylesheet to import.");
      expect(dependency).toContain('content: "extra";');
    });

    it('should not use the package root of a dependency for a deep import of the application', async () => {
      // A subpath that resolves to no file of its own is located through the root of the package,
      // which is cached separately from the resolution of the specifier.
      const source = "@use 'theme/sub/other';";
      const dependency = await compile(dependencyStylesheet, source);
      const application = await compile(buttonStylesheet, source);

      expect(dependency).toContain('content: "dependency deep";');
      expect(application).toContain('content: "project deep";');
    });

    it('should share a package resolution between the stylesheets of different components', async () => {
      const button = await compile(buttonStylesheet);
      const card = await compile(cardStylesheet);

      expect(button).toContain('content: "project";');
      expect(card).toContain('content: "project";');
      expect(resolveRequests.length).toBe(1);
    });

    it('should share a package resolution between the stylesheets of different folders of a dependency', async () => {
      const dependencyRoot = join(projectRoot, 'node_modules', 'dependency');
      const first = await compile(join(dependencyRoot, 'sub1', 'styles.scss'));
      const second = await compile(join(dependencyRoot, 'sub2', 'styles.scss'));

      expect(first).toContain('content: "dependency";');
      expect(second).toContain('content: "dependency";');
      expect(resolveRequests.length).toBe(1);
    });

    it('should share a package resolution between the stylesheets of different folders of a scoped package', async () => {
      const packageRoot = join(projectRoot, 'node_modules', '@scope', 'pkg');
      const first = await compile(join(packageRoot, 'sub1', 'styles.scss'));
      const second = await compile(join(packageRoot, 'sub2', 'styles.scss'));

      expect(first).toContain('content: "project";');
      expect(second).toContain('content: "project";');
      expect(resolveRequests.length).toBe(1);
    });

    it('should resolve a package url of a non-file containing URL from the working directory', async () => {
      // The stylesheets of a build have file URLs, but Sass does not limit a containing URL to them.
      spyOn(SassCompiler.prototype, 'compileStringAsync').and.callFake(async (_, options) => {
        const importer = options.importers?.[0] as {
          findFileUrl(
            url: string,
            context: { containingUrl: URL; fromImport: boolean },
          ): Promise<URL | null>;
        };
        const url = await importer.findFileUrl('theme', {
          containingUrl: new URL('custom:styles.scss'),
          fromImport: false,
        });

        return { css: url?.href ?? '', loadedUrls: [] };
      });

      const result = await compile(buttonStylesheet);

      expect(result).toBe(
        pathToFileURL(join(projectRoot, 'node_modules', 'theme', '_index.scss')).href,
      );
    });
  });
});
