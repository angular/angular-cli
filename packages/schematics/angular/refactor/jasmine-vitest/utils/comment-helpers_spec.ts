/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from '../../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { addTodoComment } from './comment-helpers';

describe('addTodoComment', () => {
  function createTestHarness(sourceText: string) {
    const sourceFile = ts.createSourceFile('test.ts', sourceText, ts.ScriptTarget.Latest, true);
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

    return {
      sourceFile,
      run(node: ts.Node, category: 'pending') {
        addTodoComment(node, category);

        return printer.printFile(sourceFile);
      },
    };
  }

  it('should add a comment before the containing ExpressionStatement', () => {
    const sourceText = `myFunction();`;
    const { sourceFile, run } = createTestHarness(sourceText);
    const callExpression = (sourceFile.statements[0] as ts.ExpressionStatement).expression;

    const result = run(callExpression, 'pending');

    expect(result).toContain(
      '// TODO: vitest-migration: The pending() function was converted to a skipped test (`it.skip`). See: https://vitest.dev/api/vi.html#it-skip',
    );
    expect(result.trim().startsWith('// TODO')).toBe(true);
  });

  it('should find the top-level statement for a deeply nested node', () => {
    const sourceText = `const result = myObject.prop.method();`;
    const { sourceFile, run } = createTestHarness(sourceText);

    // Get a deeply nested identifier
    const varDeclaration = (sourceFile.statements[0] as ts.VariableStatement).declarationList
      .declarations[0];
    const methodIdentifier = (
      (varDeclaration.initializer as ts.CallExpression).expression as ts.PropertyAccessExpression
    ).name;

    const result = run(methodIdentifier, 'pending');

    expect(result.trim().startsWith('// TODO')).toBe(true);
    expect(result).toContain('const result = myObject.prop.method()');
  });

  it('should add a comment before a VariableStatement', () => {
    const sourceText = `const mySpy = jasmine.createSpy();`;
    const { sourceFile, run } = createTestHarness(sourceText);
    const varDeclaration = (sourceFile.statements[0] as ts.VariableStatement).declarationList
      .declarations[0];

    const result = run(varDeclaration, 'pending');

    expect(result.trim().startsWith('// TODO')).toBe(true);
    expect(result).toContain('const mySpy = jasmine.createSpy()');
  });
});
