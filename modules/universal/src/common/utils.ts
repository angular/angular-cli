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
export const isSuccess = (status: number): boolean => (status >= 200 && status < 300);
