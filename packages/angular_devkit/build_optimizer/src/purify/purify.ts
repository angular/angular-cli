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

// Insertion are meant to be used with Webpack's ReplaceSource.
export interface Insert {
  pos: number;
  content: string;
}

export function purifyReplacements(content: string) {

  const pureImportMatches = getMatches(content, importCommentRegex, 1)
    // Remove dots at the start of matches.
    // Older versions of Purify added dots for relative imports.
    .map(match => match.replace(/^\.+/, ''))
    .join('|');

  if (!pureImportMatches) {
    return [];
  }

  const inserts: Insert[] = [];

  /* Prefix safe imports with pure */
  const regex = new RegExp(
    `(_(${pureImportMatches})__(_default)? = )(__webpack_require__(\\.\\w)?\\(\\S+\\);)`,
    'mg',
  );

  let match;
  // tslint:disable-next-line:no-conditional-assignment
  while (match = regex.exec(content)) {
    inserts.push({
      pos: match.index + match[1].length,
      content: '/*@__PURE__*/',
    });
  }

  return inserts;
}

export function purify(content: string) {
  const rawSource = new RawSource(content);
  const replaceSource = new ReplaceSource(rawSource, 'file.js');

  const inserts = purifyReplacements(content);
  inserts.forEach((insert) => {
    replaceSource.insert(insert.pos, insert.content);
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
