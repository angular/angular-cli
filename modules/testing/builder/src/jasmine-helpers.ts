/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { BuilderHandlerFn } from '@angular-devkit/architect';
import { json, logging } from '@angular-devkit/core';
import { readFileSync } from 'node:fs';
import { concatMap, count, debounceTime, firstValueFrom, take, timeout } from 'rxjs';
import {
  BuilderHarness,
  BuilderHarnessExecutionOptions,
  BuilderHarnessExecutionResult,
} from './builder-harness';
import { host } from './test-utils';

/**
 * Maximum time for single build/rebuild
 * This accounts for CI variability.
 */
export const BUILD_TIMEOUT = 30_000;

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
    beforeEach(async () => {
      harness.resetProjectMetadata();

      await host.initialize().toPromise();
    });

    afterEach(() => host.restore().toPromise());

    specDefinitions(harness);
  });
}

export class JasmineBuilderHarness<T> extends BuilderHarness<T> {
  expectFile(path: string): HarnessFileMatchers {
    return expectFile(path, this);
  }
  expectDirectory(path: string): HarnessDirectoryMatchers {
    return expectDirectory(path, this);
  }

  async executeWithCases(
    cases: ((
      executionResult: BuilderHarnessExecutionResult,
      index: number,
    ) => void | Promise<void>)[],
    options?: Partial<BuilderHarnessExecutionOptions> & { timeout?: number },
  ): Promise<void> {
    const executionCount = await firstValueFrom(
      this.execute(options).pipe(
        timeout(options?.timeout ?? BUILD_TIMEOUT),
        debounceTime(100), // This is needed as sometimes 2 events for the same change fire with webpack.
        concatMap(async (result, index) => await cases[index](result, index)),
        take(cases.length),
        count(),
      ),
    );

    expect(executionCount).toBe(cases.length);
  }
}

export interface HarnessFileMatchers {
  toExist(): boolean;
  toNotExist(): boolean;
  readonly content: jasmine.ArrayLikeMatchers<string>;
  readonly size: jasmine.Matchers<number>;
}

export interface HarnessDirectoryMatchers {
  toExist(): boolean;
  toNotExist(): boolean;
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
      expect(exists)
        .withContext('Expected file to exist: ' + path)
        .toBeTrue();

      return exists;
    },
    toNotExist() {
      const exists = harness.hasFile(path);
      expect(exists)
        .withContext('Expected file to exist: ' + path)
        .toBeFalse();

      return !exists;
    },
    get content() {
      try {
        return expect(harness.readFile(path)).withContext(`With file content for '${path}'`);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
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
        if ((e as NodeJS.ErrnoException).code !== 'ENOENT') {
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

export function expectDirectory<T>(
  path: string,
  harness: BuilderHarness<T>,
): HarnessDirectoryMatchers {
  return {
    toExist() {
      const exists = harness.hasDirectory(path);
      expect(exists)
        .withContext('Expected directory to exist: ' + path)
        .toBeTrue();

      return exists;
    },
    toNotExist() {
      const exists = harness.hasDirectory(path);
      expect(exists)
        .withContext('Expected directory to not exist: ' + path)
        .toBeFalse();

      return !exists;
    },
  };
}

export function expectLog(logs: readonly logging.LogEntry[], message: string | RegExp) {
  expect(logs).toContain(
    jasmine.objectContaining({
      message: jasmine.stringMatching(message),
    }),
  );
}

export function expectNoLog(
  logs: readonly logging.LogEntry[],
  message: string | RegExp,
  failureMessage?: string,
) {
  expect(logs)
    .withContext(failureMessage ?? '')
    .not.toContain(
      jasmine.objectContaining({
        message: jasmine.stringMatching(message),
      }),
    );
}
