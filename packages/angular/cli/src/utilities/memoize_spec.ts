/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { memoize } from './memoize';

describe('memoize', () => {
  class Dummy {
    @memoize
    get random(): number {
      return Math.random();
    }

    @memoize
    getRandom(_parameter?: unknown): number {
      return Math.random();
    }

    @memoize
    async getRandomAsync(): Promise<number> {
      return Math.random();
    }
  }

  it('should call method once', () => {
    const dummy = new Dummy();
    const val1 = dummy.getRandom();
    const val2 = dummy.getRandom();

    // Should return same value since memoized
    expect(val1).toBe(val2);
  });

  it('should call method once (async)', async () => {
    const dummy = new Dummy();
    const [val1, val2] = await Promise.all([dummy.getRandomAsync(), dummy.getRandomAsync()]);

    // Should return same value since memoized
    expect(val1).toBe(val2);
  });

  it('should call getter once', () => {
    const dummy = new Dummy();
    const val1 = dummy.random;
    const val2 = dummy.random;

    // Should return same value since memoized
    expect(val2).toBe(val1);
  });

  it('should call method when parameter changes', () => {
    const dummy = new Dummy();
    const val1 = dummy.getRandom(1);
    const val2 = dummy.getRandom(2);
    const val3 = dummy.getRandom(1);
    const val4 = dummy.getRandom(2);

    // Should return same value since memoized
    expect(val1).not.toBe(val2);
    expect(val1).toBe(val3);
    expect(val2).toBe(val4);
  });

  it('should error when used on non getters and methods', () => {
    const test = () => {
      class DummyError {
        @memoize
        set random(_value: number) {}
      }

      return new DummyError();
    };

    expect(test).toThrowError('Memoize decorator can only be used on methods or get accessors.');
  });

  describe('validate method arguments', () => {
    it('should error when using Map', () => {
      const test = () => new Dummy().getRandom(new Map());

      expect(test).toThrowError(/Argument \[object Map\] is JSON serializable./);
    });

    it('should error when using Symbol', () => {
      const test = () => new Dummy().getRandom(Symbol(''));

      expect(test).toThrowError(/Argument Symbol\(\) is JSON serializable/);
    });

    it('should error when using Function', () => {
      const test = () => new Dummy().getRandom(function () {});

      expect(test).toThrowError(/Argument function \(\) { } is JSON serializable/);
    });

    it('should error when using Map in an array', () => {
      const test = () => new Dummy().getRandom([new Map(), true]);

      expect(test).toThrowError(/Argument \[object Map\],true is JSON serializable/);
    });

    it('should error when using Map in an Object', () => {
      const test = () => new Dummy().getRandom({ foo: true, prop: new Map() });

      expect(test).toThrowError(/Argument \[object Object\] is JSON serializable/);
    });

    it('should error when using Function in an Object', () => {
      const test = () => new Dummy().getRandom({ foo: true, prop: function () {} });

      expect(test).toThrowError(/Argument \[object Object\] is JSON serializable/);
    });

    it('should not error when using primitive values in an array', () => {
      const test = () => new Dummy().getRandom([1, true, ['foo']]);

      expect(test).not.toThrow();
    });

    it('should not error when using primitive values in an Object', () => {
      const test = () => new Dummy().getRandom({ foo: true, prop: [1, true] });

      expect(test).not.toThrow();
    });

    it('should not error when using Boolean', () => {
      const test = () => new Dummy().getRandom(true);

      expect(test).not.toThrow();
    });

    it('should not error when using String', () => {
      const test = () => new Dummy().getRandom('foo');

      expect(test).not.toThrow();
    });

    it('should not error when using Number', () => {
      const test = () => new Dummy().getRandom(1);

      expect(test).not.toThrow();
    });

    it('should not error when using null', () => {
      const test = () => new Dummy().getRandom(null);

      expect(test).not.toThrow();
    });

    it('should not error when using undefined', () => {
      const test = () => new Dummy().getRandom(undefined);

      expect(test).not.toThrow();
    });
  });
});
