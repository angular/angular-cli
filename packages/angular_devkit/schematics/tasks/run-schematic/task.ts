/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { TaskConfiguration, TaskConfigurationGenerator } from '../../src';
import { RunSchematicName, RunSchematicTaskOptions } from './options';


export class RunSchematicTask<T> implements TaskConfigurationGenerator<RunSchematicTaskOptions<T>> {
  protected _collection: string | null;
  protected _schematic: string;
  protected _options: T;

  constructor(s: string, o: T);
  constructor(c: string, s: string, o: T);

  constructor(c: string | null, s: string | T, o?: T) {
    if (arguments.length == 2 || typeof s !== 'string') {
      o = s as T;
      s = c as string;
      c = null;
    }

    this._collection = c;
    this._schematic = s as string;
    this._options = o as T;
  }

  toConfiguration(): TaskConfiguration<RunSchematicTaskOptions<T>> {
    return {
      name: RunSchematicName,
      options: {
        collection: this._collection,
        name: this._schematic,
        options: this._options,
      },
    };
  }
}
