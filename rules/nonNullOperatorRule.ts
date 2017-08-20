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
    ruleName: 'non-null-operator',
    type: 'typescript',
    description: `Ensure the NonNull operator (!) can be used or not.`,
    rationale: 'strictNullChecks are meant to avoid issues, which the non-null operator removes '
             + 'if used too frequently. Please use the non-null operator responsibly.',
    options: null,
    optionsDescription: `Not configurable.`,
    typescriptOnly: false,
  };

  public static FAILURE_STRING = 'The Non-Null operator `!` is illegal.';

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
  }
}


class Walker extends Lint.RuleWalker {
  visitNonNullExpression(node: ts.NonNullExpression): void {
    this.addFailureAt(node.getStart(), node.getWidth(), Rule.FAILURE_STRING);
  }
}
