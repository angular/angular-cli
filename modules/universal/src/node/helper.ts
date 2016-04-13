import {DirectiveResolver} from 'angular2/core';
var directiveResolver: any = new DirectiveResolver();

export function serverDirectiveResolver(componentType: any): any {
  return directiveResolver.resolve(componentType);
}

export function selectorResolver(componentType: /*Type*/ any): string {
  return serverDirectiveResolver(componentType).selector;
}

export function escapeRegExp(str): string {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

export function stringify(obj, replacer = null, spaces = 2): string {
  return JSON.stringify(obj, replacer, spaces);
}

export function cssHyphenate(propertyName: string): string {
  return propertyName.replace(/([A-Z])/g, '-$1')
    .replace(/^ms-/, '-ms-') // Internet Explorer vendor prefix.
    .toLowerCase();
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

export function stringToBoolean(txt): boolean {
  if (typeof txt !== 'string') { return txt; }
  switch (txt.toLowerCase()) {
    case'false': case'\'false\'': case'"false"': case'0': case'no': return false;
    case'true': case'\'true\'': case'"true"': case'1': case'yes': return true;
    default: return txt;
  }
}

export function queryParamsToBoolean(query): any {
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
        $1       $2
    <selector> content </selector>
   /<([^\s\>]+)[^>]*>([\s\S]*?)<\/\1>/
  */

  let regExpSelect = `<${ escapeRegExp(selector) }[^>]*>([\\s\\S]*?)<\/${ escapeRegExp(selector) }>`;
  return new RegExp(regExpSelect);
}

export function arrayFlattenTree(children: any[], arr: any[]): any[] {
  for (let child of children) {
    arr.push(child.res);
    arrayFlattenTree(child.children, arr);
  }
  return arr;
}
