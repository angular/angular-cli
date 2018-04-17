/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';


@Injectable()
export class Logger {

  log(value: any, ...rest) {
    if (!environment.production) {
      console.log(value, ...rest);
    }
  }

  error(value: any, ...rest) {
    console.error(value, ...rest);
  }

  warn(value: any, ...rest) {
    console.warn(value, ...rest);
  }
}
