/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { JsonArray, JsonObject, JsonValue } from '..';

export type JsonPointer = string & {
  __PRIVATE_DEVKIT_JSON_POINTER: void;
};

export interface SchemaValidatorResult {
  data: JsonValue;
  success: boolean;
  errors?: string[];
}

export interface SchemaValidator {
  // tslint:disable-next-line:no-any
  (data: any): Observable<SchemaValidatorResult>;
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

export interface SchemaRegistry {
  compile(schema: Object): Observable<SchemaValidator>;
  addFormat(format: SchemaFormat): void;
}
