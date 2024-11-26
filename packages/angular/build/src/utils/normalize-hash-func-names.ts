/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * @description checks parameter against hash names according to current OpenSSL
 *              and W3C acceptable integrity hashes
 * @param hashName hash to check
 * @returns true for valid hash names
 */
const hashIsValid = (hashName: string) => ['sha256', 'sha384', 'sha512'].includes(hashName);

export type AllowedSRIHash = 'sha256' | 'sha384' | 'sha512';

// Considered best practice as of this writing
export const DEFAULT_SRI_HASH: AllowedSRIHash = 'sha384';

/**
 * @description returns the strongest hash name from the given list
 * @param hashes list of string hash names
 * @returns string hash algorithm name
 */
export const getStrongestHash = (hashes: string[]): AllowedSRIHash => {
  const filteredHashes = hashes.filter(hashIsValid) as AllowedSRIHash[];
  const sortedHashes = [...filteredHashes].sort();
  const strongestHashName = sortedHashes.pop() ?? DEFAULT_SRI_HASH;

  return strongestHashName;
};

export const normalizeHashFuncNames = (hashFuncs?: string[]): AllowedSRIHash => {
  if (!hashFuncs || hashFuncs.length === 0) {
    return DEFAULT_SRI_HASH;
  }

  return getStrongestHash(hashFuncs);
};
