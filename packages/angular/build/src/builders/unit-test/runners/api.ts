/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext, BuilderOutput } from '@angular-devkit/architect';
import type { ApplicationBuilderInternalOptions } from '../../application/options';
import type { FullResult, IncrementalResult } from '../../application/results';
import type { NormalizedUnitTestBuilderOptions } from '../options';

/**
 * Represents the options for a test runner.
 */
export interface RunnerOptions {
  /**
   * Partial options for the application builder.
   * These will be merged with the options from the build target.
   */
  buildOptions: Partial<ApplicationBuilderInternalOptions>;

  /**
   * A record of virtual files to be added to the build.
   * The key is the file path and the value is the file content.
   */
  virtualFiles?: Record<string, string>;

  /**
   * A map of test entry points to their corresponding test files.
   * This is used to avoid re-discovering the test files in the executor.
   */
  testEntryPointMappings?: Map<string, string>;
}

/**
 * Represents a stateful test execution session.
 * An instance of this is created for each `ng test` command.
 */
export interface TestExecutor {
  /**
   * Executes tests using the artifacts from a specific build.
   * This method can be called multiple times in watch mode.
   *
   * @param buildResult The output from the application builder.
   * @returns An async iterable builder output stream.
   */
  execute(buildResult: FullResult | IncrementalResult): AsyncIterable<BuilderOutput>;

  [Symbol.asyncDispose](): Promise<void>;
}

/**
 * Represents the metadata and hooks for a specific test runner.
 */
export interface TestRunner {
  readonly name: string;
  readonly isStandalone?: boolean;

  getBuildOptions(
    options: NormalizedUnitTestBuilderOptions,
    baseBuildOptions: Partial<ApplicationBuilderInternalOptions>,
  ): RunnerOptions | Promise<RunnerOptions>;

  /**
   * Creates a stateful executor for a test session.
   * This is called once at the start of the `ng test` command.
   *
   * @param context The Architect builder context.
   * @param options The normalized unit test options.
   * @param testEntryPointMappings A map of test entry points to their corresponding test files.
   * @returns A TestExecutor instance that will handle the test runs.
   */
  createExecutor(
    context: BuilderContext,
    options: NormalizedUnitTestBuilderOptions,
    testEntryPointMappings: Map<string, string> | undefined,
  ): Promise<TestExecutor>;
}
