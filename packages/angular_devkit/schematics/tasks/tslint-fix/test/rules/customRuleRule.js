'use strict';
/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

Object.defineProperty(exports, '__esModule', { value: true });
const Lint = require('tslint');

class Rule extends Lint.Rules.AbstractRule {
  apply(sourceFile) {
    const shouldPass = this.getOptions().ruleArguments[0];
    if (!shouldPass) {
      return [new Lint.RuleFailure(sourceFile, 0, 0, 'custom-rule fail', this.ruleName)];
    } else {
      return [];
    }
  }
}

Rule.metadata = {
  ruleName: 'custom-rule',
  description: 'Test.',
  rationale: 'Do not use this.',
  options: [{ type: 'boolean' }],
  optionsDescription: '.',
  type: 'functionality',
  typescriptOnly: false,
};

exports.Rule = Rule;
