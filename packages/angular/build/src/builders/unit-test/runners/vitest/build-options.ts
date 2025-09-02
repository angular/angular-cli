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
): string {
  let providersImport = 'const providers = [];';
  if (providersFile) {
    const relativePath = path.relative(projectSourceRoot, providersFile);
    const { dir, name } = path.parse(relativePath);
    const importPath = toPosixPath(path.join(dir, name));
    providersImport = `import providers from './${importPath}';`;
  }

  return `
    // Initialize the Angular testing environment
    import { NgModule } from '@angular/core';
    import { getTestBed, ɵgetCleanupHook as getCleanupHook } from '@angular/core/testing';
    import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
    ${providersImport}
    // Same as https://github.com/angular/angular/blob/05a03d3f975771bb59c7eefd37c01fa127ee2229/packages/core/testing/srcs/test_hooks.ts#L21-L29
    beforeEach(getCleanupHook(false));
    afterEach(getCleanupHook(true));
    @NgModule({
      providers,
    })
    export class TestModule {}
    getTestBed().initTestEnvironment([BrowserTestingModule, TestModule], platformBrowserTesting(), {
      errorOnUnknownElements: true,
      errorOnUnknownProperties: true,
    });
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
  const { workspaceRoot, projectSourceRoot, include, exclude, watch, tsConfig, providersFile } =
    options;

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

  const entryPoints = getTestEntrypoints(testFiles, { projectSourceRoot, workspaceRoot });
  entryPoints.set('init-testbed', 'angular:test-bed-init');

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
    tsConfig,
    entryPoints,
    externalDependencies: ['vitest', '@vitest/browser/context'],
  };

  buildOptions.polyfills = injectTestingPolyfills(buildOptions.polyfills);

  const testBedInitContents = createTestBedInitVirtualFile(providersFile, projectSourceRoot);

  return {
    buildOptions,
    virtualFiles: {
      'angular:test-bed-init': testBedInitContents,
    },
  };
}
