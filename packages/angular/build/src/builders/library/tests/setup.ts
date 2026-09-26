/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderHandlerFn } from '@angular-devkit/architect';
import { TestProjectHost } from '@angular-devkit/architect/testing';
import { json, normalize, join } from '@angular-devkit/core';
import { readFileSync } from 'node:fs';
import { JasmineBuilderHarness } from '../../../../../../../modules/testing/builder/src';
import { Schema } from '../schema';

export * from '../../../../../../../modules/testing/builder/src';

export const LIBRARY_BUILDER_INFO = Object.freeze({
  name: '@angular/build:library',
  schemaPath: __dirname + '/../schema.json',
});

export const BASE_OPTIONS = Object.freeze<Schema>({
  tsConfig: 'projects/lib/tsconfig.lib.json',
  outputPath: 'dist/lib',
  poll: 100,
});

const libWorkspaceRoot = join(
  normalize(__dirname),
  '../../../../../../../modules/testing/builder/projects/hello-world-lib/',
);
export const libHost = new TestProjectHost(libWorkspaceRoot);

const optionSchemaCache = new Map<string, json.schema.JsonSchema>();

function getCachedSchema(options: { schemaPath: string }): json.schema.JsonSchema {
  let optionSchema = optionSchemaCache.get(options.schemaPath);
  if (optionSchema === undefined) {
    optionSchema = JSON.parse(readFileSync(options.schemaPath, 'utf8')) as json.schema.JsonSchema;
    optionSchemaCache.set(options.schemaPath, optionSchema);
  }
  return optionSchema;
}

let counter = 0;

export function describeLibraryBuilder(
  builderHandler: BuilderHandlerFn<Schema & json.JsonObject>,
  options: { name?: string; schemaPath: string },
  specDefinitions: (harness: JasmineBuilderHarness<Schema>) => void,
): void {
  const optionSchema = getCachedSchema(options);
  const harness = new JasmineBuilderHarness<Schema>(builderHandler, libHost, {
    builderName: options.name,
    optionSchema,
  });

  describe((options.name || builderHandler.name) + ` (Suite: ${counter++})`, () => {
    beforeEach(async () => {
      harness.resetProjectMetadata();
      harness.useProject('lib', {
        root: 'projects/lib',
        sourceRoot: 'projects/lib/src',
      });
      harness.useTarget('build', BASE_OPTIONS);

      await libHost.initialize().toPromise();
      await harness.modifyFile('projects/lib/package.json', (content) => {
        const pkg = JSON.parse(content);
        pkg.exports = {
          '.': './src/public-api.ts',
        };

        return JSON.stringify(pkg, null, 2);
      });
    });

    afterEach(() => libHost.restore().toPromise());

    specDefinitions(harness);
  });
}
