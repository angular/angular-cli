/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { VitestPlugin } from 'vitest/node';
import { createBuildAssetsMiddleware } from '../../../../tools/vite/middlewares/assets-middleware';
import { toPosixPath } from '../../../../utils/path';
import type { ResultFile } from '../../../application/results';
import type { NormalizedUnitTestBuilderOptions } from '../../options';
import type { BrowserConfiguration } from './browser-provider';

type VitestPlugins = Awaited<ReturnType<typeof VitestPlugin>>;

interface PluginOptions {
  workspaceRoot: string;
  projectSourceRoot: string;
  projectName: string;
  include?: string[];
  exclude?: string[];
  buildResultFiles: ReadonlyMap<string, ResultFile>;
  testFileToEntryPoint: ReadonlyMap<string, string>;
}

export function createVitestPlugins(
  options: NormalizedUnitTestBuilderOptions,
  testSetupFiles: string[],
  browserOptions: BrowserConfiguration,
  pluginOptions: PluginOptions,
): VitestPlugins {
  const { workspaceRoot, projectName, buildResultFiles, testFileToEntryPoint } = pluginOptions;

  return [
    {
      name: 'angular:project-init',
      // Type is incorrect. This allows a Promise<void>.
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      configureVitest: async (context) => {
        // Create a subproject that can be configured with plugins for browser mode.
        // Plugins defined directly in the vite overrides will not be present in the
        // browser specific Vite instance.
        await context.injectTestProjects({
          test: {
            name: projectName,
            root: workspaceRoot,
            globals: true,
            setupFiles: testSetupFiles,
            // Use `jsdom` if no browsers are explicitly configured.
            // `node` is effectively no "environment" and the default.
            environment: browserOptions.browser ? 'node' : 'jsdom',
            browser: browserOptions.browser,
            include: options.include,
            ...(options.exclude ? { exclude: options.exclude } : {}),
          },
          plugins: [
            {
              name: 'angular:test-in-memory-provider',
              enforce: 'pre',
              resolveId: (id, importer) => {
                if (importer && (id[0] === '.' || id[0] === '/')) {
                  let fullPath;
                  if (testFileToEntryPoint.has(importer)) {
                    fullPath = toPosixPath(path.join(workspaceRoot, id));
                  } else {
                    fullPath = toPosixPath(path.join(path.dirname(importer), id));
                  }

                  const relativePath = path.relative(workspaceRoot, fullPath);
                  if (buildResultFiles.has(toPosixPath(relativePath))) {
                    return fullPath;
                  }
                }

                if (testFileToEntryPoint.has(id)) {
                  return id;
                }

                assert(buildResultFiles.size > 0, 'buildResult must be available for resolving.');
                const relativePath = path.relative(workspaceRoot, id);
                if (buildResultFiles.has(toPosixPath(relativePath))) {
                  return id;
                }
              },
              load: async (id) => {
                assert(
                  buildResultFiles.size > 0,
                  'buildResult must be available for in-memory loading.',
                );

                // Attempt to load as a source test file.
                const entryPoint = testFileToEntryPoint.get(id);
                let outputPath;
                if (entryPoint) {
                  outputPath = entryPoint + '.js';

                  // To support coverage exclusion of the actual test file, the virtual
                  // test entry point only references the built and bundled intermediate file.
                  return {
                    code: `import "./${outputPath}";`,
                  };
                } else {
                  // Attempt to load as a built artifact.
                  const relativePath = path.relative(workspaceRoot, id);
                  outputPath = toPosixPath(relativePath);
                }

                const outputFile = buildResultFiles.get(outputPath);
                if (outputFile) {
                  const sourceMapPath = outputPath + '.map';
                  const sourceMapFile = buildResultFiles.get(sourceMapPath);
                  const code =
                    outputFile.origin === 'memory'
                      ? Buffer.from(outputFile.contents).toString('utf-8')
                      : await readFile(outputFile.inputPath, 'utf-8');
                  const map = sourceMapFile
                    ? sourceMapFile.origin === 'memory'
                      ? Buffer.from(sourceMapFile.contents).toString('utf-8')
                      : await readFile(sourceMapFile.inputPath, 'utf-8')
                    : undefined;

                  return {
                    code,
                    map: map ? JSON.parse(map) : undefined,
                  };
                }
              },
              configureServer: (server) => {
                server.middlewares.use(
                  createBuildAssetsMiddleware(server.config.base, buildResultFiles),
                );
              },
            },
            {
              name: 'angular:html-index',
              transformIndexHtml: () => {
                // Add all global stylesheets
                if (buildResultFiles.has('styles.css')) {
                  return [
                    {
                      tag: 'link',
                      attrs: { href: 'styles.css', rel: 'stylesheet' },
                      injectTo: 'head',
                    },
                  ];
                }

                return [];
              },
            },
          ],
        });
      },
    },
  ];
}
