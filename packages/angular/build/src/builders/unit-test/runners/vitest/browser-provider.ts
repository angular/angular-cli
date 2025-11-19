/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createRequire } from 'node:module';
import type { BrowserBuiltinProvider, BrowserConfigOptions } from 'vitest/node';
import { assertIsError } from '../../../../utils/error';

export interface BrowserConfiguration {
  browser?: BrowserConfigOptions;
  errors?: string[];
}

function findBrowserProvider(
  projectResolver: NodeJS.RequireResolve,
): BrowserBuiltinProvider | undefined {
  const requiresPreview = !!process.versions.webcontainer;

  // One of these must be installed in the project to use browser testing
  const vitestBuiltinProviders = requiresPreview
    ? (['preview'] as const)
    : (['playwright', 'webdriverio', 'preview'] as const);

  for (const providerName of vitestBuiltinProviders) {
    try {
      projectResolver(`@vitest/browser-${providerName}`);

      return providerName;
    } catch {}
  }

  return undefined;
}

function normalizeBrowserName(browserName: string): { browser: string; headless: boolean } {
  // Normalize browser names to match Vitest's expectations for headless but also supports karma's names
  // e.g., 'ChromeHeadless' -> 'chrome', 'FirefoxHeadless' -> 'firefox'
  // and 'Chrome' -> 'chrome', 'Firefox' -> 'firefox'.
  const normalized = browserName.toLowerCase();
  const headless = normalized.endsWith('headless');

  return {
    browser: headless ? normalized.slice(0, -8) : normalized,
    headless: headless,
  };
}

export async function setupBrowserConfiguration(
  browsers: string[] | undefined,
  debug: boolean,
  projectSourceRoot: string,
  viewport: { width: number; height: number } | undefined,
): Promise<BrowserConfiguration> {
  if (browsers === undefined) {
    return {};
  }

  const projectResolver = createRequire(projectSourceRoot + '/').resolve;
  let errors: string[] | undefined;

  const providerName = findBrowserProvider(projectResolver);
  if (!providerName) {
    errors ??= [];
    errors.push(
      'The "browsers" option requires either "playwright" or "webdriverio" to be installed within the project.' +
        ' Please install one of these packages and rerun the test command.',
    );
  }

  let provider: import('vitest/node').BrowserProviderOption | undefined;
  if (providerName) {
    const providerPackage = `@vitest/browser-${providerName}`;
    try {
      const providerModule = await import(projectResolver(providerPackage));

      // Validate that the imported module has the expected structure
      const providerFactory = providerModule[providerName];
      if (typeof providerFactory === 'function') {
        if (
          providerName === 'playwright' &&
          process.env['CHROME_BIN']?.includes('rules_browsers')
        ) {
          // Use the Chrome binary from the 'rules_browsers' toolchain (via CHROME_BIN)
          // for Playwright when available to ensure hermetic testing, preventing reliance
          // on locally installed or NPM-managed browser versions.
          provider = providerFactory({
            launchOptions: {
              executablePath: process.env.CHROME_BIN,
            },
          });
        } else {
          provider = providerFactory();
        }
      } else {
        errors ??= [];
        errors.push(
          `The "${providerPackage}" package does not have a valid browser provider export.`,
        );
      }
    } catch (e) {
      assertIsError(e);
      errors ??= [];
      // Check for a module not found error to provide a more specific message
      if (e.code === 'ERR_MODULE_NOT_FOUND') {
        errors.push(
          `The "browsers" option with "${providerName}" requires the "${providerPackage}" package.` +
            ' Please install this package and rerun the test command.',
        );
      } else {
        // Handle other potential errors during import
        errors.push(
          `An error occurred while loading the "${providerPackage}" browser provider:\n  ${e.message}`,
        );
      }
    }
  }

  if (errors) {
    return { errors };
  }

  const isCI = !!process.env['CI'];
  const instances = browsers.map(normalizeBrowserName);
  if (providerName === 'preview') {
    instances.forEach((instance) => {
      instance.headless = false;
    });
  } else if (isCI) {
    instances.forEach((instance) => {
      instance.headless = true;
    });
  }

  const browser = {
    enabled: true,
    provider,
    ui: !isCI && instances.some((instance) => !instance.headless),
    viewport,
    instances,
  } satisfies BrowserConfigOptions;

  return { browser };
}
