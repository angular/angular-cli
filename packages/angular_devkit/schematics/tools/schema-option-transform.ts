/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { deepCopy, schema } from '@angular-devkit/core';
import { Observable, of as observableOf } from 'rxjs';
import { first, map, mergeMap } from 'rxjs/operators';
import { FileSystemSchematicContext, FileSystemSchematicDescription } from './description';

export class InvalidInputOptions<T = {}> extends schema.SchemaValidationException {
  constructor(options: T, errors: schema.SchemaValidatorError[]) {
    super(
      errors,
      `Schematic input does not validate against the Schema: ${JSON.stringify(options)}\nErrors:\n`,
    );
  }
}

// This can only be used in NodeJS.
export function validateOptionsWithSchema(registry: schema.SchemaRegistry) {
  return <T extends {}>(
    schematic: FileSystemSchematicDescription,
    options: T,
    context?: FileSystemSchematicContext,
  ): Observable<T> => {
    // Prevent a schematic from changing the options object by making a copy of it.
    options = deepCopy(options);

    const withPrompts = context ? context.interactive : true;

    if (schematic.schema && schematic.schemaJson) {
      // Make a deep copy of options.
      return registry
        .compile(schematic.schemaJson)
        .pipe(
          mergeMap(validator => validator(options, { withPrompts })),
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
