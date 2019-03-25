/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as ts from 'typescript';


/**
 * Given this original source code:
 *
 * import { NgModule } from '@angular/core';
 * import { Routes, RouterModule } from '@angular/router';
 *
 * const routes: Routes = [{
 *   path: 'lazy',
 *   loadChildren: () => import('./lazy/lazy.module').then(m => m.LazyModule).
 * }];
 *
 * @NgModule({
 *   imports: [RouterModule.forRoot(routes)],
 *   exports: [RouterModule]
 * })
 * export class AppRoutingModule { }
 *
 * NGC (View Engine) will process it into:
 *
 * import { Routes } from '@angular/router';
 * const ɵ0 = () => import('./lazy/lazy.module').then(m => m.LazyModule);
 * const routes: Routes = [{
 *         path: 'lazy',
 *         loadChildren: ɵ0
 *     }];
 * export class AppRoutingModule {
 * }
 * export { ɵ0 };
 *
 * The importFactory transformation will only see the AST after it is process by NGC.
 * You can confirm this with the code below:
 *
 * const res = ts.createPrinter().printNode(ts.EmitHint.Unspecified, sourceFile, sourceFile);
 * console.log(`### Original source: \n${sourceFile.text}\n###`);
 * console.log(`### Current source: \n${currentText}\n###`);
 *
 * At this point it doesn't yet matter what the target (ES5/ES2015/etc) is, so the original
 * constructs, like `class` and arrow functions, still remain.
 *
 */

export function importFactory(
  warningCb: (warning: string) => void,
): ts.TransformerFactory<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    // TODO(filipesilva): change the link to https://angular.io/guide/ivy once it is out.
    return (sourceFile: ts.SourceFile) => {
      const warning = `
Found 'loadChildren' with a non-string syntax in ${sourceFile.fileName} but could not transform it.
Make sure it matches the format below:

loadChildren: () => import('IMPORT_STRING').then(m => m.EXPORT_NAME)

Please note that only IMPORT_STRING and EXPORT_NAME can be replaced in this format.

Visit https://next.angular.io/guide/ivy for more information on using Ivy.
`;

      const emitWarning = () => warningCb(warning);
      const visitVariableStatement: ts.Visitor = (node: ts.Node) => {
        if (ts.isVariableDeclaration(node)) {
          return replaceImport(node, context, emitWarning);
        }

        return ts.visitEachChild(node, visitVariableStatement, context);
      };

      const visitToplevelNodes: ts.Visitor = (node: ts.Node) => {
        // We only care about finding variable declarations, which are found in this structure:
        // VariableStatement -> VariableDeclarationList -> VariableDeclaration
        if (ts.isVariableStatement(node)) {
          return ts.visitEachChild(node, visitVariableStatement, context);
        }

        // There's no point in recursing into anything but variable statements, so return the node.
        return node;
      };

      return ts.visitEachChild(sourceFile, visitToplevelNodes, context);
    };
  };
}

function replaceImport(
  node: ts.VariableDeclaration,
  context: ts.TransformationContext,
  emitWarning: () => void,
): ts.Node {
  // This ONLY matches the original source code format below:
  // loadChildren: () => import('IMPORT_STRING').then(m => m.EXPORT_NAME)
  // And expects that source code to be transformed by NGC (see comment for importFactory).
  // It will not match nor alter variations, for instance:
  // - not using arrow functions
  // - not using `m` as the module argument
  // - using `await` instead of `then`
  // - using a default export (https://github.com/angular/angular/issues/11402)
  // The only parts that can change are the ones in caps: IMPORT_STRING and EXPORT_NAME.

  // Exit early if the structure is not what we expect.

  // ɵ0 = something
  const name = node.name;
  if (!(
    ts.isIdentifier(name)
    && /ɵ\d+/.test(name.text)
  )) {
    return node;
  }

  const initializer = node.initializer;
  if (initializer === undefined) {
    return node;
  }

  // ɵ0 = () => something
  if (!(
    ts.isArrowFunction(initializer)
    && initializer.parameters.length === 0
  )) {
    return node;
  }

  // ɵ0 = () => something.then(something)
  const topArrowFnBody = initializer.body;
  if (!ts.isCallExpression(topArrowFnBody)) {
    return node;
  }

  const topArrowFnBodyExpr = topArrowFnBody.expression;
  if (!(
    ts.isPropertyAccessExpression(topArrowFnBodyExpr)
    && ts.isIdentifier(topArrowFnBodyExpr.name)
  )) {
    return node;
  }
  if (topArrowFnBodyExpr.name.text != 'then') {
    return node;
  }

  // ɵ0 = () => import('IMPORT_STRING').then(something)
  const importCall = topArrowFnBodyExpr.expression;
  if (!(
    ts.isCallExpression(importCall)
    && importCall.expression.kind === ts.SyntaxKind.ImportKeyword
    && importCall.arguments.length === 1
    && ts.isStringLiteral(importCall.arguments[0])
  )) {
    return node;
  }

  // ɵ0 = () => import('IMPORT_STRING').then(m => m.EXPORT_NAME)
  if (!(
    topArrowFnBody.arguments.length === 1
    && ts.isArrowFunction(topArrowFnBody.arguments[0])
  )) {
    // Now that we know it's both `ɵ0` (generated by NGC) and a `import()`, start emitting a warning
    // if the structure isn't as expected to help users identify unusable syntax.
    emitWarning();

    return node;
  }

  const thenArrowFn = topArrowFnBody.arguments[0] as ts.ArrowFunction;
  if (!(
    thenArrowFn.parameters.length === 1
    && ts.isPropertyAccessExpression(thenArrowFn.body)
    && ts.isIdentifier(thenArrowFn.body.name)
  )) {
    emitWarning();

    return node;
  }

  // At this point we know what are the nodes we need to replace.
  const importStringLit = importCall.arguments[0] as ts.StringLiteral;
  const exportNameId = thenArrowFn.body.name;

  // The easiest way to alter them is with a simple visitor.
  const replacementVisitor: ts.Visitor = (node: ts.Node) => {
    if (node === importStringLit) {
      // Transform the import string.
      return ts.createStringLiteral(importStringLit.text + '.ngfactory');
    } else if (node === exportNameId) {
      // Transform the export name.
      return ts.createIdentifier(exportNameId.text + 'NgFactory');
    }

    return ts.visitEachChild(node, replacementVisitor, context);
  };

  return ts.visitEachChild(node, replacementVisitor, context);
}
