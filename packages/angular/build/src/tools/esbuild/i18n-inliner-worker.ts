/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import remapping, { type DecodedSourceMap, type SourceMapInput } from '@ampproject/remapping';
import type { Node } from '@oxc-project/types';
import { MagicString } from 'magic-string';
import assert from 'node:assert';
import { deserialize } from 'node:v8';
import { workerData } from 'node:worker_threads';
import { parseSync, visitorKeys } from 'oxc-parser';

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
   * The serialized translation messages for the locale that should be used during the inlining
   * process of the file. A Blob is used so that the messages are shared with the Worker by
   * reference instead of being copied into it for every request.
   */
  translation?: Blob;
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
   * The serialized translation messages for the locale that should be used during the inlining
   * process of the file. A Blob is used so that the messages are shared with the Worker by
   * reference instead of being copied into it for every request.
   */
  translation?: Blob;
}

// Extract the application files and common options used for inline requests from the Worker context
const { files, missingTranslation, shouldOptimize } = (workerData || {}) as {
  files: ReadonlyMap<string, Blob>;
  missingTranslation: 'error' | 'warning' | 'ignore';
  shouldOptimize: boolean;
};

/**
 * The translation messages deserialized for the locale most recently requested of this Worker.
 * Locales are inlined one at a time, so retaining only the active locale is enough to avoid
 * deserializing the messages once per file while holding at most one set of messages in memory.
 */
let activeTranslation: { locale: string; messages: Promise<Record<string, unknown>> } | undefined;

/**
 * Deserializes the translation messages for an inline request, reusing the result for any
 * subsequent request that targets the same locale.
 * @param request An inline request containing the locale and its serialized messages.
 * @returns The translation messages, or undefined if the locale has no translations.
 */
function loadTranslation(
  request: InlineFileRequest | InlineCodeRequest,
): Promise<Record<string, unknown>> | undefined {
  const { locale, translation } = request;
  if (!translation) {
    return undefined;
  }

  if (activeTranslation?.locale !== locale) {
    activeTranslation = {
      locale,
      // Deserializing within the stored promise ensures that concurrent requests for a locale
      // share the one deserialization instead of each performing their own.
      messages: translation
        .arrayBuffer()
        .then((buffer) => deserialize(new Uint8Array(buffer)) as Record<string, unknown>),
    };
  }

  return activeTranslation.messages;
}

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
  const result = await transformWithOxc(
    code,
    map && (JSON.parse(map) as SourceMapInput),
    request,
    await loadTranslation(request),
  );

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
  const result = await transformWithOxc(
    request.code,
    undefined,
    request,
    await loadTranslation(request),
  );

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
 * Traverses ESTree AST nodes in post-order (bottom-up) without recursion.
 * Bottom-up traversal ensures that nested `$localize` expressions are transformed and
 * written to MagicString before outer containing templates are evaluated.
 *
 * @param root The root AST node to traverse.
 * @param onExit Callback invoked on each AST node in post-order.
 */
function walkAstPostOrder(root: Node, onExit: (node: Node) => void): void {
  const traverseStack: Node[] = [root];
  const postOrderNodes: Node[] = [];

  while (traverseStack.length > 0) {
    const current = traverseStack.pop();
    if (!current) {
      continue;
    }

    postOrderNodes.push(current);

    const keys = visitorKeys[current.type];
    if (!keys) {
      continue;
    }

    for (let i = 0; i < keys.length; i++) {
      const child = (current as unknown as Record<string, Node | Node[]>)[keys[i]];
      if (!child) {
        continue;
      }

      if (Array.isArray(child)) {
        for (const item of child) {
          if (item) {
            traverseStack.push(item);
          }
        }
      } else {
        traverseStack.push(child);
      }
    }
  }

  // Process collected nodes in reverse order to achieve bottom-up (post-order) traversal
  for (let i = postOrderNodes.length - 1; i >= 0; i--) {
    onExit(postOrderNodes[i]);
  }
}

/**
 * Transforms a JavaScript file using OXC and Magic-String to inline the request locale and translation.
 * @param code A string containing the JavaScript code to transform.
 * @param map A sourcemap object for the provided JavaScript code.
 * @param options The inline request options to use.
 * @param translation The translation messages to inline, or undefined for an untranslated locale.
 * @returns An object containing the code, map, and diagnostics from the transformation.
 */
async function transformWithOxc(
  code: string,
  map: SourceMapInput | undefined,
  options: InlineFileRequest,
  translation: Record<string, unknown> | undefined,
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

  walkAstPostOrder(program, (node) => {
    if (node.type === 'Literal') {
      if (typeof node.value === 'string' && node.value === '___NG_LOCALE_INSERT___') {
        magicString.overwrite(node.start, node.end, JSON.stringify(options.locale));
      }
    } else if (node.type === 'TaggedTemplateExpression') {
      if (node.tag.type === 'Identifier' && node.tag.name === '$localize') {
        const cooked = node.quasi.quasis.map((q) => q.value.cooked);
        const raw = node.quasi.quasis.map((q) => q.value.raw);
        const messageParts = Object.assign(cooked, { raw }) as unknown as TemplateStringsArray;

        const [translatedParts, translatedSubstitutions] = translate(
          diagnostics,
          translation || {},
          messageParts,
          node.quasi.expressions.map((_, index) => index),
          translation === undefined ? 'ignore' : missingTranslation,
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
    }
  });

  const outputCode = magicString.toString();
  let outputMap;
  if (map && magicString.hasChanged()) {
    // A decoded map is generated here rather than an encoded one because remapping decodes its
    // inputs. Encoding the mappings only for remapping to immediately decode them again doubles
    // the peak memory of the largest structure involved in inlining a file.
    const rawMap = magicString.generateDecodedMap({
      source: options.filename,
      includeContent: true,
      hires: 'boundary',
    });
    outputMap = remapping([{ ...rawMap, version: 3 } satisfies DecodedSourceMap, map], () => null);
  }

  return {
    code: outputCode,
    map: outputMap && JSON.stringify(outputMap),
    diagnostics,
  };
}
