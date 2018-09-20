/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable:no-any
import { deepCopy } from './object';

describe('object', () => {
  describe('deepCopy', () => {
    it('works with empty', () => {
      const data = {};
      expect(deepCopy(data)).toEqual(data);
    });

    it('works with objects', () => {
      const data = { a: 1, b: { c: 'hello' } };
      expect(deepCopy(data)).toEqual(data);
    });

    it('works with null', () => {
      const data = null;
      expect(deepCopy(data)).toEqual(data);
    });

    it('works with number', () => {
      const data = 1;
      expect(deepCopy(data)).toEqual(data);
    });

    it('works with simple classes', () => {
      class Data {
        constructor(private _x = 1, protected _y = 2, public _z = 3) {}
      }
      const data = new Data();
      expect(deepCopy(data)).toEqual(data);
      expect(deepCopy(data) instanceof Data).toBe(true);
    });

    it('works with circular objects', () => {
      const data1 = { a: 1 } as any;
      const data = { b: data1 };
      data1['circular'] = data;

      const result = deepCopy(data) as any;
      expect(result.b.a).toBe(1);
      expect(result.b.circular.b.a).toBe(1);
      expect(result.b).not.toBe(data1);
      expect(result.b).toBe(result.b.circular.b);
    });
  });
});
