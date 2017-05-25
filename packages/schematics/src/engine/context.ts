/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {Engine, Schematic, SchematicContext} from './interface';
import {MergeStrategy, Tree} from '../tree/interface';

import {Observable} from 'rxjs/Observable';


export class SchematicContextImpl implements SchematicContext {
  constructor(private _schematic: Schematic,
              private _host: Observable<Tree>,
              private _strategy = MergeStrategy.Default) {}

  get host() { return this._host; }
  get engine(): Engine { return this._schematic.collection.engine; }
  get schematic() { return this._schematic; }
  get strategy() { return this._strategy; }
}
