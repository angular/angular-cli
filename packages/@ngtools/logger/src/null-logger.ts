import { empty } from 'rxjs/observable/empty';
import { Logger } from './logger';


export class NullLogger extends Logger {
  constructor(parent: Logger | null = null) {
    super('', parent);
    this._observable = empty();
  }
}
