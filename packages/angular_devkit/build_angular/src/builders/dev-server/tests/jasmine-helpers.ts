/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { BuilderHandlerFn } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import { JasmineBuilderHarness } from '../../../testing/jasmine-helpers';
import { host } from '../../../testing/test-utils';
import { setupApplicationTarget, setupBrowserTarget } from './setup';

const optionSchemaCache = new Map<string, json.schema.JsonSchema>();

export function describeServeBuilder<T>(
  builderHandler: BuilderHandlerFn<T & json.JsonObject>,
  options: { name?: string; schemaPath: string },
  specDefinitions: ((
    harness: JasmineBuilderHarness<T>,
    setupTarget: typeof setupApplicationTarget,
    isViteRun: true,
  ) => void) &
    ((
      harness: JasmineBuilderHarness<T>,
      setupTarget: typeof setupBrowserTarget,
      isViteRun: false,
    ) => void),
): void {
  let optionSchema = optionSchemaCache.get(options.schemaPath);
  if (optionSchema === undefined) {
    optionSchema = JSON.parse(readFileSync(options.schemaPath, 'utf8')) as json.schema.JsonSchema;
    optionSchemaCache.set(options.schemaPath, optionSchema);
  }
  const harness = new JasmineBuilderHarness<T>(builderHandler, host, {
    builderName: options.name,
    optionSchema,
  });

  describe(options.name || builderHandler.name, () => {
    for (const isViteRun of [true, false]) {
      describe(isViteRun ? 'vite' : 'webpack-dev-server', () => {
        beforeEach(() => host.initialize().toPromise());
        afterEach(() => host.restore().toPromise());

        if (isViteRun) {
          specDefinitions(harness, setupApplicationTarget, true);
        } else {
          specDefinitions(harness, setupBrowserTarget, false);
        }
      });
    }
  });
}
