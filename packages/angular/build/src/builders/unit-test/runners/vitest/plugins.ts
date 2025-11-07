/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import type {
  BrowserConfigOptions,
  InlineConfig,
  UserWorkspaceConfig,
  VitestPlugin,
} from 'vitest/node';
import { createBuildAssetsMiddleware } from '../../../../tools/vite/middlewares/assets-middleware';
import { toPosixPath } from '../../../../utils/path';
import type { ResultFile } from '../../../application/results';
import type { NormalizedUnitTestBuilderOptions } from '../../options';

type VitestPlugins = Awaited<ReturnType<typeof VitestPlugin>>;

interface PluginOptions {
  workspaceRoot: string;
  projectSourceRoot: string;
  projectName: string;
  buildResultFiles: ReadonlyMap<string, ResultFile>;
  testFileToEntryPoint: ReadonlyMap<string, string>;
}

type VitestCoverageOption = Exclude<InlineConfig['coverage'], undefined>;

interface VitestConfigPluginOptions {
  browser: BrowserConfigOptions | undefined;
  coverage: NormalizedUnitTestBuilderOptions['coverage'];
  projectName: string;
  projectSourceRoot: string;
  reporters?: string[] | [string, object][];
  setupFiles: string[];
  projectPlugins: VitestPlugins;
  include: string[];
}

async function findTestEnvironment(
  projectResolver: NodeJS.RequireResolve,
): Promise<'jsdom' | 'happy-dom'> {
  try {
    projectResolver('happy-dom');

    return 'happy-dom';
  } catch {
    // happy-dom is not installed, fallback to jsdom
    return 'jsdom';
  }
}

export function createVitestConfigPlugin(options: VitestConfigPluginOptions): VitestPlugins[0] {
  const {
    include,
    browser,
    projectName,
    reporters,
    setupFiles,
    projectPlugins,
    projectSourceRoot,
  } = options;

  return {
    name: 'angular:vitest-configuration',
    async config(config) {
      const testConfig = config.test;

      const projectResolver = createRequire(projectSourceRoot + '/').resolve;

      const projectConfig: UserWorkspaceConfig = {
        test: {
          ...testConfig,
          name: projectName,
          setupFiles,
          include,
          globals: testConfig?.globals ?? true,
          ...(browser ? { browser } : {}),
          // If the user has not specified an environment, use a smart default.
          ...(!testConfig?.environment
            ? { environment: await findTestEnvironment(projectResolver) }
            : {}),
        },
        optimizeDeps: {
          noDiscovery: true,
        },
        plugins: projectPlugins,
      };

      return {
        test: {
          coverage: await generateCoverageOption(options.coverage, projectName),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(reporters ? ({ reporters } as any) : {}),
          projects: [projectConfig],
        },
      };
    },
  };
}

export function createVitestPlugins(pluginOptions: PluginOptions): VitestPlugins {
  const { workspaceRoot, buildResultFiles, testFileToEntryPoint } = pluginOptions;

  return [
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
        assert(buildResultFiles.size > 0, 'buildResult must be available for in-memory loading.');

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
          const sourceMapText = sourceMapFile
            ? sourceMapFile.origin === 'memory'
              ? Buffer.from(sourceMapFile.contents).toString('utf-8')
              : await readFile(sourceMapFile.inputPath, 'utf-8')
            : undefined;

          // Vitest will include files in the coverage report if the sourcemap contains no sources.
          // For builder-internal generated code chunks, which are typically helper functions,
          // a virtual source is added to the sourcemap to prevent them from being incorrectly
          // included in the final coverage report.
          const map = sourceMapText ? JSON.parse(sourceMapText) : undefined;
          if (map) {
            if (!map.sources?.length && !map.sourcesContent?.length && !map.mappings) {
              map.sources = ['virtual:builder'];
            }
          }

          return {
            code,
            map,
          };
        }
      },
      configureServer: (server) => {
        server.middlewares.use(createBuildAssetsMiddleware(server.config.base, buildResultFiles));
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
  ];
}

async function generateCoverageOption(
  coverage: NormalizedUnitTestBuilderOptions['coverage'],
  projectName: string,
): Promise<VitestCoverageOption> {
  let defaultExcludes: string[] = [];
  if (coverage.exclude) {
    try {
      const vitestConfig = await import('vitest/config');
      defaultExcludes = vitestConfig.coverageConfigDefaults.exclude;
    } catch {}
  }

  return {
    enabled: coverage.enabled,
    excludeAfterRemap: true,
    include: coverage.include,
    reportsDirectory: toPosixPath(path.join('coverage', projectName)),
    thresholds: coverage.thresholds,
    watermarks: coverage.watermarks,
    // Special handling for `exclude`/`reporters` due to an undefined value causing upstream failures
    ...(coverage.exclude
      ? {
          exclude: [
            // Augment the default exclude https://vitest.dev/config/#coverage-exclude
            // with the user defined exclusions
            ...coverage.exclude,
            ...defaultExcludes,
          ],
        }
      : {}),
    ...(coverage.reporters
      ? ({ reporter: coverage.reporters } satisfies VitestCoverageOption)
      : {}),
  };
}
