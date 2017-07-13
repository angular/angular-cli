/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as Lint from 'tslint';
import * as ts from 'typescript';


export class Rule extends Lint.Rules.AbstractRule {
  public static metadata: Lint.IRuleMetadata = {
    ruleName: 'import-groups',
    type: 'style',
    description: `Ensure imports are grouped.`,
    rationale: `Imports can be grouped or not depending on a project. A group is a sequence of
                import statements separated by blank lines.`,
    options: null,
    optionsDescription: `Not configurable.`,
    typescriptOnly: false,
  };

  public static FAILURE_STRING = 'You need to keep imports grouped.';

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
  }
}


class Walker extends Lint.RuleWalker {
  walk(sourceFile: ts.SourceFile) {
    super.walk(sourceFile);

    const statements = sourceFile.statements;
    const imports = statements.filter(s => s.kind == ts.SyntaxKind.ImportDeclaration);
    const nonImports = statements.filter(s => s.kind != ts.SyntaxKind.ImportDeclaration);

    for (let i = 1; i < imports.length; i++) {
      const node = imports[i];
      const previous = imports[i - 1];

      if (previous && previous.kind == ts.SyntaxKind.ImportDeclaration) {
        const nodeLine = sourceFile.getLineAndCharacterOfPosition(node.getStart());
        const previousLine = sourceFile.getLineAndCharacterOfPosition(previous.getEnd());

        if (previousLine.line < nodeLine.line - 1) {
          if (nonImports.some(s => s.getStart() > previous.getEnd()
            && s.getStart() < node.getStart())) {
            // Ignore imports with non-imports statements in between.
            continue;
          }

          this.addFailureAt(
            node.getStart(),
            node.getWidth(),
            Rule.FAILURE_STRING,
            Lint.Replacement.deleteFromTo(previous.getEnd() + 1, node.getStart()),
          );
        }
      }
    }
  }
}
