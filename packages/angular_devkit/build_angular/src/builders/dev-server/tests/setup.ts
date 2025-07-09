/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { json } from '@angular-devkit/core';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { BuilderHarness } from '../../../testing';
import { ApplicationBuilderOptions as AppilicationSchema, buildApplication } from '@angular/build';
import { buildWebpackBrowser } from '../../browser';
import { Schema as BrowserSchema } from '../../browser/schema';
import {
  BASE_OPTIONS as BROWSER_BASE_OPTIONS,
  BROWSER_BUILDER_INFO,
} from '../../browser/tests/setup';
import { Schema } from '../schema';

export { describeBuilder } from '../../../testing';

// TODO: Remove and use import after Vite-based dev server is moved to new package
export const APPLICATION_BUILDER_INFO = Object.freeze({
  name: '@angular-devkit/build-angular:application',
  schemaPath: path.join(
    path.dirname(require.resolve('@angular/build/package.json')),
    'src/builders/application/schema.json',
  ),
});

/**
 * Contains all required application builder fields.
 * Also disables progress reporting to minimize logging output.
 */
export const APPLICATION_BASE_OPTIONS = Object.freeze<AppilicationSchema>({
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

export const DEV_SERVER_BUILDER_INFO = Object.freeze({
  name: '@angular-devkit/build-angular:dev-server',
  schemaPath: __dirname + '/../schema.json',
});

/**
 * Contains all required dev-server builder fields.
 * The port is also set to zero to ensure a free port is used for each test which
 * supports parallel test execution.
 */
export const BASE_OPTIONS = Object.freeze<Schema>({
  buildTarget: 'test:build',
  port: 0,

  // Watch is not supported for testing in vite as currently there is no teardown logic to stop the watchers.
  watch: false,
});

/**
 * Cached browser builder option schema
 */
let browserSchema: json.schema.JsonSchema | undefined;

/**
 * Adds a `build` target to a builder test harness for the browser builder with the base options
 * used by the browser builder tests.
 *
 * @param harness The builder harness to use when setting up the browser builder target
 * @param extraOptions The additional options that should be used when executing the target.
 */
export function setupBrowserTarget<T>(
  harness: BuilderHarness<T>,
  extraOptions?: Partial<BrowserSchema>,
): void {
  browserSchema ??= JSON.parse(
    readFileSync(BROWSER_BUILDER_INFO.schemaPath, 'utf8'),
  ) as json.schema.JsonSchema;

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
 * Cached application builder option schema
 */
let applicationSchema: json.schema.JsonSchema | undefined;

/**
 * Adds a `build` target to a builder test harness for the application builder with the base options
 * used by the application builder tests.
 *
 * @param harness The builder harness to use when setting up the application builder target
 * @param extraOptions The additional options that should be used when executing the target.
 */
export function setupApplicationTarget<T>(
  harness: BuilderHarness<T>,
  extraOptions?: Partial<AppilicationSchema>,
): void {
  applicationSchema ??= JSON.parse(
    readFileSync(APPLICATION_BUILDER_INFO.schemaPath, 'utf8'),
  ) as json.schema.JsonSchema;

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
}
