/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable } from 'rxjs/Observable';


export interface SchemaValidatorResult {
  success: boolean;
  errors?: string[];
}


export interface SchemaValidator {
  // tslint:disable-next-line:no-any
  (data: any): Observable<SchemaValidatorResult>;
}


export interface SchemaRegistry {
  compile(schema: Object): Observable<SchemaValidator>;
}
