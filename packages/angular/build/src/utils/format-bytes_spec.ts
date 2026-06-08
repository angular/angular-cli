/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { formatSize } from './format-bytes';

describe('formatSize', () => {
  it('1000 bytes to be 1kB', () => {
    expect(formatSize(1000)).toBe('1.00 kB');
  });

  it('1_000_000 bytes to be 1MB', () => {
    expect(formatSize(1_000_000)).toBe('1.00 MB');
  });

  it('1_500_000 bytes to be 1.5MB', () => {
    expect(formatSize(1_500_000)).toBe('1.50 MB');
  });

  it('1_000_000_000 bytes to be 1GB', () => {
    expect(formatSize(1_000_000_000)).toBe('1.00 GB');
  });
});
