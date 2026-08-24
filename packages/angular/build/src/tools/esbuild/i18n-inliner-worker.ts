/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import remapping, { type DecodedSourceMap, type SourceMapInput } from '@ampproject/remapping';
import type { ɵParsedTranslation } from '@angular/localize';
import type { Node } from '@oxc-project/types';
import { MagicString } from 'magic-string';
import { deserialize } from 'node:v8';
import { workerData } from 'node:worker_threads';
import { parseSync } from 'oxc-parser';
import { traversePostOrder } from '../oxc/traversal';
import { loadLocaleData } from './i18n-locale-plugin';
import { createSharedTranslationProxy } from './i18n-translation-reader';

/**
 * The options passed to the inliner for each code request
 */
export interface InlineCodeRequest {
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
   * process of the file. A SharedArrayBuffer or Blob is used so that the messages are shared with
   * the Worker by reference instead of being copied into it for every request.
   */
  translation?: Blob | SharedArrayBuffer;

  translationKey?: string;

  missingTranslation?: 'error' | 'warning' | 'ignore';
}

export interface InlineFileBatchLocaleEntry {
  translation?: Blob | SharedArrayBuffer;
  translationKey?: string;
}

/**
 * The options passed to the inliner for a batch file request
 */
export interface InlineFileBatchRequest {
  /**
   * The filename that should be processed.
   */
  filename: string;

  /**
   * The file content as a Blob.
   */
  code: Blob;

  /**
   * Optional sourcemap content as a Blob.
   */
  map?: Blob;

  /**
   * The locale specifiers and optional translations to use during the inlining process of the file.
   */
  locales: ReadonlyMap<string, InlineFileBatchLocaleEntry | Blob | SharedArrayBuffer | undefined>;

  /**
   * Whether the file data should be treated as ephemeral and not cached long-term in the Worker.
   * Typically true when all remaining locales for the file are processed in a single batch.
   */
  ephemeral?: boolean;

  /**
   * The list of active locales in the current inlining window. Any cached translation dictionaries
   * not present in this list will be evicted from the Worker's memory cache.
   */
  activeLocales?: string[];

  /**
   * The current inlining generation counter. When a request with a new generation is received,
   * all long-term worker caches are cleared.
   */
  generation?: number;

  missingTranslation?: 'error' | 'warning' | 'ignore';

  /**
   * Optional file contents Blob when dispatched via the shared worker pool.
   */
  fileBlob?: Blob;

  /**
   * Optional cache key uniquely identifying the file content and AST metadata.
   */
  fileKey?: string;

  /**
   * Optional sourcemap Blob for the file when dispatched via the shared worker pool.
   */
  mapBlob?: Blob;
}

export interface InlineDiagnosticMessage {
  type: 'error' | 'warning';
  message: string;
}

export interface InlineFileResult {
  file: string;
  code: string;
  map?: string;
  messages: InlineDiagnosticMessage[];
}

export interface InlineCodeResult {
  output: string;
  messages: InlineDiagnosticMessage[];
}

/**
 * The result for a single locale within a batch file request.
 */
export interface InlineLocaleResult {
  locale: string;
  code?: string;
  map?: string;
  messages: InlineDiagnosticMessage[];
}

/**
 * The response returned from a batch file request.
 */
export type InlineFileBatchResult =
  | {
      file: string;
      unmodified: true;
      messages: { type: 'error' | 'warning'; message: string }[];
    }
  | {
      file: string;
      unmodified?: false;
      results: InlineLocaleResult[];
    };
// Extract common options used for inline requests from the Worker context
const { missingTranslation = 'ignore' } = (workerData || {}) as {
  missingTranslation?: 'error' | 'warning' | 'ignore';
};

/**
 * Maximum number of AST metadata structures cached in memory per worker isolate.
 * Bounding capacity prevents unbounded memory growth across watch rebuilds.
 */
const MAX_CACHED_FILES = 256;

/**
 * Maximum number of deserialized translation dictionaries cached in memory per worker isolate.
 */
const MAX_CACHED_TRANSLATIONS = 32;

/**
 * Cached file data including code and extracted localization metadata.
 */
interface CachedFileData {
  code: string;
  metadata: FileLocalizeMetadata;
}

/**
 * Cache of file data promises keyed by `${filename}\0${hash}` or filename.
 */
const fileDataCache = new Map<string, Promise<CachedFileData>>();

/**
 * Deserialized translation message dictionary cache keyed by `${locale}\0${translationKey}` or locale.
 */
const deserializedTranslations = new Map<string, Promise<Record<string, ɵParsedTranslation>>>();

/**
 * The current inlining generation for this worker.
 */
let currentGeneration: number | undefined;

/**
 * Retrieves the code and extracted localization metadata for a file.
 * Caches the metadata promise in memory to avoid reparsing the AST across locales.
 * If `cache` is false (ephemeral), the result is not retained in `fileDataCache`,
 * allowing it to be garbage-collected once the batch request finishes.
 *
 * @param filename The name of the file.
 * @param codeBlob The source code file as a Blob.
 * @param fileKey Optional cache key uniquely identifying the file content.
 * @param cache Whether to cache the loaded file data in the Worker's long-term cache.
 * @returns The cached file data.
 */
function getFileData(
  filename: string,
  codeBlob: Blob,
  fileKey?: string,
  cache = true,
): Promise<CachedFileData> {
  const cacheKey = fileKey ?? filename;
  let dataPromise = fileDataCache.get(cacheKey);
  if (!dataPromise) {
    dataPromise = (async () => {
      const code = await codeBlob.text();

      return {
        code,
        metadata: extractLocalizeMetadata(filename, code),
      };
    })().catch((error) => {
      if (fileDataCache.get(cacheKey) === dataPromise) {
        fileDataCache.delete(cacheKey);
      }
      throw error;
    });

    if (cache) {
      if (fileDataCache.size >= MAX_CACHED_FILES) {
        const oldestKey = fileDataCache.keys().next().value;
        if (oldestKey !== undefined) {
          fileDataCache.delete(oldestKey);
        }
      }

      fileDataCache.set(cacheKey, dataPromise);
    }
  } else if (cache) {
    fileDataCache.delete(cacheKey);
    fileDataCache.set(cacheKey, dataPromise);
  } else {
    fileDataCache.delete(cacheKey);
  }

  return dataPromise;
}

/**
 * Deserializes or wraps the translation messages for a locale, reusing the result for any
 * subsequent request that targets the same locale and translation payload.
 *
 * @param request The translation request object containing locale, translation payload, and optional key.
 * @param explicitTranslation Optional fallback translation payload if request is a string.
 */
function loadTranslation(
  locale: string,
  translation?: Blob | SharedArrayBuffer,
  translationKey?: string,
): Promise<Record<string, ɵParsedTranslation>> | undefined {
  if (!translation) {
    return undefined;
  }

  const cacheKey = translationKey ? `${locale}\0${translationKey}` : undefined;
  let messagesPromise = cacheKey ? deserializedTranslations.get(cacheKey) : undefined;
  if (!messagesPromise) {
    if (translation instanceof Blob) {
      messagesPromise = translation
        .arrayBuffer()
        .then((buffer) => deserialize(new Uint8Array(buffer)) as Record<string, ɵParsedTranslation>)
        .catch((error) => {
          if (cacheKey && deserializedTranslations.get(cacheKey) === messagesPromise) {
            deserializedTranslations.delete(cacheKey);
          }
          throw error;
        });
    } else {
      messagesPromise = Promise.resolve(createSharedTranslationProxy(translation));
    }

    if (cacheKey) {
      if (deserializedTranslations.size >= MAX_CACHED_TRANSLATIONS) {
        const oldestKey = deserializedTranslations.keys().next().value;
        if (oldestKey !== undefined) {
          deserializedTranslations.delete(oldestKey);
        }
      }

      deserializedTranslations.set(cacheKey, messagesPromise);
    }
  } else if (cacheKey) {
    deserializedTranslations.delete(cacheKey);
    deserializedTranslations.set(cacheKey, messagesPromise);
  }

  return messagesPromise;
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
  if (request.generation !== undefined && request.generation !== currentGeneration) {
    currentGeneration = request.generation;
    fileDataCache.clear();
    deserializedTranslations.clear();
  }

  if (request.activeLocales) {
    const activeSet = new Set(request.activeLocales);
    for (const key of deserializedTranslations.keys()) {
      const keyLocale = key.includes('\0') ? key.split('\0', 1)[0] : key;
      if (!activeSet.has(keyLocale)) {
        deserializedTranslations.delete(key);
      }
    }
  }

  const codeBlob = request.code ?? request.fileBlob;
  if (!codeBlob) {
    throw new Error(`File content not provided for: ${request.filename}`);
  }

  const { code, metadata } = await getFileData(
    request.filename,
    codeBlob,
    request.fileKey,
    !request.ephemeral,
  );

  // Fast path: file has no $localize call sites or locale insert sites
  if (metadata.callSites.length === 0 && metadata.localeInsertSites.length === 0) {
    return {
      file: request.filename,
      unmodified: true,
      messages: (metadata.diagnostics ?? []).map((message) => ({
        type: 'error' as const,
        message,
      })),
    };
  }

  // Parse the sourcemap once for the entire batch if provided.
  // It will naturally be garbage-collected after this batch action returns.
  const rawMapBlob = request.map ?? request.mapBlob;
  let map: SourceMapInput | undefined;
  let rawMap: string | undefined;
  if (rawMapBlob) {
    rawMap = await rawMapBlob.text();
    map = rawMap ? (JSON.parse(rawMap) as SourceMapInput) : undefined;
  }

  const results = await Promise.all(
    Array.from(request.locales, async ([locale, entry]) => {
      const translation =
        entry && typeof entry === 'object' && 'translation' in entry
          ? entry.translation
          : (entry as Blob | SharedArrayBuffer | undefined);
      const translationKey =
        entry && typeof entry === 'object' && 'translationKey' in entry
          ? entry.translationKey
          : undefined;

      const result = await inlineLocalize(
        code,
        map,
        metadata,
        locale,
        await loadTranslation(locale, translation, translationKey),
        request.filename,
        request.missingTranslation ?? missingTranslation,
        rawMap,
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
 * @param request An InlineCodeRequest object representing the options for inlining
 * @returns An object containing the inlined code.
 */
export async function inlineCode(request: InlineCodeRequest): Promise<InlineCodeResult> {
  const metadata = extractLocalizeMetadata(request.filename, request.code);
  const result = await inlineLocalize(
    request.code,
    undefined,
    metadata,
    request.locale,
    await loadTranslation(request.locale, request.translation, request.translationKey),
    request.filename,
    request.missingTranslation ?? missingTranslation,
  );

  return {
    output: result.code ?? request.code,
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
 * Metadata for a `$localize` tagged template expression extracted from the AST.
 */
interface LocalizeCallSite {
  start: number;
  end: number;
  messageParts: TemplateStringsArray;
  expressions: { start: number; end: number }[];
  expressionIndexes: number[];
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

  traversePostOrder(program, (node) => {
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
          const expressionIndexes = expressions.map((_, index) => index);

          callSites.push({
            start: node.start,
            end: node.end,
            messageParts,
            expressions,
            expressionIndexes,
          });
        }
      }
    }
  });

  return { callSites, localeInsertSites, diagnostics };
}

/**
 * Escapes a template literal string part for insertion into an ES template literal (backticks).
 * Uses JSON.stringify for base escaping of control characters and backslashes, then unescapes
 * double quotes and escapes backticks and `${` expression delimiters in a single pass.
 */
function escapeTemplatePart(part: string): string {
  return JSON.stringify(part)
    .slice(1, -1)
    .replace(/\\"|`|\$\{/g, (match) => (match === '\\"' ? '"' : '\\' + match));
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
 * @param missingTranslation How to handle missing translations.
 * @returns The transformed code, optional remapped source map, and diagnostics.
 */
async function inlineLocalize(
  code: string,
  map: SourceMapInput | undefined,
  metadata: FileLocalizeMetadata,
  locale: string,
  translation: Record<string, ɵParsedTranslation> | undefined,
  filename: string,
  missingTranslation: 'error' | 'warning' | 'ignore',
  rawMap?: string,
) {
  const magicString = new MagicString(code);
  const { Diagnostics, translate } = await loadLocalizeTools();
  const diagnostics = new Diagnostics();

  if (metadata.diagnostics) {
    for (const message of metadata.diagnostics) {
      diagnostics.error(message);
    }
  }

  if (metadata.localeInsertSites.length > 0) {
    const localeData = await loadLocaleData(locale);
    if (localeData.error) {
      diagnostics.error(localeData.error);
    } else if (localeData.warning) {
      diagnostics.warn(localeData.warning);
    }
    let injected = false;
    for (const site of metadata.localeInsertSites) {
      magicString.overwrite(
        site.start,
        site.end,
        JSON.stringify(locale) + (localeData.code && !injected ? `;\n${localeData.code}\n;` : ''),
      );
      injected = true;
    }
  }

  for (const callSite of metadata.callSites) {
    const [translatedParts, translatedSubstitutions] = translate(
      diagnostics,
      translation || {},
      callSite.messageParts,
      callSite.expressionIndexes,
      translation === undefined ? 'ignore' : missingTranslation,
    );

    // Reconstruct the new template/string literal replacement
    let replacement: string;
    if (translatedSubstitutions.length === 0) {
      replacement = JSON.stringify(translatedParts[0]);
    } else {
      replacement = '`';
      for (let i = 0; i < translatedParts.length; i++) {
        replacement += escapeTemplatePart(translatedParts[i]);

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

  if (!magicString.hasChanged()) {
    return {
      code: undefined,
      map: undefined,
      diagnostics,
    };
  }

  const outputCode = magicString.toString();
  let outputMap: string | undefined;
  if (map) {
    // A decoded map is generated here rather than an encoded one because remapping decodes its
    // inputs. Encoding the mappings only for remapping to immediately decode them again doubles
    // the peak memory of the largest structure involved in inlining a file.
    const rawMap = magicString.generateDecodedMap({
      source: filename,
      includeContent: true,
      hires: 'boundary',
    });
    outputMap = JSON.stringify(
      remapping([{ ...rawMap, version: 3 } satisfies DecodedSourceMap, map], () => null),
    );
  }

  return {
    code: outputCode,
    map: outputMap,
    diagnostics,
  };
}
