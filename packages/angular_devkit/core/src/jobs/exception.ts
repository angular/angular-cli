/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { BaseException } from '../exception';
import { JobName, JobTypeName } from './api';

export class JobTypeDoesNotExistException extends BaseException {
  constructor(type: JobTypeName) {
    super(`Type ${JSON.stringify(type)} was not found.`);
  }
}

export class DefaultJobForTypeDoesNotExistException extends JobTypeDoesNotExistException {}

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

export class JobHandlerIsOfInvalidTypeException extends BaseException {
  constructor(name: JobName, type: JobTypeName) {
    super(`Job handler ${JSON.stringify(name)} is not of job type ${JSON.stringify(type)}.`);
  }
}
