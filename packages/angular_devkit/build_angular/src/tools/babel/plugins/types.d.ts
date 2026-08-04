/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

declare module 'istanbul-lib-instrument' {
  export interface Visitor {
    enter(path: import('@babel/core').NodePath<types.Program>): void;
    exit(path: import('@babel/core').NodePath<types.Program>): void;
  }

  export function programVisitor(
    types: typeof import('@babel/core').types,
    filePath?: string,
    options?: { inputSourceMap?: object | null },
  ): Visitor;
}

declare module '@babel/helper-annotate-as-pure' {
  export default function annotateAsPure(
    pathOrNode: import('@babel/types').Node | { node: import('@babel/types').Node },
  ): void;
}

declare module '@babel/helper-split-export-declaration' {
  export default function splitExportDeclaration(
    exportDeclaration: import('@babel/core').NodePath<
      import('@babel/types').ExportDefaultDeclaration
    >,
  ): void;
}
