import {Observable} from 'rxjs/Observable';

import {Logger, LogEntry} from './logger';


export class TransformLogger extends Logger {
  constructor(name: string,
              transform: (stream: Observable<LogEntry>) => Observable<LogEntry>,
              parent: Logger | null = null) {
    super(name, parent);
    this._observable = transform(this._observable);
  }
}
