/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import * as path from 'path';
import * as Lint from 'tslint';
import * as ts from 'typescript';


export class Rule extends Lint.Rules.AbstractRule {
  public static metadata: Lint.IRuleMetadata = {
    ruleName: 'no-global-tslint-disable',
    type: 'style',
    description: `Ensure global tslint disable are only used for unit tests.`,
    rationale: `Some projects want to disallow tslint disable and only use per-line ones.`,
    options: null,
    optionsDescription: `Not configurable.`,
    typescriptOnly: false,
  };

  public static FAILURE_STRING = 'tslint:disable is not allowed in this context.';

  public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
    return this.applyWithWalker(new Walker(sourceFile, this.getOptions()));
  }
}


class Walker extends Lint.RuleWalker {
  private _findComments(node: ts.Node): ts.CommentRange[] {
    return ([] as ts.CommentRange[]).concat(
      ts.getLeadingCommentRanges(node.getFullText(), 0) || [],
      ts.getTrailingCommentRanges(node.getFullText(), 0) || [],
      node.getChildren().reduce((acc, n) => {
        return acc.concat(this._findComments(n));
      }, [] as ts.CommentRange[]),
    );
  }

  walk(sourceFile: ts.SourceFile) {
    super.walk(sourceFile);

    // Ignore spec files.
    if (sourceFile.fileName.match(/_spec(_large)?.ts$/)) {
      return;
    }
    // Ignore benchmark files.
    if (sourceFile.fileName.match(/_benchmark.ts$/)) {
      return;
    }

    // TODO(filipesilva): remove this once the files are cleaned up.
    // Ignore Angular CLI files files.
    if (sourceFile.fileName.includes('/angular-cli-files/')) {
      return;
    }

    const scriptsPath = path.join(process.cwd(), 'scripts').replace(/\\/g, '/');
    if (sourceFile.fileName.startsWith(scriptsPath)) {
      return;
    }

    // Find all comment nodes.
    const ranges = this._findComments(sourceFile);
    ranges.forEach(range => {
      const text = sourceFile.getFullText().substring(range.pos, range.end);
      let i = text.indexOf('tslint:disable:');

      while (i != -1) {
        this.addFailureAt(range.pos + i + 1, range.pos + i + 15, Rule.FAILURE_STRING);
        i = text.indexOf('tslint:disable:', i + 1);
      }
    });
  }
}
