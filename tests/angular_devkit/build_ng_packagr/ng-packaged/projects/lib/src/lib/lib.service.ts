/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable } from '@angular/core';

@Injectable()
export class LibService {

  constructor() { }

  testEs2016() {
    return ['foo', 'bar'].includes('foo');
  }

}
