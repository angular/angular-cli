/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import { toArray } from 'rxjs/operators';
import { LogEntry, Logger } from './logger';
import { NullLogger } from './null-logger';


describe('NullLogger', () => {
  it('works', (done: DoneFn) => {
    const logger = new NullLogger();
    logger.pipe(toArray())
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([]);
      })
      .then(() => done(), err => done.fail(err));

    logger.debug('hello');
    logger.info('world');
    logger.complete();
  });

  it('nullifies children', (done: DoneFn) => {
    const logger = new Logger('test');
    logger.pipe(toArray())
      .toPromise()
      .then((observed: LogEntry[]) => {
        expect(observed).toEqual([]);
      })
      .then(() => done(), err => done.fail(err));

    const nullLogger = new NullLogger(logger);
    const child = new Logger('test', nullLogger);
    child.debug('hello');
    child.info('world');
    logger.complete();
  });
});
