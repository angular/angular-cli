export function clone(obj, seen?: any) {

    if (typeof obj !== 'object' ||
        obj === null) {

        return obj;
    }

    seen = seen || { orig: [], copy: [] };

    const lookup = seen.orig.indexOf(obj);
    if (lookup !== -1) {
        return seen.copy[lookup];
    }

    let newObj;
    let cloneDeep = false;

    if (!Array.isArray(obj)) {
        if (Buffer.isBuffer(obj)) {
            newObj = new Buffer(obj);
        } else if (obj instanceof Date) {
            newObj = new Date(obj.getTime());
        } else if (obj instanceof RegExp) {
            newObj = new RegExp(obj);
        } else {
            const proto = Object.getPrototypeOf(obj);
            if (proto &&
                proto.isImmutable) {

                newObj = obj;
            } else {
                newObj = Object.create(proto);
                cloneDeep = true;
            }
        }
    } else {
        newObj = [];
        cloneDeep = true;
    }

    seen.orig.push(obj);
    seen.copy.push(newObj);

    if (cloneDeep) {
        const keys = Object.getOwnPropertyNames(obj);
        for (let i = 0; i < keys.length; ++i) {
            const key = keys[i];
            const descriptor = Object.getOwnPropertyDescriptor(obj, key);
            if (descriptor &&
                (descriptor.get ||
                 descriptor.set)) {

                Object.defineProperty(newObj, key, descriptor);
            } else {
                newObj[key] = exports.clone(obj[key], seen);
            }
        }
    }

    return newObj;
}
export function stringify (...args) {
  try {
      return JSON.stringify.apply(null, args);
  } catch (err) {
      return '[Cannot display object: ' + err.message + ']';
  }
}

export function assert(condition, ...args) {

  if (condition) {
      return;
  }

  if (arguments.length === 2 && arguments[1] instanceof Error) {
      throw arguments[1];
  }

  let msgs = [];
  for (let i = 1; i < arguments.length; ++i) {
      if (arguments[i] !== '') {
          msgs.push(arguments[i]);            // Avoids Array.slice arguments leak, allowing for V8 optimizations
      }
  }

  msgs = msgs.map((msg) => {

    return typeof msg === 'string' ? msg : msg instanceof Error ? msg.message : stringify(msg);
  });

  throw new Error(msgs.join(' ') || 'Unknown error');
}


/*eslint-disable */
export function merge(target, source, isNullOverride /* = true */, isMergeArrays /* = true */) {
/*eslint-enable */

  assert(target && typeof target === 'object', 'Invalid target value: must be an object');
  assert(
    source === null ||
    source === undefined ||
    typeof source === 'object', 'Invalid source value: must be null, undefined, or an object');

  if (!source) {
      return target;
  }

  if (Array.isArray(source)) {
      assert(Array.isArray(target), 'Cannot merge array onto an object');
      if (isMergeArrays === false) {                                                  // isMergeArrays defaults to true
          target.length = 0;                                                          // Must not change target assignment
      }

      for (let i = 0; i < source.length; ++i) {
          target.push(clone(source[i]));
      }

      return target;
  }

  const keys = Object.keys(source);
  for (let i = 0; i < keys.length; ++i) {
      const key = keys[i];
      const value = source[key];
      if (value &&
          typeof value === 'object') {
          /* tslint:disable */
          if (!target[key] ||
              typeof target[key] !== 'object' ||
              (Array.isArray(target[key]) !== Array.isArray(value)) ||
              value instanceof Date ||
              Buffer.isBuffer(value) ||
              value instanceof RegExp) {
          /* tslint:enable */

              target[key] = clone(value);
          } else {
              merge(target[key], value, isNullOverride, isMergeArrays);
          }
      } else {
          if (value !== null &&
              value !== undefined) {                              // Explicit to preserve empty strings

              target[key] = value;
          } else if (isNullOverride !== false) {                    // Defaults to true
              target[key] = value;
          }
      }
  }

  return target;
}

export function applyToDefaults (defaults: any, options?: any, isNullOverride?: any) {
  assert(defaults && typeof defaults === 'object', 'Invalid defaults value: must be an object');
  assert(!options || options === true || typeof options === 'object', 'Invalid options value: must be true, falsy or an object');

  if (!options) {                                                 // If no options, return null
      return null;
  }

  const copy = clone(defaults);

  if (options === true) {                                         // If options is set to true, use defaults
      return copy;
  }

  return merge(copy, options, isNullOverride === true, false);
}
