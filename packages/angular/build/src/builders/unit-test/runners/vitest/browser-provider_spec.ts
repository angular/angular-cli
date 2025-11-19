/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setupBrowserConfiguration } from './browser-provider';

describe('setupBrowserConfiguration', () => {
  let workspaceRoot: string;

  beforeEach(async () => {
    // Create a temporary workspace root
    workspaceRoot = await mkdtemp(join(tmpdir(), 'angular-cli-test-'));
    await writeFile(join(workspaceRoot, 'package.json'), '{}');

    // Create a mock @vitest/browser-playwright package
    const playwrightPkgPath = join(workspaceRoot, 'node_modules/@vitest/browser-playwright');
    await mkdir(playwrightPkgPath, { recursive: true });
    await writeFile(
      join(playwrightPkgPath, 'package.json'),
      JSON.stringify({ name: '@vitest/browser-playwright', main: 'index.js' }),
    );
    await writeFile(
      join(playwrightPkgPath, 'index.js'),
      'module.exports = { playwright: () => ({ name: "playwright" }) };',
    );
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('should configure headless mode for specific browsers based on name', async () => {
    const { browser } = await setupBrowserConfiguration(
      ['ChromeHeadless', 'Firefox'],
      false,
      workspaceRoot,
      undefined,
    );

    expect(browser?.enabled).toBeTrue();
    expect(browser?.instances).toEqual([
      { browser: 'chrome', headless: true },
      { browser: 'firefox', headless: false },
    ]);
  });

  it('should force headless mode in CI environment', async () => {
    const originalCI = process.env['CI'];
    process.env['CI'] = 'true';

    try {
      const { browser } = await setupBrowserConfiguration(
        ['Chrome', 'FirefoxHeadless'],
        false,
        workspaceRoot,
        undefined,
      );

      expect(browser?.instances).toEqual([
        { browser: 'chrome', headless: true },
        { browser: 'firefox', headless: true },
      ]);
    } finally {
      if (originalCI === undefined) {
        delete process.env['CI'];
      } else {
        process.env['CI'] = originalCI;
      }
    }
  });

  it('should set ui property based on headless instances (local)', async () => {
    // Local run (not CI)
    const originalCI = process.env['CI'];
    delete process.env['CI'];

    try {
      // Case 1: All headless -> UI false
      let result = await setupBrowserConfiguration(
        ['ChromeHeadless'],
        false,
        workspaceRoot,
        undefined,
      );
      expect(result.browser?.ui).toBeFalse();

      // Case 2: Mixed -> UI true
      result = await setupBrowserConfiguration(
        ['ChromeHeadless', 'Firefox'],
        false,
        workspaceRoot,
        undefined,
      );
      expect(result.browser?.ui).toBeTrue();
    } finally {
      if (originalCI !== undefined) {
        process.env['CI'] = originalCI;
      }
    }
  });

  it('should disable UI in CI even if headed browsers are requested', async () => {
    const originalCI = process.env['CI'];
    process.env['CI'] = 'true';

    try {
      const { browser } = await setupBrowserConfiguration(
        ['Chrome'],
        false,
        workspaceRoot,
        undefined,
      );

      expect(browser?.ui).toBeFalse();
      // And verify instances are forced to headless
      expect(browser?.instances?.[0].headless).toBeTrue();
    } finally {
      if (originalCI === undefined) {
        delete process.env['CI'];
      } else {
        process.env['CI'] = originalCI;
      }
    }
  });

  it('should support Preview provider forcing headless false', async () => {
    // Create mock preview package
    const previewPkgPath = join(workspaceRoot, 'node_modules/@vitest/browser-preview');
    await mkdir(previewPkgPath, { recursive: true });
    await writeFile(
      join(previewPkgPath, 'package.json'),
      JSON.stringify({ name: '@vitest/browser-preview', main: 'index.js' }),
    );
    await writeFile(
      join(previewPkgPath, 'index.js'),
      'module.exports = { preview: () => ({ name: "preview" }) };',
    );

    // Remove playwright mock for this test to force usage of preview
    await rm(join(workspaceRoot, 'node_modules/@vitest/browser-playwright'), {
      recursive: true,
      force: true,
    });

    const { browser } = await setupBrowserConfiguration(
      ['ChromeHeadless'],
      false,
      workspaceRoot,
      undefined,
    );

    expect(browser?.provider).toBeDefined();
    // Preview forces headless false
    expect(browser?.instances?.[0].headless).toBeFalse();
  });
});
