/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import ts from 'typescript';
import { convertTypeScriptDiagnostic } from './diagnostics';

describe('convertTypeScriptDiagnostic', () => {
  it('populates line, column, and lineText when diagnostic or relatedInformation starts at offset 0', () => {
    const sourceFile = ts.createSourceFile(
      '/src/app/app.component.ts',
      'const invalid: number = "string";\nconst secondLine = 2;\n',
      ts.ScriptTarget.Latest,
    );
    const templateFile = ts.createSourceFile(
      '/src/app/app.component.html',
      '<unknown-element></unknown-element>\n<div>Valid</div>\n',
      ts.ScriptTarget.Latest,
    );

    const diagnostic: ts.Diagnostic = {
      category: ts.DiagnosticCategory.Error,
      code: -998001,
      file: templateFile,
      start: 0,
      length: 17,
      messageText: "'unknown-element' is not a known element.",
      relatedInformation: [
        {
          category: ts.DiagnosticCategory.Message,
          code: 0,
          file: sourceFile,
          start: 0,
          length: 5,
          messageText: 'Error occurs in the template of component AppComponent.',
        },
      ],
    };

    const result = convertTypeScriptDiagnostic(ts, diagnostic);

    expect(result.text).toBe("NG8001: 'unknown-element' is not a known element.");
    expect(result.location).toEqual({
      file: '/src/app/app.component.html',
      length: 17,
      line: 1,
      column: 0,
      lineText: '<unknown-element></unknown-element>',
    });

    expect(result.notes).toEqual([
      {
        text: 'Error occurs in the template of component AppComponent.',
        location: {
          file: '/src/app/app.component.ts',
          length: 5,
          line: 1,
          column: 0,
          lineText: 'const invalid: number = "string";',
        },
      },
    ]);
  });

  it('does not throw a TypeScript Debug Failure when diagnostic is reported on an empty file', () => {
    const emptyFile = ts.createSourceFile('/src/empty.ts', '', ts.ScriptTarget.Latest);

    const diagnosticAtZero: ts.Diagnostic = {
      category: ts.DiagnosticCategory.Error,
      code: 2306,
      file: emptyFile,
      start: 0,
      length: 0,
      messageText: "File '/src/empty.ts' is not a module.",
    };

    expect(() => convertTypeScriptDiagnostic(ts, diagnosticAtZero)).not.toThrow();
    expect(convertTypeScriptDiagnostic(ts, diagnosticAtZero)).toEqual({
      text: "TS2306: File '/src/empty.ts' is not a module.",
      location: {
        file: '/src/empty.ts',
        length: 0,
        line: 1,
        column: 0,
        lineText: '',
      },
    });

    const diagnosticPastEnd: ts.Diagnostic = {
      category: ts.DiagnosticCategory.Error,
      code: 1005,
      file: emptyFile,
      start: 1,
      length: 0,
      messageText: 'Unexpected end of text.',
    };

    expect(() => convertTypeScriptDiagnostic(ts, diagnosticPastEnd)).not.toThrow();
    expect(convertTypeScriptDiagnostic(ts, diagnosticPastEnd).location).toEqual({
      file: '/src/empty.ts',
      length: 0,
      line: 1,
      column: 1,
      lineText: '',
    });
  });
});
