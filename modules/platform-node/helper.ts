

// @internal
export function cssHyphenate(propertyName: string): string {
  return propertyName.replace(/([A-Z])/g, '-$1')
    .replace(/^ms-/, '-ms-') // Internet Explorer vendor prefix.
    .toLowerCase();
}


// Copied from @angular/core/facade/lang.ts
// @internal
export function isPresent(obj: any): boolean {
  return obj !== undefined && obj !== null;
}

// @internal
export function isString(str: any): boolean {
  return typeof str === 'string';
}

// @internal
export function isBlank(obj: any): boolean {
  return obj === undefined || obj === null;
}

// @internal
export function regExFirstMatch (regExp: RegExp, input: string): RegExpExecArray {
  regExp.lastIndex = 0;
  return regExp.exec(input);
}

// @internal
export function setValueOnPath(context: any, path: string, value: any) {
  var parts = path.split('.');
  var obj: any = context;
  while (parts.length > 1) {
    var name = parts.shift();
    if (obj.hasOwnProperty(name) && isPresent(obj[name])) {
      obj = obj[name];
    } else {
      obj = obj[name] = {};
    }
  }
  if (obj === undefined || obj === null) {
    obj = {};
  }
  obj[parts.shift()] = value;
}

// @internal
export class ListWrapper {
  static contains<T>(list: T[], el: T): boolean { return list.indexOf(el) !== -1; }
  static remove<T>(list: T[], el: T): boolean {
    var index = list.indexOf(el);
    if (index > -1) {
      list.splice(index, 1);
      return true;
    }
    return false;
  }
}

// @internal
export class StringMapWrapper {
  static create(): {[k: /*any*/ string]: any} {
    // Note: We are not using Object.create(null) here due to
    // performance!
    // http://jsperf.com/ng2-object-create-null
    return {};
  }
  static contains(map: {[key: string]: any}, key: string): boolean {
    return map.hasOwnProperty(key);
  }
  static get<V>(map: {[key: string]: V}, key: string): V {
    return map.hasOwnProperty(key) ? map[key] : undefined;
  }
  static set<V>(map: {[key: string]: V}, key: string, value: V) { map[key] = value; }

  static keys(map: {[key: string]: any}): string[] { return Object.keys(map); }
  static values<T>(map: {[key: string]: T}): T[] {
    return Object.keys(map).map((k: string): T => map[k]);
  }
  static isEmpty(map: {[key: string]: any}): boolean {
    for (var prop in map) {
      return false;
    }
    return true;
  }
  static delete (map: {[key: string]: any}, key: string) { delete map[key]; }
  static forEach<K, V>(map: {[key: string]: V}, callback: (v: V, K: string) => void) {
    for (let k of Object.keys(map)) {
      callback(map[k], k);
    }
  }

  static merge<V>(m1: {[key: string]: V}, m2: {[key: string]: V}): {[key: string]: V} {
    var m: {[key: string]: V} = {};

    for (let k of Object.keys(m1)) {
      m[k] = m1[k];
    }

    for (let k of Object.keys(m2)) {
      m[k] = m2[k];
    }

    return m;
  }

  static equals<V>(m1: {[key: string]: V}, m2: {[key: string]: V}): boolean {
    var k1 = Object.keys(m1);
    var k2 = Object.keys(m2);
    if (k1.length !== k2.length) {
      return false;
    }
    var key: any /** TODO #???? */;
    for (var i = 0; i < k1.length; i++) {
      key = k1[i];
      if (m1[key] !== m2[key]) {
        return false;
      }
    }
    return true;
  }
}


var CAMEL_CASE_REGEXP = /([A-Z])/g;
var DASH_CASE_REGEXP = /-([a-z])/g;

function replaceAllMapped(s: string, from: RegExp, cb: (m: string[]) => string): string {
  return s.replace(from, function(...matches: any[]) {
    // Remove offset & string from the result array
    matches.splice(-2, 2);
    // The callback receives match, p1, ..., pn
    return cb(matches);
  });
}

// @internal
export function camelCaseToDashCase(input: string): string {
  return replaceAllMapped(input, CAMEL_CASE_REGEXP, (m: any) => { return '-' + m[1].toLowerCase(); });
}

// @internal
export function dashCaseToCamelCase(input: string): string {
  return replaceAllMapped(input, DASH_CASE_REGEXP, (m: any) => { return m[1].toUpperCase(); });
}

// @internal
export function stringify(token: any): string {
  if (typeof token === 'string') {
    return token;
  }

  if (token === undefined || token === null) {
    return '' + token;
  }

  if (token.overriddenName) {
    return token.overriddenName;
  }
  if (token.name) {
    return token.name;
  }

  var res = token.toString();
  var newLineIndex = res.indexOf('\n');
  return (newLineIndex === -1) ? res : res.substring(0, newLineIndex);
}

// Copied from @angular/facade/src/collection.ts
// @internal
export const listContains = (list: any[], el: any): boolean => list.indexOf(el) !== -1;

// @internal
export function stringMapForEach(map: {[key: string]: any}, callback: (V, K) => void) {
  for (var prop in map) {
      if (map.hasOwnProperty(prop)) {
        callback(map[prop], prop);
      }
    }
}

// Copied from @angular/http/src/http_utils.ts
// @internal
export const isSuccess = ((status: number): boolean => (status >= 200 && status < 300));

// @internal
export function _randomChar() {
  return String.fromCharCode(97 + Math.floor(Math.random() * 25));
}

// @internal
export function _appIdRandomProviderFactory() {
  return `${_randomChar()}${_randomChar()}${_randomChar()}`;
}

// @internal
export function arrayFlattenTree(children: any[], arr: any[]): any[] {
  for (let child of children) {
    if (Array.isArray(child)) {
      arrayFlattenTree(child, arr);
    } else {
      arr.push(child);
    }
  }
  return arr;
}

var __empty = null;
export default __empty;
