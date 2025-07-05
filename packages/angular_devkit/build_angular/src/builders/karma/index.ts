/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { assertCompatibleAngularVersion } from '@angular/build/private';
import {
  BuilderContext,
  BuilderOutput,
  createBuilder,
  targetFromTargetString,
} from '@angular-devkit/architect';
import { strings } from '@angular-devkit/core';
import type { ConfigOptions } from 'karma';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { Observable, from, mergeMap } from 'rxjs';
import { Configuration } from 'webpack';
import { ExecutionTransformer } from '../../transforms';
import { normalizeFileReplacements } from '../../utils';
import { BuilderMode, Schema as KarmaBuilderOptions } from './schema';

export type KarmaConfigOptions = ConfigOptions & {
  buildWebpack?: unknown;
  configFile?: string;
};

/**
 * @experimental Direct usage of this function is considered experimental.
 */
export function execute(
  options: KarmaBuilderOptions,
  context: BuilderContext,
  transforms: {
    webpackConfiguration?: ExecutionTransformer<Configuration>;
    // The karma options transform cannot be async without a refactor of the builder implementation
    karmaOptions?: (options: KarmaConfigOptions) => KarmaConfigOptions;
  } = {},
): Observable<BuilderOutput> {
  // Check Angular version.
  assertCompatibleAngularVersion(context.workspaceRoot);

  return from(getExecuteWithBuilder(options, context)).pipe(
    mergeMap(([useEsbuild, executeWithBuilder]) => {
      if (useEsbuild) {
        if (transforms.webpackConfiguration) {
          context.logger.warn(
            `This build is using the application builder but transforms.webpackConfiguration was provided. The transform will be ignored.`,
          );
        }

        if (options.fileReplacements) {
          options.fileReplacements = normalizeFileReplacements(options.fileReplacements, './');
        }

        if (typeof options.polyfills === 'string') {
          options.polyfills = [options.polyfills];
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return executeWithBuilder(options as any, context, transforms);
      } else {
        const karmaOptions = getBaseKarmaOptions(options, context);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return executeWithBuilder(options as any, context, karmaOptions, transforms);
      }
    }),
  );
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
  if (/[A-Z]/.test(coverageFolderName)) {
    coverageFolderName = strings.dasherize(coverageFolderName);
  }

  const workspaceRootRequire = createRequire(workspaceRoot + '/');

  // Any changes to the config here need to be synced to: packages/schematics/angular/config/files/karma.conf.js.template
  return {
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      'karma-jasmine',
      'karma-chrome-launcher',
      'karma-jasmine-html-reporter',
      'karma-coverage',
      '@angular-devkit/build-angular/plugins/karma',
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
export default createBuilder<Record<string, string> & KarmaBuilderOptions>(execute);

async function getExecuteWithBuilder(
  options: KarmaBuilderOptions,
  context: BuilderContext,
): Promise<
  [
    boolean,
    (
      | (typeof import('@angular/build'))['executeKarmaBuilder']
      | (typeof import('./browser_builder'))['execute']
    ),
  ]
> {
  const useEsbuild = await checkForEsbuild(options, context);
  let execute;
  if (useEsbuild) {
    const { executeKarmaBuilder } = await import('@angular/build');
    execute = executeKarmaBuilder;
  } else {
    const browserBuilderModule = await import('./browser_builder');
    execute = browserBuilderModule.execute;
  }

  return [useEsbuild, execute];
}

async function checkForEsbuild(
  options: KarmaBuilderOptions,
  context: BuilderContext,
): Promise<boolean> {
  if (options.builderMode !== BuilderMode.Detect) {
    return options.builderMode === BuilderMode.Application;
  }

  // Look up the current project's build target using a development configuration.
  const buildTargetSpecifier = `::development`;
  const buildTarget = targetFromTargetString(
    buildTargetSpecifier,
    context.target?.project,
    'build',
  );

  try {
    const developmentBuilderName = await context.getBuilderNameForTarget(buildTarget);

    return isEsbuildBased(developmentBuilderName);
  } catch (e) {
    if (!(e instanceof Error) || e.message !== 'Project target does not exist.') {
      throw e;
    }
    // If we can't find a development builder, we can't use 'detect'.
    throw new Error(
      'Failed to detect the builder used by the application. Please set builderMode explicitly.',
    );
  }
}

function isEsbuildBased(
  builderName: string,
): builderName is
  | '@angular/build:application'
  | '@angular-devkit/build-angular:application'
  | '@angular-devkit/build-angular:browser-esbuild' {
  if (
    builderName === '@angular/build:application' ||
    builderName === '@angular-devkit/build-angular:application' ||
    builderName === '@angular-devkit/build-angular:browser-esbuild'
  ) {
    return true;
  }

  return false;
}
