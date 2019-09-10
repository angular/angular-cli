/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, SubscribableOrPromise } from 'rxjs';
import { JsonArray, JsonObject, JsonValue } from '../interface';

export type JsonPointer = string & {
  __PRIVATE_DEVKIT_JSON_POINTER: void;
};

export type SchemaValidatorError =
  RefValidatorError |
  LimitValidatorError |
  AdditionalPropertiesValidatorError |
  FormatValidatorError |
  RequiredValidatorError;

export interface SchemaValidatorErrorBase {
  keyword: string;
  dataPath: string;
  message?: string;
  data?: JsonValue;
}

export interface RefValidatorError extends SchemaValidatorErrorBase {
  keyword: '$ref';
  params: { ref: string };
}

export interface LimitValidatorError extends SchemaValidatorErrorBase {
  keyword: 'maxItems' | 'minItems' | 'maxLength' | 'minLength' | 'maxProperties' | 'minProperties';
  params: { limit: number };
}

export interface AdditionalPropertiesValidatorError extends SchemaValidatorErrorBase {
  keyword: 'additionalProperties';
  params: { additionalProperty: string };
}

export interface FormatValidatorError extends SchemaValidatorErrorBase {
  keyword: 'format';
  params: { format: string };
}

export interface RequiredValidatorError extends SchemaValidatorErrorBase {
  keyword: 'required';
  params: { missingProperty: string };
}

export interface SchemaValidatorResult {
  data: JsonValue;
  success: boolean;
  errors?: SchemaValidatorError[];
}

export interface SchemaValidatorOptions {
  applyPreTransforms?: boolean;
  applyPostTransforms?: boolean;
  withPrompts?: boolean;
}

export interface SchemaValidator {
  (data: JsonValue, options?: SchemaValidatorOptions): Observable<SchemaValidatorResult>;
}

export interface SchemaFormatter {
  readonly async: boolean;
  // tslint:disable-next-line:no-any
  validate(data: any): boolean | Observable<boolean>;
}

export interface SchemaFormat {
  name: string;
  formatter: SchemaFormatter;
}

export interface SmartDefaultProvider<T> {
  (schema: JsonObject): T | Observable<T>;
}

export interface SchemaKeywordValidator {
  (
    // tslint:disable-next-line:no-any
    data: JsonValue,
    schema: JsonValue,
    parent: JsonObject | JsonArray | undefined,
    parentProperty: string | number | undefined,
    pointer: JsonPointer,
    // tslint:disable-next-line:no-any
    rootData: JsonValue,
  ): boolean | Observable<boolean>;
}

export interface PromptDefinition {
  id: string;
  type: string;
  message: string;
  default?: string | string[] | number | boolean | null;
  validator?: (value: JsonValue) => boolean | string | Promise<boolean | string>;

  items?: Array<string | { value: JsonValue, label: string }>;

  raw?: string | JsonObject;
  multiselect?: boolean;
}

export type PromptProvider = (definitions: Array<PromptDefinition>)
  => SubscribableOrPromise<{ [id: string]: JsonValue }>;

export interface SchemaRegistry {
  compile(schema: Object): Observable<SchemaValidator>;
  flatten(schema: JsonObject | string): Observable<JsonObject>;
  addFormat(format: SchemaFormat): void;
  addSmartDefaultProvider<T>(source: string, provider: SmartDefaultProvider<T>): void;
  usePromptProvider(provider: PromptProvider): void;

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
  (
    value: JsonValue,
    pointer: JsonPointer,
    schema?: JsonObject,
    root?: JsonObject | JsonArray,
  ): Observable<JsonValue> | JsonValue;
}
