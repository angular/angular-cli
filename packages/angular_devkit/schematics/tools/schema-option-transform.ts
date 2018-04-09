/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {
  BaseException,
  schema,
} from '@angular-devkit/core';
import { Observable, of as observableOf } from 'rxjs';
import { first, map, mergeMap } from 'rxjs/operators';
import { SchematicDescription } from '../src';
import { FileSystemCollectionDescription, FileSystemSchematicDescription } from './description';

export type SchematicDesc =
  SchematicDescription<FileSystemCollectionDescription, FileSystemSchematicDescription>;


export class InvalidInputOptions extends BaseException {
  // tslint:disable-next-line:no-any
  constructor(options: any, public readonly errors: schema.SchemaValidatorError[]) {
    super(`Schematic input does not validate against the Schema: ${JSON.stringify(options)}\n`
        + `Errors:\n  ${schema.SchemaValidationException.createMessages(errors).join('\n  ')}`);
  }
}


// tslint:disable-next-line:no-any
function _deepCopy<T extends {[key: string]: any}>(object: T): T {
  return JSON.parse(JSON.stringify(object));
  // const copy = {} as T;
  // for (const key of Object.keys(object)) {
  //   if (typeof object[key] == 'object') {
  //     copy[key] = _deepCopy(object[key]);
  //     break;
  //   } else {
  //       copy[key] = object[key];
  //   }
  // }

  // return copy;
}


// This can only be used in NodeJS.
export function validateOptionsWithSchema(registry: schema.SchemaRegistry) {
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
              throw new InvalidInputOptions(options, result.errors || []);
            }

            return options;
          }),
        );
    }

    return observableOf(options);
  };
}
