/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { Schema } from '../schema';
import { BuilderHandlerFn } from '@angular-devkit/architect';
import { json } from '@angular-devkit/core';
import {
  ApplicationBuilderOptions as ApplicationSchema,
  buildApplication,
} from '../../../builders/application';
import * as path from 'node:path';
import { readFileSync } from 'node:fs';
import {
  BuilderHarness,
  host,
  JasmineBuilderHarness,
} from '../../../../../../../modules/testing/builder/src';

// TODO: Consider using package.json imports field instead of relative path
//       after the switch to rules_js.
export * from '../../../../../../../modules/testing/builder/src';

export const KARMA_BUILDER_INFO = Object.freeze({
  name: '@angular/build:karma',
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
  name: '@angular/build:application',
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
  specDefinitions: (
    harness: JasmineBuilderHarness<T>,
    setupTarget: typeof setupApplicationTarget,
    isApplicationTarget: true,
  ) => void,
) {
  const optionSchema = getCachedSchema(options);
  const harness = new JasmineBuilderHarness<T>(builderHandler, host, {
    builderName: options.name,
    optionSchema,
  });

  describe(options.name || builderHandler.name, () => {
    beforeEach(async () => {
      await host.initialize().toPromise();

      await harness.modifyFile('karma.conf.js', (content) => {
        return content
          .replace(`, '@angular-devkit/build-angular'`, '')
          .replace(`require('@angular-devkit/build-angular/plugins/karma'),`, '');
      });
    });
    afterEach(() => host.restore().toPromise());

    specDefinitions(harness, setupApplicationTarget, true);
  });
}
