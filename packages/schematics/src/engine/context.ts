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
