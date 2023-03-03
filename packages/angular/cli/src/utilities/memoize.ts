/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

/**
 * A decorator that memoizes methods and getters.
 *
 * **Note**: Be cautious where and how to use this decorator as the size of the cache will grow unbounded.
 *
 * @see https://en.wikipedia.org/wiki/Memoization
 */
export function memoize<This, Args extends unknown[], Return>(
  target: (this: This, ...args: Args) => Return,
  context: ClassMemberDecoratorContext,
) {
  if (context.kind !== 'method' && context.kind !== 'getter') {
    throw new Error('Memoize decorator can only be used on methods or get accessors.');
  }

  const cache = new Map<string, Return>();

  return function (this: This, ...args: Args): Return {
    for (const arg of args) {
      if (!isJSONSerializable(arg)) {
        throw new Error(
          `Argument ${isNonPrimitive(arg) ? arg.toString() : arg} is JSON serializable.`,
        );
      }
    }

    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key) as Return;
    }

    const result = target.apply(this, args);
    cache.set(key, result);

    return result;
  };
}

/** Method to check if value is a non primitive. */
function isNonPrimitive(value: unknown): value is object | Function | symbol {
  return (
    (value !== null && typeof value === 'object') ||
    typeof value === 'function' ||
    typeof value === 'symbol'
  );
}

/** Method to check if the values are JSON serializable */
function isJSONSerializable(value: unknown): boolean {
  if (!isNonPrimitive(value)) {
    // Can be seralized since it's a primitive.
    return true;
  }

  let nestedValues: unknown[] | undefined;
  if (Array.isArray(value)) {
    // It's an array, check each item.
    nestedValues = value;
  } else if (Object.prototype.toString.call(value) === '[object Object]') {
    // It's a plain object, check each value.
    nestedValues = Object.values(value);
  }

  if (!nestedValues || nestedValues.some((v) => !isJSONSerializable(v))) {
    return false;
  }

  return true;
}
