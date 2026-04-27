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
import { platform } from 'node:os';
import path from 'node:path';

import type {
  BrowserConfigOptions,
  InlineConfig,
  ResolvedConfig,
  UserWorkspaceConfig,
  VitestPlugin,
} from 'vitest/node';
import { createBuildAssetsMiddleware } from '../../../../tools/vite/middlewares/assets-middleware';
import { toPosixPath } from '../../../../utils/path';
import type { ResultFile } from '../../../application/results';
import type { NormalizedUnitTestBuilderOptions } from '../../options';
import { normalizeBrowserName } from './browser-provider';

interface ExistingRawSourceMap {
  sources?: string[];
  sourcesContent?: string[];
  mappings?: string;
}

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
  projectPlugins: Exclude<UserWorkspaceConfig['plugins'], undefined>;
  include: string[];
  optimizeDepsInclude: string[];
  watch: boolean;
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

function determineCoverageProvider(
  browser: BrowserConfigOptions | undefined,
  testConfig: InlineConfig | undefined,
  optionsCoverageEnabled: boolean | undefined,
  projectSourceRoot: string,
): 'istanbul' | 'v8' | 'custom' | undefined {
  let determinedProvider = testConfig?.coverage?.provider;
  if (!determinedProvider && (optionsCoverageEnabled || testConfig?.coverage?.enabled)) {
    const browsersToCheck = getBrowsersToCheck(browser, testConfig?.browser);

    const hasNonChromium = browsersToCheck.some(
      (b) => !['chrome', 'chromium', 'edge'].includes(normalizeBrowserName(b).browser),
    );

    if (hasNonChromium) {
      determinedProvider = 'istanbul';
    } else {
      const projectRequire = createRequire(projectSourceRoot + '/');
      const checkInstalled = (pkg: string) => {
        try {
          projectRequire.resolve(pkg);

          return true;
        } catch {
          return false;
        }
      };
      const hasIstanbul = checkInstalled('@vitest/coverage-istanbul');
      const hasV8 = checkInstalled('@vitest/coverage-v8');

      if (hasIstanbul && !hasV8) {
        determinedProvider = 'istanbul';
      } else {
        determinedProvider = 'v8';
      }
    }
  }

  return determinedProvider;
}

function getBrowsersToCheck(
  browser: BrowserConfigOptions | undefined,
  testConfigBrowser: BrowserConfigOptions | undefined,
): string[] {
  const browsersToCheck: string[] = [];

  const cliBrowser = browser as CustomBrowserConfigOptions | undefined;
  const userBrowser = testConfigBrowser as CustomBrowserConfigOptions | undefined;

  // 1. CLI options override the Vitest configuration completely.
  if (cliBrowser) {
    if (cliBrowser.instances) {
      browsersToCheck.push(...cliBrowser.instances.map((i) => i.browser));
    }
    if (cliBrowser.name) {
      browsersToCheck.push(cliBrowser.name);
    }

    return browsersToCheck;
  }

  // 2. Fall back to Vitest configuration ONLY if browser testing is enabled.
  if (userBrowser && userBrowser.enabled !== false) {
    if (userBrowser.instances) {
      browsersToCheck.push(...userBrowser.instances.map((i) => i.browser));
    }
    if (userBrowser.name) {
      browsersToCheck.push(userBrowser.name);
    }
  }

  return browsersToCheck;
}

export async function createVitestConfigPlugin(
  options: VitestConfigPluginOptions,
): Promise<VitestPlugins[0]> {
  const {
    include,
    browser,
    projectName,
    reporters,
    setupFiles,
    projectPlugins,
    projectSourceRoot,
  } = options;

  const { mergeConfig } = await import('vitest/config');

  return {
    name: 'angular:vitest-configuration',
    async config(config) {
      const testConfig = config.test;

      const determinedProvider = determineCoverageProvider(
        browser,
        testConfig,
        options.coverage.enabled,
        projectSourceRoot,
      );

      if (reporters !== undefined) {
        delete testConfig?.reporters;
      }

      if (
        options.coverage.reporters !== undefined &&
        testConfig?.coverage &&
        'reporter' in testConfig.coverage
      ) {
        delete testConfig.coverage.reporter;
      }

      if (testConfig?.projects?.length) {
        this.warn(
          'The "test.projects" option in the Vitest configuration file is not supported. ' +
            'The Angular CLI Test system will construct its own project configuration.',
        );
        delete testConfig.projects;
      }

      if (testConfig?.include) {
        this.warn(
          'The "test.include" option in the Vitest configuration file is not supported. ' +
            'The Angular CLI Test system will manage test file discovery.',
        );
        delete testConfig.include;
      }

      if (testConfig?.watch !== undefined && testConfig.watch !== options.watch) {
        this.warn(
          `The "test.watch" option in the Vitest configuration file is overridden by the builder's ` +
            `watch option. Please use the Angular CLI "--watch" option to enable or disable watch mode.`,
        );
        delete testConfig.watch;
      }

      if (testConfig?.exclude) {
        this.warn(
          'The "test.exclude" option in the Vitest configuration file is evaluated after ' +
            'tests are compiled. For better build performance, please use the Angular CLI ' +
            '"exclude" option instead.',
        );
      }

      // Merge user-defined plugins from the Vitest config with the CLI's internal plugins.
      if (config.plugins) {
        const userPlugins = config.plugins.filter(
          (plugin) =>
            // Only inspect objects with a `name` property as these would be the internal injected plugins
            !plugin ||
            typeof plugin !== 'object' ||
            !('name' in plugin) ||
            (!plugin.name.startsWith('angular:') && !plugin.name.startsWith('vitest')),
        );

        if (userPlugins.length > 0) {
          projectPlugins.push(...userPlugins);
        }
        delete config.plugins;
      }

      // Validate browser coverage support if coverage is enabled
      if (
        (browser || testConfig?.browser?.enabled) &&
        (options.coverage.enabled || testConfig?.coverage?.enabled)
      ) {
        validateBrowserCoverage(browser, testConfig?.browser, determinedProvider);
      }

      const projectResolver = createRequire(projectSourceRoot + '/').resolve;

      const projectDefaults: UserWorkspaceConfig = {
        test: {
          setupFiles,
          globals: true,
          // Default to `false` to align with the Karma/Jasmine experience.
          isolate: false,
          sequence: { setupFiles: 'list' },
        },
        optimizeDeps: {
          noDiscovery: true,
          include: options.optimizeDepsInclude,
        },
        resolve: {
          mainFields: ['es2020', 'module', 'main'],
          conditions: ['es2015', 'es2020', 'module', ...(browser ? ['browser'] : [])],
        },
      };

      const { optimizeDeps, resolve } = config;
      const projectOverrides: UserWorkspaceConfig = {
        test: {
          name: projectName,
          include,
          // CLI provider browser options override, if present
          ...(browser ? { browser } : {}),
          // If the user has not specified an environment, use a smart default.
          ...(!testConfig?.environment
            ? { environment: await findTestEnvironment(projectResolver) }
            : {}),
        },
        plugins: projectPlugins,
        optimizeDeps,
        resolve,
      };

      const projectBase = mergeConfig(projectDefaults, testConfig ? { test: testConfig } : {});
      const projectConfig = mergeConfig(projectBase, projectOverrides);

      return {
        test: {
          coverage: await generateCoverageOption(
            options.coverage,
            testConfig?.coverage,
            projectName,
            determinedProvider,
          ),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(reporters ? ({ reporters } as any) : {}),
          projects: [projectConfig],
        },
      };
    },
  };
}

const textDecoder = new TextDecoder('utf-8');
async function loadResultFile(file: ResultFile): Promise<string> {
  if (file.origin === 'memory') {
    return textDecoder.decode(file.contents);
  }

  return readFile(file.inputPath, 'utf-8');
}

export function createVitestPlugins(pluginOptions: PluginOptions): VitestPlugins {
  const { workspaceRoot, buildResultFiles, testFileToEntryPoint } = pluginOptions;
  const isWindows = platform() === 'win32';
  let vitestConfig: ResolvedConfig;

  return [
    {
      name: 'angular:test-in-memory-provider',
      enforce: 'pre',
      configureVitest(context) {
        vitestConfig = context.vitest.config;
      },
      resolveId: (id, importer) => {
        // Fast path for test entry points.
        if (testFileToEntryPoint.has(id)) {
          return id;
        }

        // Workaround for Vitest in Windows when a fully qualified absolute path is provided with
        // a superfluous leading slash. This can currently occur with the `@vitest/coverage-v8` provider
        // when it uses `removeStartsWith(url, FILE_PROTOCOL)` to convert a file URL resulting in
        // `/D:/tmp_dir/...` instead of `D:/tmp_dir/...`.
        if (id[0] === '/' && isWindows) {
          const slicedId = id.slice(1);
          if (path.isAbsolute(slicedId)) {
            return slicedId;
          }
        }

        // Determine the base directory for resolution.
        let baseDir: string;
        if (importer) {
          // If the importer is a test entry point, resolve relative to the workspace root.
          // Otherwise, resolve relative to the importer's directory.
          baseDir = testFileToEntryPoint.has(importer) ? workspaceRoot : path.dirname(importer);
        } else {
          // If there's no importer, assume the id is relative to the workspace root.
          baseDir = workspaceRoot;
        }

        // Construct the full, absolute path and normalize it to POSIX format.
        let fullPath: string;
        if (path.isAbsolute(id)) {
          const relativeId = path.relative(baseDir, id);
          fullPath =
            !relativeId.startsWith('..') && !path.isAbsolute(relativeId)
              ? id
              : path.join(baseDir, id);
        } else {
          fullPath = path.join(baseDir, id);
        }
        fullPath = toPosixPath(fullPath);

        if (testFileToEntryPoint.has(fullPath)) {
          return fullPath;
        }

        // Check if the resolved path corresponds to a known build artifact.
        const relativePath = path.relative(workspaceRoot, fullPath);
        if (buildResultFiles.has(toPosixPath(relativePath))) {
          return fullPath;
        }

        // If the module cannot be resolved from the build artifacts, let other plugins handle it.
        return undefined;
      },
      async load(id) {
        assert(buildResultFiles.size > 0, 'buildResult must be available for in-memory loading.');

        // Attempt to load as a source test file.
        const entryPoint = testFileToEntryPoint.get(id);
        let outputPath;
        if (entryPoint) {
          outputPath = entryPoint + '.js';

          if (vitestConfig?.coverage?.enabled) {
            // To support coverage exclusion of the actual test file, the virtual
            // test entry point only references the built and bundled intermediate file.
            // If vitest supported an "excludeOnlyAfterRemap" option, this could be removed completely.
            return {
              code: `import "./${outputPath}";`,
            };
          }
        } else {
          // Attempt to load as a built artifact.
          const relativePath = path.relative(workspaceRoot, id);
          outputPath = toPosixPath(relativePath);
        }

        const outputFile = buildResultFiles.get(outputPath);
        if (outputFile) {
          const code = await loadResultFile(outputFile);
          const sourceMapPath = outputPath + '.map';
          const sourceMapFile = buildResultFiles.get(sourceMapPath);
          const sourceMapText = sourceMapFile ? await loadResultFile(sourceMapFile) : undefined;

          const map = sourceMapText ? JSON.parse(sourceMapText) : undefined;
          if (map) {
            adjustSourcemapSources(map, true, workspaceRoot, id);
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

/**
 * Adjusts the sources field in a sourcemap to ensure correct source mapping and coverage reporting.
 *
 * @param map The raw sourcemap to adjust.
 * @param rebaseSources Whether to rebase the source paths relative to the test file.
 * @param workspaceRoot The root directory of the workspace.
 * @param id The ID (path) of the file being loaded.
 */
function adjustSourcemapSources(
  map: ExistingRawSourceMap,
  rebaseSources: boolean,
  workspaceRoot: string,
  id: string,
): void {
  if (!map.sources?.length && !map.sourcesContent?.length && !map.mappings) {
    // Vitest will include files in the coverage report if the sourcemap contains no sources.
    // For builder-internal generated code chunks, which are typically helper functions,
    // a virtual source is added to the sourcemap to prevent them from being incorrectly
    // included in the final coverage report.
    map.sources = ['virtual:builder'];
  } else if (rebaseSources && map.sources) {
    map.sources = map.sources.map((source) => {
      if (!source || source.startsWith('angular:')) {
        return source;
      }

      // source is relative to the workspace root because the output file is at the root of the output.
      const absoluteSource = path.join(workspaceRoot, source);

      return toPosixPath(path.relative(path.dirname(id), absoluteSource));
    });
  }
}

interface CustomBrowserConfigOptions {
  enabled?: boolean;
  instances?: { browser: string }[];
  name?: string;
}

/**
 * Validates that all enabled browsers support V8 coverage when coverage is enabled.
 * Throws an error if an unsupported browser is detected.
 */
function validateBrowserCoverage(
  browser: BrowserConfigOptions | undefined,
  testConfigBrowser: BrowserConfigOptions | undefined,
  provider?: string,
): void {
  if (provider === 'istanbul') {
    return;
  }
  const browsersToCheck = getBrowsersToCheck(browser, testConfigBrowser);

  // Normalize and filter unsupported browsers
  const unsupportedBrowsers = browsersToCheck
    .map((b) => normalizeBrowserName(b).browser)
    .filter((b) => !['chrome', 'chromium', 'edge'].includes(b));

  if (unsupportedBrowsers.length > 0) {
    throw new Error(
      `Code coverage is enabled, but the following configured browsers do not support the V8 coverage provider: ` +
        `${unsupportedBrowsers.join(', ')}. ` +
        `V8 coverage is only supported on Chromium-based browsers (e.g., Chrome, Chromium, Edge). ` +
        `Please disable coverage or remove the unsupported browsers.`,
    );
  }
}

async function generateCoverageOption(
  optionsCoverage: NormalizedUnitTestBuilderOptions['coverage'],
  configCoverage: VitestCoverageOption | undefined,
  projectName: string,
  provider?: 'istanbul' | 'v8' | 'custom',
): Promise<VitestCoverageOption> {
  let defaultExcludes: string[] = [];
  // When a coverage exclude option is provided, Vitest's default coverage excludes
  // will be overridden. To retain them, we manually fetch the defaults to append to the
  // user's provided exclusions.
  if (optionsCoverage.exclude) {
    try {
      const vitestConfig = await import('vitest/config');
      defaultExcludes = vitestConfig.coverageConfigDefaults.exclude;
    } catch {}
  }

  return {
    provider,
    excludeAfterRemap: true,
    reportsDirectory:
      configCoverage?.reportsDirectory ?? toPosixPath(path.join('coverage', projectName)),
    ...(optionsCoverage.enabled !== undefined ? { enabled: optionsCoverage.enabled } : {}),
    // Vitest performs a pre-check and a post-check for sourcemaps.
    // The pre-check uses the bundled files, so specific bundled entry points and chunks need to be included.
    // The post-check uses the original source files, so the user's include is used.
    ...(optionsCoverage.include
      ? { include: ['spec-*.js', 'chunk-*.js', ...optionsCoverage.include] }
      : {}),
    // The 'in' operator is used here because 'configCoverage' is a union type and
    // not all coverage providers support thresholds or watermarks.
    thresholds: mergeCoverageObjects(
      configCoverage && 'thresholds' in configCoverage ? configCoverage.thresholds : undefined,
      optionsCoverage.thresholds,
    ),
    watermarks: mergeCoverageObjects(
      configCoverage && 'watermarks' in configCoverage ? configCoverage.watermarks : undefined,
      optionsCoverage.watermarks,
    ),
    // Special handling for `exclude`/`reporters` due to an undefined value causing upstream failures
    ...(optionsCoverage.exclude
      ? {
          exclude: Array.from(
            new Set([
              // Augment the default exclude https://vitest.dev/config/#coverage-exclude
              // with the user defined exclusions
              ...(configCoverage?.exclude || []),
              ...optionsCoverage.exclude,
              ...defaultExcludes,
            ]),
          ),
        }
      : {}),
    ...(optionsCoverage.reporters
      ? ({ reporter: optionsCoverage.reporters } satisfies VitestCoverageOption)
      : {}),
  };
}

/**
 * Merges coverage related objects while ignoring any `undefined` values.
 * This ensures that Angular CLI options correctly override Vitest configuration
 * only when explicitly provided.
 */
function mergeCoverageObjects<T extends object>(
  configValue: T | undefined,
  optionsValue: T | undefined,
): T | undefined {
  if (optionsValue === undefined) {
    return configValue;
  }

  const result: Record<string, unknown> = { ...(configValue ?? {}) };
  for (const [key, value] of Object.entries(optionsValue)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }

  return Object.keys(result).length > 0 ? (result as T) : undefined;
}
