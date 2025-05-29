/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonValue } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import {
  Node,
  ParseError,
  applyEdits,
  findNodeAtLocation,
  getNodeValue,
  modify,
  parseTree,
  printParseErrorCode,
} from 'jsonc-parser';
import { getEOL } from './eol';

export type InsertionIndex = (properties: string[]) => number;
export type JSONPath = (string | number)[];

/** @private */
export class JSONFile {
  content: string;
  private eol: string;

  constructor(
    private readonly host: Tree,
    private readonly path: string,
  ) {
    this.content = this.host.readText(this.path);
    this.eol = getEOL(this.content);
  }

  private _jsonAst: Node | undefined;
  private get JsonAst(): Node | undefined {
    if (this._jsonAst) {
      return this._jsonAst;
    }

    const errors: ParseError[] = [];
    this._jsonAst = parseTree(this.content, errors, { allowTrailingComma: true });
    if (errors.length) {
      const { error, offset } = errors[0];
      throw new Error(
        `Failed to parse "${this.path}" as JSON AST Object. ${printParseErrorCode(
          error,
        )} at location: ${offset}.`,
      );
    }

    return this._jsonAst;
  }

  get(jsonPath: JSONPath): unknown {
    const jsonAstNode = this.JsonAst;
    if (!jsonAstNode) {
      return undefined;
    }

    if (jsonPath.length === 0) {
      return getNodeValue(jsonAstNode);
    }

    const node = findNodeAtLocation(jsonAstNode, jsonPath);

    return node === undefined ? undefined : getNodeValue(node);
  }

  modify(
    jsonPath: JSONPath,
    value: JsonValue | undefined,
    insertInOrder?: InsertionIndex | false,
  ): void {
    let getInsertionIndex: InsertionIndex | undefined;
    if (insertInOrder === undefined) {
      const property = jsonPath.slice(-1)[0];
      getInsertionIndex = (properties) =>
        [...properties, property].sort().findIndex((p) => p === property);
    } else if (insertInOrder !== false) {
      getInsertionIndex = insertInOrder;
    }

    const edits = modify(this.content, jsonPath, value, {
      getInsertionIndex,

      formattingOptions: {
        eol: this.eol,
        insertSpaces: true,
        tabSize: 2,
      },
    });

    if (edits.length > 0) {
      const editedContent = applyEdits(this.content, edits);

      // Update the file content if it changed
      if (editedContent !== this.content) {
        this.content = editedContent;
        this.host.overwrite(this.path, editedContent);
        this._jsonAst = undefined;
      }
    }
  }

  remove(jsonPath: JSONPath): void {
    if (this.get(jsonPath) !== undefined) {
      this.modify(jsonPath, undefined);
    }
  }
}
