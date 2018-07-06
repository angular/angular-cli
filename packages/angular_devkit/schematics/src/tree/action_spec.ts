/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { normalize } from '@angular-devkit/core';
import { Action, ActionList } from './action';

describe('Action', () => {
  describe('optimize', () => {
    it('works with create', () => {
      const actions = new ActionList;

      actions.create(normalize('/a/b'), Buffer.from('1'));
      actions.create(normalize('/a/c'), Buffer.from('2'));
      actions.create(normalize('/a/c'), Buffer.from('3'));

      expect(actions.length).toBe(3);
      actions.optimize();
      expect(actions.length).toBe(2);
    });
    it('works with overwrite', () => {
      const actions = new ActionList;

      actions.create(normalize('/a/b'), Buffer.from('1'));
      actions.create(normalize('/a/c'), Buffer.from('2'));
      actions.overwrite(normalize('/a/c'), Buffer.from('3'));
      actions.overwrite(normalize('/a/b'), Buffer.from('4'));

      expect(actions.length).toBe(4);
      actions.optimize();
      expect(actions.length).toBe(2);
    });

    it('works with cloning a list', () => {
      const actions = new ActionList;

      actions.create(normalize('/a/b'), Buffer.from('1'));
      actions.create(normalize('/a/c'), Buffer.from('2'));
      actions.overwrite(normalize('/a/c'), Buffer.from('3'));
      actions.overwrite(normalize('/a/b'), Buffer.from('4'));
      actions.create(normalize('/a/d'), Buffer.from('5'));

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

      actions.create(normalize('/test'), Buffer.from('1'));
      actions.overwrite(normalize('/test'), Buffer.from('3'));
      actions.overwrite(normalize('/hello'), Buffer.from('2'));
      actions.overwrite(normalize('/test'), Buffer.from('4'));

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

    it('handles edge cases (2)', () => {
      const actions = new ActionList;

      actions.create(normalize('/test'), Buffer.from('1'));
      actions.rename(normalize('/test'), normalize('/test1'));
      actions.overwrite(normalize('/test1'), Buffer.from('2'));
      actions.rename(normalize('/test1'), normalize('/test2'));

      actions.optimize();
      expect(actions.length).toBe(1);
      expect(actions.get(0)).toEqual(
        jasmine.objectContaining<Action>({ kind: 'c', path: normalize('/test2') }),
      );
    });

    it('handles edge cases (3)', () => {
      const actions = new ActionList;

      actions.rename(normalize('/test'), normalize('/test1'));
      actions.overwrite(normalize('/test1'), Buffer.from('2'));
      actions.rename(normalize('/test1'), normalize('/test2'));

      actions.optimize();
      expect(actions.length).toBe(2);
      expect(actions.get(0)).toEqual(jasmine.objectContaining<Action>({
        kind: 'r', path: normalize('/test'), to: normalize('/test2'),
      }));
      expect(actions.get(1)).toEqual(
        jasmine.objectContaining<Action>({kind: 'o', path: normalize('/test2') }),
      );
    });
  });
});
