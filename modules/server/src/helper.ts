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

export function stringToBoolean(txt) {
  if (typeof txt !== 'string') { return txt; }
  switch (txt.toLowerCase()) {
    case'false': case'\'false\'': case'"false"': case'0': case'no': return false;
    case'true': case'\'true\'': case'"true"': case'1': case'yes': return true;
    default: return txt;
  }
}

export function queryParamsToBoolean(query) {
  var obj = {};
  for (let prop in query) {
    if (query.hasOwnProperty(prop)) {
      obj[prop] = stringToBoolean(query[prop]);
    }
  }
  return obj;
}


export function selectorRegExpFactory(selector: string): RegExp {
  /*
        $1       $2        $3
    <selector> content </selector>
  */

  let regExpSelector = `(<${ escapeRegExp(selector) }>)((?:.|\\n)*?)(<\/${ escapeRegExp(selector) }>)`;
  return new RegExp(regExpSelector);
}


export function relativeToAbsoluteUrl(relativeUrl: string): string {
  return baseUrl() + relativeUrl;
}

export function baseUrl(): string {
  var _server = require('../../../../index.js').Server;
  var _addr = _server.address();
  return `http://${ _addr.address }:${ _addr.port }`;
}
