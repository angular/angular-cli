/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
    Replacement,
    RuleFailure,
    Rules,
} from 'tslint'; // tslint:disable-line:no-implicit-dependencies
import * as ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';

 // Constants:
const LOAD_CHILDREN_SPLIT = '#';
const FAILURE_MESSAGE = 'Found magic `loadChildren` string. Use a function with `import` instead.';

export class Rule extends Rules.AbstractRule {
  public apply (ast: ts.SourceFile): Array<RuleFailure> {
    const ruleName = this.ruleName;
    const changes: RuleFailure[] = [];

    // NOTE: This should ideally be excluded at a higher level to avoid parsing
    if (ast.isDeclarationFile || /[\\\/]node_modules[\\\/]/.test(ast.fileName)) {
      return [];
    }

    // Workaround mismatched tslint TS version and vendored TS version
    // The TS SyntaxKind enum numeric values change between versions
    const sourceFile = ts.createSourceFile(ast.fileName, ast.text, ast.languageVersion, true);

    ts.forEachChild(sourceFile, function analyze(node) {
      if (ts.isPropertyAssignment(node) &&
          (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) &&
          node.name.text === 'loadChildren' &&
          ts.isStringLiteral(node.initializer)) {
        const valueNode = node.initializer;
        const parts = valueNode.text.split(LOAD_CHILDREN_SPLIT);
        const path = parts[0];
        const moduleName = parts[1] || 'default';

        let fix = `() => import('${path}').then(m => m.${moduleName})`;

        // Try to fix indentation in replacement:
        const { character } = ast.getLineAndCharacterOfPosition(node.getStart());
        fix = fix.replace(/\n/g, `\n${' '.repeat(character)}`);

        const replacement = new Replacement(valueNode.getStart(), valueNode.getWidth(), fix);
        const start = node.getStart();
        const end = node.getEnd();

        const change = new RuleFailure(ast, start, end, FAILURE_MESSAGE, ruleName, replacement);
        change.setRuleSeverity('warning');
        changes.push(change);
      }

      ts.forEachChild(node, analyze);
    });

    return changes;
  }
}
