/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';
import { JsonValue } from '..';


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

export interface SchemaRegistry {
  compile(schema: Object): Observable<SchemaValidator>;
  addFormat(format: SchemaFormat): void;
}
