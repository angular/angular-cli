/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuildOutputFileType } from '@angular/build';
import {
  ResultFile,
  ResultKind,
  buildApplicationInternal,
  emitFilesToDisk,
} from '@angular/build/private';
import { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import type { Config, ConfigOptions, InlinePluginDef } from 'karma';
import * as path from 'path';
import { Observable, catchError, defaultIfEmpty, from, of, switchMap } from 'rxjs';
import { Configuration } from 'webpack';
import { ExecutionTransformer } from '../../transforms';
import { OutputHashing } from '../browser-esbuild/schema';
import { findTests } from './find-tests';
import { Schema as KarmaBuilderOptions } from './schema';

class ApplicationBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationBuildError';
  }
}

export function execute(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  karmaOptions: ConfigOptions,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<Configuration>;
    // The karma options transform cannot be async without a refactor of the builder implementation
    karmaOptions?: (options: ConfigOptions) => ConfigOptions;
  } = {},
): Observable<BuilderOutput> {
  return from(initializeApplication(options, context, karmaOptions, transforms)).pipe(
    switchMap(
      ([karma, karmaConfig]) =>
        new Observable<BuilderOutput>((subscriber) => {
          // Complete the observable once the Karma server returns.
          const karmaServer = new karma.Server(karmaConfig as Config, (exitCode) => {
            subscriber.next({ success: exitCode === 0 });
            subscriber.complete();
          });

          const karmaStart = karmaServer.start();

          // Cleanup, signal Karma to exit.
          return () => {
            void karmaStart.then(() => karmaServer.stop());
          };
        }),
    ),
    catchError((err) => {
      if (err instanceof ApplicationBuildError) {
        return of({ success: false, message: err.message });
      }

      throw err;
    }),
    defaultIfEmpty({ success: false }),
  );
}

async function getProjectSourceRoot(context: BuilderContext): Promise<string> {
  // We have already validated that the project name is set before calling this function.
  const projectName = context.target?.project;
  if (!projectName) {
    return context.workspaceRoot;
  }

  const projectMetadata = await context.getProjectMetadata(projectName);
  const sourceRoot = (projectMetadata.sourceRoot ?? projectMetadata.root ?? '') as string;

  return path.join(context.workspaceRoot, sourceRoot);
}

async function collectEntrypoints(
  options: KarmaBuilderOptions,
  context: BuilderContext,
): Promise<[Set<string>, string[]]> {
  const projectSourceRoot = await getProjectSourceRoot(context);

  // Glob for files to test.
  const testFiles = await findTests(
    options.include ?? [],
    options.exclude ?? [],
    context.workspaceRoot,
    projectSourceRoot,
  );

  const entryPoints = new Set([
    ...testFiles,
    '@angular-devkit/build-angular/src/builders/karma/init_test_bed.js',
  ]);
  // Extract `zone.js/testing` to a separate entry point because it needs to be loaded after Jasmine.
  const [polyfills, hasZoneTesting] = extractZoneTesting(options.polyfills);
  if (hasZoneTesting) {
    entryPoints.add('zone.js/testing');
  }

  return [entryPoints, polyfills];
}

async function initializeApplication(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  karmaOptions: ConfigOptions,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<Configuration>;
    karmaOptions?: (options: ConfigOptions) => ConfigOptions;
  } = {},
): Promise<[typeof import('karma'), Config & ConfigOptions]> {
  if (transforms.webpackConfiguration) {
    context.logger.warn(
      `This build is using the application builder but transforms.webpackConfiguration was provided. The transform will be ignored.`,
    );
  }

  const testDir = path.join(context.workspaceRoot, 'dist/test-out', randomUUID());

  const [karma, [entryPoints, polyfills]] = await Promise.all([
    import('karma'),
    collectEntrypoints(options, context),
    fs.rm(testDir, { recursive: true, force: true }),
  ]);

  const outputPath = testDir;

  // Build tests with `application` builder, using test files as entry points.
  const buildOutput = await first(
    buildApplicationInternal(
      {
        entryPoints,
        tsConfig: options.tsConfig,
        outputPath,
        aot: false,
        index: false,
        outputHashing: OutputHashing.None,
        optimization: false,
        sourceMap: {
          scripts: true,
          styles: true,
          vendor: true,
        },
        styles: options.styles,
        polyfills,
        webWorkerTsConfig: options.webWorkerTsConfig,
      },
      context,
    ),
  );
  if (buildOutput.kind === ResultKind.Failure) {
    throw new ApplicationBuildError('Build failed');
  } else if (buildOutput.kind !== ResultKind.Full) {
    throw new ApplicationBuildError(
      'A full build result is required from the application builder.',
    );
  }

  // Write test files
  await writeTestFiles(buildOutput.files, testDir);

  karmaOptions.files ??= [];
  karmaOptions.files.push(
    // Serve polyfills first.
    { pattern: `${testDir}/polyfills.js`, type: 'module' },
    // Allow loading of chunk-* files but don't include them all on load.
    { pattern: `${testDir}/chunk-*.js`, type: 'module', included: false },
    // Allow loading of worker-* files but don't include them all on load.
    { pattern: `${testDir}/worker-*.js`, type: 'module', included: false },
    // `zone.js/testing`, served but not included on page load.
    { pattern: `${testDir}/testing.js`, type: 'module', included: false },
    // Serve remaining JS on page load, these are the test entrypoints.
    { pattern: `${testDir}/*.js`, type: 'module' },
  );

  if (options.styles?.length) {
    // Serve CSS outputs on page load, these are the global styles.
    karmaOptions.files.push({ pattern: `${testDir}/*.css`, type: 'css' });
  }

  const parsedKarmaConfig: Config & ConfigOptions = await karma.config.parseConfig(
    options.karmaConfig && path.resolve(context.workspaceRoot, options.karmaConfig),
    transforms.karmaOptions ? transforms.karmaOptions(karmaOptions) : karmaOptions,
    { promiseConfig: true, throwErrors: true },
  );

  // Remove the webpack plugin/framework:
  // Alternative would be to make the Karma plugin "smart" but that's a tall order
  // with managing unneeded imports etc..
  const pluginLengthBefore = (parsedKarmaConfig.plugins ?? []).length;
  parsedKarmaConfig.plugins = (parsedKarmaConfig.plugins ?? []).filter(
    (plugin: string | InlinePluginDef) => {
      if (typeof plugin === 'string') {
        return plugin !== 'framework:@angular-devkit/build-angular';
      }

      return !plugin['framework:@angular-devkit/build-angular'];
    },
  );
  parsedKarmaConfig.frameworks = parsedKarmaConfig.frameworks?.filter(
    (framework: string) => framework !== '@angular-devkit/build-angular',
  );
  const pluginLengthAfter = (parsedKarmaConfig.plugins ?? []).length;
  if (pluginLengthBefore !== pluginLengthAfter) {
    context.logger.warn(
      `Ignoring framework "@angular-devkit/build-angular" from karma config file because it's not compatible with the application builder.`,
    );
  }

  // When using code-coverage, auto-add karma-coverage.
  // This was done as part of the karma plugin for webpack.
  if (
    options.codeCoverage &&
    !parsedKarmaConfig.reporters?.some((r: string) => r === 'coverage' || r === 'coverage-istanbul')
  ) {
    parsedKarmaConfig.reporters = (parsedKarmaConfig.reporters ?? []).concat(['coverage']);
  }

  return [karma, parsedKarmaConfig];
}

export async function writeTestFiles(files: Record<string, ResultFile>, testDir: string) {
  const directoryExists = new Set<string>();
  // Writes the test related output files to disk and ensures the containing directories are present
  await emitFilesToDisk(Object.entries(files), async ([filePath, file]) => {
    if (file.type !== BuildOutputFileType.Browser && file.type !== BuildOutputFileType.Media) {
      return;
    }

    const fullFilePath = path.join(testDir, filePath);

    // Ensure output subdirectories exist
    const fileBasePath = path.dirname(fullFilePath);
    if (fileBasePath && !directoryExists.has(fileBasePath)) {
      await fs.mkdir(fileBasePath, { recursive: true });
      directoryExists.add(fileBasePath);
    }

    if (file.origin === 'memory') {
      // Write file contents
      await fs.writeFile(fullFilePath, file.contents);
    } else {
      // Copy file contents
      await fs.copyFile(file.inputPath, fullFilePath, fs.constants.COPYFILE_FICLONE);
    }
  });
}

function extractZoneTesting(
  polyfills: readonly string[] | string | undefined,
): [polyfills: string[], hasZoneTesting: boolean] {
  if (typeof polyfills === 'string') {
    polyfills = [polyfills];
  }
  polyfills ??= [];

  const polyfillsWithoutZoneTesting = polyfills.filter(
    (polyfill) => polyfill !== 'zone.js/testing',
  );
  const hasZoneTesting = polyfills.length !== polyfillsWithoutZoneTesting.length;

  return [polyfillsWithoutZoneTesting, hasZoneTesting];
}

/** Returns the first item yielded by the given generator and cancels the execution. */
async function first<T>(generator: AsyncIterable<T>): Promise<T> {
  for await (const value of generator) {
    return value;
  }

  throw new Error('Expected generator to emit at least once.');
}
