/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonArray, JsonValue } from '../interface';


export interface JsonSchemaBase {
  $schema?: string;
  $id?: string;

  // Metadata.
  id?: string;
  title?: string;
  description?: string;
  readonly?: boolean;

  // Reference properties.
  $ref?: string;
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];

  // Structural properties.
  definitions?: { [name: string]: JsonSchema };
}

export interface JsonSchemaString {
  type: 'string';
  default?: string;

  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
}

export interface JsonSchemaNumberBase {
  default?: number;
  multipleOf?: number;

  // Range.
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: boolean;
  exclusiveMaximum?: boolean;
}

export interface JsonSchemaNumber extends JsonSchemaNumberBase {
  type: 'number';
}

export interface JsonSchemaInteger extends JsonSchemaNumberBase {
  type: 'integer';
}

export interface JsonSchemaBoolean {
  type: 'boolean';
  default?: boolean;
}

export interface JsonSchemaObject extends JsonSchemaBase {
  type: 'object';

  // Object properties.
  properties?: { [name: string]: JsonSchema };
  patternProperties?: { [pattern: string]: JsonSchema };
  required?: string[];
  minProperties?: number;
  maxProperties?: number;

  dependencies?: { [name: string]: JsonSchema | string[]; };

  additionalProperties?: boolean | JsonSchema;
}

export interface JsonSchemaArray extends JsonSchemaBase {
  type: 'array';

  additionalItems?: boolean | JsonSchema;
  items?: JsonSchema | JsonSchema[];
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
}

export interface JsonSchemaOneOfType extends JsonSchemaBase {
  type: JsonSchemaBaseType[];
}

export interface JsonSchemaAny {
  // Type related properties.
  type: undefined;
  default?: JsonValue;
  enum?: JsonArray;
}


export type JsonSchema = JsonSchemaString
                       | JsonSchemaNumber
                       | JsonSchemaInteger
                       | JsonSchemaObject
                       | JsonSchemaArray
                       | JsonSchemaOneOfType
                       | JsonSchemaAny;
export type JsonSchemaBaseType = undefined | 'string' | 'number' | 'object' | 'array' | 'boolean';
