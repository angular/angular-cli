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

import type { BuilderContext } from '@angular-devkit/architect';
import path from 'node:path';
import { toPosixPath } from '../../../../utils/path';
import { createProjectResolver } from '../../../../utils/resolve-project';
import type { ApplicationBuilderInternalOptions } from '../../../application/options';
import { OutputHashing } from '../../../application/schema';
import { type NormalizedUnitTestBuilderOptions, injectTestingPolyfills } from '../../options';
import { findTests, getTestEntrypoints } from '../../test-discovery';
import { RunnerOptions } from '../api';

/**
 * Creates the virtual file contents to initialize the Angular testing environment (TestBed).
 *
 * @param providersFile Optional path to a file that exports default providers.
 * @param projectSourceRoot The root directory of the project source.
 * @param teardown Whether to configure TestBed to destroy after each test.
 * @returns The string content of the virtual initialization file.
 */
function createTestBedInitVirtualFile(
  providersFile: string | undefined,
  projectSourceRoot: string,
  teardown: boolean,
  hasLocalize: boolean,
): string {
  let providersImport = 'const providers = [];';
  if (providersFile) {
    const relativePath = path.relative(projectSourceRoot, providersFile);
    const { dir, name } = path.parse(relativePath);
    const importPath = toPosixPath(path.join(dir, name));
    providersImport = `import providers from './${importPath}';`;
  }

  // The DynamicDOMTestComponentRenderer is used to avoid stale document references
  // when running Vitest in non-isolated mode with JSDOM. It looks up the
  // document dynamically on every operation instead of caching it.
  return `
    ${hasLocalize ? "import '@angular/localize/init';" : ''}
    // Initialize the Angular testing environment
    import { NgModule, provideZoneChangeDetection } from '@angular/core';
    import { getTestBed, ɵgetCleanupHook as getCleanupHook, TestComponentRenderer } from '@angular/core/testing';
    import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
    import { ɵgetDOM } from '@angular/common';
    import { afterEach, beforeEach } from 'vitest';
    ${providersImport}

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
 * Injects Zone.js and Zone.js testing polyfills into the build options based on the
 * project configuration and `polyfills` option.
 *
 * @param polyfills The configured polyfills from the test or build target.
 * @param projectSourceRoot The root directory of the project source.
 * @param logger The logger instance for reporting deprecation warnings.
 * @returns An array of polyfill specifiers to use for testing.
 */
function injectZoneJsTestingPolyfills(
  polyfills: string[] | undefined,
  projectSourceRoot: string,
  logger: BuilderContext['logger'],
): string[] {
  if (polyfills) {
    return injectTestingPolyfills(polyfills);
  }

  // If polyfills is undefined (e.g. library build target), attempt to load zone.js if installed.
  try {
    const projectResolve = createProjectResolver(projectSourceRoot);
    projectResolve('zone.js');

    logger.warn(
      'Zone.js polyfills are being automatically injected because "zone.js" was detected in the project dependencies. ' +
        'This behavior is deprecated. If your project is zoneless, set the "polyfills" option to an empty array ("[]") in the ' +
        'test configuration. Otherwise, explicitly add "zone.js" to the "polyfills" option.',
    );

    return ['zone.js', 'zone.js/testing'];
  } catch {
    return [];
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
 * @param logger The logger instance for reporting deprecation warnings.
 * @returns An async RunnerOptions configuration.
 */
export async function getVitestBuildOptions(
  options: NormalizedUnitTestBuilderOptions,
  baseBuildOptions: Partial<ApplicationBuilderInternalOptions>,
  logger: BuilderContext['logger'],
): Promise<RunnerOptions> {
  const {
    workspaceRoot,
    projectSourceRoot,
    include,
    polyfills,
    exclude = [],
    watch,
    providersFile,
    setupFiles,
  } = options;

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

  const rootFiles = [...testFiles];
  if (providersFile) {
    rootFiles.push(providersFile);
  }

  if (setupFiles?.length) {
    rootFiles.push(...setupFiles);

    const setupEntryPoints = getTestEntrypoints(setupFiles, {
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
    polyfills: injectZoneJsTestingPolyfills(
      polyfills ?? baseBuildOptions.polyfills,
      projectSourceRoot,
      logger,
    ),
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
    namedChunks: false,
    entryPoints,
    rootFiles,
    // Vitest's Node-based module loading emulation (vite-node) is not fully spec compliant and lacks
    // live ESM bindings across chunk boundaries. This can cause uninitialized exports or break mocking.
    // Disabling code splitting avoids shared chunks, but increases build and coverage memory/time.
    disableCodeSplitting: !options.splitting,
    // Enable support for vitest browser prebundling. Excludes can be controlled with a runnerConfig
    // and the `optimizeDeps.exclude` option.
    externalPackages: true,
    externalDependencies,
  };

  let hasLocalize = false;
  try {
    const projectResolve = createProjectResolver(projectSourceRoot);
    projectResolve('@angular/localize');
    hasLocalize = true;
  } catch {}

  const testBedInitContents = createTestBedInitVirtualFile(
    providersFile,
    projectSourceRoot,
    !options.debug,
    hasLocalize,
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
