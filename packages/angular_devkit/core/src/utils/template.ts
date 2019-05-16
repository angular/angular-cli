/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Position, SourceNode } from 'source-map';

// Matches <%= expr %>. This does not support structural JavaScript (for/if/...).
const kInterpolateRe = /<%=([\s\S]+?)%>/g;
// Matches <%# text %>. It's a comment and will be entirely ignored.
const kCommentRe = /<%#([\s\S]+?)%>/g;

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
  sourceMap?: boolean;
  module?: boolean | { exports: {} };
  sourceRoot?: string;
  fileName?: string;
}


function _positionFor(content: string, offset: number): Position {
  let line = 1;
  let column = 0;
  for (let i = 0; i < offset - 1; i++) {
    if (content[i] == '\n') {
      line++;
      column = 0;
    } else {
      column++;
    }
  }

  return {
    line,
    column,
  };
}

/**
 * A simple AST for templates. There's only one level of AST nodes, but it's still useful
 * to have the information you're looking for.
 */
export interface TemplateAst {
  fileName: string;
  content: string;
  children: TemplateAstNode[];
}

/**
 * The base, which contains positions.
 */
export interface TemplateAstBase {
  start: Position;
  end: Position;
}

/**
 * A static content node.
 */
export interface TemplateAstContent extends TemplateAstBase {
  kind: 'content';
  content: string;
}

/**
 * A comment node.
 */
export interface TemplateAstComment extends TemplateAstBase {
  kind: 'comment';
  text: string;
}

/**
 * An evaluate node, which is the code between `<% ... %>`.
 */
export interface TemplateAstEvaluate extends TemplateAstBase {
  kind: 'evaluate';
  expression: string;
}

/**
 * An escape node, which is the code between `<%- ... %>`.
 */
export interface TemplateAstEscape extends TemplateAstBase {
  kind: 'escape';
  expression: string;
}

/**
 * An interpolation node, which is the code between `<%= ... %>`.
 */
export interface TemplateAstInterpolate extends TemplateAstBase {
  kind: 'interpolate';
  expression: string;
}

export type TemplateAstNode = TemplateAstContent
                            | TemplateAstEvaluate
                            | TemplateAstComment
                            | TemplateAstEscape
                            | TemplateAstInterpolate;

/**
 * Given a source text (and a fileName), returns a TemplateAst.
 */
export function templateParser(sourceText: string, fileName: string): TemplateAst {
  const children = [];

  // Compile the regexp to match each delimiter.
  const reExpressions = [kEscapeRe, kCommentRe, kInterpolateRe, kEvaluateRe];
  const reDelimiters = RegExp(reExpressions.map(x => x.source).join('|') + '|$', 'g');

  const parsed = sourceText.split(reDelimiters);
  let offset = 0;
  // Optimization that uses the fact that the end of a node is always the beginning of the next
  // node, so we keep the positioning of the nodes in memory.
  let start = _positionFor(sourceText, offset);
  let end: Position | null;

  const increment = reExpressions.length + 1;
  for (let i = 0; i < parsed.length; i += increment) {
    const [content, escape, comment, interpolate, evaluate] = parsed.slice(i, i + increment);
    if (content) {
      end = _positionFor(sourceText, offset + content.length);
      offset += content.length;
      children.push({ kind: 'content', content, start, end } as TemplateAstContent);
      start = end;
    }
    if (escape) {
      end = _positionFor(sourceText, offset + escape.length + 5);
      offset += escape.length + 5;
      children.push({ kind: 'escape', expression: escape, start, end } as TemplateAstEscape);
      start = end;
    }
    if (comment) {
      end = _positionFor(sourceText, offset + comment.length + 5);
      offset += comment.length + 5;
      children.push({ kind: 'comment', text: comment, start, end } as TemplateAstComment);
      start = end;
    }
    if (interpolate) {
      end = _positionFor(sourceText, offset + interpolate.length + 5);
      offset += interpolate.length + 5;
      children.push({
        kind: 'interpolate',
        expression: interpolate,
        start,
        end,
      } as TemplateAstInterpolate);
      start = end;
    }
    if (evaluate) {
      end = _positionFor(sourceText, offset + evaluate.length + 5);
      offset += evaluate.length + 5;
      children.push({ kind: 'evaluate', expression: evaluate, start, end } as TemplateAstEvaluate);
      start = end;
    }
  }

  return {
    fileName,
    content: sourceText,
    children,
  };
}

/**
 * Fastest implementation of the templating algorithm. It only add strings and does not bother
 * with source maps.
 */
function templateFast(ast: TemplateAst, options?: TemplateOptions): string {
  const module = options && options.module ? 'module.exports.default =' : '';
  const reHtmlEscape = reUnescapedHtml.source.replace(/[']/g, '\\\\\\\'');

  return `
    return ${module} function(obj) {
      obj || (obj = {});
      let __t;
      let __p = '';
      const __escapes = ${JSON.stringify(kHtmlEscapes)};
      const __escapesre = new RegExp('${reHtmlEscape}', 'g');

      const __e = function(s) {
        return s ? s.replace(__escapesre, function(key) { return __escapes[key]; }) : '';
      };
      with (obj) {
        ${ast.children.map(node => {
            switch (node.kind) {
              case 'content':
                return `__p += ${JSON.stringify(node.content)};`;
              case 'interpolate':
                return `__p += ((__t = (${node.expression})) == null) ? '' : __t;`;
              case 'escape':
                return `__p += __e(${node.expression});`;
              case 'evaluate':
                return node.expression;
            }
          }).join('\n')
        }
      }

      return __p;
    };
  `;
}

/**
 * Templating algorithm with source map support. The map is outputted as //# sourceMapUrl=...
 */
function templateWithSourceMap(ast: TemplateAst, options?: TemplateOptions): string {
  const sourceUrl = ast.fileName;
  const module = options && options.module ? 'module.exports.default =' : '';
  const reHtmlEscape = reUnescapedHtml.source.replace(/[']/g, '\\\\\\\'');

  const preamble = (new SourceNode(1, 0, sourceUrl, ''))
    .add(new SourceNode(1, 0, sourceUrl, [
      `return ${module} function(obj) {\n`,
      '  obj || (obj = {});\n',
      '  let __t;\n',
      '  let __p = "";\n',
      `  const __escapes = ${JSON.stringify(kHtmlEscapes)};\n`,
      `  const __escapesre = new RegExp('${reHtmlEscape}', 'g');\n`,
      `\n`,
      `  const __e = function(s) { `,
      `    return s ? s.replace(__escapesre, function(key) { return __escapes[key]; }) : '';`,
      `  };\n`,
      `  with (obj) {\n`,
    ]));

  const end = ast.children.length
    ? ast.children[ast.children.length - 1].end
    : { line: 0, column: 0 };
  const nodes = ast.children.reduce((chunk, node) => {
    let code: string | SourceNode | (SourceNode | string)[] = '';
    switch (node.kind) {
      case 'content':
        code = [
          new SourceNode(node.start.line, node.start.column, sourceUrl, '__p = __p'),
          ...node.content.split('\n').map((line, i, arr) => {
            return new SourceNode(
              node.start.line + i,
              i == 0 ? node.start.column : 0,
              sourceUrl,
              '\n    + '
              + JSON.stringify(line + (i == arr.length - 1 ? '' : '\n')),
            );
          }),
          new SourceNode(node.end.line, node.end.column, sourceUrl, ';\n'),
        ];
        break;
      case 'interpolate':
        code = [
          new SourceNode(node.start.line, node.start.column, sourceUrl, '__p += ((__t = '),
          ...node.expression.split('\n').map((line, i, arr) => {
            return new SourceNode(
              node.start.line + i,
              i == 0 ? node.start.column : 0,
              sourceUrl,
              line + ((i == arr.length - 1) ? '' : '\n'),
            );
          }),
          new SourceNode(node.end.line, node.end.column, sourceUrl, ') == null ? "" : __t);\n'),
        ];
        break;
      case 'escape':
        code = [
          new SourceNode(node.start.line, node.start.column, sourceUrl, '__p += __e('),
          ...node.expression.split('\n').map((line, i, arr) => {
            return new SourceNode(
              node.start.line + i,
              i == 0 ? node.start.column : 0,
              sourceUrl,
              line + ((i == arr.length - 1) ? '' : '\n'),
            );
          }),
          new SourceNode(node.end.line, node.end.column, sourceUrl, ');\n'),
        ];
        break;
      case 'evaluate':
        code = [
          ...node.expression.split('\n').map((line, i, arr) => {
            return new SourceNode(
              node.start.line + i,
              i == 0 ? node.start.column : 0,
              sourceUrl,
              line + ((i == arr.length - 1) ? '' : '\n'),
            );
          }),
          new SourceNode(node.end.line, node.end.column, sourceUrl, '\n'),
        ];
        break;
    }

    return chunk.add(new SourceNode(node.start.line, node.start.column, sourceUrl, code));
  }, preamble)
  .add(new SourceNode(end.line, end.column, sourceUrl, [
    '  };\n',
    '\n',
    '  return __p;\n',
    '}\n',
  ]));

  const code = nodes.toStringWithSourceMap({
    file: sourceUrl,
    sourceRoot: options && options.sourceRoot || '.',
  });

  // Set the source content in the source map, otherwise the sourceUrl is not enough
  // to find the content.
  code.map.setSourceContent(sourceUrl, ast.content);

  return code.code
       + '\n//# sourceMappingURL=data:application/json;base64,'
       + Buffer.from(code.map.toString()).toString('base64');
}


/**
 * An equivalent of EJS templates, which is based on John Resig's `tmpl` implementation
 * (http://ejohn.org/blog/javascript-micro-templating/) and Laura Doktorova's doT.js
 * (https://github.com/olado/doT).
 *
 * This version differs from lodash by removing support from ES6 quasi-literals, and making the
 * code slightly simpler to follow. It also does not depend on any third party, which is nice.
 *
 * Finally, it supports SourceMap, if you ever need to debug, which is super nice.
 *
 * @param content The template content.
 * @param options Optional Options. See TemplateOptions for more description.
 * @return {(input: T) => string} A function that accept an input object and returns the content
 *         of the template with the input applied.
 */
export function template<T>(content: string, options?: TemplateOptions): (input: T) => string {
  const sourceUrl = options && options.sourceURL || 'ejs';
  const ast = templateParser(content, sourceUrl);

  let source: string;
  // If there's no need for source map support, we revert back to the fast implementation.
  if (options && options.sourceMap) {
    source = templateWithSourceMap(ast, options);
  } else {
    source = templateFast(ast, options);
  }

  // We pass a dummy module in case the module option is passed. If `module: true` is passed, we
  // need to only use the source, not the function itself. Otherwise expect a module object to be
  // passed, and we use that one.
  const fn = Function('module', source);
  const module = options && options.module
               ? (options.module === true ? { exports: {} } : options.module)
               : null;
  const result = fn(module);

  // Provide the compiled function's source by its `toString` method or
  // the `source` property as a convenience for inlining compiled templates.
  result.source = source;

  return result;
}
