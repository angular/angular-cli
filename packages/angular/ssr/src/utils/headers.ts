/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Internal sentinel string representing a wildcard rule to trust all proxy headers.
 */
const TRUST_ALL_PROXY_HEADERS = '*';

/**
 * Extracts the first value from a multi-value header string.
 *
 * @param value - A string or an array of strings representing the header values.
 *                If it's a string, values are expected to be comma-separated.
 * @returns The first trimmed value from the multi-value header, or `undefined` if the input is invalid or empty.
 *
 * @example
 * ```typescript
 * getFirstHeaderValue("value1, value2, value3"); // "value1"
 * getFirstHeaderValue(["value1", "value2"]); // "value1"
 * getFirstHeaderValue(undefined); // undefined
 * ```
 */
export function getFirstHeaderValue(
  value: string | string[] | undefined | null,
): string | undefined {
  return value?.toString().split(',', 1)[0]?.trim();
}

/**
 * Checks if a specific proxy header is allowed.
 *
 * @param headerName - The name of the proxy header to check.
 * @param trustProxyHeaders - A set of allowed proxy headers.
 * @returns `true` if the header is allowed, `false` otherwise.
 */
export function isProxyHeaderAllowed(
  headerName: string,
  trustProxyHeaders: ReadonlySet<string>,
): boolean {
  return (
    trustProxyHeaders.has(TRUST_ALL_PROXY_HEADERS) ||
    trustProxyHeaders.has(headerName.toLowerCase())
  );
}

/**
 * Normalizes the `trustProxyHeaders` option to a consistent representation.
 * @param trustProxyHeaders The input `trustProxyHeaders` value.
 * @returns A `Set<string>` of normalized header names.
 */
export function normalizeTrustProxyHeaders(
  trustProxyHeaders: boolean | readonly string[] | undefined,
): ReadonlySet<string> {
  if (!trustProxyHeaders) {
    return new Set();
  }

  if (trustProxyHeaders === true) {
    return new Set([TRUST_ALL_PROXY_HEADERS]);
  }

  const normalizedTrustedProxyHeaders = new Set<string>();
  for (const header of trustProxyHeaders) {
    const lowerHeader = header.toLowerCase();
    if (lowerHeader === TRUST_ALL_PROXY_HEADERS) {
      throw new Error(
        `"${TRUST_ALL_PROXY_HEADERS}" is not allowed as a value for the "trustProxyHeaders" option.`,
      );
    }
    const isValid = lowerHeader === 'forwarded' || lowerHeader.startsWith('x-forwarded-');
    if (!isValid) {
      throw new Error(
        `"${header}" is not a valid proxy header. Trusted proxy headers must be "forwarded" or start with "x-forwarded-".`,
      );
    }
    normalizedTrustedProxyHeaders.add(lowerHeader);
  }

  return normalizedTrustedProxyHeaders;
}

/**
 * Parses the standard `Forwarded` header (RFC 7239).
 * It extracts the parameters from the first (leftmost) element in the header.
 *
 * @param headerValue - The value of the `Forwarded` header.
 * @returns A record of lowercase parameter names to their values.
 */
export function parseForwardedHeader(
  headerValue: string | null | undefined,
): Record<string, string> {
  if (!headerValue) {
    return {};
  }

  const params: Record<string, string> = {};
  let inQuotes = false;
  let escaped = false;
  let currentKey = '';
  let currentValue = '';
  let isParsingValue = false;
  let isKeyEnded = false;
  let isParsingValueEnded = false;

  for (const char of headerValue) {
    if (escaped) {
      escaped = false;
      if (isParsingValue) {
        currentValue += char;
      } else {
        currentKey += char;
      }
      continue;
    }

    if (char === '\\') {
      if (inQuotes) {
        escaped = true;
      } else if (isParsingValue) {
        currentValue += char;
      } else {
        currentKey += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (inQuotes) {
      if (isParsingValue) {
        currentValue += char;
      } else {
        currentKey += char;
      }
      continue;
    }

    if (char === ',') {
      addParam(currentKey, currentValue, isParsingValue, params);
      break;
    }

    if (char === ';') {
      addParam(currentKey, currentValue, isParsingValue, params);
      currentKey = '';
      currentValue = '';
      isParsingValue = false;
      isKeyEnded = false;
      isParsingValueEnded = false;
      continue;
    }

    if (char === '=') {
      if (!isParsingValue) {
        isParsingValue = true;
      } else {
        currentValue += char;
      }
      continue;
    }

    if (char === ' ' || char === '\t') {
      if (isParsingValue) {
        if (currentValue.length > 0) {
          isParsingValueEnded = true;
        }
      } else if (currentKey.length > 0) {
        isKeyEnded = true;
      }
      continue;
    }

    if (isParsingValue) {
      if (!isParsingValueEnded) {
        currentValue += char;
      }
    } else if (isKeyEnded) {
      currentKey = char;
      isKeyEnded = false;
    } else {
      currentKey += char;
    }
  }

  if (currentKey || currentValue || isParsingValue) {
    addParam(currentKey, currentValue, isParsingValue, params);
  }

  return params;
}

/**
 * Helper function to add a parameter to the params object.
 * @param key - The key to add.
 * @param value - The value to add.
 * @param hasValue - Whether the parameter has a value.
 * @param params - The params object to add the parameter to.
 */
function addParam(
  key: string,
  value: string,
  hasValue: boolean,
  params: Record<string, string>,
): void {
  if (!hasValue) {
    return;
  }

  const trimmedKey = key.trim().toLowerCase();
  if (trimmedKey) {
    params[trimmedKey] = value;
  }
}
