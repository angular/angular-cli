/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import { ActionList } from './action';


describe('Action', () => {
  describe('optimize', () => {
    it('works with create', () => {
      const actions = new ActionList;

      actions.create(normalize('/a/b'), new Buffer('1'));
      actions.create(normalize('/a/c'), new Buffer('2'));
      actions.create(normalize('/a/c'), new Buffer('3'));

      expect(actions.length).toBe(3);
      actions.optimize();
      expect(actions.length).toBe(2);
    });
    it('works with overwrite', () => {
      const actions = new ActionList;

      actions.create(normalize('/a/b'), new Buffer('1'));
      actions.create(normalize('/a/c'), new Buffer('2'));
      actions.overwrite(normalize('/a/c'), new Buffer('3'));
      actions.overwrite(normalize('/a/b'), new Buffer('4'));

      expect(actions.length).toBe(4);
      actions.optimize();
      expect(actions.length).toBe(2);
    });

    it('works with cloning a list', () => {
      const actions = new ActionList;

      actions.create(normalize('/a/b'), new Buffer('1'));
      actions.create(normalize('/a/c'), new Buffer('2'));
      actions.overwrite(normalize('/a/c'), new Buffer('3'));
      actions.overwrite(normalize('/a/b'), new Buffer('4'));
      actions.create(normalize('/a/d'), new Buffer('5'));

      const actions2 = new ActionList;
      actions.forEach(x => actions2.push(x));

      expect(actions.length).toBe(5);
      expect(actions2.length).toBe(5);
      actions.optimize();
      expect(actions.length).toBe(3);
      expect(actions2.length).toBe(5);
      actions2.optimize();
      expect(actions2.length).toBe(3);
    });

    it('handles edge cases (1)', () => {
      const actions = new ActionList;

      actions.create(normalize('/test'), new Buffer('1'));
      actions.overwrite(normalize('/test'), new Buffer('3'));
      actions.overwrite(normalize('/hello'), new Buffer('2'));
      actions.overwrite(normalize('/test'), new Buffer('4'));

      const actions2 = new ActionList;
      actions.forEach(x => actions2.push(x));

      expect(actions.length).toBe(4);
      expect(actions2.length).toBe(4);
      actions.optimize();
      expect(actions.length).toBe(2);
      expect(actions2.length).toBe(4);
      actions2.optimize();
      expect(actions2.length).toBe(2);
    });
  });
});
