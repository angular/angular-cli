/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { DirEntry, Rule, UpdateRecorder } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { getPackageJsonDependency } from '../../utility/dependencies';

function* visit(directory: DirEntry): IterableIterator<ts.SourceFile> {
  for (const path of directory.subfiles) {
    if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
      const entry = directory.file(path);
      if (entry) {
        const content = entry.content;
        if (content.includes('CommonEngine') && !content.includes('@angular/ssr/node')) {
          const source = ts.createSourceFile(
            entry.path,
            content.toString().replace(/^\uFEFF/, ''),
            ts.ScriptTarget.Latest,
            true,
          );

          yield source;
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

/**
 * Schematics rule that identifies and updates import declarations in TypeScript files.
 * Specifically, it modifies imports of '@angular/ssr' by appending '/node' if the
 * `CommonEngine` is used from the old entry point.
 *
 */
export default function (): Rule {
  return (tree) => {
    if (!getPackageJsonDependency(tree, '@angular/ssr')) {
      return;
    }

    for (const sourceFile of visit(tree.root)) {
      let recorder: UpdateRecorder | undefined;

      const allImportDeclarations = sourceFile.statements.filter((n) => ts.isImportDeclaration(n));
      if (allImportDeclarations.length === 0) {
        continue;
      }

      const ssrImports = allImportDeclarations.filter(
        (n) => ts.isStringLiteral(n.moduleSpecifier) && n.moduleSpecifier.text === '@angular/ssr',
      );
      for (const ssrImport of ssrImports) {
        const ssrNamedBinding = getNamedImports(ssrImport);
        if (ssrNamedBinding) {
          const isUsingOldEntryPoint = ssrNamedBinding.elements.some((e) =>
            e.name.text.startsWith('CommonEngine'),
          );

          if (!isUsingOldEntryPoint) {
            continue;
          }

          recorder ??= tree.beginUpdate(sourceFile.fileName);
          recorder.insertRight(ssrImport.moduleSpecifier.getEnd() - 1, '/node');
        }
      }

      if (recorder) {
        tree.commitUpdate(recorder);
      }
    }
  };
}

function getNamedImports(
  importDeclaration: ts.ImportDeclaration | undefined,
): ts.NamedImports | undefined {
  const namedBindings = importDeclaration?.importClause?.namedBindings;
  if (namedBindings && ts.isNamedImports(namedBindings)) {
    return namedBindings;
  }

  return undefined;
}
