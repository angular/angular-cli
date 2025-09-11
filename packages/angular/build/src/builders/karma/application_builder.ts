/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { Config, ConfigOptions, FilePattern, InlinePluginDef, Server } from 'karma';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import { ReadableStream } from 'node:stream/web';
import { createVirtualModulePlugin } from '../../tools/esbuild/virtual-module-plugin';
import { buildApplicationInternal } from '../application/index';
import { ApplicationBuilderInternalOptions } from '../application/options';
import { Result, ResultKind } from '../application/results';
import { OutputHashing } from '../application/schema';
import { AngularAssetsMiddleware } from './assets-middleware';
import { createInstrumentationFilter, getInstrumentationExcludedPaths } from './coverage';
import { getBaseKarmaOptions } from './karma-config';
import { NormalizedKarmaBuilderOptions, normalizeOptions } from './options';
import { AngularPolyfillsPlugin } from './polyfills-plugin';
import { injectKarmaReporter } from './progress-reporter';
import { Schema as KarmaBuilderOptions } from './schema';
import {
  collectEntrypoints,
  first,
  getProjectSourceRoot,
  hasChunkOrWorkerFiles,
  normalizePolyfills,
  writeTestFiles,
} from './utils';
import type { KarmaBuilderTransformsOptions } from './index';

interface BuildOptions extends ApplicationBuilderInternalOptions {
  // We know that it's always a string since we set it.
  outputPath: string;
}

class ApplicationBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationBuildError';
  }
}

export function execute(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  transforms?: KarmaBuilderTransformsOptions,
): AsyncIterable<BuilderOutput> {
  const normalizedOptions = normalizeOptions(context, options);
  const karmaOptions = getBaseKarmaOptions(normalizedOptions, context);

  let karmaServer: Server;

  return new ReadableStream({
    async start(controller) {
      let init;
      try {
        init = await initializeApplication(normalizedOptions, context, karmaOptions, transforms);
      } catch (err) {
        if (err instanceof ApplicationBuildError) {
          controller.enqueue({ success: false, message: err.message });
          controller.close();

          return;
        }

        throw err;
      }

      const [karma, karmaConfig, buildOptions, buildIterator] = init;

      // If `--watch` is explicitly enabled or if we are keeping the Karma
      // process running, we should hook Karma into the build.
      if (buildIterator) {
        injectKarmaReporter(buildOptions, buildIterator, karmaConfig, controller);
      }

      // Close the stream once the Karma server returns.
      karmaServer = new karma.Server(karmaConfig as Config, (exitCode) => {
        controller.enqueue({ success: exitCode === 0 });
        controller.close();
      });

      await karmaServer.start();
    },
    async cancel() {
      await karmaServer?.stop();
    },
  });
}

async function initializeApplication(
  options: NormalizedKarmaBuilderOptions,
  context: BuilderContext,
  karmaOptions: ConfigOptions,
  transforms?: KarmaBuilderTransformsOptions,
): Promise<
  [typeof import('karma'), Config & ConfigOptions, BuildOptions, AsyncIterator<Result> | null]
> {
  const karma = await import('karma');
  const projectSourceRoot = await getProjectSourceRoot(context);
  const outputPath = path.join(context.workspaceRoot, 'dist/test-out', randomUUID());
  await fs.rm(outputPath, { recursive: true, force: true });

  const { buildOptions, mainName } = await setupBuildOptions(
    options,
    context,
    projectSourceRoot,
    outputPath,
  );

  const [buildOutput, buildIterator] = await runEsbuild(buildOptions, context, projectSourceRoot);

  const karmaConfig = await configureKarma(
    karma,
    context,
    karmaOptions,
    options,
    buildOptions,
    buildOutput,
    mainName,
    transforms,
  );

  return [karma, karmaConfig, buildOptions, buildIterator];
}

async function setupBuildOptions(
  options: NormalizedKarmaBuilderOptions,
  context: BuilderContext,
  projectSourceRoot: string,
  outputPath: string,
): Promise<{ buildOptions: BuildOptions; mainName: string }> {
  const entryPoints = await collectEntrypoints(options, context, projectSourceRoot);

  const mainName = 'test_main';
  if (options.main) {
    entryPoints.set(mainName, options.main);
  } else {
    entryPoints.set(mainName, 'angular:test-bed-init');
  }

  const instrumentForCoverage = options.codeCoverage
    ? createInstrumentationFilter(
        projectSourceRoot,
        getInstrumentationExcludedPaths(context.workspaceRoot, options.codeCoverageExclude ?? []),
      )
    : undefined;

  const [polyfills, jasmineCleanup] = normalizePolyfills(options.polyfills);
  for (let idx = 0; idx < jasmineCleanup.length; ++idx) {
    entryPoints.set(`jasmine-cleanup-${idx}`, jasmineCleanup[idx]);
  }

  const buildOptions: BuildOptions = {
    assets: options.assets,
    entryPoints,
    tsConfig: options.tsConfig,
    outputPath,
    preserveSymlinks: options.preserveSymlinks,
    aot: options.aot,
    index: false,
    outputHashing: OutputHashing.None,
    optimization: false,
    sourceMap: options.sourceMap,
    instrumentForCoverage,
    styles: options.styles,
    scripts: options.scripts,
    polyfills,
    webWorkerTsConfig: options.webWorkerTsConfig,
    watch: options.watch,
    stylePreprocessorOptions: options.stylePreprocessorOptions,
    inlineStyleLanguage: options.inlineStyleLanguage,
    fileReplacements: options.fileReplacements,
    define: options.define,
    loader: options.loader,
    externalDependencies: options.externalDependencies,
  };

  return { buildOptions, mainName };
}

async function runEsbuild(
  buildOptions: BuildOptions,
  context: BuilderContext,
  projectSourceRoot: string,
): Promise<[Result & { kind: ResultKind.Full }, AsyncIterator<Result> | null]> {
  const virtualTestBedInit = createVirtualModulePlugin({
    namespace: 'angular:test-bed-init',
    loadContent: async () => {
      const contents: string[] = [
        // Initialize the Angular testing environment
        `import { getTestBed } from '@angular/core/testing';`,
        `import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';`,
        `getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting(), {`,
        `  errorOnUnknownElements: true,`,
        `  errorOnUnknownProperties: true,`,
        `});`,
      ];

      return {
        contents: contents.join('\n'),
        loader: 'js',
        resolveDir: projectSourceRoot,
      };
    },
  });

  // Build tests with `application` builder, using test files as entry points.
  const [buildOutput, buildIterator] = await first(
    buildApplicationInternal(buildOptions, context, { codePlugins: [virtualTestBedInit] }),
    { cancel: !buildOptions.watch },
  );
  if (buildOutput.kind === ResultKind.Failure) {
    throw new ApplicationBuildError('Build failed');
  } else if (buildOutput.kind !== ResultKind.Full) {
    throw new ApplicationBuildError(
      'A full build result is required from the application builder.',
    );
  }

  // Write test files
  await writeTestFiles(buildOutput.files, buildOptions.outputPath);

  return [buildOutput, buildIterator];
}

async function configureKarma(
  karma: typeof import('karma'),
  context: BuilderContext,
  karmaOptions: ConfigOptions,
  options: NormalizedKarmaBuilderOptions,
  buildOptions: BuildOptions,
  buildOutput: Result & { kind: ResultKind.Full },
  mainName: string,
  transforms?: KarmaBuilderTransformsOptions,
): Promise<Config & ConfigOptions> {
  const outputPath = buildOptions.outputPath;

  // We need to add this to the beginning *after* the testing framework has
  // prepended its files. The output path is required for each since they are
  // added later in the test process via a plugin.
  const polyfillsFile: FilePattern = {
    pattern: `${outputPath}/polyfills.js`,
    included: true,
    served: true,
    type: 'module',
    watched: false,
  };
  const jasmineCleanupFiles: FilePattern = {
    pattern: `${outputPath}/jasmine-cleanup-*.js`,
    included: true,
    served: true,
    type: 'module',
    watched: false,
  };

  karmaOptions.basePath = outputPath;

  const scriptsFiles: FilePattern[] = [];
  if (options.scripts?.length) {
    const outputScripts = new Set<string>();
    for (const scriptEntry of options.scripts) {
      const outputName =
        typeof scriptEntry === 'string'
          ? 'scripts.js'
          : `${scriptEntry.bundleName ?? 'scripts'}.js`;

      if (outputScripts.has(outputName)) {
        continue;
      }
      outputScripts.add(outputName);
      scriptsFiles.push({
        pattern: `${outputPath}/${outputName}`,
        watched: false,
        included: typeof scriptEntry === 'string' ? true : scriptEntry.inject !== false,
        type: 'js',
      });
    }
  }

  karmaOptions.files ??= [];
  karmaOptions.files.push(
    // Serve global setup script.
    { pattern: `${mainName}.js`, type: 'module', watched: false },
    // Serve all source maps.
    { pattern: `*.map`, included: false, watched: false },
    // These are the test entrypoints.
    { pattern: `spec-*.js`, type: 'module', watched: false },
  );

  if (hasChunkOrWorkerFiles(buildOutput.files)) {
    karmaOptions.files.push(
      // Allow loading of chunk-* files but don't include them all on load.
      {
        pattern: `{chunk,worker}-*.js`,
        type: 'module',
        included: false,
        watched: false,
      },
    );
  }

  if (options.styles?.length) {
    // Serve CSS outputs on page load, these are the global styles.
    karmaOptions.files.push({ pattern: `*.css`, type: 'css', watched: false });
  }

  const parsedKarmaConfig: Config & ConfigOptions = await karma.config.parseConfig(
    options.karmaConfig,
    transforms?.karmaOptions ? await transforms.karmaOptions(karmaOptions) : karmaOptions,
    { promiseConfig: true, throwErrors: true },
  );

  // Check for jsdom which does not support executing ESM scripts.
  // If present, remove jsdom and issue a warning.
  const updatedBrowsers = parsedKarmaConfig.browsers?.filter((browser) => browser !== 'jsdom');
  if (parsedKarmaConfig.browsers?.length !== updatedBrowsers?.length) {
    parsedKarmaConfig.browsers = updatedBrowsers;
    context.logger.warn(
      `'jsdom' does not support ESM code execution and cannot be used for karma testing.` +
        ` The 'jsdom' entry has been removed from the 'browsers' option.`,
    );
  }

  // Remove the webpack plugin/framework:
  // Alternative would be to make the Karma plugin "smart" but that's a tall order
  // with managing unneeded imports etc..
  parsedKarmaConfig.plugins ??= [];
  const pluginLengthBefore = parsedKarmaConfig.plugins.length;
  parsedKarmaConfig.plugins = parsedKarmaConfig.plugins.filter(
    (plugin: string | InlinePluginDef) => {
      if (typeof plugin === 'string') {
        return plugin !== 'framework:@angular-devkit/build-angular';
      }

      return !plugin['framework:@angular-devkit/build-angular'];
    },
  );
  parsedKarmaConfig.frameworks ??= [];
  parsedKarmaConfig.frameworks = parsedKarmaConfig.frameworks.filter(
    (framework: string) => framework !== '@angular-devkit/build-angular',
  );
  const pluginLengthAfter = parsedKarmaConfig.plugins.length;
  if (pluginLengthBefore !== pluginLengthAfter) {
    context.logger.warn(
      `Ignoring framework "@angular-devkit/build-angular" from karma config file because it's not compatible with the application builder.`,
    );
  }

  parsedKarmaConfig.plugins.push(AngularAssetsMiddleware.createPlugin(buildOutput));
  parsedKarmaConfig.middleware ??= [];
  parsedKarmaConfig.middleware.push(AngularAssetsMiddleware.NAME);

  parsedKarmaConfig.plugins.push(
    AngularPolyfillsPlugin.createPlugin(polyfillsFile, jasmineCleanupFiles, scriptsFiles),
  );
  parsedKarmaConfig.reporters ??= [];
  parsedKarmaConfig.reporters.push(AngularPolyfillsPlugin.NAME);

  // Adjust karma junit reporter outDir location to maintain previous (devkit) behavior
  // The base path for the reporter was previously the workspace root.
  // To keep the files in the same location, the reporter's output directory is adjusted
  // to be relative to the workspace root when using junit.
  if (parsedKarmaConfig.reporters?.some((reporter) => reporter === 'junit')) {
    if ('junitReporter' in parsedKarmaConfig) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const junitReporterOptions = (parsedKarmaConfig as any)['junitReporter'] as {
        outputDir?: unknown;
      };
      if (junitReporterOptions.outputDir == undefined) {
        junitReporterOptions.outputDir = context.workspaceRoot;
      } else if (
        typeof junitReporterOptions.outputDir === 'string' &&
        !path.isAbsolute(junitReporterOptions.outputDir)
      ) {
        junitReporterOptions.outputDir = path.join(
          context.workspaceRoot,
          junitReporterOptions.outputDir,
        );
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (parsedKarmaConfig as any)['junitReporter'] = {
        outputDir: context.workspaceRoot,
      };
    }
  }

  // When using code-coverage, auto-add karma-coverage.
  // This was done as part of the karma plugin for webpack.
  if (
    options.codeCoverage &&
    !parsedKarmaConfig.reporters?.some((r: string) => r === 'coverage' || r === 'coverage-istanbul')
  ) {
    parsedKarmaConfig.reporters = (parsedKarmaConfig.reporters ?? []).concat(['coverage']);
  }

  return parsedKarmaConfig;
}
