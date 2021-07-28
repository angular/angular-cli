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
import { BuilderHarness } from './builder-harness';
import { host } from './test-utils';

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

/**
 * Add a Jasmine expectation filter to an expectation that always fails with a message.
 * @param base The base expectation (`expect(...)`) to use.
 * @param message The message to provide in the expectation failure.
 */
function createFailureExpectation<T>(base: T, message: string): T {
  // Needed typings are not included in the Jasmine types
  const expectation = base as T & {
    expector: {
      addFilter(filter: {
        selectComparisonFunc(): () => { pass: boolean; message: string };
      }): typeof expectation.expector;
    };
  };
  expectation.expector = expectation.expector.addFilter({
    selectComparisonFunc() {
      return () => ({
        pass: false,
        message,
      });
    },
  });

  return expectation;
}

export function expectFile<T>(path: string, harness: BuilderHarness<T>): HarnessFileMatchers {
  return {
    toExist() {
      const exists = harness.hasFile(path);
      expect(exists).toBe(true, 'Expected file to exist: ' + path);

      return exists;
    },
    toNotExist() {
      const exists = harness.hasFile(path);
      expect(exists).toBe(false, 'Expected file to not exist: ' + path);

      return !exists;
    },
    get content() {
      try {
        return expect(harness.readFile(path)).withContext(`With file content for '${path}'`);
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }

        // File does not exist so always fail the expectation
        return createFailureExpectation(
          expect(''),
          `Expected file content but file does not exist: '${path}'`,
        );
      }
    },
    get size() {
      try {
        return expect(Buffer.byteLength(harness.readFile(path))).withContext(
          `With file size for '${path}'`,
        );
      } catch (e) {
        if (e.code !== 'ENOENT') {
          throw e;
        }

        // File does not exist so always fail the expectation
        return createFailureExpectation(
          expect(0),
          `Expected file size but file does not exist: '${path}'`,
        );
      }
    },
  };
}
