/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { buildWebpackBrowser } from '../../browser';
import { BASE_OPTIONS as BROWSER_BASE_OPTIONS } from '../../browser/tests/setup';
import { BuilderHarness } from '../../testing/builder-harness';
import { Schema } from '../schema';

export { describeBuilder } from '../../testing';

export const DEV_SERVER_BUILDER_INFO = Object.freeze({
  name: '@angular-devkit/build-angular:dev-server',
  schemaPath: __dirname + '/../schema.json',
});

/**
 * Contains all required extract-i18n builder fields.
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

export function setupBrowserTarget<T>(harness: BuilderHarness<T>): void {
  harness.withBuilderTarget('build', buildWebpackBrowser, {
    ...BROWSER_BASE_OPTIONS,
  });
}
