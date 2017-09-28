
/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import preventNameDuplication from './prevent-name-duplication';

describe('prevent name duplication', () => {
  it('should do nothing if suffix doesn\'t match', () => {
    const input = 'foo';
    const suffix = 'component';
    const expected = 'foo';
    expect(preventNameDuplication(input, suffix)).toEqual(expected);
  });

  it('should remove a duplicate name (dash delimiter)', () => {
    const input = 'foo-component';
    const suffix = 'component';
    const expected = 'foo';
    expect(preventNameDuplication(input, suffix)).toEqual(expected);
  });

  it('should remove a duplicate name (dot delimiter)', () => {
    const input = 'foo.component';
    const suffix = 'component';
    const expected = 'foo';
    expect(preventNameDuplication(input, suffix)).toEqual(expected);
  });

  it('should remove a duplicate name (camel case)', () => {
    const input = 'fooComponent';
    const suffix = 'component';
    const expected = 'foo';
    expect(preventNameDuplication(input, suffix)).toEqual(expected);
  });
});
