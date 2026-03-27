/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { isZonelessApp } from './utils';

describe('isZonelessApp', () => {
  it('should return true when polyfills is undefined', () => {
    expect(isZonelessApp(undefined)).toBeTrue();
  });

  it('should return true when polyfills is an empty array', () => {
    expect(isZonelessApp([])).toBeTrue();
  });

  it('should return false when polyfills contains "zone.js"', () => {
    expect(isZonelessApp(['zone.js'])).toBeFalse();
  });

  it('should return false when polyfills contains "zone.js" among other entries', () => {
    expect(isZonelessApp(['some-polyfill', 'zone.js'])).toBeFalse();
  });

  it('should return true when polyfills contains only non-zone.js package names', () => {
    expect(isZonelessApp(['some-polyfill'])).toBeTrue();
  });

  it('should return true when polyfills contains custom .ts files without zone.js', () => {
    expect(isZonelessApp(['./polyfill-buffer.ts'])).toBeTrue();
  });

  it('should return true when polyfills contains custom .js files without zone.js', () => {
    expect(isZonelessApp(['./custom-polyfill.js'])).toBeTrue();
  });

  it('should return true when polyfills contains custom .mjs files without zone.js', () => {
    expect(isZonelessApp(['./polyfill.mjs'])).toBeTrue();
  });

  it('should return true when polyfills contains a mix of file polyfills and package names without zone.js', () => {
    expect(isZonelessApp(['./polyfill-buffer.ts', 'some-polyfill', './other.js'])).toBeTrue();
  });

  it('should return false when polyfills contains file polyfills and zone.js', () => {
    expect(isZonelessApp(['./polyfill-buffer.ts', 'zone.js'])).toBeFalse();
  });
});
