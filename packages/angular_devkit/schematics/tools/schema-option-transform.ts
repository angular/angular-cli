/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '@angular-devkit/core';
import { SchematicDescription } from '@angular-devkit/schematics';
import { Observable } from 'rxjs/Observable';
import { first } from 'rxjs/operators/first';
import { map } from 'rxjs/operators/map';
import { mergeMap } from 'rxjs/operators/mergeMap';
import { FileSystemCollectionDescription, FileSystemSchematicDescription } from './description';

export type SchematicDesc =
  SchematicDescription<FileSystemCollectionDescription, FileSystemSchematicDescription>;


export class InvalidInputOptions extends BaseException {
  // tslint:disable-next-line:no-any
  constructor(options: any, errors: string[]) {
    super(`Schematic input does not validate against the Schema: ${JSON.stringify(options)}\n`
        + `Errors:\n  ${errors.join('\n  ')}`);
  }
}


export interface OptionsSchemaValidatorResult {
  success: boolean;
  errors?: string[];
}

export interface OptionsSchemaValidator {
  // tslint:disable-next-line:no-any
  (data: any): Observable<OptionsSchemaValidatorResult>;
}

export interface OptionsSchemaRegistry {
  compile(schema: Object): Observable<OptionsSchemaValidator>;
}

// tslint:disable-next-line:no-any
function _deepCopy<T extends {[key: string]: any}>(object: T): T {
  const copy = {} as T;
  for (const key of Object.keys(object)) {
    if (typeof object[key] == 'object') {
      copy[key] = _deepCopy(object[key]);
      break;
    } else {
        copy[key] = object[key];
    }
  }

  return copy;
}


// This can only be used in NodeJS.
export function validateOptionsWithSchema(registry: OptionsSchemaRegistry) {
  return <T extends {}>(schematic: SchematicDesc, options: T): Observable<T> => {
    // Prevent a schematic from changing the options object by making a copy of it.
    options = _deepCopy(options);

    if (schematic.schema && schematic.schemaJson) {
      // Make a deep copy of options.
      return registry
        .compile(schematic.schemaJson)
        .pipe(
          mergeMap(validator => validator(options)),
          first(),
          map(result => {
            if (!result.success) {
              throw new InvalidInputOptions(options, result.errors || ['Unknown reason.']);
            }

            return options;
          }),
        );
    }

    return Observable.of(options);
  };
}
