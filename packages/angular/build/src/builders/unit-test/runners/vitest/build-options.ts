/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import path from 'node:path';
import { toPosixPath } from '../../../../utils/path';
import type { ApplicationBuilderInternalOptions } from '../../../application/options';
import { OutputHashing } from '../../../application/schema';
import { NormalizedUnitTestBuilderOptions, injectTestingPolyfills } from '../../options';
import { findTests, getTestEntrypoints } from '../../test-discovery';
import { RunnerOptions } from '../api';

function createTestBedInitVirtualFile(
  providersFile: string | undefined,
  projectSourceRoot: string,
  teardown: boolean,
  polyfills: string[] = [],
): string {
  const usesZoneJS = polyfills.includes('zone.js');
  let providersImport = 'const providers = [];';
  if (providersFile) {
    const relativePath = path.relative(projectSourceRoot, providersFile);
    const { dir, name } = path.parse(relativePath);
    const importPath = toPosixPath(path.join(dir, name));
    providersImport = `import providers from './${importPath}';`;
  }

  return `
    // Initialize the Angular testing environment
    import { NgModule${usesZoneJS ? ', provideZoneChangeDetection' : ''} } from '@angular/core';
    import { getTestBed, ɵgetCleanupHook as getCleanupHook } from '@angular/core/testing';
    import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
    import { afterEach, beforeEach } from 'vitest';
    ${providersImport}

    // The beforeEach and afterEach hooks are registered outside the globalThis guard.
    // This ensures that the hooks are always applied, even in non-isolated browser environments.
    // Same as https://github.com/angular/angular/blob/05a03d3f975771bb59c7eefd37c01fa127ee2229/packages/core/testing/srcs/test_hooks.ts#L21-L29
    beforeEach(getCleanupHook(false));
    afterEach(getCleanupHook(true));

    const ANGULAR_TESTBED_SETUP = Symbol.for('@angular/cli/testbed-setup');
    if (!globalThis[ANGULAR_TESTBED_SETUP]) {
      globalThis[ANGULAR_TESTBED_SETUP] = true;

      // The Angular TestBed needs to be initialized before any tests are run.
      // In a non-isolated environment, this setup file can be executed multiple times.
      // The guard condition above ensures that the setup is only performed once.

      @NgModule({
        providers: [${usesZoneJS ? 'provideZoneChangeDetection(), ' : ''}...providers],
      })
      class TestModule {}

      getTestBed().initTestEnvironment([BrowserTestingModule, TestModule], platformBrowserTesting(), {
        errorOnUnknownElements: true,
        errorOnUnknownProperties: true,
        ${teardown === false ? 'teardown: { destroyAfterEach: false },' : ''}
      });
    }
  `;
}

function adjustOutputHashing(hashing?: OutputHashing): OutputHashing {
  switch (hashing) {
    case OutputHashing.All:
    case OutputHashing.Media:
      // Ensure media is continued to be hashed to avoid overwriting of output media files
      return OutputHashing.Media;
    default:
      return OutputHashing.None;
  }
}

export async function getVitestBuildOptions(
  options: NormalizedUnitTestBuilderOptions,
  baseBuildOptions: Partial<ApplicationBuilderInternalOptions>,
): Promise<RunnerOptions> {
  const { workspaceRoot, projectSourceRoot, include, exclude = [], watch, providersFile } = options;

  // Find test files
  const testFiles = await findTests(include, exclude, workspaceRoot, projectSourceRoot);
  if (testFiles.length === 0) {
    throw new Error(
      'No tests found matching the following patterns:\n' +
        `- Included: ${include.join(', ')}\n` +
        (exclude.length ? `- Excluded: ${exclude.join(', ')}\n` : '') +
        `\nPlease check the 'test' target configuration in your project's 'angular.json' file.`,
    );
  }

  const entryPoints = getTestEntrypoints(testFiles, {
    projectSourceRoot,
    workspaceRoot,
    removeTestExtension: true,
  });

  if (options.setupFiles?.length) {
    const setupEntryPoints = getTestEntrypoints(options.setupFiles, {
      projectSourceRoot,
      workspaceRoot,
      removeTestExtension: false,
      prefix: 'setup',
    });

    for (const [entryPoint, setupFile] of setupEntryPoints) {
      entryPoints.set(entryPoint, setupFile);
    }
  }

  entryPoints.set('init-testbed', 'angular:test-bed-init');
  entryPoints.set('vitest-mock-patch', 'angular:vitest-mock-patch');

  // The 'vitest' package is always external for testing purposes
  const externalDependencies = ['vitest'];
  if (baseBuildOptions.externalDependencies) {
    externalDependencies.push(...baseBuildOptions.externalDependencies);
  }

  const buildOptions: Partial<ApplicationBuilderInternalOptions> = {
    ...baseBuildOptions,
    watch,
    incrementalResults: watch,
    index: false,
    browser: undefined,
    server: undefined,
    outputMode: undefined,
    localize: false,
    budgets: [],
    serviceWorker: false,
    appShell: false,
    ssr: false,
    prerender: false,
    sourceMap: { scripts: true, vendor: false, styles: false },
    outputHashing: adjustOutputHashing(baseBuildOptions.outputHashing),
    optimization: false,
    entryPoints,
    // Enable support for vitest browser prebundling. Excludes can be controlled with a runnerConfig
    // and the `optimizeDeps.exclude` option.
    externalPackages: true,
    externalDependencies,
  };

  buildOptions.polyfills = injectTestingPolyfills(buildOptions.polyfills);

  const testBedInitContents = createTestBedInitVirtualFile(
    providersFile,
    projectSourceRoot,
    !options.debug,
    buildOptions.polyfills,
  );

  const mockPatchContents = `
    import { vi } from 'vitest';
    const error = new Error(
    'The "vi.mock" and related methods are not supported with the Angular unit-test system. Please use Angular TestBed for mocking.');
    vi.mock = () => { throw error; };
    vi.doMock = () => { throw error; };
    vi.importMock = () => { throw error; };
    vi.unmock = () => { throw error; };
    vi.doUnmock = () => { throw error; };
  `;

  return {
    buildOptions,
    virtualFiles: {
      'angular:test-bed-init': testBedInitContents,
      'angular:vitest-mock-patch': mockPatchContents,
    },
    testEntryPointMappings: entryPoints,
  };
}
