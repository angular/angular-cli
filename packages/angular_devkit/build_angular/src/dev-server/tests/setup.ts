/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { json } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import { buildWebpackBrowser } from '../../browser';
import { Schema as BrowserSchema } from '../../browser/schema';
import {
  BASE_OPTIONS as BROWSER_BASE_OPTIONS,
  BROWSER_BUILDER_INFO,
} from '../../browser/tests/setup';
import { BuilderHarness } from '../../testing/builder-harness';
import { Schema } from '../schema';

export { describeBuilder } from '../../testing';

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
  browserTarget: 'test:build',
  port: 0,
});

/**
 * Maximum time for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 15000;

/**
 * Cached browser builder option schema
 */
let browserSchema: json.schema.JsonSchema | undefined = undefined;

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
  if (!browserSchema) {
    browserSchema = JSON.parse(
      readFileSync(BROWSER_BUILDER_INFO.schemaPath, 'utf8'),
    ) as json.schema.JsonSchema;
  }

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
