/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderMode, Schema } from '../schema';
import { BuilderHandlerFn } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { ApplicationBuilderOptions as ApplicationSchema, buildApplication } from '@angular/build';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';

import { JasmineBuilderHarness } from '../../../testing';
import { host } from '../../../testing/test-utils';
import { BuilderHarness } from '../../../testing';
import { buildWebpackBrowser } from '../../browser';
import { Schema as BrowserSchema } from '../../browser/schema';
import {
  BASE_OPTIONS as BROWSER_BASE_OPTIONS,
  BROWSER_BUILDER_INFO,
} from '../../browser/tests/setup';

export { describeBuilder } from '../../../testing';

export const KARMA_BUILDER_INFO = Object.freeze({
  name: '@angular-devkit/build-angular:karma',
  schemaPath: __dirname + '/../schema.json',
});

/**
 * Contains all required karma builder fields.
 * Also disables progress reporting to minimize logging output.
 */
export const BASE_OPTIONS = Object.freeze<Schema>({
  polyfills: ['./src/polyfills', 'zone.js/testing'],
  tsConfig: 'src/tsconfig.spec.json',
  karmaConfig: 'karma.conf.js',
  browsers: 'ChromeHeadlessCI',
  progress: false,
  watch: false,
  builderMode: BuilderMode.Detect,
});

const optionSchemaCache = new Map<string, json.schema.JsonSchema>();

function getCachedSchema(options: { schemaPath: string }): json.schema.JsonSchema {
  let optionSchema = optionSchemaCache.get(options.schemaPath);
  if (optionSchema === undefined) {
    optionSchema = JSON.parse(readFileSync(options.schemaPath, 'utf8')) as json.schema.JsonSchema;
    optionSchemaCache.set(options.schemaPath, optionSchema);
  }
  return optionSchema;
}

/**
 * Adds a `build` target to a builder test harness for the browser builder with the base options
 * used by the browser builder tests.
 *
 * @param harness The builder harness to use when setting up the browser builder target
 * @param extraOptions The additional options that should be used when executing the target.
 */
export async function setupBrowserTarget<T>(
  harness: BuilderHarness<T>,
  extraOptions?: Partial<BrowserSchema>,
): Promise<void> {
  const browserSchema = getCachedSchema(BROWSER_BUILDER_INFO);

  harness.withBuilderTarget(
    'build',
    buildWebpackBrowser,
    {
      ...BROWSER_BASE_OPTIONS,
      ...extraOptions,
    },
    {
      builderName: BROWSER_BUILDER_INFO.name,
      optionSchema: browserSchema,
    },
  );
}

/**
 * Contains all required application builder fields.
 * Also disables progress reporting to minimize logging output.
 */
export const APPLICATION_BASE_OPTIONS = Object.freeze<ApplicationSchema>({
  index: 'src/index.html',
  browser: 'src/main.ts',
  outputPath: 'dist',
  tsConfig: 'src/tsconfig.app.json',
  progress: false,

  // Disable optimizations
  optimization: false,

  // Enable polling (if a test enables watch mode).
  // This is a workaround for bazel isolation file watch not triggering in tests.
  poll: 100,
});

// TODO: Remove and use import after Vite-based dev server is moved to new package
export const APPLICATION_BUILDER_INFO = Object.freeze({
  name: '@angular-devkit/build-angular:application',
  schemaPath: path.join(
    path.dirname(require.resolve('@angular/build/package.json')),
    'src/builders/application/schema.json',
  ),
});

/**
 * Adds a `build` target to a builder test harness for the application builder with the base options
 * used by the application builder tests.
 *
 * @param harness The builder harness to use when setting up the application builder target
 * @param extraOptions The additional options that should be used when executing the target.
 */
export async function setupApplicationTarget<T>(
  harness: BuilderHarness<T>,
  extraOptions?: Partial<ApplicationSchema>,
): Promise<void> {
  const applicationSchema = getCachedSchema(APPLICATION_BUILDER_INFO);

  harness.withBuilderTarget(
    'build',
    buildApplication,
    {
      ...APPLICATION_BASE_OPTIONS,
      ...extraOptions,
    },
    {
      builderName: APPLICATION_BUILDER_INFO.name,
      optionSchema: applicationSchema,
    },
  );

  // For application-builder based targets, the localize polyfill needs to be explicit.
  await harness.appendToFile('src/polyfills.ts', `import '@angular/localize/init';`);
}

/** Runs the test against both an application- and a browser-builder context. */
export function describeKarmaBuilder<T>(
  builderHandler: BuilderHandlerFn<T & json.JsonObject>,
  options: { name?: string; schemaPath: string },
  specDefinitions: ((
    harness: JasmineBuilderHarness<T>,
    setupTarget: typeof setupApplicationTarget,
    isApplicationTarget: true,
  ) => void) &
    ((
      harness: JasmineBuilderHarness<T>,
      setupTarget: typeof setupBrowserTarget,
      isApplicationTarget: false,
    ) => void),
) {
  const optionSchema = getCachedSchema(options);
  const harness = new JasmineBuilderHarness<T>(builderHandler, host, {
    builderName: options.name,
    optionSchema,
  });

  describe(options.name || builderHandler.name, () => {
    for (const isApplicationTarget of [true, false]) {
      describe(isApplicationTarget ? 'with application builder' : 'with browser builder', () => {
        beforeEach(() => host.initialize().toPromise());
        afterEach(() => host.restore().toPromise());

        if (isApplicationTarget) {
          specDefinitions(harness, setupApplicationTarget, true);
        } else {
          specDefinitions(harness, setupBrowserTarget, false);
        }
      });
    }
  });
}
