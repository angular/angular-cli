/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {JsonValue} from '../json/interface';
import {Logger} from './logger';
import 'rxjs/add/operator/toArray';
import 'rxjs/add/operator/toPromise';


describe('Logger', () => {
  it('works', (done: DoneFn) => {
    const logger = new Logger('test');
    logger
      .toArray()
      .toPromise()
      .then((observed: JsonValue[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'hello', level: 'debug', name: 'test' }) as any,
          jasmine.objectContaining({ message: 'world', level: 'info', name: 'test' }) as any,
        ]);
      })
      .then(() => done(), (err: any) => done.fail(err));

    logger.debug('hello');
    logger.info('world');
    logger.complete();
  });

  it('works with children', (done: DoneFn) => {
    const logger = new Logger('test');
    let hasCompleted = false;
    logger
      .toArray()
      .toPromise()
      .then((observed: JsonValue[]) => {
        expect(observed).toEqual([
          jasmine.objectContaining({ message: 'hello', level: 'debug', name: 'child' }) as any,
          jasmine.objectContaining({ message: 'world', level: 'info', name: 'child' }) as any,
        ]);
        expect(hasCompleted).toBe(true);
      })
      .then(() => done(), (err: any) => done.fail(err));

    const childLogger = new Logger('child', logger);
    childLogger.subscribe(undefined, undefined, () => hasCompleted = true);
    childLogger.debug('hello');
    childLogger.info('world');
    logger.complete();
  });
});
