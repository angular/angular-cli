/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderOutput } from '@angular-devkit/architect';
import assert from 'node:assert';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { InlineConfig, Vitest } from 'vitest/node';
import { assertIsError } from '../../../../utils/error';
import { loadEsmModule } from '../../../../utils/load-esm';
import { toPosixPath } from '../../../../utils/path';
import { type FullResult, type IncrementalResult, ResultKind } from '../../../application/results';
import { writeTestFiles } from '../../../karma/application_builder';
import { NormalizedUnitTestBuilderOptions } from '../../options';
import type { TestExecutor } from '../api';
import { setupBrowserConfiguration } from './browser-provider';

type VitestCoverageOption = Exclude<InlineConfig['coverage'], undefined>;

export class VitestExecutor implements TestExecutor {
  private vitest: Vitest | undefined;
  private readonly projectName: string;
  private readonly options: NormalizedUnitTestBuilderOptions;
  private readonly outputPath: string;
  private latestBuildResult: FullResult | IncrementalResult | undefined;

  constructor(projectName: string, options: NormalizedUnitTestBuilderOptions) {
    this.projectName = projectName;
    this.options = options;
    this.outputPath = toPosixPath(path.join(options.workspaceRoot, generateOutputPath()));
  }

  async *execute(buildResult: FullResult | IncrementalResult): AsyncIterable<BuilderOutput> {
    await writeTestFiles(buildResult.files, this.outputPath);

    this.latestBuildResult = buildResult;

    // Initialize Vitest if not already present.
    this.vitest ??= await this.initializeVitest();
    const vitest = this.vitest;

    let testResults;
    if (buildResult.kind === ResultKind.Incremental) {
      const addedFiles = buildResult.added.map((file) => path.join(this.outputPath, file));
      const modifiedFiles = buildResult.modified.map((file) => path.join(this.outputPath, file));

      if (addedFiles.length === 0 && modifiedFiles.length === 0) {
        yield { success: true };

        return;
      }

      // If new files are added, use `start` to trigger test discovery.
      // Also pass modified files to `start` to ensure they are re-run.
      if (addedFiles.length > 0) {
        await vitest.start([...addedFiles, ...modifiedFiles]);
      } else {
        // For modified files only, use the more efficient `rerunTestSpecifications`
        const specsToRerun = modifiedFiles.flatMap((file) => vitest.getModuleSpecifications(file));

        if (specsToRerun.length > 0) {
          modifiedFiles.forEach((file) => vitest.invalidateFile(file));
          testResults = await vitest.rerunTestSpecifications(specsToRerun);
        }
      }
    }

    // Check if all the tests pass to calculate the result
    const testModules = testResults?.testModules;

    yield { success: testModules?.every((testModule) => testModule.ok()) ?? true };
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.vitest?.close();
  }

  private async initializeVitest(): Promise<Vitest> {
    const { codeCoverage, reporters, workspaceRoot, setupFiles, browsers, debug, watch } =
      this.options;
    const { outputPath, projectName, latestBuildResult } = this;

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

    assert(latestBuildResult, 'buildResult must be available before initializing vitest');
    // Add setup file entries for TestBed initialization and project polyfills
    const testSetupFiles = ['init-testbed.js', ...setupFiles];

    // TODO: Provide additional result metadata to avoid needing to extract based on filename
    const polyfillsFile = Object.keys(latestBuildResult.files).find((f) => f === 'polyfills.js');
    if (polyfillsFile) {
      testSetupFiles.unshift(polyfillsFile);
    }

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
        project: ['base', projectName],
        name: 'base',
        include: [],
        reporters: reporters ?? ['default'],
        watch,
        coverage: generateCoverageOption(codeCoverage, workspaceRoot, this.outputPath),
        ...debugOptions,
      },
      {
        server: {
          // Disable the actual file watcher. The boolean watch option above should still
          // be enabled as it controls other internal behavior related to rerunning tests.
          watch: null,
        },
        plugins: [
          {
            name: 'angular:project-init',
            async configureVitest(context) {
              // Create a subproject that can be configured with plugins for browser mode.
              // Plugins defined directly in the vite overrides will not be present in the
              // browser specific Vite instance.
              const [project] = await context.injectTestProjects({
                test: {
                  name: projectName,
                  root: outputPath,
                  globals: true,
                  setupFiles: testSetupFiles,
                  // Use `jsdom` if no browsers are explicitly configured.
                  // `node` is effectively no "environment" and the default.
                  environment: browserOptions.browser ? 'node' : 'jsdom',
                  browser: browserOptions.browser,
                },
                plugins: [
                  {
                    name: 'angular:html-index',
                    transformIndexHtml: () => {
                      assert(
                        latestBuildResult,
                        'buildResult must be available for HTML index transformation.',
                      );
                      // Add all global stylesheets
                      const styleFiles = Object.entries(latestBuildResult.files).filter(
                        ([file]) => file === 'styles.css',
                      );

                      return styleFiles.map(([href]) => ({
                        tag: 'link',
                        attrs: { href, rel: 'stylesheet' },
                        injectTo: 'head',
                      }));
                    },
                  },
                ],
              });

              // Adjust coverage excludes to not include the otherwise automatically inserted included unit tests.
              // Vite does this as a convenience but is problematic for the bundling strategy employed by the
              // builder's test setup. To workaround this, the excludes are adjusted here to only automatically
              // exclude the TypeScript source test files.
              project.config.coverage.exclude = [
                ...(codeCoverage?.exclude ?? []),
                '**/*.{test,spec}.?(c|m)ts',
              ];
            },
          },
        ],
      },
    );
  }
}

function generateOutputPath(): string {
  const datePrefix = new Date().toISOString().replaceAll(/[-:.]/g, '');
  const uuidSuffix = randomUUID().slice(0, 8);

  return path.join('dist', 'test-out', `${datePrefix}-${uuidSuffix}`);
}

function generateCoverageOption(
  codeCoverage: NormalizedUnitTestBuilderOptions['codeCoverage'],
  workspaceRoot: string,
  outputPath: string,
): VitestCoverageOption {
  if (!codeCoverage) {
    return {
      enabled: false,
    };
  }

  return {
    enabled: true,
    excludeAfterRemap: true,
    include: [`${toPosixPath(path.relative(workspaceRoot, outputPath))}/**`],
    // Special handling for `reporter` due to an undefined value causing upstream failures
    ...(codeCoverage.reporters
      ? ({ reporter: codeCoverage.reporters } satisfies VitestCoverageOption)
      : {}),
  };
}
