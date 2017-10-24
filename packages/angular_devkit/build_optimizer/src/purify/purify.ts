/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { RawSource, ReplaceSource } from 'webpack-sources';


// This matches a comment left by the build-optimizer that contains pure import paths
const importCommentRegex = /\/\*\* PURE_IMPORTS_START (\S+) PURE_IMPORTS_END \*\//mg;

// Replacements are meant to be used with Webpack's ReplaceSource.
export interface Replacement {
  start: number;
  end: number;
  content: string;
}

export function purifyReplacements(content: string) {

  const pureImportMatches = getMatches(content, importCommentRegex, 1).join('|');
  const replacements: Replacement[] = [];
  const addReplacement = (start: number, length: number, content: string) =>
    replacements.push({
      start,
      end: start + length - 1,
      content,
    });

  /* Prefix safe imports with pure */
  content.replace(
    new RegExp(`(_(${pureImportMatches})__ = )(__webpack_require__\\(\\S+\\);)`, 'mg'),
    (match, p1, _p2, p3, offset) => {
      const newContent = `${p1}/*@__PURE__*/${p3}`;
      addReplacement(offset, match.length, newContent);

      return newContent;
    },
  );

  /* Prefix default safe imports with pure */
  content.replace(
    new RegExp(
      `(_(${pureImportMatches})___default = )(__webpack_require__\\.\\w\\(\\S+\\);)`, 'mg',
    ),
    (match, p1, _p2, p3, offset) => {
      const newContent = `${p1}/*@__PURE__*/${p3}`;
      addReplacement(offset, match.length, newContent);

      return newContent;
    },
  );

  return replacements;
}

export function purify(content: string) {
  const rawSource = new RawSource(content);
  const replaceSource = new ReplaceSource(rawSource, 'file.js');

  const replacements = purifyReplacements(content);
  replacements.forEach((replacement) => {
    replaceSource.replace(replacement.start, replacement.end, replacement.content);
  });

  return replaceSource.source();
}

function getMatches(str: string, regex: RegExp, index: number) {
  let matches: string[] = [];
  let match;
  // tslint:disable-next-line:no-conditional-assignment
  while (match = regex.exec(str)) {
    matches = matches.concat(match[index].split(','));
  }

  return matches;
}
