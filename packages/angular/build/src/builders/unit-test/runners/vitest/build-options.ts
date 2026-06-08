/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @fileoverview
 * Provides Vitest-specific build options and virtual file contents for Angular unit testing.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { toPosixPath } from '../../../../utils/path';
import type { ApplicationBuilderInternalOptions } from '../../../application/options';
import { OutputHashing } from '../../../application/schema';
import { NormalizedUnitTestBuilderOptions } from '../../options';
import { findTests, getTestEntrypoints } from '../../test-discovery';
import { RunnerOptions } from '../api';

/**
 * Creates the virtual file contents to initialize the Angular testing environment (TestBed).
 *
 * @param providersFile Optional path to a file that exports default providers.
 * @param projectSourceRoot The root directory of the project source.
 * @param teardown Whether to configure TestBed to destroy after each test.
 * @param zoneTestingStrategy How zone.js should be loaded during initialization.
 * @returns The string content of the virtual initialization file.
 */
function createTestBedInitVirtualFile(
  providersFile: string | undefined,
  projectSourceRoot: string,
  teardown: boolean,
  zoneTestingStrategy: 'none' | 'static' | 'dynamic',
): string {
  let providersImport = 'const providers = [];';
  if (providersFile) {
    const relativePath = path.relative(projectSourceRoot, providersFile);
    const { dir, name } = path.parse(relativePath);
    const importPath = toPosixPath(path.join(dir, name));
    providersImport = `import providers from './${importPath}';`;
  }

  let zoneTestingSnippet = '';
  if (zoneTestingStrategy === 'static') {
    zoneTestingSnippet = `import 'zone.js/testing';`;
  } else if (zoneTestingStrategy === 'dynamic') {
    zoneTestingSnippet = `if (typeof Zone !== 'undefined') {
      // 'zone.js/testing' is used to initialize the ZoneJS testing environment.
      // It must be imported dynamically to avoid a static dependency on 'zone.js'.
      await import('zone.js/testing');
    }`;
  }

  // The DynamicDOMTestComponentRenderer is used to avoid stale document references
  // when running Vitest in non-isolated mode with JSDOM. It looks up the
  // document dynamically on every operation instead of caching it.
  return `
    // Initialize the Angular testing environment
    import { NgModule, provideZoneChangeDetection } from '@angular/core';
    import { getTestBed, ɵgetCleanupHook as getCleanupHook, TestComponentRenderer } from '@angular/core/testing';
    import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
    import { ɵgetDOM } from '@angular/common';
    import { afterEach, beforeEach } from 'vitest';
    ${providersImport}

    ${zoneTestingSnippet}

    // The beforeEach and afterEach hooks are registered outside the globalThis guard.
    // This ensures that the hooks are always applied, even in non-isolated browser environments.
    // Same as https://github.com/angular/angular/blob/05a03d3f975771bb59c7eefd37c01fa127ee2229/packages/core/testing/srcs/test_hooks.ts#L21-L29
    beforeEach(getCleanupHook(false));
    afterEach(getCleanupHook(true));

    class DynamicDOMTestComponentRenderer extends TestComponentRenderer {
      insertRootElement(rootElId, tagName = 'div') {
        this.removeAllRootElements();

        const dom = ɵgetDOM();
        const doc = dom.getDefaultDocument();
        if (doc && doc.body) {
          const rootElement = doc.createElement(tagName);
          rootElement.setAttribute('id', rootElId);
          doc.body.appendChild(rootElement);
        }
      }

      removeAllRootElements() {
        const dom = ɵgetDOM();
        const doc = dom.getDefaultDocument();
        if (doc && typeof doc.querySelectorAll === 'function') {
          const oldRoots = doc.querySelectorAll('[id^=root]');
          for (let i = 0; i < oldRoots.length; i++) {
            dom.remove(oldRoots[i]);
          }
        }
      }
    }

    const ANGULAR_TESTBED_SETUP = Symbol.for('@angular/cli/testbed-setup');
    if (!globalThis[ANGULAR_TESTBED_SETUP]) {
      globalThis[ANGULAR_TESTBED_SETUP] = true;

      // The Angular TestBed needs to be initialized before any tests are run.
      // In a non-isolated environment, this setup file can be executed multiple times.
      // The guard condition above ensures that the setup is only performed once.

      @NgModule({
        providers: [
          ...(typeof Zone !== 'undefined' ? [provideZoneChangeDetection()] : []),
          ...providers,
          { provide: TestComponentRenderer, useClass: DynamicDOMTestComponentRenderer },
        ],
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

/**
 * Adjusts output hashing settings for testing purposes. For example, ensuring media
 * is continued to be hashed to avoid overwriting assets, but turning off JavaScript hashing.
 *
 * @param hashing The original OutputHashing configuration.
 * @returns The adjusted OutputHashing configuration.
 */
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

/**
 * Resolves the Zone.js testing strategy by inspecting polyfills and resolving zone.js package.
 *
 * @param buildOptions The partial application builder options.
 * @param projectSourceRoot The root directory of the project source.
 * @returns The resolved zone testing strategy ('none', 'static', 'dynamic').
 */
function getZoneTestingStrategy(
  buildOptions: Partial<ApplicationBuilderInternalOptions>,
  projectSourceRoot: string,
): 'none' | 'static' | 'dynamic' {
  if (buildOptions.polyfills?.includes('zone.js/testing')) {
    return 'none';
  }

  if (buildOptions.polyfills?.includes('zone.js')) {
    return 'static';
  }

  try {
    const projectRequire = createRequire(path.join(projectSourceRoot, 'package.json'));
    projectRequire.resolve('zone.js');

    return 'dynamic';
  } catch {
    return 'none';
  }
}

/**
 * Generates options and virtual files for the Vitest test runner.
 *
 * Discovers specs matchers, creates entry points, decides polyfills strategy, and orchestrates
 * internal ApplicationBuilder options.
 *
 * @param options The normalized unit test builder options.
 * @param baseBuildOptions The base build config to derive testing config from.
 * @returns An async RunnerOptions configuration.
 */
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

  // Inject the zone.js testing polyfill if Zone.js is installed.
  const zoneTestingStrategy = getZoneTestingStrategy(buildOptions, projectSourceRoot);

  const testBedInitContents = createTestBedInitVirtualFile(
    providersFile,
    projectSourceRoot,
    !options.debug,
    zoneTestingStrategy,
  );

  const mockPatchContents = `
    import { vi } from 'vitest';

    const ANGULAR_VITEST_MOCK_PATCH = Symbol.for('@angular/cli/vitest-mock-patch');
    if (!globalThis[ANGULAR_VITEST_MOCK_PATCH]) {
      globalThis[ANGULAR_VITEST_MOCK_PATCH] = true;

      const error = new Error(
        'The "vi.mock" and related methods are not supported for relative imports with the Angular unit-test system. ' +
        'Please use Angular TestBed for mocking dependencies.'
      );

      // Store original implementations
      const { mock, doMock, importMock, unmock, doUnmock } = vi;

      function patch(original) {
        return (path, ...args) => {
          // Check if the path is a string and starts with a character that indicates a relative path.
          if (typeof path === 'string' && /^[./]/.test(path)) {
            throw error;
          }

          // Call the original function for non-relative paths.
          return original(path, ...args);
        };
      }

      vi.mock = patch(mock);
      vi.doMock = patch(doMock);
      vi.importMock = patch(importMock);
      vi.unmock = patch(unmock);
      vi.doUnmock = patch(doUnmock);
    }
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
