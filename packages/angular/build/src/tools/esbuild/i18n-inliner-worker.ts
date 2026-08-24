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

/**
 * The options passed to the inliner for a batch file request
 */
interface InlineFileBatchRequest {
  /**
   * The filename that should be processed. The data for the file is provided to the Worker
   * during Worker initialization.
   */
  filename: string;

  /**
   * The locale specifiers or locale objects that should be used during the inlining process of the file.
   */
  locales: (string | { locale: string; translation?: Blob })[];
}

/**
 * The result for a single locale within a batch file request.
 */
interface InlineLocaleResult {
  locale: string;
  code: string;
  map?: string;
  messages: { type: 'error' | 'warning'; message: string }[];
}

/**
 * The response returned from a batch file request.
 */
interface InlineFileBatchResult {
  file: string;
  results: InlineLocaleResult[];
}

// Extract the application files and common options used for inline requests from the Worker context
const { files, missingTranslation, translations } = (workerData || {}) as {
  files: ReadonlyMap<string, Blob>;
  missingTranslation: 'error' | 'warning' | 'ignore';
  translations?: ReadonlyMap<string, Blob>;
};

/**
 * Cached file data including code and extracted localization metadata.
 */
interface CachedFileData {
  code: string;
  metadata: FileLocalizeMetadata;
}

/**
 * Cache of file data promises keyed by filename.
 */
const fileDataCache = new Map<string, Promise<CachedFileData>>();

/**
 * Cache of deserialized translation messages keyed by locale.
 */
const deserializedTranslations = new Map<string, Promise<Record<string, unknown>>>();

/**
 * Retrieves the cached file data for a filename, loading and extracting it on the first request.
 *
 * @param filename The name of the file to load.
 * @returns The cached code and localization metadata.
 */
function getFileData(filename: string): Promise<CachedFileData> {
  let fileDataPromise = fileDataCache.get(filename);
  if (!fileDataPromise) {
    fileDataPromise = (async () => {
      const data = files.get(filename);
      assert(data !== undefined, `Invalid inline request for file '${filename}'.`);

      const code = await data.text();
      const metadata = extractLocalizeMetadata(filename, code);

      return { code, metadata };
    })();
    fileDataCache.set(filename, fileDataPromise);
  }

  return fileDataPromise;
}

/**
 * Deserializes the translation messages for a locale, reusing the result for any
 * subsequent request that targets the same locale.
 * @param locale The locale identifier.
 * @param translation Optional serialized translation messages. If omitted, workerData.translations is used.
 * @returns The translation messages, or undefined if the locale has no translations.
 */
function loadTranslation(
  locale: string,
  translation?: Blob,
): Promise<Record<string, unknown>> | undefined {
  const translationBlob = translation ?? translations?.get(locale);
  if (!translationBlob) {
    return undefined;
  }

  let messagesPromise = deserializedTranslations.get(locale);
  if (!messagesPromise) {
    messagesPromise = translationBlob
      .arrayBuffer()
      .then((buffer) => deserialize(new Uint8Array(buffer)) as Record<string, unknown>)
      .catch((error) => {
        deserializedTranslations.delete(locale);
        throw error;
      });
    deserializedTranslations.set(locale, messagesPromise);
  }

  return messagesPromise;
}

/**
 * Inlines the provided locale and translation into a JavaScript file that contains `$localize` usage.
 * This function is the main entry for the Worker's action that is called by the worker pool.
 *
 * @param request An InlineRequest object representing the options for inlining
 * @returns An object containing the inlined file and optional map content.
 */
export default async function inlineFile(request: InlineFileRequest) {
  const { code, metadata } = await getFileData(request.filename);

  // Sourcemaps are parsed on demand per request rather than cached long-term to prevent
  // monotonic memory growth as a worker processes multiple files across the build.
  const rawMap = await files.get(request.filename + '.map')?.text();
  const map = rawMap ? (JSON.parse(rawMap) as SourceMapInput) : undefined;

  const result = await inlineLocalize(
    code,
    map,
    metadata,
    request.locale,
    await loadTranslation(request.locale, request.translation),
    request.filename,
  );

  return {
    file: request.filename,
    code: result.code,
    map: result.map,
    messages: result.diagnostics.messages,
  };
}

/**
 * Inlines multiple locales and translations into a JavaScript file that contains `$localize` usage.
 *
 * @param request An InlineFileBatchRequest object representing the options for inlining.
 * @returns An object containing the inlined results for each requested locale.
 */
export async function inlineFileBatch(
  request: InlineFileBatchRequest,
): Promise<InlineFileBatchResult> {
  const { code, metadata } = await getFileData(request.filename);

  // Parse the sourcemap once for the entire batch.
  // It will naturally be garbage-collected after this batch action returns.
  const rawMap = await files.get(request.filename + '.map')?.text();
  const map = rawMap ? (JSON.parse(rawMap) as SourceMapInput) : undefined;

  const results = await Promise.all(
    request.locales.map(async (entry) => {
      const locale = typeof entry === 'string' ? entry : entry.locale;
      const translation = typeof entry === 'string' ? undefined : entry.translation;
      const result = await inlineLocalize(
        code,
        map,
        metadata,
        locale,
        await loadTranslation(locale, translation),
        request.filename,
      );

      return {
        locale,
        code: result.code,
        map: result.map,
        messages: result.diagnostics.messages,
      };
    }),
  );

  return {
    file: request.filename,
    results,
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
  const metadata = extractLocalizeMetadata(request.filename, request.code);
  const result = await inlineLocalize(
    request.code,
    undefined,
    metadata,
    request.locale,
    await loadTranslation(request.locale, request.translation),
    request.filename,
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
 * Metadata for a `$localize` tagged template expression extracted from the AST.
 */
interface LocalizeCallSite {
  start: number;
  end: number;
  messageParts: TemplateStringsArray;
  expressions: { start: number; end: number }[];
}

/**
 * Metadata extracted from a JavaScript file AST needed for localization inlining.
 */
interface FileLocalizeMetadata {
  callSites: LocalizeCallSite[];
  localeInsertSites: { start: number; end: number }[];
  diagnostics?: string[];
}

/**
 * Extracts localization call sites and locale insertion points from JavaScript code using OXC.
 *
 * @param filename The name of the file being processed.
 * @param code The JavaScript source code.
 * @returns The extracted localization metadata.
 */
function extractLocalizeMetadata(filename: string, code: string): FileLocalizeMetadata {
  const { program } = parseSync(filename, code, {
    sourceType: 'unambiguous',
  });

  if (!program) {
    throw new Error(`Unknown error occurred parsing file "${filename}" with OXC.`);
  }

  const callSites: LocalizeCallSite[] = [];
  const localeInsertSites: { start: number; end: number }[] = [];
  let diagnostics: string[] | undefined;

  walkAstPostOrder(program, (node) => {
    if (node.type === 'Literal') {
      if (typeof node.value === 'string' && node.value === '___NG_LOCALE_INSERT___') {
        localeInsertSites.push({ start: node.start, end: node.end });
      }
    } else if (node.type === 'TaggedTemplateExpression') {
      if (node.tag.type === 'Identifier' && node.tag.name === '$localize') {
        const cooked: string[] = [];
        const raw: string[] = [];
        let hasMalformedEscape = false;

        for (const q of node.quasi.quasis) {
          if (q.value.cooked === null || q.value.cooked === undefined) {
            hasMalformedEscape = true;
            (diagnostics ??= []).push(
              `Malformed escape sequence in $localize template literal in file "${filename}".`,
            );
            break;
          }
          cooked.push(q.value.cooked);
          raw.push(q.value.raw);
        }

        if (!hasMalformedEscape) {
          const messageParts = Object.assign(cooked, { raw });
          const expressions = node.quasi.expressions.map((expr) => ({
            start: expr.start,
            end: expr.end,
          }));

          callSites.push({
            start: node.start,
            end: node.end,
            messageParts,
            expressions,
          });
        }
      }
    }
  });

  return { callSites, localeInsertSites, diagnostics };
}

/**
 * Inlines translations into code using previously extracted localization metadata.
 *
 * @param code The source code to transform.
 * @param map Optional source map for the source code.
 * @param metadata Extracted localization metadata.
 * @param locale The target locale identifier.
 * @param translation The translation messages dictionary, or undefined for untranslated locale.
 * @param filename The name of the file being transformed.
 * @returns The transformed code, optional remapped source map, and diagnostics.
 */
async function inlineLocalize(
  code: string,
  map: SourceMapInput | undefined,
  metadata: FileLocalizeMetadata,
  locale: string,
  translation: Record<string, unknown> | undefined,
  filename: string,
) {
  const magicString = new MagicString(code);
  const { Diagnostics, translate } = await loadLocalizeTools();
  const diagnostics = new Diagnostics();

  if (metadata.diagnostics) {
    for (const message of metadata.diagnostics) {
      diagnostics.error(message);
    }
  }

  for (const site of metadata.localeInsertSites) {
    magicString.overwrite(site.start, site.end, JSON.stringify(locale));
  }

  for (const callSite of metadata.callSites) {
    const [translatedParts, translatedSubstitutions] = translate(
      diagnostics,
      translation || {},
      callSite.messageParts,
      callSite.expressions.map((_, index) => index),
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
          const expr = callSite.expressions[originalIndex];
          const exprCode = magicString.slice(expr.start, expr.end);
          replacement += '${' + exprCode + '}';
        }
      }
      replacement += '`';
    }

    magicString.overwrite(callSite.start, callSite.end, replacement);
  }

  const outputCode = magicString.toString();
  let outputMap;
  if (map && magicString.hasChanged()) {
    // A decoded map is generated here rather than an encoded one because remapping decodes its
    // inputs. Encoding the mappings only for remapping to immediately decode them again doubles
    // the peak memory of the largest structure involved in inlining a file.
    const rawMap = magicString.generateDecodedMap({
      source: filename,
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
