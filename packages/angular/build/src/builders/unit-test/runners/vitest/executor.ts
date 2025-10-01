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
import type { InlineConfig, Vitest } from 'vitest/node';
import { assertIsError } from '../../../../utils/error';
import { loadEsmModule } from '../../../../utils/load-esm';
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
    if (buildResult.kind === ResultKind.Full) {
      this.buildResultFiles.clear();
      for (const [path, file] of Object.entries(buildResult.files)) {
        this.buildResultFiles.set(path, file);
      }
    } else {
      for (const file of buildResult.removed) {
        this.buildResultFiles.delete(file.path);
      }
      for (const [path, file] of Object.entries(buildResult.files)) {
        this.buildResultFiles.set(path, file);
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
    const { coverage, reporters, outputFile, workspaceRoot, browsers, debug, watch } = this.options;
    let vitestNodeModule;
    try {
      vitestNodeModule = await loadEsmModule<typeof import('vitest/node')>('vitest/node');
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

    // Setup vitest browser options if configured
    const browserOptions = setupBrowserConfiguration(
      browsers,
      debug,
      this.options.projectSourceRoot,
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
        // Disable configuration file resolution/loading
        config: false,
        root: workspaceRoot,
        project: ['base', this.projectName],
        name: 'base',
        include: [],
        testNamePattern: this.options.filter,
        reporters: reporters ?? ['default'],
        outputFile,
        watch,
        coverage: generateCoverageOption(coverage, this.projectName),
        ...debugOptions,
      },
      {
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

function generateCoverageOption(
  coverage: NormalizedUnitTestBuilderOptions['coverage'],
  projectName: string,
): VitestCoverageOption {
  if (!coverage) {
    return {
      enabled: false,
    };
  }

  return {
    enabled: true,
    all: coverage.all,
    excludeAfterRemap: true,
    include: coverage.include,
    reportsDirectory: toPosixPath(path.join('coverage', projectName)),
    thresholds: coverage.thresholds,
    watermarks: coverage.watermarks,
    // Special handling for `exclude`/`reporters` due to an undefined value causing upstream failures
    ...(coverage.exclude ? { exclude: coverage.exclude } : {}),
    ...(coverage.reporters
      ? ({ reporter: coverage.reporters } satisfies VitestCoverageOption)
      : {}),
  };
}
