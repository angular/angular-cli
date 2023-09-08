/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import remapping, { SourceMapInput } from '@ampproject/remapping';
import { PluginObj, parseSync, transformFromAstAsync, types } from '@babel/core';
import assert from 'node:assert';
import { workerData } from 'node:worker_threads';
import { assertIsError } from '../../utils/error';
import { loadEsmModule } from '../../utils/load-esm';

/**
 * The options passed to the inliner for each file request
 */
interface InlineRequest {
  /**
   * The filename that should be processed. The data for the file is provided to the Worker
   * during Worker initialization.
   */
  filename: string;
  /**
   * The locale specifier that should be used during the inlining process of the file.
   */
  locale: string;
  /**
   * The translation messages for the locale that should be used during the inlining process of the file.
   */
  translation?: Record<string, unknown>;
}

// Extract the application files and common options used for inline requests from the Worker context
// TODO: Evaluate overall performance difference of passing translations here as well
const { files, missingTranslation, shouldOptimize } = (workerData || {}) as {
  files: ReadonlyMap<string, Blob>;
  missingTranslation: 'error' | 'warning' | 'ignore';
  shouldOptimize: boolean;
};

/**
 * Inlines the provided locale and translation into a JavaScript file that contains `$localize` usage.
 * This function is the main entry for the Worker's action that is called by the worker pool.
 *
 * @param request An InlineRequest object representing the options for inlining
 * @returns An array containing the inlined file and optional map content.
 */
export default async function inlineLocale(request: InlineRequest) {
  const data = files.get(request.filename);

  assert(data !== undefined, `Invalid inline request for file '${request.filename}'.`);

  const code = await data.text();
  const map = await files.get(request.filename + '.map')?.text();
  const result = await transformWithBabel(
    code,
    map && (JSON.parse(map) as SourceMapInput),
    request,
  );

  // TODO: Return diagnostics
  // TODO: Consider buffer transfer instead of string copying
  const response = [{ file: request.filename, contents: result.code }];
  if (result.map) {
    response.push({ file: request.filename + '.map', contents: result.map });
  }

  return response;
}

/**
 * A Type representing the localize tools module.
 */
type LocalizeUtilityModule = typeof import('@angular/localize/tools');

/**
 * Cached instance of the `@angular/localize/tools` module.
 * This is used to remove the need to repeatedly import the module per file translation.
 */
let localizeToolsModule: LocalizeUtilityModule | undefined;

/**
 * Attempts to load the `@angular/localize/tools` module containing the functionality to
 * perform the file translations.
 * This module must be dynamically loaded as it is an ESM module and this file is CommonJS.
 */
async function loadLocalizeTools(): Promise<LocalizeUtilityModule> {
  // Load ESM `@angular/localize/tools` using the TypeScript dynamic import workaround.
  // Once TypeScript provides support for keeping the dynamic import this workaround can be
  // changed to a direct dynamic import.
  localizeToolsModule ??= await loadEsmModule<LocalizeUtilityModule>('@angular/localize/tools');

  return localizeToolsModule;
}

/**
 * Creates the needed Babel plugins to inline a given locale and translation for a JavaScript file.
 * @param locale A string containing the locale specifier to use.
 * @param translation A object record containing locale specific messages to use.
 * @returns An array of Babel plugins.
 */
async function createI18nPlugins(locale: string, translation: Record<string, unknown> | undefined) {
  const { Diagnostics, makeEs2015TranslatePlugin } = await loadLocalizeTools();

  const plugins: PluginObj[] = [];
  const diagnostics = new Diagnostics();

  plugins.push(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    makeEs2015TranslatePlugin(diagnostics, (translation || {}) as any, {
      missingTranslation: translation === undefined ? 'ignore' : missingTranslation,
    }),
  );

  // Create a plugin to replace the locale specifier constant inject by the build system with the actual specifier
  plugins.push({
    visitor: {
      StringLiteral(path) {
        if (path.node.value === '___NG_LOCALE_INSERT___') {
          path.replaceWith(types.stringLiteral(locale));
        }
      },
    },
  });

  return { diagnostics, plugins };
}

/**
 * Transforms a JavaScript file using Babel to inline the request locale and translation.
 * @param code A string containing the JavaScript code to transform.
 * @param map A sourcemap object for the provided JavaScript code.
 * @param options The inline request options to use.
 * @returns An object containing the code, map, and diagnostics from the transformation.
 */
async function transformWithBabel(
  code: string,
  map: SourceMapInput | undefined,
  options: InlineRequest,
) {
  let ast;
  try {
    ast = parseSync(code, {
      babelrc: false,
      configFile: false,
      sourceType: 'unambiguous',
      filename: options.filename,
    });
  } catch (error) {
    assertIsError(error);

    // Make the error more readable.
    // Same errors will contain the full content of the file as the error message
    // Which makes it hard to find the actual error message.
    const index = error.message.indexOf(')\n');
    const msg = index !== -1 ? error.message.slice(0, index + 1) : error.message;
    throw new Error(`${msg}\nAn error occurred inlining file "${options.filename}"`);
  }

  if (!ast) {
    throw new Error(`Unknown error occurred inlining file "${options.filename}"`);
  }

  const { diagnostics, plugins } = await createI18nPlugins(options.locale, options.translation);
  const transformResult = await transformFromAstAsync(ast, code, {
    filename: options.filename,
    // false is a valid value but not included in the type definition
    inputSourceMap: false as unknown as undefined,
    sourceMaps: !!map,
    compact: shouldOptimize,
    configFile: false,
    babelrc: false,
    browserslistConfigFile: false,
    plugins,
  });

  if (!transformResult || !transformResult.code) {
    throw new Error(`Unknown error occurred processing bundle for "${options.filename}".`);
  }

  let outputMap;
  if (map && transformResult.map) {
    outputMap = remapping([transformResult.map as SourceMapInput, map], () => null);
  }

  return { code: transformResult.code, map: outputMap && JSON.stringify(outputMap), diagnostics };
}
