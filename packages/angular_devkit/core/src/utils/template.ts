/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// Matches <%= expr %>. This does not support structural JavaScript (for/if/...).
const kInterpolateRe = /<%=([\s\S]+?)%>/g;

// Used to match template delimiters.
// <%- expr %>: HTML escape the value.
// <% ... %>: Structural template code.
const kEscapeRe = /<%-([\s\S]+?)%>/g;
const kEvaluateRe = /<%([\s\S]+?)%>/g;

/** Used to map characters to HTML entities. */
const kHtmlEscapes: {[char: string]: string} = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '`': '&#96;',
};

// Used to match HTML entities and HTML characters.
const reUnescapedHtml = new RegExp(`[${Object.keys(kHtmlEscapes).join('')}]`, 'g');

// Options to pass to template.
export interface TemplateOptions {
  sourceURL?: string;
}


// Used to match empty string literals in compiled template source.
const reEmptyStringLeading = /\b__p \+= '';/g;
const reEmptyStringMiddle = /\b(__p \+=) '' \+/g;
const reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;


// Used to escape characters for inclusion in compiled string literals.
const stringEscapes: {[char: string]: string} = {
  '\\': '\\\\',
  "'": "\\'",
  '\n': '\\n',
  '\r': '\\r',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

// Used to match unescaped characters in compiled string literals.
const reUnescapedString = /['\n\r\u2028\u2029\\]/g;


/**
 * An equivalent of lodash templates, which is based on John Resig's `tmpl` implementation
 * (http://ejohn.org/blog/javascript-micro-templating/) and Laura Doktorova's doT.js
 * (https://github.com/olado/doT).
 *
 * This version differs from lodash by removing support from ES6 quasi-literals, and making the
 * code slightly simpler to follow. It also does not depend on any third party, which is nice.
 *
 * @param content
 * @param options
 * @return {any}
 */
export function template<T>(content: string, options?: TemplateOptions): (input: T) => string {
  const interpolate = kInterpolateRe;
  let isEvaluating;
  let index = 0;
  let source = `__p += '`;

  options = options || {};

  // Compile the regexp to match each delimiter.
  const reDelimiters = RegExp(
    `${kEscapeRe.source}|${interpolate.source}|${kEvaluateRe.source}|$`, 'g');

  // Use a sourceURL for easier debugging.
  const sourceURL = options.sourceURL ? '//# sourceURL=' + options.sourceURL + '\n' : '';

  content.replace(reDelimiters, (match, escapeValue, interpolateValue, evaluateValue, offset) => {
    // Escape characters that can't be included in string literals.
    source += content.slice(index, offset).replace(reUnescapedString, chr => stringEscapes[chr]);

    // Replace delimiters with snippets.
    if (escapeValue) {
      source += `' +\n__e(${escapeValue}) +\n  '`;
    }
    if (evaluateValue) {
      isEvaluating = true;
      source += `';\n${evaluateValue};\n__p += '`;
    }
    if (interpolateValue) {
      source += `' +\n((__t = (${interpolateValue})) == null ? '' : __t) +\n  '`;
    }
    index = offset + match.length;

    return match;
  });

  source += "';\n";

  // Cleanup code by stripping empty strings.
  source = (isEvaluating ? source.replace(reEmptyStringLeading, '') : source)
    .replace(reEmptyStringMiddle, '$1')
    .replace(reEmptyStringTrailing, '$1;');

  // Frame code as the function body.
  source = `
  return function(obj) {
    obj || (obj = {});
    let __t;
    let __p = '';

    const __escapes = ${JSON.stringify(kHtmlEscapes)};
    const __escapesre = new RegExp('${reUnescapedHtml.source.replace(/'/g, '\\\'')}', 'g');

    const __e = function(s) {
      return s ? s.replace(__escapesre, key => __escapes[key]) : '';
    };
    with (obj) {
      ${source.replace(/\n/g, '\n      ')}
    }
    return __p;
  };
  `;

  const fn = Function(sourceURL + source);
  const result = fn();

  // Provide the compiled function's source by its `toString` method or
  // the `source` property as a convenience for inlining compiled templates.
  result.source = source;

  return result;
}
