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
    ruleName: 'single-eof-line',
    type: 'style',
    description: `Ensure the file ends with a single new line.`,
    rationale: `This is similar to eofline, but ensure an exact count instead of just any new
                line.`,
    options: null,
    optionsDescription: `Two integers indicating minimum and maximum number of new lines.`,
    typescriptOnly: false,
  };

  public static FAILURE_STRING = 'You need to have a single blank line at end of file.';

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    const length = sourceFile.text.length;
    if (length === 0) {
      // Allow empty files.
      return [];
    }

    const matchEof = /\r?\n((\r?\n)*)$/.exec(sourceFile.text);
    if (!matchEof) {
      const lines = sourceFile.getLineStarts();
      const fix = Lint.Replacement.appendText(
        length,
        sourceFile.text[lines[1] - 2] === '\r' ? '\r\n' : '\n',
      );

      return [
        new Lint.RuleFailure(sourceFile, length, length, Rule.FAILURE_STRING, this.ruleName, fix),
      ];
    } else if (matchEof[1]) {
      const lines = sourceFile.getLineStarts();
      const fix = Lint.Replacement.replaceFromTo(
        matchEof.index,
        length,
        sourceFile.text[lines[1] - 2] === '\r' ? '\r\n' : '\n',
      );

      return [
        new Lint.RuleFailure(sourceFile, length, length, Rule.FAILURE_STRING, this.ruleName, fix),
      ];
    }

    return [];
  }
}
