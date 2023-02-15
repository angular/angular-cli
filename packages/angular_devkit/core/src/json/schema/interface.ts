/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import { ErrorObject, Format } from 'ajv';
import { Observable, ObservableInput } from 'rxjs';
import { JsonArray, JsonObject, JsonValue } from '../utils';

export type JsonPointer = string & {
  __PRIVATE_DEVKIT_JSON_POINTER: void;
};
export interface SchemaValidatorResult {
  data: JsonValue;
  success: boolean;
  errors?: SchemaValidatorError[];
}

export type SchemaValidatorError = Partial<ErrorObject>;

export interface SchemaValidatorOptions {
  applyPreTransforms?: boolean;
  applyPostTransforms?: boolean;
  withPrompts?: boolean;
}

export interface SchemaValidator {
  (data: JsonValue, options?: SchemaValidatorOptions): Promise<SchemaValidatorResult>;
}

export type SchemaFormatter = Format;

export interface SchemaFormat {
  name: string;
  formatter: SchemaFormatter;
}

export interface SmartDefaultProvider<T> {
  (schema: JsonObject): T | Observable<T>;
}

export interface SchemaKeywordValidator {
  (
    data: JsonValue,
    schema: JsonValue,
    parent: JsonObject | JsonArray | undefined,
    parentProperty: string | number | undefined,
    pointer: JsonPointer,
    rootData: JsonValue,
  ): boolean | Observable<boolean>;
}

export interface PromptDefinition {
  id: string;
  type: string;
  message: string;
  default?: string | string[] | number | boolean | null;
  validator?: (value: JsonValue) => boolean | string | Promise<boolean | string>;

  items?: Array<string | { value: JsonValue; label: string }>;

  raw?: string | JsonObject;
  multiselect?: boolean;
  propertyTypes: Set<string>;
}

export type PromptProvider = (
  definitions: Array<PromptDefinition>,
) => ObservableInput<{ [id: string]: JsonValue }>;

export interface SchemaRegistry {
  compile(schema: Object): Promise<SchemaValidator>;

  /** @private */
  ɵflatten(schema: JsonObject | string): Promise<JsonObject>;
  addFormat(format: SchemaFormat): void;
  addSmartDefaultProvider<T>(source: string, provider: SmartDefaultProvider<T>): void;
  usePromptProvider(provider: PromptProvider): void;
  useXDeprecatedProvider(onUsage: (message: string) => void): void;

  /**
   * Add a transformation step before the validation of any Json.
   * @param {JsonVisitor} visitor The visitor to transform every value.
   * @param {JsonVisitor[]} deps A list of other visitors to run before.
   */
  addPreTransform(visitor: JsonVisitor, deps?: JsonVisitor[]): void;

  /**
   * Add a transformation step after the validation of any Json. The JSON will not be validated
   * after the POST, so if transformations are not compatible with the Schema it will not result
   * in an error.
   * @param {JsonVisitor} visitor The visitor to transform every value.
   * @param {JsonVisitor[]} deps A list of other visitors to run before.
   */
  addPostTransform(visitor: JsonVisitor, deps?: JsonVisitor[]): void;
}

export interface JsonSchemaVisitor {
  (
    current: JsonObject | JsonArray,
    pointer: JsonPointer,
    parentSchema?: JsonObject | JsonArray,
    index?: string,
  ): void;
}

export interface JsonVisitor {
  (value: JsonValue, pointer: JsonPointer, schema?: JsonObject, root?: JsonObject | JsonArray):
    | Observable<JsonValue>
    | JsonValue;
}
