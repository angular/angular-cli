/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { tsquery } from '@phenomnomnominal/tsquery';
// tslint:disable-next-line:no-implicit-dependencies
import { Replacement, RuleFailure, Rules } from 'tslint';
import * as ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';

// Constants:
const LOAD_CHILDREN_SPLIT = '#';
const NO_CHILDREN_QUERY = `:not(:has(Identifier[name="children"]))`;
const HAS_LOAD_CHILDREN_QUERY = `:has(Identifier[name="loadChildren"])`;
const LAZY_VALUE_QUERY = `:has(StringLiteral[value=/.*${LOAD_CHILDREN_SPLIT}.*/]))`;
const LOAD_CHILDREN_ASSIGNMENT_QUERY =
    `PropertyAssignment${NO_CHILDREN_QUERY}${HAS_LOAD_CHILDREN_QUERY}${LAZY_VALUE_QUERY}`;

const FAILURE_MESSAGE = 'Found magic `loadChildren` string. Use a function with `import` instead.';

export class Rule extends Rules.AbstractRule {
    public apply(ast: ts.SourceFile): Array<RuleFailure> {
        return tsquery(ast, LOAD_CHILDREN_ASSIGNMENT_QUERY).map(result => {
            const [valueNode] = tsquery(result, LAZY_VALUE_QUERY);
            let fix = this._promiseReplacement(valueNode.text);

            // Try to fix indentation in replacement:
            const { character } = ast.getLineAndCharacterOfPosition(result.getStart());
            fix = fix.replace(/\n/g, `\n${' '.repeat(character)}`);

            const replacement = new Replacement(valueNode.getStart(), valueNode.getWidth(), fix);
            const start = result.getStart();
            const end = result.getEnd();

            return new RuleFailure(ast, start, end, FAILURE_MESSAGE, this.ruleName, replacement);
        });
    }

    private _promiseReplacement (loadChildren: string): string {
        const [path, moduleName] = this._getChunks(loadChildren);

        return `() => import('${path}').then(m => m.${moduleName})`;
    }

    private _getChunks (loadChildren: string): Array<string> {
        return loadChildren.split(LOAD_CHILDREN_SPLIT);
    }
}
