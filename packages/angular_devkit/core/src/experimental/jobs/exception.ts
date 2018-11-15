/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '../../exception/index';
import { JobName } from './api';

export class JobNameAlreadyRegisteredException extends BaseException {
  constructor(name: JobName) {
    super(`Job named ${JSON.stringify(name)} already exists.`);
  }
}

export class JobDoesNotExistException extends BaseException {
  constructor(name: JobName) {
    super(`Job name ${JSON.stringify(name)} does not exist.`);
  }
}
