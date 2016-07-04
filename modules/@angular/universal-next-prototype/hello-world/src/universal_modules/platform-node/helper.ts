import {OpaqueToken} from '@angular/core';
import {APP_BASE_HREF} from '@angular/common';

export const BASE_URL: OpaqueToken = APP_BASE_HREF;
export const ORIGIN_URL: OpaqueToken = new OpaqueToken('ORIGIN_URL');
export const REQUEST_URL: OpaqueToken = new OpaqueToken('REQUEST_URL');
export const PRIME_CACHE: OpaqueToken = new OpaqueToken('PRIME_CACHE');
export const COOKIE_KEY: OpaqueToken = new OpaqueToken('COOKIE_KEY');

export function cssHyphenate(propertyName: string): string {
  return propertyName.replace(/([A-Z])/g, '-$1')
    .replace(/^ms-/, '-ms-') // Internet Explorer vendor prefix.
    .toLowerCase();
}


// Copied from @angular/core/facade/lang.ts
export function isPresent(obj: any): boolean {
  return obj !== undefined && obj !== null;
}

export function isBlank(obj: any): boolean {
  return obj === undefined || obj === null;
}

export function regExFirstMatch (regExp: RegExp, input: string): RegExpExecArray {
  regExp.lastIndex = 0;
  return regExp.exec(input);
}

// Copied from @angular/facade/src/collection.ts
export const listContains = (list: any[], el: any): boolean => list.indexOf(el) !== -1;

export function stringMapForEach(map: {[key: string]: any}, callback: (V, K) => void) {
  for (var prop in map) {
      if (map.hasOwnProperty(prop)) {
        callback(map[prop], prop);
      }
    }
}

// Copied from @angular/http/src/http_utils.ts
export const isSuccess = ((status: number): boolean => (status >= 200 && status < 300));

export function _randomChar() {
  return String.fromCharCode(97 + Math.floor(Math.random() * 25));
}

export function _appIdRandomProviderFactory() {
  return `${_randomChar()}${_randomChar()}${_randomChar()}`;
}
