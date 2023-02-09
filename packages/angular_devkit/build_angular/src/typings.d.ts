/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

declare module '@babel/helper-annotate-as-pure' {
  export default function annotateAsPure(
    pathOrNode: import('@babel/types').Node | { node: import('@babel/types').Node },
  ): void;
}

declare module '@babel/helper-split-export-declaration' {
  export default function splitExportDeclaration(
    exportDeclaration: import('@babel/traverse').NodePath<
      import('@babel/types').ExportDefaultDeclaration
    >,
  ): void;
}
