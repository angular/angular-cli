/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import remapping, { type EncodedSourceMap, type SourceMapInput } from '@ampproject/remapping';
import MagicString from 'magic-string';
import assert from 'node:assert';
import { workerData } from 'node:worker_threads';
import { Visitor, parseSync } from 'oxc-parser';

/**
 * The options passed to the inliner for each file request
 */
interface InlineFileRequest {
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

/**
 * The options passed to the inliner for each code request
 */
interface InlineCodeRequest {
  /**
   * The code that should be processed.
   */
  code: string;

  /**
   * The filename to use in error and warning messages for the provided code.
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
 * @returns An object containing the inlined file and optional map content.
 */
export default async function inlineFile(request: InlineFileRequest) {
  const data = files.get(request.filename);

  assert(data !== undefined, `Invalid inline request for file '${request.filename}'.`);

  const code = await data.text();
  const map = await files.get(request.filename + '.map')?.text();
  const result = await transformWithOxc(code, map && (JSON.parse(map) as SourceMapInput), request);

  return {
    file: request.filename,
    code: result.code,
    map: result.map,
    messages: result.diagnostics.messages,
  };
}

/**
 * Inlines the provided locale and translation into JavaScript code that contains `$localize` usage.
 * This function is a secondary entry primarily for use with component HMR update modules.
 *
 * @param request An InlineRequest object representing the options for inlining
 * @returns An object containing the inlined code.
 */
export async function inlineCode(request: InlineCodeRequest) {
  const result = await transformWithOxc(request.code, undefined, request);

  return {
    output: result.code,
    messages: result.diagnostics.messages,
  };
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
  localizeToolsModule ??= await import('@angular/localize/tools');

  return localizeToolsModule;
}

/**
 * Transforms a JavaScript file using OXC and Magic-String to inline the request locale and translation.
 * @param code A string containing the JavaScript code to transform.
 * @param map A sourcemap object for the provided JavaScript code.
 * @param options The inline request options to use.
 * @returns An object containing the code, map, and diagnostics from the transformation.
 */
async function transformWithOxc(
  code: string,
  map: SourceMapInput | undefined,
  options: InlineFileRequest,
) {
  const { program } = parseSync(options.filename, code, {
    sourceType: 'unambiguous',
  });

  if (!program) {
    throw new Error(`Unknown error occurred parsing file "${options.filename}" with OXC.`);
  }

  const magicString = new MagicString(code);
  const { Diagnostics, translate } = await loadLocalizeTools();
  const diagnostics = new Diagnostics();

  const visitor = new Visitor({
    Literal(node) {
      if (typeof node.value === 'string' && node.value === '___NG_LOCALE_INSERT___') {
        magicString.overwrite(node.start, node.end, JSON.stringify(options.locale));
      }
    },
    'TaggedTemplateExpression:exit'(node) {
      if (node.tag.type === 'Identifier' && node.tag.name === '$localize') {
        const cooked = node.quasi.quasis.map((q) => q.value.cooked);
        const raw = node.quasi.quasis.map((q) => q.value.raw);
        const messageParts = Object.assign(cooked, { raw }) as unknown as TemplateStringsArray;

        const [translatedParts, translatedSubstitutions] = translate(
          diagnostics,
          options.translation || {},
          messageParts,
          node.quasi.expressions.map((_, index) => index),
          options.translation === undefined ? 'ignore' : missingTranslation,
        );

        // Reconstruct the new template/string literal replacement
        let replacement: string;
        if (translatedSubstitutions.length === 0) {
          replacement = JSON.stringify(translatedParts[0]);
        } else {
          replacement = '`';
          for (let i = 0; i < translatedParts.length; i++) {
            const escapedPart = JSON.stringify(translatedParts[i])
              .slice(1, -1)
              .replace(/\\"/g, '"')
              .replace(/`/g, '\\`')
              .replace(/\$\{/g, '\\${');
            replacement += escapedPart;

            if (i < translatedSubstitutions.length) {
              const originalIndex = translatedSubstitutions[i];
              const exprNode = node.quasi.expressions[originalIndex];
              const exprCode = magicString.slice(exprNode.start, exprNode.end);
              replacement += '${' + exprCode + '}';
            }
          }
          replacement += '`';
        }

        magicString.overwrite(node.start, node.end, replacement);
      }
    },
  });

  visitor.visit(program);

  const outputCode = magicString.toString();
  let outputMap;
  if (map && magicString.hasChanged()) {
    const rawMap = magicString.generateMap({
      source: options.filename,
      includeContent: true,
      hires: 'boundary',
    });
    outputMap = remapping([rawMap as EncodedSourceMap, map], () => null);
  }

  return {
    code: outputCode,
    map: outputMap && JSON.stringify(outputMap),
    diagnostics,
  };
}
