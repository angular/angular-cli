/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createRequire } from 'node:module';
import type {
  BrowserBuiltinProvider,
  BrowserConfigOptions,
  BrowserProviderOption,
} from 'vitest/node';
import { assertIsError } from '../../../../utils/error';

export interface BrowserConfiguration {
  browser?: BrowserConfigOptions;
  errors?: string[];
  messages?: string[];
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

export interface BrowserInstanceConfiguration {
  browser: string;
  headless: boolean;
  provider?: BrowserProviderOption;
}

export function normalizeBrowserName(browserName: string): BrowserInstanceConfiguration {
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

/**
 * Mutates the provided browser instances to apply standard headless execution
 * constraints based on the chosen provider, user options, and CI environment presence.
 *
 * @param instances The normalized browser instances to mutate.
 * @param providerName The identifier for the chosen Vitest browser provider.
 * @param headless The user-provided headless configuration option.
 * @param isCI Whether the current environment is running in CI.
 * @returns An array of informational messages generated during evaluation.
 */
export function applyHeadlessConfiguration(
  instances: BrowserInstanceConfiguration[],
  providerName: BrowserBuiltinProvider | undefined,
  headless: boolean | undefined,
  isCI: boolean,
): string[] {
  const messages: string[] = [];

  if (providerName === 'preview') {
    instances.forEach((instance) => {
      // Preview mode only supports headed execution
      instance.headless = false;
    });

    if (headless) {
      messages.push('The "headless" option is ignored when using the "preview" provider.');
    }
  } else if (headless !== undefined) {
    if (headless) {
      const allHeadlessByDefault = isCI || instances.every((i) => i.headless);
      if (allHeadlessByDefault) {
        messages.push(
          'The "headless" option is unnecessary as all browsers are already configured to run in headless mode.',
        );
      }
    }

    instances.forEach((instance) => {
      instance.headless = headless;
    });
  } else if (isCI) {
    instances.forEach((instance) => {
      instance.headless = true;
    });
  }

  return messages;
}

/**
 * Resolves and configures the Vitest browser provider for the unit test builder.
 * Dynamically discovers and imports the necessary provider (Playwright, WebdriverIO, or Preview),
 * maps the requested browser instances, and applies environment-specific execution logic.
 *
 * @param browsers An array of requested browser names (e.g., 'chrome', 'firefox').
 * @param headless User-provided configuration for headless execution.
 * @param debug Whether the builder is running in watch or debug mode.
 * @param projectSourceRoot The root directory of the project being tested for resolving installed packages.
 * @param viewport Optional viewport dimensions to apply to the launched browser instances.
 * @returns A fully resolved Vitest browser configuration object alongside any generated warning or error messages.
 */
export async function setupBrowserConfiguration(
  browsers: string[] | undefined,
  headless: boolean | undefined,
  debug: boolean,
  projectSourceRoot: string,
  viewport: { width: number; height: number } | undefined,
): Promise<BrowserConfiguration> {
  if (browsers === undefined) {
    if (headless !== undefined) {
      return {
        messages: ['The "headless" option is ignored when no browsers are configured.'],
      };
    }

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

  const instances = browsers.map(normalizeBrowserName);

  let provider: import('vitest/node').BrowserProviderOption | undefined;
  if (providerName) {
    const providerPackage = `@vitest/browser-${providerName}`;
    try {
      const providerModule = await import(projectResolver(providerPackage));

      // Validate that the imported module has the expected structure
      const providerFactory = providerModule[providerName];
      if (typeof providerFactory === 'function') {
        if (providerName === 'playwright') {
          const executablePath = process.env['CHROME_BIN'];
          const baseOptions = {
            contextOptions: {
              // Enables `prefer-color-scheme` for Vitest browser instead of `light`
              colorScheme: null,
            },
          };

          provider = providerFactory(baseOptions);

          if (executablePath) {
            for (const instance of instances) {
              if (instance.browser === 'chrome' || instance.browser === 'chromium') {
                instance.provider = providerFactory({
                  ...baseOptions,
                  launchOptions: { executablePath },
                });
              }
            }
          }
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
  const messages = applyHeadlessConfiguration(instances, providerName, headless, isCI);

  const browser = {
    enabled: true,
    provider,
    ui: !isCI && instances.some((instance) => !instance.headless),
    viewport,
    instances,
  } satisfies BrowserConfigOptions;

  return { browser, messages };
}
