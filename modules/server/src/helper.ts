/// <reference path="../typings/tsd.d.ts" />

export function escapeRegExp(str): string {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

export function stringify(obj, replacer = null, spaces = 2): string {
  return JSON.stringify(obj, replacer, spaces);
}

export function showDebug(options = {}): string {
  var info = '\n';
  for (var prop in options) {
    if (prop && options[prop]) {
      info += '' +
      '<pre>' +
      `${ prop } = ${ stringify(options[prop]) }` +
      '</pre>';
    }
  }
  return info;
}


export function selectorRegExpFactory(selector: string): RegExp {
  /*
        $1       $2        $3
    <selector> content </selector>
  */

  let regExpSelector = `(<${ escapeRegExp(selector) }>)((?:.|\\n)*?)(<\/${ escapeRegExp(selector) }>)`;
  return new RegExp(regExpSelector);
}
