/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { createHash } from 'node:crypto';

/**
 * Fixed RFC 4122 namespace UUID used to derive deterministic UUIDv5 build/Debug IDs.
 * Treated as 16 raw bytes when fed into the SHA-1 of `namespace || name`.
 *
 * The exact value is arbitrary but must remain stable across releases so that
 * the same source map content always yields the same Debug ID.
 */
const ANGULAR_BUILD_NAMESPACE = Buffer.from('6f9619ff8b86d011b42d00cf4fc964ff', 'hex');

/**
 * Generates a deterministic UUIDv5 (RFC 4122 §4.3) Debug ID from the given name bytes.
 *
 * Determinism is recommended by the ECMA-426 "Source Map Debug ID" proposal
 * (https://github.com/tc39/ecma426/blob/main/proposals/debug-id.md) so that the
 * produced artifacts are stable across builds with the same source content.
 *
 * @param name Bytes that uniquely identify the artifact (typically the source map content).
 * @returns A canonical UUIDv5 string (lowercase, hyphenated).
 */
export function generateDebugId(name: string | Uint8Array): string {
  const sha = createHash('sha1').update(ANGULAR_BUILD_NAMESPACE).update(name).digest();

  // Set version (5) in the high nibble of byte 6.
  sha[6] = (sha[6] & 0x0f) | 0x50;
  // Set RFC 4122 variant bits (10xx) in byte 8.
  sha[8] = (sha[8] & 0x3f) | 0x80;

  const h = sha.toString('hex');

  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** Pattern matching an existing `//# debugId=<uuid>` comment anywhere in the file. */
const DEBUG_ID_COMMENT = /^[ \t]*\/\/[ \t]*#[ \t]*debugId=[^\n]*\n?/m;

/** Pattern matching the `//# sourceMappingURL=` comment, used to position the debug-id line. */
const SOURCE_MAPPING_URL_COMMENT = /^[ \t]*\/\/[ \t]*#[ \t]*sourceMappingURL=[^\n]*$/m;

/**
 * Inserts (or replaces) a `//# debugId=<id>` comment in the given JavaScript text.
 *
 * Per ECMA-426, the comment must appear within the last 5 lines and SHOULD be
 * placed immediately above any `//# sourceMappingURL=` comment so that existing
 * tools that only consult the final line still find the source-map URL.
 */
export function injectDebugIdIntoJs(text: string, id: string): string {
  const comment = `//# debugId=${id}`;

  // Replace any existing debugId comment to keep the operation idempotent.
  if (DEBUG_ID_COMMENT.test(text)) {
    return text.replace(DEBUG_ID_COMMENT, `${comment}\n`);
  }

  if (SOURCE_MAPPING_URL_COMMENT.test(text)) {
    return text.replace(SOURCE_MAPPING_URL_COMMENT, (match) => `${comment}\n${match}`);
  }

  // No source map reference; append at the very end on its own line.
  return text.endsWith('\n') ? `${text}${comment}\n` : `${text}\n${comment}\n`;
}

/**
 * Sets the top-level `debugId` field on a JSON source map.
 *
 * Per ECMA-426, source maps embed the same Debug ID under a `debugId` key so
 * that consumers can pair a generated file with its source map without relying
 * on URL/path conventions.
 */
export function injectDebugIdIntoSourceMap(json: string, id: string): string {
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(json) as Record<string, unknown>;
  } catch {
    // Source map is malformed; do not corrupt it further.
    return json;
  }

  parsed['debugId'] = id;

  return JSON.stringify(parsed);
}
