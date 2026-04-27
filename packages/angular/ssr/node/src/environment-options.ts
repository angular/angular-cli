/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Retrieves the list of allowed hosts from the environment variable `NG_ALLOWED_HOSTS`.
 * @returns An array of allowed hosts.
 */
export function getAllowedHostsFromEnv(): ReadonlyArray<string> | undefined {
  return getArrayFromEnv('NG_ALLOWED_HOSTS');
}

/**
 * Retrieves the list of trusted proxy headers from the environment variable `NG_TRUST_PROXY_HEADERS`.
 * @returns An array of trusted proxy headers.
 */
export function getTrustProxyHeadersFromEnv(): ReadonlyArray<string> | undefined {
  return getArrayFromEnv('NG_TRUST_PROXY_HEADERS');
}

function getArrayFromEnv(envName: string): ReadonlyArray<string> | undefined {
  const envValue = process.env[envName];
  if (!envValue) {
    return undefined;
  }

  const values: string[] = [];
  for (const value of envValue.split(',')) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      values.push(trimmed);
    }
  }

  return values;
}
