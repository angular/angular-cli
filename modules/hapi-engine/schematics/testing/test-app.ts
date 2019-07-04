/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {SchematicTestRunner, UnitTestTree} from '@angular-devkit/schematics/testing';
import {Observable} from 'rxjs';
import {switchMap} from 'rxjs/operators';

/** Path to the collection file for the NgUniversal schematics */
export const collectionPath =
  require.resolve('nguniversal/modules/hapi-engine/schematics/collection.json');

/** Create a base app used for testing. */
export function createTestApp(appOptions = {}): Observable<UnitTestTree> {
  const baseRunner =
      new SchematicTestRunner('universal-schematics', collectionPath);

  return baseRunner
      .runExternalSchematicAsync('@schematics/angular', 'workspace', {
        name: 'workspace',
        version: '6.0.0',
        newProjectRoot: 'projects',
      })
      .pipe(
          switchMap(workspaceTree => baseRunner.runExternalSchematicAsync(
                  '@schematics/angular', 'application',
                  {...appOptions, name: 'bar'}, workspaceTree)),
      );
}
