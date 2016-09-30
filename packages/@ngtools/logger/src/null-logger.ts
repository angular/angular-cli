import {Logger} from './logger';

import {Observable} from 'rxjs/Observable';

import 'rxjs/add/observable/empty';


export class NullLogger extends Logger {
  constructor(parent: Logger | null = null) {
    super('', parent);
    this._observable = Observable.empty();
  }
}
