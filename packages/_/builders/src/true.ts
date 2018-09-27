/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, of } from 'rxjs';

export class TrueBuilder {
  constructor() {}

  run(): Observable<{ success: boolean }> {
    return of({
      success: true,
    });
  }
}

export default TrueBuilder;
