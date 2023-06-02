/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { Rule, Tree } from '@angular-devkit/schematics';
import ts from '../../third_party/github.com/Microsoft/TypeScript/lib/typescript';
import { hasTopLevelIdentifier, insertImport } from '../ast-utils';
import { applyToUpdateRecorder } from '../change';

/** Generated code that hasn't been interpolated yet. */
export interface PendingCode {
  /** Code that will be inserted. */
  expression: string;

  /** Imports that need to be added to the file in which the code is inserted. */
  imports: PendingImports;
}

/** Map keeping track of imports and aliases under which they're referred to in an expresion. */
type PendingImports = Map<string, Map<string, string>>;

/** Counter used to generate unique IDs. */
let uniqueIdCounter = 0;

/**
 * Callback invoked by a Rule that produces the code
 * that needs to be inserted somewhere in the app.
 */
export type CodeBlockCallback = (block: CodeBlock) => PendingCode;

/**
 * Utility class used to generate blocks of code that
 * can be inserted by the devkit into a user's app.
 */
export class CodeBlock {
  private _imports: PendingImports = new Map<string, Map<string, string>>();

  // Note: the methods here are defined as arrow function so that they can be destructured by
  // consumers without losing their context. This makes the API more concise.

  /** Function used to tag a code block in order to produce a `PendingCode` object. */
  code = (strings: TemplateStringsArray, ...params: unknown[]): PendingCode => {
    return {
      expression: strings.map((part, index) => part + (params[index] || '')).join(''),
      imports: this._imports,
    };
  };

  /**
   * Used inside of a code block to mark external symbols and which module they should be imported
   * from. When the code is inserted, the required import statements will be produced automatically.
   * @param symbolName Name of the external symbol.
   * @param moduleName Module from which the symbol should be imported.
   */
  external = (symbolName: string, moduleName: string): string => {
    if (!this._imports.has(moduleName)) {
      this._imports.set(moduleName, new Map());
    }

    const symbolsPerModule = this._imports.get(moduleName) as Map<string, string>;

    if (!symbolsPerModule.has(symbolName)) {
      symbolsPerModule.set(symbolName, `@@__SCHEMATIC_PLACEHOLDER_${uniqueIdCounter++}__@@`);
    }

    return symbolsPerModule.get(symbolName) as string;
  };

  /**
   * Produces the necessary rules to transform a `PendingCode` object into valid code.
   * @param initialCode Code pending transformed.
   * @param filePath Path of the file in which the code will be inserted.
   */
  static transformPendingCode(initialCode: PendingCode, filePath: string) {
    const code = { ...initialCode };
    const rules: Rule[] = [];

    code.imports.forEach((symbols, moduleName) => {
      symbols.forEach((placeholder, symbolName) => {
        rules.push((tree: Tree) => {
          const recorder = tree.beginUpdate(filePath);
          const sourceFile = ts.createSourceFile(
            filePath,
            tree.readText(filePath),
            ts.ScriptTarget.Latest,
            true,
          );

          // Note that this could still technically clash if there's a top-level symbol called
          // `${symbolName}_alias`, however this is unlikely. We can revisit this if it becomes
          // a problem.
          const alias = hasTopLevelIdentifier(sourceFile, symbolName, moduleName)
            ? symbolName + '_alias'
            : undefined;

          code.expression = code.expression.replace(
            new RegExp(placeholder, 'g'),
            alias || symbolName,
          );

          applyToUpdateRecorder(recorder, [
            insertImport(sourceFile, filePath, symbolName, moduleName, false, alias),
          ]);
          tree.commitUpdate(recorder);
        });
      });
    });

    return { code, rules };
  }
}
