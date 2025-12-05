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
import { BuilderHarness } from '../../../../../../../modules/testing/builder/src';
import {
  ApplicationBuilderOptions as AppilicationSchema,
  buildApplication,
} from '../../../builders/application';
import { Schema } from '../schema';

// TODO: Consider using package.json imports field instead of relative path
//       after the switch to rules_js.
export * from '../../../../../../../modules/testing/builder/src';

// TODO: Remove and use import after Vite-based dev server is moved to new package
export const APPLICATION_BUILDER_INFO = Object.freeze({
  name: '@angular/build:application',
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
  name: '@angular/build:dev-server',
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
 * Maximum time for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 25_000;

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
