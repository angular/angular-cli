/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BuilderHandlerFn } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import { readFileSync } from 'fs';
import { host } from '../test-utils';
import { BuilderHarness } from './builder-harness';

const optionSchemaCache = new Map<string, json.schema.JsonSchema>();

export function describeBuilder<T>(
  builderHandler: BuilderHandlerFn<T & json.JsonObject>,
  options: { name?: string; schemaPath: string },
  specDefinitions: (harness: JasmineBuilderHarness<T>) => void,
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
    beforeEach(() => host.initialize().toPromise());

    afterEach(() => host.restore().toPromise());

    specDefinitions(harness);
  });
}

class JasmineBuilderHarness<T> extends BuilderHarness<T> {
  expectFile(path: string): HarnessFileMatchers {
    return expectFile(path, this);
  }
}

export interface HarnessFileMatchers {
  toExist(): boolean;
  toNotExist(): boolean;
  readonly content: jasmine.ArrayLikeMatchers<string>;
  readonly size: jasmine.Matchers<number>;
}

export function expectFile<T>(path: string, harness: BuilderHarness<T>): HarnessFileMatchers {
  return {
    toExist: () => expect(harness.hasFile(path)).toBe(true, 'Expected file to exist: ' + path),
    toNotExist: () =>
      expect(harness.hasFile(path)).toBe(false, 'Expected file to not exist: ' + path),
    get content() {
      return expect(harness.readFile(path)).withContext(`With file content for '${path}'`);
    },
    get size() {
      return expect(Buffer.byteLength(harness.readFile(path))).withContext(
        `With file size for '${path}'`,
      );
    },
  };
}
