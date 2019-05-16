/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
export interface Position {
  readonly offset: number;

  readonly line: number;
  readonly character: number;
}


export type JsonAstNode = JsonAstNumber
    | JsonAstString
    | JsonAstIdentifier
    | JsonAstArray
    | JsonAstObject
    | JsonAstConstantFalse
    | JsonAstConstantNull
    | JsonAstConstantTrue;


export interface JsonAstNodeBase {
  readonly start: Position;
  readonly end: Position;
  readonly text: string;

  readonly comments?: (JsonAstComment | JsonAstMultilineComment)[];
}


export interface JsonAstNumber extends JsonAstNodeBase {
  readonly kind: 'number';
  readonly value: number;
}


export interface JsonAstString extends JsonAstNodeBase {
  readonly kind: 'string';
  readonly value: string;
}


export interface JsonAstIdentifier extends JsonAstNodeBase {
  readonly kind: 'identifier';
  readonly value: string;
}


export interface JsonArray extends Array<JsonValue> {}


export interface JsonAstArray extends JsonAstNodeBase {
  readonly kind: 'array';
  readonly elements: JsonAstNode[];
  readonly value: JsonArray;
}


export interface JsonObject {
  [prop: string]: JsonValue;
}


export interface JsonAstKeyValue extends JsonAstNodeBase {
  readonly kind: 'keyvalue';
  readonly key: JsonAstString | JsonAstIdentifier;
  readonly value: JsonAstNode;
}


export interface JsonAstObject extends JsonAstNodeBase {
  readonly kind: 'object';
  readonly properties: JsonAstKeyValue[];
  readonly value: JsonObject;
}


export interface JsonAstConstantFalse extends JsonAstNodeBase {
  readonly kind: 'false';
  readonly value: false;
}


export interface JsonAstConstantNull extends JsonAstNodeBase {
  readonly kind: 'null';
  readonly value: null;
}


export interface JsonAstConstantTrue extends JsonAstNodeBase {
  readonly kind: 'true';
  readonly value: true;
}


// Loose mode AST.
export interface JsonAstMultilineComment extends JsonAstNodeBase {
  readonly kind: 'multicomment';
  readonly content: string;
}
export interface JsonAstComment extends JsonAstNodeBase {
  readonly kind: 'comment';
  readonly content: string;
}


export type JsonValue = JsonAstNode['value'];

export function isJsonObject(value: JsonValue): value is JsonObject {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

export function isJsonArray(value: JsonValue): value is JsonArray {
  return Array.isArray(value);
}
