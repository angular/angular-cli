/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  type Builder,
  type BuilderContext,
  type BuilderOutput,
  createBuilder,
} from '@angular-devkit/architect';
import type { ConfigOptions } from 'karma';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { Schema as KarmaBuilderOptions } from './schema';

export type KarmaConfigOptions = ConfigOptions & {
  buildWebpack?: unknown;
  configFile?: string;
};

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export async function* execute(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  transforms: {
    // The karma options transform cannot be async without a refactor of the builder implementation
    karmaOptions?: (options: KarmaConfigOptions) => KarmaConfigOptions;
  } = {},
): AsyncIterable<BuilderOutput> {
  const { execute } = await import('./application_builder');
  const karmaOptions = getBaseKarmaOptions(options, context);

  yield* execute(options, context, karmaOptions, transforms);
}

function getBaseKarmaOptions(
  options: KarmaBuilderOptions,
  context: BuilderContext,
): KarmaConfigOptions {
  let singleRun: boolean | undefined;
  if (options.watch !== undefined) {
    singleRun = !options.watch;
  }

  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    throw new Error(`The 'karma' builder requires a target to be specified.`);
  }

  const karmaOptions: KarmaConfigOptions = options.karmaConfig
    ? {}
    : getBuiltInKarmaConfig(context.workspaceRoot, projectName);

  karmaOptions.singleRun = singleRun;

  // Workaround https://github.com/angular/angular-cli/issues/28271, by clearing context by default
  // for single run executions. Not clearing context for multi-run (watched) builds allows the
  // Jasmine Spec Runner to be visible in the browser after test execution.
  karmaOptions.client ??= {};
  karmaOptions.client.clearContext ??= singleRun ?? false; // `singleRun` defaults to `false` per Karma docs.

  // Convert browsers from a string to an array
  if (typeof options.browsers === 'string' && options.browsers) {
    karmaOptions.browsers = options.browsers.split(',');
  } else if (options.browsers === false) {
    karmaOptions.browsers = [];
  }

  if (options.reporters) {
    // Split along commas to make it more natural, and remove empty strings.
    const reporters = options.reporters
      .reduce<string[]>((acc, curr) => acc.concat(curr.split(',')), [])
      .filter((x) => !!x);

    if (reporters.length > 0) {
      karmaOptions.reporters = reporters;
    }
  }

  return karmaOptions;
}

function getBuiltInKarmaConfig(
  workspaceRoot: string,
  projectName: string,
): ConfigOptions & Record<string, unknown> {
  let coverageFolderName = projectName.charAt(0) === '@' ? projectName.slice(1) : projectName;
  coverageFolderName = coverageFolderName.toLowerCase();

  const workspaceRootRequire = createRequire(workspaceRoot + '/');

  // Any changes to the config here need to be synced to: packages/schematics/angular/config/files/karma.conf.js.template
  return {
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-jasmine-html-reporter',
      'karma-coverage',
    ].map((p) => workspaceRootRequire(p)),
    jasmineHtmlReporter: {
      suppressAll: true, // removes the duplicated traces
    },
    coverageReporter: {
      dir: path.join(workspaceRoot, 'coverage', coverageFolderName),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      // Chrome configured to run in a bazel sandbox.
      // Disable the use of the gpu and `/dev/shm` because it causes Chrome to
      // crash on some environments.
      // See:
      //   https://github.com/puppeteer/puppeteer/blob/v1.0.0/docs/troubleshooting.md#tips
      //   https://stackoverflow.com/questions/50642308/webdriverexception-unknown-error-devtoolsactiveport-file-doesnt-exist-while-t
      ChromeHeadlessNoSandbox: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--headless', '--disable-gpu', '--disable-dev-shm-usage'],
      },
    },
    restartOnFileChange: true,
  };
}

export type { KarmaBuilderOptions };

const builder: Builder<KarmaBuilderOptions> = createBuilder<KarmaBuilderOptions>(execute);

export default builder;
