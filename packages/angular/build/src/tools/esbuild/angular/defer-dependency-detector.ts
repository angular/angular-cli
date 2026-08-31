/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';

/**
 * A single `@defer`-generated dependency import found in a file, e.g. the
 * `import("some-lib").then(m => m.SomeComponent)` inside a defer block's
 * resolver function.
 */
export interface DeferDependencyImportMatch {
  /** Start offset of the import()'s argument list, e.g. right after `import(`. */
  start: number;

  /** End offset of the import()'s argument list, e.g. right before `)`. */
  end: number;

  /** The module specifier as written by the user, e.g. `'some-lib'`. */
  specifier: string;

  /** The exported symbol being read off the resolved module, e.g. `SomeComponent` or `default`. */
  symbol: string;
}

/**
 * Looks for `@defer`-generated dependency imports in a file - the code
 * Angular writes when a component is only used inside a `@defer` block,
 * which looks like this:
 *
 *   import("some-lib").then(m => m.SomeComponent)
 *
 * This is just pattern matching against what `@angular/compiler` happens
 * to produce today (see `compileDeferResolverFunction` if you want to look
 * at the source). The compiler has never promised this exact shape will
 * stay the same, so this logic is kept in its own file on purpose: if the
 * compiler team ever gives us something more reliable to look for (a real
 * marker, say), we should only need to change this one file.
 *
 * Why we think this match is safe enough to use:
 * - It's rare for hand-written code to look like this. The closest
 *   real-world example is a Router `loadComponent`/`loadChildren` route,
 *   but those almost always use a relative path like `./foo`, so we skip
 *   anything that isn't a plain package name.
 * - We also require a `@ts-ignore` comment right above the import. The
 *   compiler does use `@ts-ignore` in a few unrelated places too, but
 *   never on this exact shape - so requiring both the shape *and* the
 *   comment together is a pretty strong signal.
 *
 * Still, this is a guess, not a guarantee. See the PR description for the
 * question we're asking the compiler team about this.
 */
export function findDeferDependencyImports(
  code: string,
  fileName: string,
): DeferDependencyImportMatch[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    code,
    ts.ScriptTarget.ES2022,
    /* setParentNodes */ true,
    ts.ScriptKind.JS,
  );

  const matches: DeferDependencyImportMatch[] = [];

  // TypeScript actually has a built-in helper for this, `ts.isImportCall`,
  // but it's not part of the public types for the TypeScript version this
  // repo uses right now. So we just check the node type by hand instead.
  function isDynamicImportCall(node: ts.CallExpression): boolean {
    return node.expression.kind === ts.SyntaxKind.ImportKeyword;
  }

  function hasNearbyTsIgnore(node: ts.Node): boolean {
    // Angular writes the comment like this:
    //
    //   [/* @ts-ignore */
    //       import(...)]
    //
    // Notice the comment is on the same line as the `[` before it, not on
    // its own line right above the import. Because of that, TypeScript
    // doesn't count it as "belonging to" the import - so the normal way of
    // checking for a leading comment (`ts.getLeadingCommentRanges`) misses
    // it here. Just checking the raw text in between is simpler and works
    // no matter how the comment is attached.
    return code.slice(node.pos, node.getStart(sourceFile)).includes('@ts-ignore');
  }

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'then' &&
      ts.isCallExpression(node.expression.expression) &&
      isDynamicImportCall(node.expression.expression) &&
      node.arguments.length === 1
    ) {
      const importCall = node.expression.expression;
      const specifierArg = importCall.arguments[0];
      const thenArg = node.arguments[0];

      const isSimplePropertyAccessCallback =
        (ts.isArrowFunction(thenArg) || ts.isFunctionExpression(thenArg)) &&
        thenArg.parameters.length === 1 &&
        ts.isIdentifier(thenArg.parameters[0].name) &&
        !!thenArg.body &&
        ts.isPropertyAccessExpression(thenArg.body) &&
        ts.isIdentifier(thenArg.body.expression) &&
        thenArg.body.expression.text === thenArg.parameters[0].name.text;

      if (
        specifierArg &&
        ts.isStringLiteralLike(specifierArg) &&
        isSimplePropertyAccessCallback &&
        hasNearbyTsIgnore(node)
      ) {
        const specifier = specifierArg.text;

        // Skip relative paths like './foo' - that's almost certainly a
        // Router route someone wrote by hand, not something the compiler
        // generated. It's also not a case we need to fix: a relative
        // import points at your own file, not at an unrelated package, so
        // there's no "whole library got pulled in" problem to solve.
        if (!specifier.startsWith('.') && !specifier.startsWith('/')) {
          matches.push({
            start: importCall.arguments.pos,
            end: importCall.arguments.end,
            specifier,
            symbol: (thenArg.body as ts.PropertyAccessExpression).name.text,
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return matches;
}
