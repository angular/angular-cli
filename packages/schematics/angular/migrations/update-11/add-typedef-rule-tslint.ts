/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonValue } from '@angular-devkit/core';
import { DirEntry, Rule, Tree, UpdateRecorder } from '@angular-devkit/schematics';
import * as ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { getPackageJsonDependency } from '../../utility/dependencies';
import { JSONFile } from '../../utility/json-file';

const TSLINT_CONFIG_PATH = '/tslint.json';
const RULES_TO_ADD: Record<string, JsonValue> = {
  typedef: [true, 'call-signature'],
};

function* visit(directory: DirEntry): IterableIterator<ts.SourceFile> {
  for (const path of directory.subfiles) {
    if (path.endsWith('.ts') && !path.endsWith('.d.ts')) {
      const entry = directory.file(path);
      if (entry) {
        yield ts.createSourceFile(
          entry.path,
          entry.content.toString().replace(/^\uFEFF/, ''),
          ts.ScriptTarget.Latest,
          true,
        );
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

function addTypedefDisableComments(tree: Tree) {
  for (const sourceFile of visit(tree.root)) {
    let recorder: UpdateRecorder | undefined;
    ts.forEachChild(sourceFile, function analyze(node) {
      switch (node.kind) {
        case ts.SyntaxKind.FunctionDeclaration:
        case ts.SyntaxKind.FunctionExpression:
        case ts.SyntaxKind.GetAccessor:
        case ts.SyntaxKind.MethodDeclaration:
        case ts.SyntaxKind.MethodSignature:
          if (!(node as ts.CallSignatureDeclaration).type) {
            if (!recorder) {
              recorder = tree.beginUpdate(sourceFile.fileName);
            }

            const triviaWidth = node.getLeadingTriviaWidth();
            const lineBreakPosition = node.getFullText().substr(0, triviaWidth).lastIndexOf('\n') + 1;
            const indent = triviaWidth - lineBreakPosition;
            recorder.insertLeft(node.getStart(), `// tslint:disable-next-line:typedef\n${' '.repeat(indent)}`);
          }

          break;
      }

      ts.forEachChild(node, analyze);
    });

    if (recorder) {
      tree.commitUpdate(recorder);
    }
  }
}

export default function (): Rule {
  return (tree, context) => {
    const logger = context.logger;

    // Update tslint dependency
    const current = getPackageJsonDependency(tree, 'tslint');

    if (!current) {
      logger.info('Skipping: "tslint" in not a dependency of this workspace.');

      return;
    }

    // Update tslint config.
    let json;
    try {
      json = new JSONFile(tree, TSLINT_CONFIG_PATH);
    } catch {
      const config = ['tslint.js', 'tslint.yaml'].find(c => tree.exists(c));
      if (config) {
        logger.warn(`Expected a JSON configuration file but found "${config}".`);
      } else {
        logger.warn('Cannot find "tslint.json" configuration file.');
      }

      return;
    }

    for (const [name, value] of Object.entries(RULES_TO_ADD)) {
      const ruleName = ['rules', name];
      if (json.get(ruleName) === undefined) {
        json.modify(ruleName, value);

        // typedef doesn't have a fixer.
        // Let's add comments to disable typedef rule
        addTypedefDisableComments(tree);
      }
    }
  };
}
