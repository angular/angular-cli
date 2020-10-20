/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {extname, Path} from '@angular-devkit/core';
import {Rule} from '@angular-devkit/schematics';

const RE_INTERPOLATIONS: ReadonlyArray<[RegExp, string]> = [
  // Matching an interpolation:
  //
  // {{((?:[^}'"]|'[^']*?'|"[^"]*?")*?)}
  //        ^^^^^^                    match everything except a }, ", or '
  //               ^^^^^^^^ ^^^^^^^^  or any quoted string

  // Replace "{{expr}<!-- cmt -->}" with "{{ '{{' }} expr {{ '}}' }}".
  // The former is a little-known pattern previously used to display an
  // iterpolation literally, but that does not longer parse. The latter would
  // still parse.
  [
    /{{((?:'[^']*?'|"[^"]*?"|[^}'"])*?)}<!--.*-->}/g,
    //                                 ^^^^^^^^^^^ match a comment b/w braces
    `{{ '{{' }}$1{{ '}}' }}`
  ],

  // Replace "{{expr}" with "{{expr}}".
  [/{{((?:'[^']*?'|"[^"]*?"|[^}'"])*?)}(?!})/g, '{{$1}}'],
  //                                  ^^^^^^ match a singularly-terminated
  //                                         interpolation
];

export default function(): Rule {
  return (tree) => {
    tree.visit((path: Path) => {
      if (extname(path) !== '.html' && extname(path) !== '.ts') {
        return;
      }
      const contents = tree.read(path)?.toString();
      if (contents === undefined) {
        return;
      }

      if (extname(path) === '.html') {
        tree.overwrite(path, cleanupInterpolations(contents));
      } else {
        // TS file
        const templateRanges = getInlineTemplateRanges(contents);
        const fixedContents =
            templateRanges.reduceRight((content, [tStart, tEnd]) => {
              const template = content.substring(tStart, tEnd);
              return content.substring(0, tStart) +
                  cleanupInterpolations(template) + content.substring(tEnd);
            }, contents);
        tree.overwrite(path, fixedContents);
      }
    });
  };
}

function cleanupInterpolations(content: string): string {
  return RE_INTERPOLATIONS.reduce(
      (content, [reInterp, replacement]) =>
          content.replace(reInterp, replacement),
      content);
}

// If we are in a TypeScript file, we need to check for and fix contents in
// `template:` keys. Ideally we would do this by walking the TS AST, but we
// don't have a TypeScript dependency available.
//
// The returned ranges are guaranteed to be in increasing order.
function getInlineTemplateRanges(contents: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  let RE_TEMPLATE =
      /(template:[\s]*)("[^"\\]*(\\.[^"\\]*)*"|'[^'\\]*(\\.[^'\\]*)*?'|`[^`\\]*(\\.[^`\\]*)*`)/g;
  let match;
  while (match = RE_TEMPLATE.exec(contents)) {
    ranges.push([match.index, match.index + match[0].length]);
  }

  return ranges;
}
