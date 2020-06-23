/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { JsonValue } from '@angular-devkit/core';
import { Tree } from '@angular-devkit/schematics';
import { Node, applyEdits, findNodeAtLocation, getNodeValue, modify, parseTree } from 'jsonc-parser';

export type JSONPath = (string | number)[];

/** @internal */
export class JSONFile {
  private content: string;
  error: undefined | Error;

  constructor(
    private readonly host: Tree,
    private readonly path: string,
  ) {
    const buffer = this.host.read(this.path);
    if (buffer) {
      this.content = buffer.toString();
    } else {
      this.error = new Error(`Could not read ${path}.`);
    }
  }

  private _jsonAst: Node | undefined;
  private get JsonAst(): Node {
    if (this._jsonAst) {
      return this._jsonAst;
    }

    this._jsonAst = parseTree(this.content);

    return this._jsonAst;
  }

  get(jsonPath: JSONPath): unknown {
    if (jsonPath.length === 0) {
      return getNodeValue(this.JsonAst);
    }

    const node = findNodeAtLocation(this.JsonAst, jsonPath);

    return node === undefined ? undefined : getNodeValue(node);
  }

  modify(jsonPath: JSONPath, value: JsonValue | undefined, getInsertionIndex?: (properties: string[]) => number): void {
    if (!getInsertionIndex) {
      const property = jsonPath.slice(-1)[0];
      getInsertionIndex = properties => [...properties, property].sort().findIndex(p => p === property);
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

    this.content = applyEdits(this.content, edits);
    this.host.overwrite(this.path, this.content);
    this._jsonAst = undefined;
  }

  remove(jsonPath: JSONPath): void {
    if (this.get(jsonPath) !== undefined) {
      this.modify(jsonPath, undefined);
    }
  }
}
