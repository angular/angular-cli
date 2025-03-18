/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { DirEntry, Rule } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { getPackageJsonDependency } from '../../utility/dependencies';

function* visit(directory: DirEntry): IterableIterator<[fileName: string, contents: string]> {
  for (const path of directory.subfiles) {
    if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
      const entry = directory.file(path);
      if (entry) {
        const content = entry.content;
        if (content.includes('provideServerRouting') && content.includes('@angular/ssr')) {
          // Only need to rename the import so we can just string replacements.
          yield [entry.path, content.toString()];
        }
      }
    }
  }

  for (const path of directory.subdirs) {
    if (path === 'node_modules' || path.startsWith('.')) {
      continue;
    }

    yield* visit(directory.dir(path));
  }
}

export default function (): Rule {
  return async (tree) => {
    if (!getPackageJsonDependency(tree, '@angular/ssr')) {
      return;
    }

    for (const [filePath, content] of visit(tree.root)) {
      const recorder = tree.beginUpdate(filePath);
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      function visit(node: ts.Node) {
        if (
          ts.isPropertyAssignment(node) &&
          ts.isIdentifier(node.name) &&
          node.name.text === 'providers' &&
          ts.isArrayLiteralExpression(node.initializer)
        ) {
          const providersArray = node.initializer;
          const newProviders = providersArray.elements
            .filter((el) => {
              return !(
                ts.isCallExpression(el) &&
                ts.isIdentifier(el.expression) &&
                el.expression.text === 'provideServerRendering'
              );
            })
            .map((el) => {
              if (
                ts.isCallExpression(el) &&
                ts.isIdentifier(el.expression) &&
                el.expression.text === 'provideServerRouting'
              ) {
                const [withRouteVal, ...others] = el.arguments.map((arg) => arg.getText());

                return `provideServerRendering(withRoutes(${withRouteVal})${others.length ? ', ' + others.join(', ') : ''})`;
              }

              return el.getText();
            });

          // Update the 'providers' array in the source file
          recorder.remove(providersArray.getStart(), providersArray.getWidth());
          recorder.insertRight(providersArray.getStart(), `[${newProviders.join(', ')}]`);
        }

        ts.forEachChild(node, visit);
      }

      // Visit all nodes to update 'providers'
      visit(sourceFile);

      // Update imports by removing 'provideServerRouting'
      const importDecl = sourceFile.statements.find(
        (stmt) =>
          ts.isImportDeclaration(stmt) &&
          ts.isStringLiteral(stmt.moduleSpecifier) &&
          stmt.moduleSpecifier.text === '@angular/ssr',
      ) as ts.ImportDeclaration | undefined;

      if (importDecl?.importClause?.namedBindings) {
        const namedBindings = importDecl?.importClause.namedBindings;

        if (ts.isNamedImports(namedBindings)) {
          const elements = namedBindings.elements;
          const updatedElements = elements
            .map((el) => el.getText())
            .filter((x) => x !== 'provideServerRouting');

          updatedElements.push('withRoutes');

          recorder.remove(namedBindings.getStart(), namedBindings.getWidth());
          recorder.insertLeft(namedBindings.getStart(), `{ ${updatedElements.sort().join(', ')} }`);
        }
      }

      tree.commitUpdate(recorder);
    }
  };
}
