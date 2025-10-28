/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderOutput } from '@angular-devkit/architect';
import assert from 'node:assert';
import path from 'node:path';
import { isMatch } from 'picomatch';
import type { InlineConfig, Vitest } from 'vitest/node';
import { assertIsError } from '../../../../utils/error';
import { toPosixPath } from '../../../../utils/path';
import {
  type FullResult,
  type IncrementalResult,
  type ResultFile,
  ResultKind,
} from '../../../application/results';
import { NormalizedUnitTestBuilderOptions } from '../../options';
import type { TestExecutor } from '../api';
import { setupBrowserConfiguration } from './browser-provider';
import { createVitestPlugins } from './plugins';

type VitestCoverageOption = Exclude<InlineConfig['coverage'], undefined>;

export class VitestExecutor implements TestExecutor {
  private vitest: Vitest | undefined;
  private normalizePath: ((id: string) => string) | undefined;
  private readonly projectName: string;
  private readonly options: NormalizedUnitTestBuilderOptions;
  private readonly buildResultFiles = new Map<string, ResultFile>();

  // This is a reverse map of the entry points created in `build-options.ts`.
  // It is used by the in-memory provider plugin to map the requested test file
  // path back to its bundled output path.
  // Example: `Map<'/path/to/src/app.spec.ts', 'spec-src-app-spec'>`
  private readonly testFileToEntryPoint = new Map<string, string>();
  private readonly entryPointToTestFile = new Map<string, string>();

  constructor(
    projectName: string,
    options: NormalizedUnitTestBuilderOptions,
    testEntryPointMappings: Map<string, string> | undefined,
  ) {
    this.projectName = projectName;
    this.options = options;

    if (testEntryPointMappings) {
      for (const [entryPoint, testFile] of testEntryPointMappings) {
        this.testFileToEntryPoint.set(testFile, entryPoint);
        this.entryPointToTestFile.set(entryPoint + '.js', testFile);
      }
    }
  }

  async *execute(buildResult: FullResult | IncrementalResult): AsyncIterable<BuilderOutput> {
    this.normalizePath ??= (await import('vite')).normalizePath;

    if (buildResult.kind === ResultKind.Full) {
      this.buildResultFiles.clear();
      for (const [path, file] of Object.entries(buildResult.files)) {
        this.buildResultFiles.set(this.normalizePath(path), file);
      }
    } else {
      for (const file of buildResult.removed) {
        this.buildResultFiles.delete(this.normalizePath(file.path));
      }
      for (const [path, file] of Object.entries(buildResult.files)) {
        this.buildResultFiles.set(this.normalizePath(path), file);
      }
    }

    // Initialize Vitest if not already present.
    this.vitest ??= await this.initializeVitest();
    const vitest = this.vitest;

    let testResults;
    if (buildResult.kind === ResultKind.Incremental) {
      // To rerun tests, Vitest needs the original test file paths, not the output paths.
      const modifiedSourceFiles = new Set<string>();
      for (const modifiedFile of buildResult.modified) {
        // The `modified` files in the build result are the output paths.
        // We need to find the original source file path to pass to Vitest.
        const source = this.entryPointToTestFile.get(modifiedFile);
        if (source) {
          modifiedSourceFiles.add(source);
        }
        vitest.invalidateFile(toPosixPath(path.join(this.options.workspaceRoot, modifiedFile)));
      }

      const specsToRerun = [];
      for (const file of modifiedSourceFiles) {
        vitest.invalidateFile(file);
        const specs = vitest.getModuleSpecifications(file);
        if (specs) {
          specsToRerun.push(...specs);
        }
      }

      if (specsToRerun.length > 0) {
        testResults = await vitest.rerunTestSpecifications(specsToRerun);
      }
    }

    // Check if all the tests pass to calculate the result
    const testModules = testResults?.testModules ?? this.vitest.state.getTestModules();

    yield { success: testModules.every((testModule) => testModule.ok()) };
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.vitest?.close();
  }

  private prepareSetupFiles(): string[] {
    const { setupFiles } = this.options;
    // Add setup file entries for TestBed initialization and project polyfills
    const testSetupFiles = ['init-testbed.js', ...setupFiles];

    // TODO: Provide additional result metadata to avoid needing to extract based on filename
    if (this.buildResultFiles.has('polyfills.js')) {
      testSetupFiles.unshift('polyfills.js');
    }

    return testSetupFiles;
  }

  private async initializeVitest(): Promise<Vitest> {
    const {
      coverage,
      reporters,
      outputFile,
      workspaceRoot,
      browsers,
      debug,
      watch,
      browserViewport,
      ui,
    } = this.options;

    let vitestNodeModule;
    let vitestCoverageModule;
    try {
      vitestCoverageModule = await import('vitest/coverage');
      vitestNodeModule = await import('vitest/node');
    } catch (error: unknown) {
      assertIsError(error);
      if (error.code !== 'ERR_MODULE_NOT_FOUND') {
        throw error;
      }
      throw new Error(
        'The `vitest` package was not found. Please install the package and rerun the test command.',
      );
    }
    const { startVitest } = vitestNodeModule;

    // Augment BaseCoverageProvider to include logic to support the built virtual files.
    // Temporary workaround to avoid the direct filesystem checks in the base provider that
    // were introduced in v4. Also ensures that all built virtual files are available.
    const builtVirtualFiles = this.buildResultFiles;
    vitestCoverageModule.BaseCoverageProvider.prototype.isIncluded = function (filename) {
      const relativeFilename = path.relative(workspaceRoot, filename);
      if (!this.options.include || builtVirtualFiles.has(relativeFilename)) {
        return !isMatch(relativeFilename, this.options.exclude);
      } else {
        return isMatch(relativeFilename, this.options.include, {
          ignore: this.options.exclude,
        });
      }
    };

    // Setup vitest browser options if configured
    const browserOptions = await setupBrowserConfiguration(
      browsers,
      debug,
      this.options.projectSourceRoot,
      browserViewport,
    );
    if (browserOptions.errors?.length) {
      throw new Error(browserOptions.errors.join('\n'));
    }

    assert(
      this.buildResultFiles.size > 0,
      'buildResult must be available before initializing vitest',
    );

    const testSetupFiles = this.prepareSetupFiles();
    const plugins = createVitestPlugins(this.options, testSetupFiles, browserOptions, {
      workspaceRoot,
      projectSourceRoot: this.options.projectSourceRoot,
      projectName: this.projectName,
      include: this.options.include,
      exclude: this.options.exclude,
      buildResultFiles: this.buildResultFiles,
      testFileToEntryPoint: this.testFileToEntryPoint,
    });

    const debugOptions = debug
      ? {
          inspectBrk: true,
          isolate: false,
          fileParallelism: false,
        }
      : {};

    return startVitest(
      'test',
      undefined,
      {
        config: this.options.runnerConfig === true ? undefined : this.options.runnerConfig,
        root: workspaceRoot,
        project: ['base', this.projectName],
        name: 'base',
        include: [],
        testNamePattern: this.options.filter,
        watch,
        ui,
      },
      {
        test: {
          coverage: await generateCoverageOption(coverage, this.projectName),
          outputFile,
          ...debugOptions,
          ...(reporters ? { reporters } : {}),
        },
        server: {
          // Disable the actual file watcher. The boolean watch option above should still
          // be enabled as it controls other internal behavior related to rerunning tests.
          watch: null,
        },
        plugins,
      },
    );
  }
}

async function generateCoverageOption(
  coverage: NormalizedUnitTestBuilderOptions['coverage'],
  projectName: string,
): Promise<VitestCoverageOption> {
  if (!coverage) {
    return {
      enabled: false,
    };
  }

  let defaultExcludes: string[] = [];
  if (coverage.exclude) {
    try {
      const vitestConfig = await import('vitest/config');
      defaultExcludes = vitestConfig.coverageConfigDefaults.exclude;
    } catch {}
  }

  return {
    enabled: true,
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
