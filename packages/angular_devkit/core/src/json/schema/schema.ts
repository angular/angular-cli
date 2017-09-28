/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { JsonArray, JsonObject, JsonValue } from '../interface';


export interface JsonSchemaBase extends Partial<JsonObject> {
  $schema?: string;
  $id?: string;

  // Metadata.
  id?: string;
  title?: string;
  description?: string;
  readonly?: boolean;

  // Reference properties.
  $ref?: string;
  allOf?: (JsonObject & JsonSchema)[];
  anyOf?: (JsonObject & JsonSchema)[];
  oneOf?: (JsonObject & JsonSchema)[];

  // Structural properties.
  definitions?: { [name: string]: (JsonObject & JsonSchema) };
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
  properties?: { [name: string]: (JsonObject & JsonSchema) };
  patternProperties?: { [pattern: string]: (JsonObject & JsonSchema) };
  required?: string[];
  minProperties?: number;
  maxProperties?: number;

  dependencies?: { [name: string]: (string & JsonSchema) | string[]; };

  additionalProperties?: boolean | (JsonObject & JsonSchema);
}

export interface JsonSchemaArray extends JsonSchemaBase {
  type: 'array';

  additionalItems?: boolean | (JsonObject & JsonSchema);
  items?: JsonArray;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
}

export interface JsonSchemaOneOfType extends JsonSchemaBase {
  type: JsonArray & (JsonSchemaBaseType[]);
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
