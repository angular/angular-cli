/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { Observable, Operator, PartialObserver, Subject, Subscription } from 'rxjs';
import { JsonObject } from '../json/interface';


export interface LoggerMetadata extends JsonObject {
  name: string;
  path: string[];
}
export interface LogEntry extends LoggerMetadata {
  level: LogLevel;
  message: string;
  timestamp: number;
}
export interface LoggerApi {
  createChild(name: string): Logger;
  log(level: LogLevel, message: string, metadata?: JsonObject): void;
  debug(message: string, metadata?: JsonObject): void;
  info(message: string, metadata?: JsonObject): void;
  warn(message: string, metadata?: JsonObject): void;
  error(message: string, metadata?: JsonObject): void;
  fatal(message: string, metadata?: JsonObject): void;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';


export class Logger extends Observable<LogEntry> implements LoggerApi {
  protected readonly _subject: Subject<LogEntry> = new Subject<LogEntry>();
  protected _metadata: LoggerMetadata;

  private _obs: Observable<LogEntry>;
  private _subscription: Subscription | null;

  protected get _observable() { return this._obs; }
  protected set _observable(v: Observable<LogEntry>) {
    if (this._subscription) {
      this._subscription.unsubscribe();
    }
    this._obs = v;
    if (this.parent) {
      this._subscription = this.subscribe((value: LogEntry) => {
        if (this.parent) {
          this.parent._subject.next(value);
        }
      }, (error: Error) => {
        if (this.parent) {
          this.parent._subject.error(error);
        }
      }, () => {
        if (this._subscription) {
          this._subscription.unsubscribe();
        }
        this._subscription = null;
      });
    }
  }

  constructor(public readonly name: string, public readonly parent: Logger | null = null) {
    super();

    const path: string[] = [];
    let p = parent;
    while (p) {
      path.push(p.name);
      p = p.parent;
    }
    this._metadata = { name, path };
    this._observable = this._subject.asObservable();
    if (this.parent && this.parent._subject) {
      // When the parent completes, complete us as well.
      this.parent._subject.subscribe(undefined, undefined, () => this.complete());
    }
  }

  asApi(): LoggerApi {
    return {
      createChild: (name: string) => this.createChild(name),
      log: (level: LogLevel, message: string, metadata?: JsonObject) => {
        return this.log(level, message, metadata);
      },
      debug: (message: string, metadata?: JsonObject) => this.debug(message, metadata),
      info: (message: string, metadata?: JsonObject) => this.info(message, metadata),
      warn: (message: string, metadata?: JsonObject) => this.warn(message, metadata),
      error: (message: string, metadata?: JsonObject) => this.error(message, metadata),
      fatal: (message: string, metadata?: JsonObject) => this.fatal(message, metadata),
    };
  }

  createChild(name: string) {
    return new (this.constructor as typeof Logger)(name, this);
  }

  complete() {
    this._subject.complete();
  }

  log(level: LogLevel, message: string, metadata: JsonObject = {}): void {
    const entry: LogEntry = Object.assign({}, metadata, this._metadata, {
      level, message, timestamp: +Date.now(),
    });
    this._subject.next(entry);
  }
  next(entry: LogEntry): void {
    this._subject.next(entry);
  }

  debug(message: string, metadata: JsonObject = {}) {
    return this.log('debug', message, metadata);
  }
  info(message: string, metadata: JsonObject = {}) {
    return this.log('info', message, metadata);
  }
  warn(message: string, metadata: JsonObject = {}) {
    return this.log('warn', message, metadata);
  }
  error(message: string, metadata: JsonObject = {}) {
    return this.log('error', message, metadata);
  }
  fatal(message: string, metadata: JsonObject = {}) {
    return this.log('fatal', message, metadata);
  }

  toString() {
    return `<Logger(${this.name})>`;
  }

  lift<R>(operator: Operator<LogEntry, R>): Observable<R> {
    return this._observable.lift(operator);
  }

  subscribe(): Subscription;
  subscribe(observer: PartialObserver<LogEntry>): Subscription;
  subscribe(next?: (value: LogEntry) => void, error?: (error: Error) => void,
            complete?: () => void): Subscription;
  subscribe(_observerOrNext?: PartialObserver<LogEntry> | ((value: LogEntry) => void),
            _error?: (error: Error) => void,
            _complete?: () => void): Subscription {
    return this._observable.subscribe.apply(this._observable, arguments);
  }
  forEach(next: (value: LogEntry) => void, PromiseCtor?: typeof Promise): Promise<void> {
    return this._observable.forEach(next, PromiseCtor);
  }
}
