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
import { applyHeadlessConfiguration, setupBrowserConfiguration } from './browser-provider';

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
      'module.exports = { playwright: (options) => ({ name: "playwright", options }) };',
    );
  });

  afterEach(async () => {
    await rm(workspaceRoot, { recursive: true, force: true });
  });

  it('should configure headless mode for specific browsers based on name', async () => {
    const { browser } = await setupBrowserConfiguration(
      ['ChromeHeadless', 'Firefox'],
      undefined,
      false,
      workspaceRoot,
      undefined,
    );

    expect(browser?.enabled).toBeTrue();
    expect(browser?.instances).toEqual([
      jasmine.objectContaining({ browser: 'chrome', headless: true }),
      jasmine.objectContaining({ browser: 'firefox', headless: false }),
    ]);
  });

  it('should force headless mode in CI environment', async () => {
    const originalCI = process.env['CI'];
    process.env['CI'] = 'true';

    try {
      const { browser } = await setupBrowserConfiguration(
        ['Chrome', 'FirefoxHeadless'],
        undefined,
        false,
        workspaceRoot,
        undefined,
      );

      expect(browser?.instances).toEqual([
        jasmine.objectContaining({ browser: 'chrome', headless: true }),
        jasmine.objectContaining({ browser: 'firefox', headless: true }),
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
        undefined,
        false,
        workspaceRoot,
        undefined,
      );
      expect(result.browser?.ui).toBeFalse();

      // Case 2: Mixed -> UI true
      result = await setupBrowserConfiguration(
        ['ChromeHeadless', 'Firefox'],
        undefined,
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
        undefined,
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

  // See: https://github.com/angular/angular-cli/issues/32469
  it('should pass colorScheme=null to Playwright provider', async () => {
    const { browser } = await setupBrowserConfiguration(
      ['ChromeHeadless'],
      undefined,
      false,
      workspaceRoot,
      undefined,
    );

    expect(browser?.provider?.options).toEqual(
      jasmine.objectContaining({
        contextOptions: jasmine.objectContaining({
          colorScheme: null,
        }),
      }),
    );
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
      undefined,
      false,
      workspaceRoot,
      undefined,
    );

    expect(browser?.provider).toBeDefined();
    // Preview forces headless false
    expect(browser?.instances?.[0].headless).toBeFalse();
  });

  it('should force headless mode when headless option is true', async () => {
    const { browser, messages } = await setupBrowserConfiguration(
      ['Chrome', 'Firefox'],
      true,
      false,
      workspaceRoot,
      undefined,
    );

    expect(browser?.instances).toEqual([
      jasmine.objectContaining({ browser: 'chrome', headless: true }),
      jasmine.objectContaining({ browser: 'firefox', headless: true }),
    ]);
    expect(messages).toEqual([]);
  });

  it('should return information message when headless option is redundant', async () => {
    const { messages } = await setupBrowserConfiguration(
      ['ChromeHeadless'],
      true,
      false,
      workspaceRoot,
      undefined,
    );

    expect(messages).toEqual([
      'The "headless" option is unnecessary as all browsers are already configured to run in headless mode.',
    ]);
  });

  describe('CHROME_BIN usage', () => {
    let originalChromeBin: string | undefined;

    beforeEach(() => {
      originalChromeBin = process.env['CHROME_BIN'];
      process.env['CHROME_BIN'] = '/custom/path/to/chrome';
    });

    afterEach(() => {
      if (originalChromeBin === undefined) {
        delete process.env['CHROME_BIN'];
      } else {
        process.env['CHROME_BIN'] = originalChromeBin;
      }
    });

    it('should set executablePath on the individual chrome instance', async () => {
      const { browser } = await setupBrowserConfiguration(
        ['ChromeHeadless', 'Chromium'],
        undefined,
        false,
        workspaceRoot,
        undefined,
      );

      // Verify the global provider does NOT have executablePath
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((browser?.provider as any)?.options?.launchOptions?.executablePath).toBeUndefined();

      // Verify the individual instances have executablePath
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (browser?.instances?.[0]?.provider as any)?.options?.launchOptions?.executablePath,
      ).toBe('/custom/path/to/chrome');
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (browser?.instances?.[1]?.provider as any)?.options?.launchOptions?.executablePath,
      ).toBe('/custom/path/to/chrome');
    });

    it('should set executablePath for chrome instances but not for others when mixed browsers are requested', async () => {
      const { browser } = await setupBrowserConfiguration(
        ['ChromeHeadless', 'Firefox'],
        undefined,
        false,
        workspaceRoot,
        undefined,
      );

      // Verify the global provider does NOT have executablePath
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((browser?.provider as any)?.options?.launchOptions?.executablePath).toBeUndefined();

      // Verify chrome gets it
      expect(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (browser?.instances?.[0]?.provider as any)?.options?.launchOptions?.executablePath,
      ).toBe('/custom/path/to/chrome');

      // Verify firefox does not
      expect(browser?.instances?.[1]?.provider).toBeUndefined();
    });
  });

  describe('applyHeadlessConfiguration', () => {
    it('should set headless false and issue warning when using preview provider with headless true', () => {
      const instances = [{ browser: 'chrome', headless: true }];
      const messages = applyHeadlessConfiguration(instances, 'preview', true, false);

      expect(instances[0].headless).toBeFalse();
      expect(messages).toEqual([
        'The "headless" option is ignored when using the "preview" provider.',
      ]);
    });

    it('should force headless mode when headless option is true', () => {
      const instances = [{ browser: 'chrome', headless: false }];
      const messages = applyHeadlessConfiguration(instances, 'playwright', true, false);

      expect(instances[0].headless).toBeTrue();
      expect(messages).toEqual([]);
    });

    it('should return information message when headless option is redundant', () => {
      const instances = [{ browser: 'chrome', headless: true }];
      const messages = applyHeadlessConfiguration(instances, 'playwright', true, false);

      expect(instances[0].headless).toBeTrue();
      expect(messages).toEqual([
        'The "headless" option is unnecessary as all browsers are already configured to run in headless mode.',
      ]);
    });

    it('should force headless mode in CI environment when headless is undefined', () => {
      const instances = [{ browser: 'chrome', headless: false }];
      const messages = applyHeadlessConfiguration(instances, 'playwright', undefined, true);

      expect(instances[0].headless).toBeTrue();
      expect(messages).toEqual([]);
    });
  });
});
