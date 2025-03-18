/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { DirEntry, Rule } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { NodeDependencyType, addPackageJsonDependency } from '../../utility/dependencies';
import { latestVersions } from '../../utility/latest-versions';

function* visit(directory: DirEntry): IterableIterator<[fileName: string, contents: string]> {
  for (const path of directory.subfiles) {
    if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
      const entry = directory.file(path);
      if (entry) {
        const content = entry.content;
        if (
          content.includes('provideServerRendering') &&
          content.includes('@angular/platform-server')
        ) {
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
    addPackageJsonDependency(tree, {
      name: '@angular/ssr',
      version: latestVersions.AngularSSR,
      type: NodeDependencyType.Default,
      overwrite: false,
    });

    for (const [filePath, content] of visit(tree.root)) {
      let updatedContent = content;
      const ssrImports = new Set<string>();
      const platformServerImports = new Set<string>();
      const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);

      sourceFile.forEachChild((node) => {
        if (ts.isImportDeclaration(node)) {
          const moduleSpecifier = node.moduleSpecifier.getText(sourceFile);
          if (moduleSpecifier.includes('@angular/platform-server')) {
            const importClause = node.importClause;
            if (
              importClause &&
              importClause.namedBindings &&
              ts.isNamedImports(importClause.namedBindings)
            ) {
              const namedImports = importClause.namedBindings.elements.map((e) =>
                e.getText(sourceFile),
              );
              namedImports.forEach((importName) => {
                if (importName === 'provideServerRendering') {
                  ssrImports.add(importName);
                } else {
                  platformServerImports.add(importName);
                }
              });
            }
            updatedContent = updatedContent.replace(node.getFullText(sourceFile), '');
          } else if (moduleSpecifier.includes('@angular/ssr')) {
            const importClause = node.importClause;
            if (
              importClause &&
              importClause.namedBindings &&
              ts.isNamedImports(importClause.namedBindings)
            ) {
              importClause.namedBindings.elements.forEach((e) => {
                ssrImports.add(e.getText(sourceFile));
              });
            }
            updatedContent = updatedContent.replace(node.getFullText(sourceFile), '');
          }
        }
      });

      if (platformServerImports.size > 0) {
        updatedContent =
          `import { ${Array.from(platformServerImports).sort().join(', ')} } from '@angular/platform-server';\n` +
          updatedContent;
      }

      if (ssrImports.size > 0) {
        updatedContent =
          `import { ${Array.from(ssrImports).sort().join(', ')} } from '@angular/ssr';\n` +
          updatedContent;
      }

      if (content !== updatedContent) {
        tree.overwrite(filePath, updatedContent);
      }
    }
  };
}
