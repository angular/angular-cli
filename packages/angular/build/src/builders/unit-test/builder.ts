/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import { createVirtualModulePlugin } from '../../tools/esbuild/virtual-module-plugin';
import { assertIsError } from '../../utils/error';
import { loadEsmModule } from '../../utils/load-esm';
import { buildApplicationInternal } from '../application';
import type {
  ApplicationBuilderExtensions,
  ApplicationBuilderInternalOptions,
} from '../application/options';
import { ResultKind } from '../application/results';
import { OutputHashing } from '../application/schema';
import { writeTestFiles } from '../karma/application_builder';
import { findTests, getTestEntrypoints } from '../karma/find-tests';
import { useKarmaBuilder } from './karma-bridge';
import { normalizeOptions } from './options';
import type { Schema as UnitTestOptions } from './schema';

export type { UnitTestOptions };

/**
 * @experimental Direct usage of this function is considered experimental.
 */
// eslint-disable-next-line max-lines-per-function
export async function* execute(
  options: UnitTestOptions,
  context: BuilderContext,
  extensions: ApplicationBuilderExtensions = {},
): AsyncIterable<BuilderOutput> {
  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    context.logger.error(
      `The "${context.builder.builderName}" builder requires a target to be specified.`,
    );

    return;
  }

  context.logger.warn(
    `NOTE: The "${context.builder.builderName}" builder is currently EXPERIMENTAL and not ready for production use.`,
  );

  const normalizedOptions = await normalizeOptions(context, projectName, options);
  const { projectSourceRoot, workspaceRoot, runnerName } = normalizedOptions;

  // Translate options and use karma builder directly if specified
  if (runnerName === 'karma') {
    const karmaBridge = await useKarmaBuilder(context, normalizedOptions);
    yield* karmaBridge;

    return;
  }

  if (runnerName !== 'vitest') {
    context.logger.error('Unknown test runner: ' + runnerName);

    return;
  }

  // Find test files
  const testFiles = await findTests(
    normalizedOptions.include,
    normalizedOptions.exclude,
    workspaceRoot,
    projectSourceRoot,
  );

  if (testFiles.length === 0) {
    context.logger.error('No tests found.');

    return { success: false };
  }

  const entryPoints = getTestEntrypoints(testFiles, { projectSourceRoot, workspaceRoot });
  entryPoints.set('init-testbed', 'angular:test-bed-init');

  let vitestNodeModule;
  try {
    vitestNodeModule = await loadEsmModule<typeof import('vitest/node')>('vitest/node');
  } catch (error: unknown) {
    assertIsError(error);
    if (error.code !== 'ERR_MODULE_NOT_FOUND') {
      throw error;
    }

    context.logger.error(
      'The `vitest` package was not found. Please install the package and rerun the test command.',
    );

    return;
  }
  const { startVitest } = vitestNodeModule;

  // Setup test file build options based on application build target options
  const buildTargetOptions = (await context.validateOptions(
    await context.getTargetOptions(normalizedOptions.buildTarget),
    await context.getBuilderNameForTarget(normalizedOptions.buildTarget),
  )) as unknown as ApplicationBuilderInternalOptions;

  if (buildTargetOptions.polyfills?.includes('zone.js')) {
    buildTargetOptions.polyfills.push('zone.js/testing');
  }

  const outputPath = path.join(context.workspaceRoot, 'dist/test-out', randomUUID());
  const buildOptions: ApplicationBuilderInternalOptions = {
    ...buildTargetOptions,
    watch: normalizedOptions.watch,
    incrementalResults: normalizedOptions.watch,
    outputPath,
    index: false,
    browser: undefined,
    server: undefined,
    localize: false,
    budgets: [],
    serviceWorker: false,
    appShell: false,
    ssr: false,
    prerender: false,
    sourceMap: { scripts: true, vendor: false, styles: false },
    outputHashing: OutputHashing.None,
    optimization: false,
    tsConfig: normalizedOptions.tsConfig,
    entryPoints,
    externalDependencies: ['vitest', ...(buildTargetOptions.externalDependencies ?? [])],
  };
  extensions ??= {};
  extensions.codePlugins ??= [];
  const virtualTestBedInit = createVirtualModulePlugin({
    namespace: 'angular:test-bed-init',
    loadContent: async () => {
      const contents: string[] = [
        // Initialize the Angular testing environment
        `import { NgModule } from '@angular/core';`,
        `import { getTestBed, ɵgetCleanupHook as getCleanupHook } from '@angular/core/testing';`,
        `import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';`,
        `import { beforeEach, afterEach } from 'vitest';`,
        '',
        normalizedOptions.providersFile
          ? `import providers from './${path
              .relative(projectSourceRoot, normalizedOptions.providersFile)
              .replace(/.[mc]?ts$/, '')
              .replace(/\\/g, '/')}'`
          : 'const providers = [];',
        '',
        // Same as https://github.com/angular/angular/blob/05a03d3f975771bb59c7eefd37c01fa127ee2229/packages/core/testing/src/test_hooks.ts#L21-L29
        `beforeEach(getCleanupHook(false));`,
        `afterEach(getCleanupHook(true));`,
        '',
        `@NgModule({`,
        `  providers,`,
        `})`,
        `export class TestModule {}`,
        '',
        `getTestBed().initTestEnvironment([BrowserTestingModule, TestModule], platformBrowserTesting(), {`,
        `  errorOnUnknownElements: true,`,
        `  errorOnUnknownProperties: true,`,
        '});',
      ];

      return {
        contents: contents.join('\n'),
        loader: 'js',
        resolveDir: projectSourceRoot,
      };
    },
  });
  extensions.codePlugins.unshift(virtualTestBedInit);

  let instance: import('vitest/node').Vitest | undefined;

  // Setup vitest browser options if configured
  const { browser, errors } = setupBrowserConfiguration(
    normalizedOptions.browsers,
    projectSourceRoot,
  );
  if (errors?.length) {
    errors.forEach((error) => context.logger.error(error));

    return { success: false };
  }

  // Add setup file entries for TestBed initialization and project polyfills
  const setupFiles = ['init-testbed.js'];
  if (buildTargetOptions?.polyfills?.length) {
    setupFiles.push('polyfills.js');
  }

  try {
    for await (const result of buildApplicationInternal(buildOptions, context, extensions)) {
      if (result.kind === ResultKind.Failure) {
        continue;
      } else if (result.kind !== ResultKind.Full && result.kind !== ResultKind.Incremental) {
        assert.fail(
          'A full and/or incremental build result is required from the application builder.',
        );
      }
      assert(result.files, 'Builder did not provide result files.');

      await writeTestFiles(result.files, outputPath);

      instance ??= await startVitest('test', undefined /* cliFilters */, undefined /* options */, {
        test: {
          root: outputPath,
          globals: true,
          setupFiles,
          // Use `jsdom` if no browsers are explicitly configured.
          // `node` is effectively no "environment" and the default.
          environment: browser ? 'node' : 'jsdom',
          watch: normalizedOptions.watch,
          browser,
          reporters: normalizedOptions.reporters ?? ['default'],
          coverage: {
            enabled: normalizedOptions.codeCoverage,
            exclude: normalizedOptions.codeCoverageExclude,
            excludeAfterRemap: true,
          },
        },
      });

      // Check if all the tests pass to calculate the result
      const testModules = instance.state.getTestModules();

      yield { success: testModules.every((testModule) => testModule.ok()) };
    }
  } finally {
    if (normalizedOptions.watch) {
      // Vitest will automatically close if not using watch mode
      await instance?.close();
    }
  }
}

function findBrowserProvider(
  projectResolver: NodeJS.RequireResolve,
): import('vitest/node').BrowserBuiltinProvider | undefined {
  // One of these must be installed in the project to use browser testing
  const vitestBuiltinProviders = ['playwright', 'webdriverio'] as const;

  for (const providerName of vitestBuiltinProviders) {
    try {
      projectResolver(providerName);

      return providerName;
    } catch {}
  }
}

function setupBrowserConfiguration(
  browsers: string[] | undefined,
  projectSourceRoot: string,
): { browser?: import('vitest/node').BrowserConfigOptions; errors?: string[] } {
  if (browsers === undefined) {
    return {};
  }

  const projectResolver = createRequire(projectSourceRoot + '/').resolve;
  let errors: string[] | undefined;

  try {
    projectResolver('@vitest/browser');
  } catch {
    errors ??= [];
    errors.push(
      'The "browsers" option requires the "@vitest/browser" package to be installed within the project.' +
        ' Please install this package and rerun the test command.',
    );
  }

  const provider = findBrowserProvider(projectResolver);
  if (!provider) {
    errors ??= [];
    errors.push(
      'The "browsers" option requires either "playwright" or "webdriverio" to be installed within the project.' +
        ' Please install one of these packages and rerun the test command.',
    );
  }

  if (errors) {
    return { errors };
  }

  const browser = {
    enabled: true,
    provider,
    instances: browsers.map((browserName) => ({
      browser: browserName,
    })),
  };

  return { browser };
}
