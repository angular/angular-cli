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

export function arrayFlattenTree(children: any[], arr: any[]): any[] {
  for (let child of children) {
    arr.push(child.res);
    arrayFlattenTree(child.children, arr);
  }
  return arr
}

// TODO: use Angular's compiler
export function simpleTemplate(html: string, options?: any): string {
  var re = /\{\{([^\}\}]+)?\}\}/g;
  var reExp = /(^( )?(var|if|for|else|switch|case|break|{|}|;))(.*)?/g;
  var code = 'with(cmp) { var r=[];\n';
  var cursor = 0;
  var match;
  var result = '';

  function add(line, js?: any) {
    js ? (code += line.match(reExp) ? line + '\n' : 'r.push(' + line + ');\n') :
        (code += line != '' ? 'r.push("' + line.replace(/"/g, '\\"') + '");\n' : '');
    return add;
  }

  while((match = re.exec(html), match)) {
    add(html.slice(cursor, match.index))(match[1], true);
    cursor = match.index + match[0].length;
  }

  add(html.substr(cursor, html.length - cursor));
  code = (code + 'return r.join(""); }').replace(/[\r\t\n]/g, '');

  try {
    result = new Function('cmp', code).apply(options, [options]);
  } catch(err) {
    console.error("'" + err.message + "'", " in \n\nCode:\n", code, "\n");
  }
  return result;
}
