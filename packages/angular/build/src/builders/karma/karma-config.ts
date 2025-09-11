/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import type { BuilderContext } from '@angular-devkit/architect';
import type { ConfigOptions } from 'karma';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { NormalizedKarmaBuilderOptions } from './options';

export function getBaseKarmaOptions(
  options: NormalizedKarmaBuilderOptions,
  context: BuilderContext,
): ConfigOptions {
  // Determine project name from builder context target
  const projectName = context.target?.project;
  if (!projectName) {
    throw new Error(`The 'karma' builder requires a target to be specified.`);
  }

  const karmaOptions: ConfigOptions = options.karmaConfig
    ? {}
    : getBuiltInKarmaConfig(context.workspaceRoot, projectName);

  const singleRun = !options.watch;
  karmaOptions.singleRun = singleRun;

  // Workaround https://github.com/angular/angular-cli/issues/28271, by clearing context by default
  // for single run executions. Not clearing context for multi-run (watched) builds allows the
  // Jasmine Spec Runner to be visible in the browser after test execution.
  karmaOptions.client ??= {};
  karmaOptions.client.clearContext ??= singleRun;

  // Convert browsers from a string to an array
  if (options.browsers) {
    karmaOptions.browsers = options.browsers;
  }

  if (options.reporters) {
    karmaOptions.reporters = options.reporters;
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
