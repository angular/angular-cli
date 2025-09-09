/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderOutput } from '@angular-devkit/architect';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { InlineConfig, Vitest, VitestPlugin } from 'vitest/node';
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
import { findTests, getTestEntrypoints } from '../../test-discovery';
import type { TestExecutor } from '../api';
import { setupBrowserConfiguration } from './browser-provider';

type VitestCoverageOption = Exclude<InlineConfig['coverage'], undefined>;
type VitestPlugins = Awaited<ReturnType<typeof VitestPlugin>>;

export class VitestExecutor implements TestExecutor {
  private vitest: Vitest | undefined;
  private readonly projectName: string;
  private readonly options: NormalizedUnitTestBuilderOptions;
  private buildResultFiles = new Map<string, ResultFile>();

  // This is a reverse map of the entry points created in `build-options.ts`.
  // It is used by the in-memory provider plugin to map the requested test file
  // path back to its bundled output path.
  // Example: `Map<'/path/to/src/app.spec.ts', 'spec-src-app-spec'>`
  private testFileToEntryPoint = new Map<string, string>();
  private entryPointToTestFile = new Map<string, string>();

  constructor(projectName: string, options: NormalizedUnitTestBuilderOptions) {
    this.projectName = projectName;
    this.options = options;
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

    // The `getTestEntrypoints` function is used here to create the same mapping
    // that was used in `build-options.ts` to generate the build entry points.
    // This is a deliberate duplication to avoid a larger refactoring of the
    // builder's core interfaces to pass the entry points from the build setup
    // phase to the execution phase.
    if (this.testFileToEntryPoint.size === 0) {
      const { include, exclude = [], workspaceRoot, projectSourceRoot } = this.options;
      const testFiles = await findTests(include, exclude, workspaceRoot, projectSourceRoot);
      const entryPoints = getTestEntrypoints(testFiles, {
        projectSourceRoot,
        workspaceRoot,
        removeTestExtension: true,
      });
      for (const [entryPoint, testFile] of entryPoints) {
        this.testFileToEntryPoint.set(testFile, entryPoint);
        this.entryPointToTestFile.set(entryPoint + '.js', testFile);
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

  private createVitestPlugins(
    testSetupFiles: string[],
    browserOptions: Awaited<ReturnType<typeof setupBrowserConfiguration>>,
  ): VitestPlugins {
    const { workspaceRoot } = this.options;

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
              name: this.projectName,
              root: workspaceRoot,
              globals: true,
              setupFiles: testSetupFiles,
              // Use `jsdom` if no browsers are explicitly configured.
              // `node` is effectively no "environment" and the default.
              environment: browserOptions.browser ? 'node' : 'jsdom',
              browser: browserOptions.browser,
              include: this.options.include,
              ...(this.options.exclude ? { exclude: this.options.exclude } : {}),
            },
            plugins: [
              {
                name: 'angular:test-in-memory-provider',
                enforce: 'pre',
                resolveId: (id, importer) => {
                  if (importer && (id[0] === '.' || id[0] === '/')) {
                    let fullPath;
                    if (this.testFileToEntryPoint.has(importer)) {
                      fullPath = toPosixPath(path.join(this.options.workspaceRoot, id));
                    } else {
                      fullPath = toPosixPath(path.join(path.dirname(importer), id));
                    }

                    const relativePath = path.relative(this.options.workspaceRoot, fullPath);
                    if (this.buildResultFiles.has(toPosixPath(relativePath))) {
                      return fullPath;
                    }
                  }

                  if (this.testFileToEntryPoint.has(id)) {
                    return id;
                  }

                  assert(
                    this.buildResultFiles.size > 0,
                    'buildResult must be available for resolving.',
                  );
                  const relativePath = path.relative(this.options.workspaceRoot, id);
                  if (this.buildResultFiles.has(toPosixPath(relativePath))) {
                    return id;
                  }
                },
                load: async (id) => {
                  assert(
                    this.buildResultFiles.size > 0,
                    'buildResult must be available for in-memory loading.',
                  );

                  // Attempt to load as a source test file.
                  const entryPoint = this.testFileToEntryPoint.get(id);
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
                    const relativePath = path.relative(this.options.workspaceRoot, id);
                    outputPath = toPosixPath(relativePath);
                  }

                  const outputFile = this.buildResultFiles.get(outputPath);
                  if (outputFile) {
                    const sourceMapPath = outputPath + '.map';
                    const sourceMapFile = this.buildResultFiles.get(sourceMapPath);
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
              },
              {
                name: 'angular:html-index',
                transformIndexHtml: () => {
                  // Add all global stylesheets
                  if (this.buildResultFiles.has('styles.css')) {
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

  private async initializeVitest(): Promise<Vitest> {
    const { codeCoverage, reporters, workspaceRoot, browsers, debug, watch } = this.options;

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
    const plugins = this.createVitestPlugins(testSetupFiles, browserOptions);

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
        reporters: reporters ?? ['default'],
        watch,
        coverage: generateCoverageOption(codeCoverage),
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
  codeCoverage: NormalizedUnitTestBuilderOptions['codeCoverage'],
): VitestCoverageOption {
  if (!codeCoverage) {
    return {
      enabled: false,
    };
  }

  return {
    enabled: true,
    excludeAfterRemap: true,
    // Special handling for `exclude`/`reporters` due to an undefined value causing upstream failures
    ...(codeCoverage.exclude ? { exclude: codeCoverage.exclude } : {}),
    ...(codeCoverage.reporters
      ? ({ reporter: codeCoverage.reporters } satisfies VitestCoverageOption)
      : {}),
  };
}
