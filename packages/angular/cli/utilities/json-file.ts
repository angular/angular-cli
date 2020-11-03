/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue } from '@angular-devkit/core';
import { readFileSync, writeFileSync } from 'fs';
import {
  Node, ParseError, applyEdits, findNodeAtLocation,
  getNodeValue, modify, parse, parseTree, printParseErrorCode,
} from 'jsonc-parser';

export type InsertionIndex = (properties: string[]) => number;
export type JSONPath = (string | number)[];

/** @internal */
export class JSONFile {
  content: string;

  constructor(
    private readonly path: string,
  ) {
    const buffer = readFileSync(this.path);
    if (buffer) {
      this.content = buffer.toString();
    } else {
      throw new Error(`Could not read '${path}'.`);
    }
  }

  private _jsonAst: Node | undefined;
  private get JsonAst(): Node {
    if (this._jsonAst) {
      return this._jsonAst;
    }

    const errors: ParseError[] = [];
    this._jsonAst = parseTree(this.content, errors);
    if (errors.length) {
      formatError(this.path, errors);
    }

    return this._jsonAst;
  }

  get(jsonPath: JSONPath): unknown {
    if (jsonPath.length === 0) {
      return getNodeValue(this.JsonAst);
    }

    const node = findNodeAtLocation(this.JsonAst, jsonPath);

    return node === undefined ? undefined : getNodeValue(node);
  }

  modify(jsonPath: JSONPath, value: JsonValue | undefined, insertInOrder?: InsertionIndex | false): boolean {
    if (value === undefined && this.get(jsonPath) === undefined) {
      // Cannot remove a value which doesn't exist.
      return false;
    }

    let getInsertionIndex: InsertionIndex | undefined;
    if (insertInOrder === undefined) {
      const property = jsonPath.slice(-1)[0];
      getInsertionIndex = properties => [...properties, property].sort().findIndex(p => p === property);
    } else if (insertInOrder !== false) {
      getInsertionIndex = insertInOrder;
    }

    const edits = modify(
      this.content,
      jsonPath,
      value,
      {
        getInsertionIndex,
        formattingOptions: {
          insertSpaces: true,
          tabSize: 2,
        },
      },
    );

    if (edits.length === 0) {
      return false;
    }

    this.content = applyEdits(this.content, edits);
    this._jsonAst = undefined;

    return true;
  }

  save(): void {
    writeFileSync(this.path, this.content);
  }
}

// tslint:disable-next-line: no-any
export function readAndParseJson(path: string): any {
  const errors: ParseError[] = [];
  const content = parse(readFileSync(path, 'utf-8'), errors);
  if (errors.length) {
    formatError(path, errors);
  }

  return content;
}

function formatError(path: string, errors: ParseError[]): never {
  const { error, offset } = errors[0];
  throw new Error(`Failed to parse "${path}" as JSON AST Object. ${printParseErrorCode(error)} at location: ${offset}.`);
}

// tslint:disable-next-line: no-any
export function parseJson(content: string): any {
  return parse(content);
}
