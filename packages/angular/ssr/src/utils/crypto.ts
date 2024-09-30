/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * Generates a SHA-256 hash of the provided string.
 *
 * @param data - The input string to be hashed.
 * @returns A promise that resolves to the SHA-256 hash of the input,
 * represented as a hexadecimal string.
 */
export async function sha256(data: string): Promise<string> {
  if (typeof crypto === 'undefined') {
    // TODO(alanagius): remove once Node.js version 18 is no longer supported.
    throw new Error(
      `The global 'crypto' module is unavailable. ` +
        `If you are running on Node.js, please ensure you are using version 20 or later, ` +
        `which includes built-in support for the Web Crypto module.`,
    );
  }

  const encodedData = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encodedData);
  const hashParts: string[] = [];

  for (const h of new Uint8Array(hashBuffer)) {
    hashParts.push(h.toString(16).padStart(2, '0'));
  }

  return hashParts.join('');
}
