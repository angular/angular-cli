/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { DirEntry, Rule, UpdateRecorder } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';

function* visit(directory: DirEntry): IterableIterator<ts.SourceFile> {
  for (const path of directory.subfiles) {
    if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
      const entry = directory.file(path);
      if (entry) {
        const content = entry.content;
        if (content.includes('Worker')) {
          const source = ts.createSourceFile(
            entry.path,
            // Remove UTF-8 BOM if present
            // TypeScript expects the BOM to be stripped prior to parsing
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

function hasPropertyWithValue(node: ts.Expression, name: string, value: unknown): boolean {
  if (!ts.isObjectLiteralExpression(node)) {
    return false;
  }

  for (const property of node.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    if (!ts.isIdentifier(property.name) || property.name.text !== 'type') {
      continue;
    }
    if (ts.isStringLiteralLike(property.initializer)) {
      return property.initializer.text === 'module';
    }
  }

  return false;
}

export default function (): Rule {
  return (tree) => {
    for (const sourceFile of visit(tree.root)) {
      let recorder: UpdateRecorder | undefined;

      ts.forEachChild(sourceFile, function analyze(node) {
        // Only modify code in the form of `new Worker('./app.worker', { type: 'module' })`.
        // `worker-plugin` required the second argument to be an object literal with type=module
        if (
          ts.isNewExpression(node) &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === 'Worker' &&
          node.arguments?.length === 2 &&
          ts.isStringLiteralLike(node.arguments[0]) &&
          hasPropertyWithValue(node.arguments[1], 'type', 'module')
        ) {
          const valueNode = node.arguments[0] as ts.StringLiteralLike;

          // Webpack expects a URL constructor: https://webpack.js.org/guides/web-workers/
          const fix = `new URL('${valueNode.text}', import.meta.url)`;

          if (!recorder) {
            recorder = tree.beginUpdate(sourceFile.fileName);
          }

          const index = valueNode.getStart();
          const length = valueNode.getWidth();
          recorder.remove(index, length).insertLeft(index, fix);
        }

        ts.forEachChild(node, analyze);
      });

      if (recorder) {
        tree.commitUpdate(recorder);
      }
    }
  };
}
