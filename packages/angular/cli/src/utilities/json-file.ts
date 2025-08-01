/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import { JsonValue } from '@angular-devkit/core';
import {
  Node,
  ParseError,
  applyEdits,
  findNodeAtLocation,
  getNodeValue,
  modify,
  parse,
  parseTree,
  printParseErrorCode,
} from 'jsonc-parser';
import { readFileSync, writeFileSync } from 'node:fs';
import { getEOL } from './eol';
import { assertIsError } from './error';

/** A function that returns an index to insert a new property in a JSON object. */
export type InsertionIndex = (properties: string[]) => number;

/** A JSON path. */
export type JSONPath = (string | number)[];

/**
 * Represents a JSON file, allowing for reading, modifying, and saving.
 * This class uses `jsonc-parser` to preserve comments and formatting, including
 * indentation and end-of-line sequences.
 * @internal
 */
export class JSONFile {
  /** The raw content of the JSON file. */
  #content: string;

  /** The end-of-line sequence used in the file. */
  #eol: string;

  /** Whether the file uses spaces for indentation. */
  #insertSpaces = true;

  /** The number of spaces or tabs used for indentation. */
  #tabSize = 2;

  /** The path to the JSON file. */
  #path: string;

  /** The parsed JSON abstract syntax tree. */
  #jsonAst: Node | undefined;

  /** The raw content of the JSON file. */
  public get content(): string {
    return this.#content;
  }

  /**
   * Creates an instance of JSONFile.
   * @param path The path to the JSON file.
   */
  constructor(path: string) {
    this.#path = path;
    try {
      this.#content = readFileSync(this.#path, 'utf-8');
    } catch (e) {
      assertIsError(e);
      // We don't have to worry about ENOENT, since we'll be creating the file.
      if (e.code !== 'ENOENT') {
        throw e;
      }

      this.#content = '';
    }

    this.#eol = getEOL(this.#content);
    this.#detectIndentation();
  }

  /**
   * Gets the parsed JSON abstract syntax tree.
   * The AST is lazily parsed and cached.
   */
  private get JsonAst(): Node | undefined {
    if (this.#jsonAst) {
      return this.#jsonAst;
    }

    const errors: ParseError[] = [];
    this.#jsonAst = parseTree(this.#content, errors, { allowTrailingComma: true });
    if (errors.length) {
      formatError(this.#path, errors);
    }

    return this.#jsonAst;
  }

  /**
   * Gets a value from the JSON file at a specific path.
   * @param jsonPath The path to the value.
   * @returns The value at the given path, or `undefined` if not found.
   */
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

  /**
   * Modifies a value in the JSON file.
   * @param jsonPath The path to the value to modify.
   * @param value The new value to insert.
   * @param insertInOrder A function to determine the insertion index, or `false` to insert at the end.
   * @returns `true` if the modification was successful, `false` otherwise.
   */
  modify(
    jsonPath: JSONPath,
    value: JsonValue | undefined,
    insertInOrder?: InsertionIndex | false,
  ): boolean {
    if (value === undefined && this.get(jsonPath) === undefined) {
      // Cannot remove a value which doesn't exist.
      return false;
    }

    let getInsertionIndex: InsertionIndex | undefined;
    if (insertInOrder === undefined) {
      const property = jsonPath.slice(-1)[0];
      getInsertionIndex = (properties) =>
        [...properties, property].sort().findIndex((p) => p === property);
    } else if (insertInOrder !== false) {
      getInsertionIndex = insertInOrder;
    }

    const edits = modify(this.#content, jsonPath, value, {
      getInsertionIndex,
      formattingOptions: {
        insertSpaces: this.#insertSpaces,
        tabSize: this.#tabSize,
        eol: this.#eol,
      },
    });

    if (edits.length === 0) {
      return false;
    }

    this.#content = applyEdits(this.#content, edits);
    this.#jsonAst = undefined;

    return true;
  }

  /**
   * Deletes a value from the JSON file at a specific path.
   * @param jsonPath The path to the value to delete.
   * @returns `true` if the deletion was successful, `false` otherwise.
   */
  delete(jsonPath: JSONPath): boolean {
    return this.modify(jsonPath, undefined);
  }

  /** Saves the modified content back to the file. */
  save(): void {
    writeFileSync(this.#path, this.#content);
  }

  /** Detects the indentation of the file. */
  #detectIndentation(): void {
    // Find the first line that has indentation.
    const match = this.#content.match(/^(?:( )+|\t+)\S/m);
    if (match) {
      this.#insertSpaces = !!match[1];
      this.#tabSize = match[0].length - 1;
    }
  }
}

/**
 * Reads and parses a JSON file, supporting comments and trailing commas.
 * @param path The path to the JSON file.
 * @returns The parsed JSON object.
 */
export function readAndParseJson<T extends JsonValue>(path: string): T {
  const errors: ParseError[] = [];
  const content = parse(readFileSync(path, 'utf-8'), errors, { allowTrailingComma: true }) as T;
  if (errors.length) {
    formatError(path, errors);
  }

  return content;
}

/**
 * Formats a JSON parsing error and throws an exception.
 * @param path The path to the file that failed to parse.
 * @param errors The list of parsing errors.
 */
function formatError(path: string, errors: ParseError[]): never {
  const { error, offset } = errors[0];
  throw new Error(
    `Failed to parse "${path}" as JSON AST Object. ${printParseErrorCode(
      error,
    )} at location: ${offset}.`,
  );
}

/**
 * Parses a JSON string, supporting comments and trailing commas.
 * @param content The JSON string to parse.
 * @returns The parsed JSON object.
 */
export function parseJson<T extends JsonValue>(content: string): T {
  return parse(content, undefined, { allowTrailingComma: true }) as T;
}
