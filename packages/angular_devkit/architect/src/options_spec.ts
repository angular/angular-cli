/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { mergeOptions } from './options';

describe('mergeOptions', () => {
  it('overwrites literal values', () => {
    expect(
      mergeOptions(
        {
          onlyBase: 'base',
          a: 'foo',
          b: 42,
          c: true,
        },
        {
          onlyOverride: 'override',
          a: 'bar',
          b: 43,
          c: false,
        },
      ),
    ).toEqual({
      onlyBase: 'base',
      a: 'bar',
      b: 43,
      c: false,
      onlyOverride: 'override',
    });
  });

  it('merges object values one layer deep', () => {
    expect(
      mergeOptions(
        {
          obj: {
            nested: {
              fromBase: true,
            },
            fromBase: true,
            overridden: false,
          },
        },
        {
          obj: {
            nested: {
              fromOverride: true,
            },
            overridden: true,
            fromOverride: true,
          },
        },
      ),
    ).toEqual({
      obj: {
        nested: {
          fromOverride: true,
        },
        fromBase: true,
        overridden: true,
        fromOverride: true,
      },
    });
  });
});
