/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, Tree } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';

const toDrop: {[importName: string]: true} = {
  'core-js/es6/symbol': true,
  'core-js/es6/object': true,
  'core-js/es6/function': true,
  'core-js/es6/parse-int': true,
  'core-js/es6/parse-float': true,
  'core-js/es6/number': true,
  'core-js/es6/math': true,
  'core-js/es6/string': true,
  'core-js/es6/date': true,
  'core-js/es6/array': true,
  'core-js/es6/regexp': true,
  'core-js/es6/map': true,
  'zone.js/dist/zone': true,
  'core-js/es6/set': true,
};

const header = `/**
*/

/***************************************************************************************************
* BROWSER POLYFILLS
*/

/** IE9, IE10 and IE11 requires all of the following polyfills. **/
// import 'core-js/es6/weak-map';`;

const applicationPolyfillsHeader = 'APPLICATION IMPORTS';

export const dropES2015Polyfills = (): Rule => {
  return (tree: Tree) => {
    const path = '/polyfills.ts';
    const source = tree.read(path);
    if (!source) {
      return;
    }

    // Start the update of the file.
    const recorder = tree.beginUpdate(path);

    const sourceFile = ts.createSourceFile(path, source.toString(), ts.ScriptTarget.Latest, true);
    const imports = sourceFile.statements
        .filter(s => s.kind === ts.SyntaxKind.ImportDeclaration) as ts.ImportDeclaration[];

    const applicationPolyfillsStart = sourceFile.getText().indexOf(applicationPolyfillsHeader);

    if (imports.length === 0) { return; }

    for (const i of imports) {
      const module = ts.isStringLiteral(i.moduleSpecifier) && i.moduleSpecifier.text;
      // We do not want to remove imports which are after the "APPLICATION IMPORTS" header.
      if (module && toDrop[module] && applicationPolyfillsStart > i.getFullStart()) {
        recorder.remove(i.getFullStart(), i.getFullWidth());
      }
    }

    // We've removed the header since it's part of the JSDoc of the nodes we dropped
    // As part of the header, we also add the comment for importing WeakMap since
    // it's not part of the internal ES2015 polyfills we provide.
    if (sourceFile.getText().indexOf(header) < 0) {
      recorder.insertLeft(0, header);
    }

    tree.commitUpdate(recorder);
  };
};
