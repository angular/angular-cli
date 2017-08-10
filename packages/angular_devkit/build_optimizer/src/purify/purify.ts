/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// This matches a comment left by the build-optimizer that contains pure import paths
const importCommentRegex = /\/\*\* PURE_IMPORTS_START (\S+) PURE_IMPORTS_END \*\//mg;

// TODO: handle sourcemaps
export function purify(content: string) {

  const pureImportMatches = getMatches(content, importCommentRegex, 1).join('|');

  const newContent = content
    /* Prefix safe imports with pure */
    .replace(new RegExp(`(_(${pureImportMatches})__ = )(__webpack_require__\\(\\S+\\);)`, 'mg'),
      '$1/*@__PURE__*/$3',
    )
    /* Prefix default safe imports with pure */
    .replace(
      new RegExp(
        `(_(${pureImportMatches})___default = )(__webpack_require__\\.\\w\\(\\S+\\);)`, 'mg',
      ),
      '$1/*@__PURE__*/$3',
    )
    /* Prefix CCF and CMF statements */
    .replace(
      /\w*__WEBPACK_IMPORTED_MODULE_\d+__angular_core__\["\w+" \/\* (ɵccf|ɵcmf|ɵcrt) \*\/\]\(/mg,
      '/*@__PURE__*/$&',
    )
    /* Prefix module statements */
    .replace(
      /new \w*__WEBPACK_IMPORTED_MODULE_\d+__angular_core__\["\w+" \/\* NgModuleFactory \*\/\]/mg,
      '/*@__PURE__*/$&',
    );

  return newContent;
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
