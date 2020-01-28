/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// tslint:disable-next-line: no-global-tslint-disable
// tslint:disable: no-implicit-dependencies
import * as Lint from 'tslint';
import * as ts from 'typescript';


// An empty rule so that tslint does not error on rules '//' (which are comments).
export class Rule extends Lint.Rules.AbstractRule {
  public static metadata: Lint.IRuleMetadata = {
    ruleName: '//',
    type: 'typescript',
    description: ``,
    rationale: '',
    options: null,
    optionsDescription: `Not configurable.`,
    typescriptOnly: false,
  };

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return [];
  }
}
